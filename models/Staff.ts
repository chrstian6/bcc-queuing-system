// models/Staff.ts
import mongoose, { Document, Model } from "mongoose";

export interface IStaff extends Document {
  staffId: string;
  facultyId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleName: string;
  roleAccessLevel: number;
  cashierWindow: string;
  status: "active" | "inactive" | "suspended";
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const staffSchema = new mongoose.Schema<IStaff>(
  {
    staffId: {
      type: String,
      required: [true, "Staff ID is required"],
      unique: true,
    },
    facultyId: {
      type: String,
      required: [true, "Faculty ID is required"],
      unique: true,
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
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@bcc\.edu\.ph$/, "Must be a valid BCC email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    roleName: {
      type: String,
      required: [true, "Role name is required"],
      enum: ["registrar", "dean", "dsdw", "cashier"],
    },
    roleAccessLevel: {
      type: Number,
      default: 6,
      min: 1,
      max: 10,
    },
    cashierWindow: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

// Generate staff ID before saving
staffSchema.pre("save", async function (next) {
  if (this.isNew) {
    const count = await mongoose.model("Staff").countDocuments();
    this.staffId = `STF-${String(count + 1).padStart(4, "0")}`;
  }
});

// Hash password before saving
staffSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return;
  try {
    const bcrypt = await import("bcryptjs");
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error: any) {
    throw error;
  }
});

// Compare password method
staffSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  try {
    const bcrypt = await import("bcryptjs");
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

// Prevent duplicate model creation in development
const Staff: Model<IStaff> =
  mongoose.models.Staff || mongoose.model<IStaff>("Staff", staffSchema);

export default Staff;
