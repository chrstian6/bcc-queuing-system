// actions/documentRequest.ts
"use server";

import connectDB from "@/lib/mongodb";
import DocumentRequest from "@/models/DocumentRequest";
import User from "@/models/User";
import Counter from "@/models/Counter";
import { revalidatePath } from "next/cache";
import {
  requireRole,
  requireStudent,
  STALE_SESSION_ERROR,
  UNAUTHORIZED_ERROR,
} from "@/lib/authz";
import { ROLES } from "@/lib/roles";
import { checkRateLimit } from "@/lib/ratelimits";
import { withIdempotency, IdempotencyConflictError } from "@/lib/idempotency";
import { getAppDayRange } from "@/lib/time";
import { sendDocumentRequestEmail } from "@/lib/email";
import {
  createDocumentRequestSchema,
  DOCUMENT_TYPE_LABELS,
  MAX_ACTIVE_REQUESTS,
  type DocumentType,
} from "@/types/documentRequest";

const ACTIVE_STATUSES = ["pending", "processing", "ready-for-pickup"];

interface DocumentRequestResponse {
  success: boolean;
  error?: string;
  request?: any;
}

function serialize(doc: unknown) {
  return JSON.parse(JSON.stringify(doc));
}

function revalidateDocumentPaths() {
  revalidatePath("/student/documents");
  revalidatePath("/student/dashboard");
  revalidatePath("/staff/registrar/requests");
  revalidatePath("/staff/registrar/dashboard");
}

export async function createDocumentRequest(data: {
  documentType: string;
  otherDescription?: string;
  purpose: string;
  copies: number;
  idempotencyKey: string;
}): Promise<DocumentRequestResponse> {
  try {
    const session = await requireStudent();
    if (!session) return { success: false, error: STALE_SESSION_ERROR };

    if (!data.idempotencyKey) {
      return { success: false, error: "Missing request identifier" };
    }

    const rateLimit = await checkRateLimit(
      session.user.id || "",
      "createDocumentRequest",
      5,
      60 * 60 * 1000,
    );
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: "Too many document requests. Please try again later.",
      };
    }

    const parsed = createDocumentRequestSchema.safeParse({
      documentType: data.documentType,
      otherDescription: data.otherDescription || "",
      purpose: data.purpose,
      copies: Number(data.copies),
    });
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message || "Please check the form for errors",
      };
    }
    const input = parsed.data;

    await connectDB();

    // Cap concurrent active requests per student
    const activeCount = await DocumentRequest.countDocuments({
      userId: session.user.id,
      status: { $in: ACTIVE_STATUSES },
    });
    if (activeCount >= MAX_ACTIVE_REQUESTS) {
      return {
        success: false,
        error: `You already have ${MAX_ACTIVE_REQUESTS} active requests. Please wait for one to finish before submitting another.`,
      };
    }

    // Snapshot the student profile server-side
    const user = await User.findById(session.user.id).lean();
    if (!user || !user.schoolId) {
      return { success: false, error: STALE_SESSION_ERROR };
    }

    return await withIdempotency<DocumentRequestResponse>(
      `docRequest:${session.user.id}:${data.idempotencyKey}`,
      async () => {
        const { start: today, dateStr } = getAppDayRange();

        // Daily sequential request number: DR-YYYYMMDD-0001
        const counter = await Counter.findOneAndUpdate(
          { _id: `DOCREQ-${dateStr}` },
          { $inc: { seq: 1 }, $setOnInsert: { date: today } },
          { upsert: true, returnDocument: "after" },
        );
        const requestId = `DR-${dateStr}-${String(counter?.seq || 1).padStart(4, "0")}`;

        const request = new DocumentRequest({
          requestId,
          userId: session.user.id,
          student: {
            schoolId: user.schoolId,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            middleName: user.middleName || "",
            suffix: user.suffix || "",
            year: user.year || "",
            campus: user.campus || "",
            email: user.email,
            contactNumber: user.contactNumber || "",
          },
          documentType: input.documentType,
          otherDescription:
            input.documentType === "other" ? input.otherDescription || "" : "",
          purpose: input.purpose,
          copies: input.copies,
          status: "pending",
        });

        await request.save();

        sendDocumentRequestEmail({
          email: user.email,
          studentName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          requestId,
          documentTypeLabel:
            DOCUMENT_TYPE_LABELS[input.documentType as DocumentType],
          copies: input.copies,
          purpose: input.purpose,
          notificationType: "submitted",
        }).catch((err) =>
          console.error("Document request email failed:", err),
        );

        revalidateDocumentPaths();

        return { success: true, request: serialize(request.toObject()) };
      },
    );
  } catch (error: any) {
    if (error instanceof IdempotencyConflictError) {
      return {
        success: false,
        error: "Your request is still being processed. Please wait a moment.",
      };
    }
    console.error("Error creating document request:", error);
    if (error?.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return { success: false, error: messages.join(", ") };
    }
    return {
      success: false,
      error: "Failed to submit document request. Please try again.",
    };
  }
}

export async function getMyDocumentRequests() {
  try {
    const session = await requireStudent();
    if (!session)
      return { success: false, error: STALE_SESSION_ERROR, requests: [] };

    await connectDB();
    const requests = await DocumentRequest.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return { success: true, requests: serialize(requests) };
  } catch (error) {
    console.error("Error fetching document requests:", error);
    return { success: false, error: "Failed to fetch requests", requests: [] };
  }
}

