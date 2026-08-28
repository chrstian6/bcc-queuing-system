// models/DocumentRequest.ts
import mongoose, { Document, Model } from "mongoose";
import {
  VALID_DOCUMENT_TYPES,
  VALID_REQUEST_STATUSES,
} from "@/types/documentRequest";

export interface IDocumentRequestStudent {
  schoolId: string;
  firstName: string;
  lastName: string;
  middleName: string;
  suffix: string;
  year: string;
  campus: string;
  email: string;
  contactNumber: string;
}

// TOR-specific fields
export interface ITorDetails {
  purpose: {
    employment: boolean;
    employmentScope: "local" | "abroad";
    cavChed: boolean;
    cavScope: "local" | "abroad";
    boardExam: boolean;
    boardExamType: "cpa" | "let" | "other";
    boardExamOther: string;
  };
  student: {
    lastName: string;
    firstName: string;
    middleName: string;
    birthdate: string;
    birthplace: string;
    gender: "male" | "female";
    address: string;
    contactNo: string;
  };
  academic: {
    course: string;
    major: string;
    yearGraduated: string;
    notGraduated: boolean;
    semester: "1st" | "2nd" | "Summer";
    schoolYear: string;
  };
  fee: number;
}

export interface IDocumentRequest extends Document {
  requestId: string;
  userId: string;
  student: IDocumentRequestStudent;
  documentType: string;
  otherDescription: string;
  purpose: string;
  copies: number;
  status: string;
  remarks: string;
  torDetails: ITorDetails | null;
  statusHistory: {
    status: string;
    timestamp: Date;
    changedBy: string;
    remarks: string;
  }[];
  processedBy: string | null;
  readyAt: Date | null;
  releasedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const documentRequestSchema = new mongoose.Schema<IDocumentRequest>(
  {
    requestId: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    student: {
      schoolId: { type: String, default: "" }, // Not required anymore
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      middleName: { type: String, default: "" },
      suffix: { type: String, default: "" },
      year: { type: String, default: "" },
      campus: { type: String, default: "" },
      email: { type: String, default: "", lowercase: true },
      contactNumber: { type: String, default: "" },
    },
    documentType: {
      type: String,
      required: true,
      // Remove enum restriction to accept any string
      // enum: VALID_DOCUMENT_TYPES,
    },
    otherDescription: { type: String, default: "", maxlength: 200 },
    purpose: { type: String, required: true, maxlength: 300 },
    copies: { type: Number, default: 1, min: 1, max: 5 },
    torDetails: {
      type: {
        purpose: {
          employment: { type: Boolean, default: false },
          employmentScope: {
            type: String,
            enum: ["local", "abroad"],
            default: "local",
          },
          cavChed: { type: Boolean, default: false },
          cavScope: {
            type: String,
            enum: ["local", "abroad"],
            default: "local",
          },
          boardExam: { type: Boolean, default: false },
          boardExamType: {
            type: String,
            enum: ["cpa", "let", "other"],
            default: "cpa",
          },
          boardExamOther: { type: String, default: "" },
        },
        student: {
          lastName: { type: String, default: "" },
          firstName: { type: String, default: "" },
          middleName: { type: String, default: "" },
          birthdate: { type: String, default: "" },
          birthplace: { type: String, default: "" },
          gender: {
            type: String,
            enum: ["male", "female"],
            default: "male",
          },
          address: { type: String, default: "" },
          contactNo: { type: String, default: "" },
        },
        academic: {
          course: { type: String, default: "" },
          major: { type: String, default: "" },
          yearGraduated: { type: String, default: "" },
          notGraduated: { type: Boolean, default: false },
          semester: {
            type: String,
            enum: ["1st", "2nd", "Summer"],
            default: "1st",
          },
          schoolYear: { type: String, default: "" },
        },
        fee: { type: Number, default: 0 },
      },
      default: null,
    },
    status: {
      type: String,
      enum: VALID_REQUEST_STATUSES,
      default: "pending",
      index: true,
    },
    remarks: { type: String, default: "", maxlength: 500 },
    statusHistory: {
      type: [
        {
          _id: false,
          status: { type: String, required: true },
          timestamp: { type: Date, default: Date.now },
          changedBy: { type: String, default: "system" },
          remarks: { type: String, default: "" },
        },
      ],
      default: [],
    },
    processedBy: { type: String, default: null },
    readyAt: { type: Date, default: null },
    releasedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

documentRequestSchema.index({ userId: 1, createdAt: -1 });
documentRequestSchema.index({ status: 1, createdAt: -1 });

documentRequestSchema.pre("save", function () {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: "pending",
      timestamp: new Date(),
      changedBy: "system",
      remarks: "",
    });
  }
});

if (mongoose.models.DocumentRequest) {
  delete mongoose.models.DocumentRequest;
}

const DocumentRequest: Model<IDocumentRequest> =
  mongoose.model<IDocumentRequest>("DocumentRequest", documentRequestSchema);

export default DocumentRequest;
