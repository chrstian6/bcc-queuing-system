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
import { sendDocumentRequestSMS } from "@/lib/sms";
import {
  createDocumentRequestSchema,
  DOCUMENT_TYPE_LABELS,
  MAX_ACTIVE_REQUESTS,
  type DocumentType,
} from "@/types/documentRequest";
import type { TorFormData } from "@/components/public/TranscriptOfRecordsForm";

const ACTIVE_STATUSES = ["pending", "processing", "ready-for-pickup"];
const SMS_STATUSES = ["released", "rejected"];

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

/**
 * Create a document request (requires student session)
 * EMAIL ONLY — no SMS on submission.
 */
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

    const user = await User.findById(session.user.id).lean();
    if (!user || !user.schoolId) {
      return { success: false, error: STALE_SESSION_ERROR };
    }

    const result = await withIdempotency<DocumentRequestResponse>(
      `docRequest:${session.user.id}:${data.idempotencyKey}`,
      async () => {
        const { start: today, dateStr } = getAppDayRange();

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

        const studentName =
          `${user.firstName || ""} ${user.lastName || ""}`.trim();
        const documentTypeLabel =
          DOCUMENT_TYPE_LABELS[input.documentType as DocumentType];

        // Email only — no SMS on submission
        sendDocumentRequestEmail({
          email: user.email,
          studentName,
          requestId,
          documentTypeLabel,
          copies: input.copies,
          purpose: input.purpose,
          notificationType: "submitted",
        }).catch((err) => console.error("Document request email failed:", err));

        revalidateDocumentPaths();

        return { success: true, request: serialize(request.toObject()) };
      },
    );

    return result;
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

/**
 * Create a PUBLIC document request (no session required — landing page).
 * Used when a guest picks a document from the Registrar dropdown.
 * EMAIL ONLY — no SMS on submission.
 */
export async function createPublicDocumentRequest(
  data: {
    documentType: string;
    otherDescription?: string;
    purpose: string;
    copies: number;
    student?: {
      firstName?: string;
      lastName?: string;
      middleName?: string;
      email?: string;
      contactNumber?: string;
    };
  },
  idempotencyKey: string,
): Promise<DocumentRequestResponse> {
  try {
    if (!idempotencyKey) {
      return { success: false, error: "Missing request identifier" };
    }

    if (!data.documentType) {
      return { success: false, error: "Document type is required" };
    }

    const purpose = (data.purpose || "").trim();
    if (purpose.length < 5) {
      return {
        success: false,
        error: "Purpose must be at least 5 characters",
      };
    }
    if (purpose.length > 300) {
      return {
        success: false,
        error: "Purpose must be 300 characters or less",
      };
    }

    const copies = Number(data.copies) || 1;
    if (copies < 1 || copies > 5) {
      return { success: false, error: "Copies must be between 1 and 5" };
    }

    if (
      data.documentType === "other" &&
      (!data.otherDescription || !data.otherDescription.trim())
    ) {
      return {
        success: false,
        error: "Please describe the document you need",
      };
    }

    const student = data.student || {};
    const firstName = (student.firstName || "").trim();
    const lastName = (student.lastName || "").trim();

    if (!firstName || !lastName) {
      return {
        success: false,
        error: "First name and last name are required",
      };
    }

    const email = (student.email || "").trim().toLowerCase();
    const contactNumber = (student.contactNumber || "").replace(/\s/g, "");

    if (!email && !contactNumber) {
      return {
        success: false,
        error: "Provide either email or contact number",
      };
    }

    await connectDB();

    const result = await withIdempotency<DocumentRequestResponse>(
      `publicDocRequest:${idempotencyKey}`,
      async () => {
        const { start: today, dateStr } = getAppDayRange();

        const counter = await Counter.findOneAndUpdate(
          { _id: `DOCREQ-${dateStr}` },
          { $inc: { seq: 1 }, $setOnInsert: { date: today } },
          { upsert: true, returnDocument: "after" },
        );
        const requestId = `DR-${dateStr}-${String(counter?.seq || 1).padStart(4, "0")}`;

        const request = new DocumentRequest({
          requestId,
          userId: "public",
          student: {
            schoolId: "",
            firstName,
            lastName,
            middleName: (student.middleName || "").trim(),
            suffix: "",
            year: "",
            campus: "",
            email,
            contactNumber,
          },
          documentType: data.documentType,
          otherDescription:
            data.documentType === "other"
              ? (data.otherDescription || "").trim()
              : "",
          purpose,
          copies,
          status: "pending",
        });

        await request.save();

        const documentTypeLabel =
          DOCUMENT_TYPE_LABELS[data.documentType as DocumentType] ||
          data.documentType;

        // Email only if email provided
        if (email) {
          sendDocumentRequestEmail({
            email,
            studentName: `${firstName} ${lastName}`.trim(),
            requestId,
            documentTypeLabel,
            copies,
            purpose,
            notificationType: "submitted",
          }).catch((err) =>
            console.error("Public document request email failed:", err),
          );
        }

        revalidateDocumentPaths();

        return { success: true, request: serialize(request.toObject()) };
      },
    );

    return result;
  } catch (error: any) {
    if (error instanceof IdempotencyConflictError) {
      return {
        success: false,
        error: "Your request is still being processed. Please wait a moment.",
      };
    }
    console.error("Error creating public document request:", error);
    if (error?.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return { success: false, error: messages.join(", ") };
    }
    return {
      success: false,
      error: "Failed to submit request. Please try again.",
    };
  }
}

