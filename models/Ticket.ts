// models/Ticket.ts
import mongoose, { Document, Model } from "mongoose";
import {
  YearLevel,
  Campus,
  TransactionType,
  TicketStatus,
  Department,
  RequesterType,
  Relationship,
  Suffix,
  VALID_TRANSACTION_TYPES,
  VALID_STATUSES,
  VALID_DEPARTMENTS,
  VALID_REQUESTER_TYPES,
  VALID_RELATIONSHIPS,
  VALID_SUFFIXES,
} from "@/types/ticket";

export interface IStudent {
  schoolId: string;
  firstName: string;
  lastName: string;
  middleName: string;
  suffix: Suffix | "";
  year: YearLevel;
  campus: Campus;
}

export interface IRequester {
  type: RequesterType;
  email: string;
  contactNumber: string;
}

export interface IGuardian {
  firstName: string;
  lastName: string;
  middleName: string;
  relationship: Relationship | "";
}

export interface IStatusTracking {
  status: TicketStatus;
  timestamp: Date;
  changedBy?: string;
}

export interface ITicket extends Document {
  ticketNumber: string;
  ticketId: string;
  transactionType: TransactionType;
  transactionDescription?: string;
  amount: number;
  department: Department;
  status: TicketStatus;
  student: IStudent;
  requester: IRequester;
  guardian?: IGuardian;
  assignedTo?: string;
  servedBy?: string;
  servingWindow?: string;
  createdAt: Date;
  updatedAt: Date;
  servedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  statusHistory: IStatusTracking[];
  waitTime?: number;
  serviceTime?: number;
  totalTime?: number;
}

const StatusTrackingSchema = new mongoose.Schema<IStatusTracking>(
  {
    status: {
      type: String,
      enum: [...VALID_STATUSES],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: String,
      default: "",
    },
  },
  { _id: false },
);

