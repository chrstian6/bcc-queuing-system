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
      schoolId: { type: String, required: true },
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
      enum: VALID_DOCUMENT_TYPES,
    },
    otherDescription: { type: String, default: "", maxlength: 200 },
    purpose: { type: String, required: true, maxlength: 300 },
    copies: { type: Number, default: 1, min: 1, max: 5 },
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

// Seed the initial history entry at creation. Transitions happen via
// status-guarded pipeline updates in the actions, never document saves.
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

// Delete existing model to force recompilation in dev (HMR)
if (mongoose.models.DocumentRequest) {
  delete mongoose.models.DocumentRequest;
}

const DocumentRequest: Model<IDocumentRequest> =
  mongoose.model<IDocumentRequest>("DocumentRequest", documentRequestSchema);

export default DocumentRequest;