/**
 * Create a public TOR request (no session required — landing page).
 * EMAIL ONLY — no SMS on submission.
 */
export async function createPublicTorRequest(
  torData: TorFormData,
  idempotencyKey: string,
): Promise<DocumentRequestResponse> {
  try {
    if (!idempotencyKey) {
      return { success: false, error: "Missing request identifier" };
    }

    const purposes: string[] = [];
    if (torData.purpose.employment) {
      purposes.push(`Employment (${torData.purpose.employmentScope})`);
    }
    if (torData.purpose.cavChed) {
      purposes.push(`CAV-CHED (${torData.purpose.cavScope})`);
    }
    if (torData.purpose.boardExam) {
      const examType =
        torData.purpose.boardExamType === "other"
          ? `Other: ${torData.purpose.boardExamOther}`
          : torData.purpose.boardExamType.toUpperCase();
      purposes.push(`Board Exam (${examType})`);
    }
    const purposeString = purposes.join(", ") || "Transcript of Records";

    await connectDB();

    const result = await withIdempotency<DocumentRequestResponse>(
      `publicTorRequest:${idempotencyKey}`,
      async () => {
        const { start: today, dateStr } = getAppDayRange();

        const counter = await Counter.findOneAndUpdate(
          { _id: `DOCREQ-${dateStr}` },
          { $inc: { seq: 1 }, $setOnInsert: { date: today } },
          { upsert: true, returnDocument: "after" },
        );
        const requestId = `DR-${dateStr}-${String(counter?.seq || 1).padStart(4, "0")}`;

        const request = new DocumentRequest({
          requestId,
          userId: "public",
          student: {
            schoolId: "",
            firstName: torData.student.firstName,
            lastName: torData.student.lastName,
            middleName: torData.student.middleName || "",
            suffix: "",
            year: "",
            campus: "",
            email: "",
            contactNumber: torData.student.contactNo || "",
          },
          documentType: "transcript-records",
          otherDescription: "",
          purpose: purposeString,
          copies: 1,
          torDetails: {
            purpose: {
              employment: torData.purpose.employment,
              employmentScope: torData.purpose.employmentScope,
              cavChed: torData.purpose.cavChed,
              cavScope: torData.purpose.cavScope,
              boardExam: torData.purpose.boardExam,
              boardExamType: torData.purpose.boardExamType,
              boardExamOther: torData.purpose.boardExamOther,
            },
            student: {
              lastName: torData.student.lastName,
              firstName: torData.student.firstName,
              middleName: torData.student.middleName,
              birthdate: torData.student.birthdate,
              birthplace: torData.student.birthplace,
              gender: torData.student.gender,
              address: torData.student.address,
              contactNo: torData.student.contactNo,
            },
            academic: {
              course: torData.academic.course,
              major: torData.academic.major,
              yearGraduated: torData.academic.yearGraduated,
              notGraduated: torData.academic.notGraduated,
              semester: torData.academic.semester,
              schoolYear: torData.academic.schoolYear,
            },
            fee: torData.fee,
          },
          status: "pending",
        });

        await request.save();

        revalidateDocumentPaths();

        return { success: true, request: serialize(request.toObject()) };
      },
    );

    return result;
  } catch (error: any) {
    if (error instanceof IdempotencyConflictError) {
      return {
        success: false,
        error: "Your request is still being processed. Please wait a moment.",
      };
    }
    console.error("Error creating public TOR request:", error);
    if (error?.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return { success: false, error: messages.join(", ") };
    }
    return {
      success: false,
      error: "Failed to submit TOR request. Please try again.",
    };
  }
}

