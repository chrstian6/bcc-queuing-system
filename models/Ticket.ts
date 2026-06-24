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

export interface IStatusTracking {
  status: string;
  timestamp: Date;
  changedBy?: string;
}

export interface ITicket extends Document {
  ticketNumber: string;
  ticketId: string;
  transactionType: string;
  department: string;
  status: "pending" | "serving" | "completed" | "cancelled";
  student: IStudent;
  requester: IRequester;
  guardian?: IGuardian;
  assignedTo?: string;
  servedBy?: string;
  servingWindow?: string;
  // Time tracking
  createdAt: Date;
  updatedAt: Date;
  servedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  // Status history for tracking
  statusHistory: IStatusTracking[];
  // Queue metrics
  waitTime?: number;
  serviceTime?: number;
  totalTime?: number;
}

const VALID_TRANSACTION_TYPES = [
  "tor",
  "coe",
  "request-grades",
  "enrollment-fees",
  "assessment",
  "exam-fees",
  "payments",
  "certificate",
];

const StatusTrackingSchema = new mongoose.Schema<IStatusTracking>(
  {
    status: {
      type: String,
      enum: ["pending", "serving", "completed", "cancelled"],
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
        values: VALID_TRANSACTION_TYPES,
        message: "{VALUE} is not a valid transaction type",
      },
      required: [true, "Transaction type is required"],
    },
    department: {
      type: String,
      enum: ["registrar", "dean", "dsdw", "cashier", "general"],
      default: "general",
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "serving", "completed", "cancelled"],
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
    // Status history tracking
    statusHistory: {
      type: [StatusTrackingSchema],
      default: [],
    },
    // Time tracking timestamps
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
    // Queue metrics (calculated)
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

// Indexes for efficient queries
ticketSchema.index({ ticketNumber: 1 });
ticketSchema.index({ status: 1, createdAt: 1 });
ticketSchema.index({ transactionType: 1, createdAt: 1 });
ticketSchema.index({ "student.schoolId": 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ status: 1, ticketNumber: 1 });
ticketSchema.index({ department: 1, status: 1, createdAt: 1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ servedBy: 1, createdAt: 1 });

// Pre-save hook to track status changes
ticketSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    // Add to status history
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      changedBy: "system",
    });

    // Set timestamps based on status
    const now = new Date();
    if (this.status === "serving") {
      this.servedAt = now;
      // Calculate wait time
      if (this.createdAt) {
        this.waitTime = Math.round(
          (now.getTime() - this.createdAt.getTime()) / 1000,
        );
      }
    } else if (this.status === "completed") {
      this.completedAt = now;
      // Calculate service time
      if (this.servedAt) {
        this.serviceTime = Math.round(
          (now.getTime() - this.servedAt.getTime()) / 1000,
        );
      }
      // Calculate total time
      if (this.createdAt) {
        this.totalTime = Math.round(
          (now.getTime() - this.createdAt.getTime()) / 1000,
        );
      }
    } else if (this.status === "cancelled") {
      this.cancelledAt = now;
      // Calculate total time if cancelled
      if (this.createdAt) {
        this.totalTime = Math.round(
          (now.getTime() - this.createdAt.getTime()) / 1000,
        );
      }
    }
  }
});

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

// Virtual for formatted wait time
ticketSchema.virtual("formattedWaitTime").get(function () {
  if (!this.waitTime) return "N/A";
  const minutes = Math.floor(this.waitTime / 60);
  const seconds = this.waitTime % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
});

// Virtual for formatted service time
ticketSchema.virtual("formattedServiceTime").get(function () {
  if (!this.serviceTime) return "N/A";
  const minutes = Math.floor(this.serviceTime / 60);
  const seconds = this.serviceTime % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
});

// Virtual for formatted total time
ticketSchema.virtual("formattedTotalTime").get(function () {
  if (!this.totalTime) return "N/A";
  const minutes = Math.floor(this.totalTime / 60);
  const seconds = this.totalTime % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
});

// Virtual for current status duration
ticketSchema.virtual("currentStatusDuration").get(function () {
  const lastStatus = this.statusHistory[this.statusHistory.length - 1];
  if (!lastStatus) return 0;
  return Math.round((Date.now() - lastStatus.timestamp.getTime()) / 1000);
});

// Ensure virtuals are included in JSON
ticketSchema.set("toJSON", { virtuals: true });
ticketSchema.set("toObject", { virtuals: true });

// Delete existing model to force recompilation
if (mongoose.models.Ticket) {
  delete mongoose.models.Ticket;
}

const Ticket: Model<ITicket> = mongoose.model<ITicket>("Ticket", ticketSchema);

export default Ticket;