const ticketSchema = new mongoose.Schema<ITicket>(
  {
    ticketNumber: {
      type: String,
      required: [true, "Ticket number is required"],
    },
    ticketId: {
      type: String,
      required: [true, "Ticket ID is required"],
      unique: true,
    },
    transactionType: {
      type: String,
      enum: {
        values: [...VALID_TRANSACTION_TYPES],
        message: "{VALUE} is not a valid transaction type",
      },
      required: [true, "Transaction type is required"],
    },
    transactionDescription: {
      type: String,
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
      validate: {
        validator: function (this: any, value: string) {
          const transactionType = (this as any).transactionType;
          if (
            transactionType === "other-school-fees" &&
            (!value || value.trim().length === 0)
          ) {
            return false;
          }
          return true;
        },
        message: "Description is required for Other School Fees",
      },
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
      max: [999999999999, "Amount exceeds maximum limit"],
      validate: {
        validator: function (value: number) {
          return /^\d+(\.\d{1,2})?$/.test(value.toString());
        },
        message: "Amount must be a valid decimal with up to 2 decimal places",
      },
    },
    department: {
      type: String,
      enum: [...VALID_DEPARTMENTS],
      default: "cashier",
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: [...VALID_STATUSES],
        message: "{VALUE} is not a valid status",
      },
      default: "pending",
    },
    assignedTo: {
      type: String,
      default: null,
      index: true,
    },
    servedBy: {
      type: String,
      default: null,
      index: true,
    },
    servingWindow: {
      type: String,
      default: null,
    },
    student: {
      schoolId: {
        type: String,
        default: "",
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
        enum: [...VALID_SUFFIXES],
        default: "",
      },
      year: {
        type: String,
        required: [true, "Year level is required"],
      },
      campus: {
        type: String,
        required: [true, "Campus is required"],
      },
    },
    requester: {
      type: {
        type: String,
        enum: [...VALID_REQUESTER_TYPES],
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
      type: {
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
          enum: [...VALID_RELATIONSHIPS, ""],
          default: "",
        },
      },
      default: undefined,
    },
    statusHistory: {
      type: [StatusTrackingSchema],
      default: [],
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
    waitTime: {
      type: Number,
      default: null,
    },
    serviceTime: {
      type: Number,
      default: null,
    },
    totalTime: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
ticketSchema.index({ ticketNumber: 1 });
ticketSchema.index({ status: 1, createdAt: 1 });
ticketSchema.index({ transactionType: 1, createdAt: 1 });
ticketSchema.index({ "student.schoolId": 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ status: 1, ticketNumber: 1 });
ticketSchema.index({ department: 1, status: 1, createdAt: 1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ servedBy: 1, createdAt: 1 });

// Virtual for formatted amount
ticketSchema.virtual("formattedAmount").get(function () {
  const doc = this as unknown as ITicket;
  if (!doc.amount) return "₱0.00";
  return `₱${doc.amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
});

// Pre-save hook
ticketSchema.pre("save", function (next) {
  const doc = this as unknown as ITicket;

  if (doc.isModified("status")) {
    doc.statusHistory.push({
      status: doc.status,
      timestamp: new Date(),
      changedBy: "system",
    });

    const now = new Date();
    if (doc.status === "serving") {
      doc.servedAt = now;
      if (doc.createdAt) {
        doc.waitTime = Math.round(
          (now.getTime() - doc.createdAt.getTime()) / 1000,
        );
      }
    } else if (doc.status === "completed") {
      doc.completedAt = now;
      if (doc.servedAt) {
        doc.serviceTime = Math.round(
          (now.getTime() - doc.servedAt.getTime()) / 1000,
        );
      }
      if (doc.createdAt) {
        doc.totalTime = Math.round(
          (now.getTime() - doc.createdAt.getTime()) / 1000,
        );
      }
    } else if (doc.status === "cancelled") {
      doc.cancelledAt = now;
      if (doc.createdAt) {
        doc.totalTime = Math.round(
          (now.getTime() - doc.createdAt.getTime()) / 1000,
        );
      }
    }
  }
});

// Virtuals
ticketSchema.virtual("student.fullName").get(function () {
  const doc = this as unknown as ITicket;
  const { firstName, middleName, lastName, suffix } = doc.student;
  let fullName = `${firstName} ${middleName ? middleName + " " : ""}${lastName}`;
  if (suffix) fullName += ` ${suffix}`;
  return fullName.trim();
});

ticketSchema.virtual("guardian.fullName").get(function () {
  const doc = this as unknown as ITicket;
  if (!doc.guardian) return "";
  const { firstName, middleName, lastName } = doc.guardian;
  return `${firstName} ${middleName ? middleName + " " : ""}${lastName}`.trim();
});

ticketSchema.virtual("formattedWaitTime").get(function () {
  const doc = this as unknown as ITicket;
  if (!doc.waitTime) return "N/A";
  const minutes = Math.floor(doc.waitTime / 60);
  const seconds = doc.waitTime % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
});

ticketSchema.virtual("formattedServiceTime").get(function () {
  const doc = this as unknown as ITicket;
  if (!doc.serviceTime) return "N/A";
  const minutes = Math.floor(doc.serviceTime / 60);
  const seconds = doc.serviceTime % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
});

ticketSchema.virtual("formattedTotalTime").get(function () {
  const doc = this as unknown as ITicket;
  if (!doc.totalTime) return "N/A";
  const minutes = Math.floor(doc.totalTime / 60);
  const seconds = doc.totalTime % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
});

ticketSchema.virtual("currentStatusDuration").get(function () {
  const doc = this as unknown as ITicket;
  const lastStatus = doc.statusHistory[doc.statusHistory.length - 1];
  if (!lastStatus) return 0;
  return Math.round((Date.now() - lastStatus.timestamp.getTime()) / 1000);
});

ticketSchema.set("toJSON", { virtuals: true });
ticketSchema.set("toObject", { virtuals: true });

if (mongoose.models.Ticket) {
  delete mongoose.models.Ticket;
}

const Ticket: Model<ITicket> = mongoose.model<ITicket>("Ticket", ticketSchema);

export default Ticket;