/**
 * Get my document requests (requires student session)
 */
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

/**
 * Get registrar requests
 */
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

/**
 * Get registrar request stats
 */
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
      stats: {
        pending,
        processing,
        ready,
        releasedToday,
        rejectedToday,
        total,
      },
    };
  } catch (error) {
    console.error("Error fetching registrar stats:", error);
    return { success: false, error: "Failed to fetch stats" };
  }
}

type ProcessAction = "start-processing" | "mark-ready" | "release" | "reject";

const TRANSITIONS: Record<
  ProcessAction,
  { from: string[]; to: string; dateField?: string }
> = {
  "start-processing": { from: ["pending"], to: "processing" },
  "mark-ready": {
    from: ["processing"],
    to: "ready-for-pickup",
    dateField: "readyAt",
  },
  release: {
    from: ["ready-for-pickup"],
    to: "released",
    dateField: "releasedAt",
  },
  reject: {
    from: ["pending", "processing"],
    to: "rejected",
    dateField: "rejectedAt",
  },
};

/**
 * Process document request.
 * SMS fires ONLY for statuses in SMS_STATUSES (released, rejected).
 */
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
      return {
        success: false,
        error: "Remarks must be 500 characters or less",
      };
    }

    const changedBy =
      session.user.staffId ||
      (session.user.role === ROLES.ADMIN ? "admin" : "staff");

    await connectDB();

    const existingDoc = await DocumentRequest.findOne({ requestId }).lean();

    if (!existingDoc) {
      return { success: false, error: "Request not found" };
    }

    if (!transition.from.includes(existingDoc.status)) {
      return {
        success: false,
        error: "Request not found or already moved to another status",
      };
    }

    const updateFields: any = {
      status: transition.to,
      processedBy: changedBy,
      statusHistory: [
        ...(existingDoc.statusHistory || []),
        {
          status: transition.to,
          timestamp: new Date(),
          changedBy,
          remarks: trimmedRemarks,
        },
      ],
    };

    if (action === "reject") {
      updateFields.remarks = trimmedRemarks;
    }

    if (transition.dateField) {
      updateFields[transition.dateField] = new Date();
    }

    const updated = await DocumentRequest.findOneAndUpdate(
      { requestId, status: { $in: transition.from } },
      { $set: updateFields },
      { new: true },
    ).lean();

    if (!updated) {
      return {
        success: false,
        error: "Request not found or already moved to another status",
      };
    }

    const doc: any = updated;
    const studentName =
      `${doc.student?.firstName || ""} ${doc.student?.lastName || ""}`.trim();
    const documentTypeLabel =
      DOCUMENT_TYPE_LABELS[doc.documentType as DocumentType] ||
      doc.documentType;

    const contactNumber =
      doc.student?.contactNumber || doc.torDetails?.student?.contactNo || "";

    // Email — fires for every status change
    if (doc.student?.email) {
      sendDocumentRequestEmail({
        email: doc.student.email,
        studentName,
        requestId: doc.requestId,
        documentTypeLabel,
        copies: doc.copies,
        purpose: doc.purpose,
        notificationType:
          transition.to === "processing"
            ? "processing"
            : (transition.to as "ready-for-pickup" | "released" | "rejected"),
        remarks: trimmedRemarks || undefined,
      }).catch((err) => console.error("Document status email failed:", err));
    }

    // SMS — ONLY for released and rejected
    if (contactNumber && SMS_STATUSES.includes(transition.to)) {
      console.log(
        `Sending SMS for status "${transition.to}" to:`,
        contactNumber,
      );
      sendDocumentRequestSMS(
        contactNumber,
        studentName,
        doc.requestId,
        documentTypeLabel,
        transition.to,
        trimmedRemarks || undefined,
      ).catch((err) => console.error("Document status SMS failed:", err));
    } else {
      console.log(
        `SMS skipped for status "${transition.to}" (SMS only for released / rejected)`,
      );
    }

    revalidateDocumentPaths();

    return { success: true, request: serialize(updated) };
  } catch (error) {
    console.error("Error processing document request:", error);
    return { success: false, error: "Failed to update request" };
  }
}
