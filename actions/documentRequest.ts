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

    const result = await withIdempotency<DocumentRequestResponse>(
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

        const studentName =
          `${user.firstName || ""} ${user.lastName || ""}`.trim();
        const documentTypeLabel =
          DOCUMENT_TYPE_LABELS[input.documentType as DocumentType];

        // Send email notification
        sendDocumentRequestEmail({
          email: user.email,
          studentName,
          requestId,
          documentTypeLabel,
          copies: input.copies,
          purpose: input.purpose,
          notificationType: "submitted",
        }).catch((err) => console.error("Document request email failed:", err));

        // Send SMS notification
        if (user.contactNumber) {
          console.log("SMS: Sending submission SMS to:", user.contactNumber);
          sendDocumentRequestSMS(
            user.contactNumber,
            studentName,
            requestId,
            documentTypeLabel,
            "submitted",
          ).catch((err) => console.error("Document request SMS failed:", err));
        } else {
          console.log("SMS: No contact number for user:", user.email);
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
 * Create a public TOR request (no session required - for landing page)
 */
export async function createPublicTorRequest(
  torData: TorFormData,
  idempotencyKey: string,
): Promise<DocumentRequestResponse> {
  try {
    if (!idempotencyKey) {
      return { success: false, error: "Missing request identifier" };
    }

    // Build purpose string from TOR data
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

        // Send SMS notification for public TOR request
        if (torData.student.contactNo) {
          const studentName =
            `${torData.student.firstName} ${torData.student.lastName}`.trim();
          console.log(
            "SMS: Sending TOR submission SMS to:",
            torData.student.contactNo,
          );
          sendDocumentRequestSMS(
            torData.student.contactNo,
            studentName,
            requestId,
            "Transcript of Records",
            "submitted",
          ).catch((err) => console.error("TOR request SMS failed:", err));
        } else {
          console.log("SMS: No contact number provided in TOR form");
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
 * Get registrar requests (requires admin or registrar role)
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
 * Get registrar request stats (requires admin or registrar role)
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

// Transition map: guard status(es) → next status
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
 * Process document request (requires admin or registrar role)
 * Sends SMS notification to the student's contact number
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

    // First check if the request exists
    const existingDoc = await DocumentRequest.findOne({ requestId }).lean();

    if (!existingDoc) {
      return {
        success: false,
        error: "Request not found",
      };
    }

    // Check if status is in allowed transition
    if (!transition.from.includes(existingDoc.status)) {
      return {
        success: false,
        error: "Request not found or already moved to another status",
      };
    }

    // Build update object
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

    // Use findOneAndUpdate with regular update object
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

    // Get contact number from student info or TOR details
    const contactNumber =
      doc.student?.contactNumber || doc.torDetails?.student?.contactNo || "";

    console.log("=== SMS Notification Debug ===");
    console.log("Request ID:", doc.requestId);
    console.log("Student Name:", studentName);
    console.log("Contact Number from student:", doc.student?.contactNumber);
    console.log(
      "Contact Number from TOR details:",
      doc.torDetails?.student?.contactNo,
    );
    console.log("Final Contact Number:", contactNumber);
    console.log("Status:", transition.to);
    console.log("==============================");

    // Send email notification if email exists
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

    // Send SMS notification if contact number exists
    if (contactNumber) {
      console.log("Sending SMS notification to:", contactNumber);
      sendDocumentRequestSMS(
        contactNumber,
        studentName,
        doc.requestId,
        documentTypeLabel,
        transition.to,
        trimmedRemarks || undefined,
      ).catch((err) => console.error("Document status SMS failed:", err));
    } else {
      console.log("No contact number found. SMS notification skipped.");
    }

    revalidateDocumentPaths();

    return { success: true, request: serialize(updated) };
  } catch (error) {
    console.error("Error processing document request:", error);
    return { success: false, error: "Failed to update request" };
  }
}