export async function getRegistrarRequests(filters?: {
  status?: string;
  search?: string;
}) {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.REGISTRAR);
    if (!session)
      return { success: false, error: UNAUTHORIZED_ERROR, requests: [] };

    await connectDB();
    const query: any = {};
    if (filters?.status && filters.status !== "all") {
      query.status = filters.status;
    }
    if (filters?.search) {
      const term = filters.search.trim();
      query.$or = [
        { requestId: { $regex: term, $options: "i" } },
        { "student.lastName": { $regex: term, $options: "i" } },
        { "student.firstName": { $regex: term, $options: "i" } },
        { "student.schoolId": { $regex: term, $options: "i" } },
      ];
    }

    const requests = await DocumentRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return { success: true, requests: serialize(requests) };
  } catch (error) {
    console.error("Error fetching registrar requests:", error);
    return { success: false, error: "Failed to fetch requests", requests: [] };
  }
}

export async function getRegistrarRequestStats() {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.REGISTRAR);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    await connectDB();
    const { start: today, end: tomorrow } = getAppDayRange();

    const [pending, processing, ready, releasedToday, rejectedToday, total] =
      await Promise.all([
        DocumentRequest.countDocuments({ status: "pending" }),
        DocumentRequest.countDocuments({ status: "processing" }),
        DocumentRequest.countDocuments({ status: "ready-for-pickup" }),
        DocumentRequest.countDocuments({
          status: "released",
          releasedAt: { $gte: today, $lt: tomorrow },
        }),
        DocumentRequest.countDocuments({
          status: "rejected",
          rejectedAt: { $gte: today, $lt: tomorrow },
        }),
        DocumentRequest.countDocuments({}),
      ]);

    return {
      success: true,
      stats: { pending, processing, ready, releasedToday, rejectedToday, total },
    };
  } catch (error) {
    console.error("Error fetching registrar stats:", error);
    return { success: false, error: "Failed to fetch stats" };
  }
}

type ProcessAction = "start-processing" | "mark-ready" | "release" | "reject";

// Transition map: guard status(es) → next status
const TRANSITIONS: Record<
  ProcessAction,
  { from: string[]; to: string; dateField?: string }
> = {
  "start-processing": { from: ["pending"], to: "processing" },
  "mark-ready": { from: ["processing"], to: "ready-for-pickup", dateField: "readyAt" },
  release: { from: ["ready-for-pickup"], to: "released", dateField: "releasedAt" },
  reject: { from: ["pending", "processing"], to: "rejected", dateField: "rejectedAt" },
};

export async function processDocumentRequest(
  requestId: string,
  action: ProcessAction,
  remarks?: string,
): Promise<DocumentRequestResponse> {
  try {
    const session = await requireRole(ROLES.ADMIN, ROLES.REGISTRAR);
    if (!session) return { success: false, error: UNAUTHORIZED_ERROR };

    const transition = TRANSITIONS[action];
    if (!transition) return { success: false, error: "Invalid action" };

    const trimmedRemarks = (remarks || "").trim();
    if (action === "reject" && !trimmedRemarks) {
      return {
        success: false,
        error: "A reason is required when rejecting a request",
      };
    }
    if (trimmedRemarks.length > 500) {
      return { success: false, error: "Remarks must be 500 characters or less" };
    }

    const changedBy =
      session.user.staffId || (session.user.role === ROLES.ADMIN ? "admin" : "staff");

    await connectDB();

    // Status-guarded pipeline update (atomic; also appends history)
    const updated = await DocumentRequest.findOneAndUpdate(
      { requestId, status: { $in: transition.from } },
      [
        {
          $set: {
            status: transition.to,
            processedBy: changedBy,
            ...(action === "reject" ? { remarks: trimmedRemarks } : {}),
            ...(transition.dateField
              ? { [transition.dateField]: "$$NOW" }
              : {}),
            statusHistory: {
              $concatArrays: [
                { $ifNull: ["$statusHistory", []] },
                [
                  {
                    status: transition.to,
                    timestamp: "$$NOW",
                    changedBy,
                    remarks: trimmedRemarks,
                  },
                ],
              ],
            },
          },
        },
      ],
      { returnDocument: "after" },
    ).lean();

    if (!updated) {
      return {
        success: false,
        error: "Request not found or already moved to another status",
      };
    }

    const doc: any = updated;
    sendDocumentRequestEmail({
      email: doc.student?.email || "",
      studentName: `${doc.student?.firstName || ""} ${doc.student?.lastName || ""}`.trim(),
      requestId: doc.requestId,
      documentTypeLabel:
        DOCUMENT_TYPE_LABELS[doc.documentType as DocumentType] ||
        doc.documentType,
      copies: doc.copies,
      purpose: doc.purpose,
      notificationType:
        transition.to === "processing"
          ? "processing"
          : (transition.to as "ready-for-pickup" | "released" | "rejected"),
      remarks: trimmedRemarks || undefined,
    }).catch((err) => console.error("Document status email failed:", err));

    revalidateDocumentPaths();

    return { success: true, request: serialize(updated) };
  } catch (error) {
    console.error("Error processing document request:", error);
    return { success: false, error: "Failed to update request" };
  }
}
