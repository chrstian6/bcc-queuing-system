// models/Ticket.ts
import mongoose, { Document, Model } from "mongoose";

export interface IStudent {
  schoolId: string;
  firstName: string;
  lastName: string;
  middleName: string;
  suffix: string;
  year: string;
  section: string;
}

export interface IRequester {
  type: "student" | "guardian";
  email: string;
  contactNumber: string;
}

export interface IGuardian {
  firstName: string;
  lastName: string;
  middleName: string;
  relationship: string;
}

export interface ITicket extends Document {
  ticketNumber: string; // Queue position: "001", "002", "003", etc.
  ticketId: string; // Unique ID: "BCC-20240617-001"
  transactionType: "certificate" | "tor" | "grades" | "assessment";
  status: "pending" | "serving" | "completed" | "cancelled";
  student: IStudent;
  requester: IRequester;
  guardian?: IGuardian;
  servedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new mongoose.Schema<ITicket>(
  {
    ticketNumber: {
      type: String,
      required: [true, "Ticket number is required"],
      index: true,
    },
    ticketId: {
      type: String,
      required: [true, "Ticket ID is required"],
      unique: true,
    },
    transactionType: {
      type: String,
      enum: {
        values: ["certificate", "tor", "grades", "assessment"],
        message: "{VALUE} is not a valid transaction type",
      },
      required: [true, "Transaction type is required"],
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "serving", "completed", "cancelled"],
        message: "{VALUE} is not a valid status",
      },
      default: "pending",
    },
    student: {
      schoolId: {
        type: String,
        required: [true, "School ID is required"],
        trim: true,
      },
      firstName: {
        type: String,
        required: [true, "First name is required"],
        trim: true,
      },
      lastName: {
        type: String,
        required: [true, "Last name is required"],
        trim: true,
      },
      middleName: {
        type: String,
        default: "",
        trim: true,
      },
      suffix: {
        type: String,
        default: "",
        trim: true,
      },
      year: {
        type: String,
        required: [true, "Year level is required"],
      },
      section: {
        type: String,
        required: [true, "Section is required"],
      },
    },
    requester: {
      type: {
        type: String,
        enum: ["student", "guardian"],
        required: [true, "Requester type is required"],
      },
      email: {
        type: String,
        default: "",
        trim: true,
        lowercase: true,
      },
      contactNumber: {
        type: String,
        default: "",
        trim: true,
      },
    },
    guardian: {
      firstName: {
        type: String,
        default: "",
        trim: true,
      },
      lastName: {
        type: String,
        default: "",
        trim: true,
      },
      middleName: {
        type: String,
        default: "",
        trim: true,
      },
      relationship: {
        type: String,
        default: "",
        trim: true,
      },
    },
    servedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient queries
ticketSchema.index({ ticketNumber: 1 });
ticketSchema.index({ ticketId: 1 }, { unique: true });
ticketSchema.index({ status: 1, createdAt: 1 });
ticketSchema.index({ transactionType: 1, createdAt: 1 });
ticketSchema.index({ "student.schoolId": 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ status: 1, ticketNumber: 1 });

// Virtual for full name
ticketSchema.virtual("student.fullName").get(function () {
  const { firstName, middleName, lastName, suffix } = this.student;
  let fullName = `${firstName} ${middleName ? middleName + " " : ""}${lastName}`;
  if (suffix) fullName += ` ${suffix}`;
  return fullName.trim();
});

// Virtual for guardian full name
ticketSchema.virtual("guardian.fullName").get(function () {
  if (!this.guardian) return "";
  const { firstName, middleName, lastName } = this.guardian;
  return `${firstName} ${middleName ? middleName + " " : ""}${lastName}`.trim();
});

// Ensure virtuals are included in JSON
ticketSchema.set("toJSON", { virtuals: true });
ticketSchema.set("toObject", { virtuals: true });

// Prevent duplicate model creation in development
const Ticket: Model<ITicket> =
  mongoose.models.Ticket || mongoose.model<ITicket>("Ticket", ticketSchema);

export default Ticket;
