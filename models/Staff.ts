// models/Staff.ts
import mongoose, { Document, Model } from "mongoose";
import crypto from "crypto";
import bcrypt from "bcryptjs";

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
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const staffSchema = new mongoose.Schema<IStaff>(
  {
    staffId: {
      type: String,
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
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
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
    mustChangePassword: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Generate unique random staff ID
function generateStaffId(): string {
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const randomBytes = crypto
    .randomBytes(4)
    .toString("hex")
    .slice(0, 4)
    .toUpperCase();
  return `STF-${timestamp}${randomBytes}`;
}

// Generate staff ID before saving with uniqueness check
staffSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      let isUnique = false;
      let staffId = "";
      let attempts = 0;
      const maxAttempts = 10;

      while (!isUnique && attempts < maxAttempts) {
        staffId = generateStaffId();
        const existing = await mongoose.model("Staff").findOne({ staffId });
        if (!existing) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        return new Error("Failed to generate unique staff ID");
      }

      this.staffId = staffId;
    } catch (error: any) {
      return new Error("Failed to generate unique staff ID");
    }
  } else {
  }
});

// Hash password before saving
staffSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return;

  try {
    if (this.password.startsWith("$2")) {
      return;
    }

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error: any) {
    return new Error("Failed to hash password");
  }
});

// Compare password method
staffSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  try {
    if (this.password.startsWith("$2")) {
      return await bcrypt.compare(candidatePassword, this.password);
    }

    return candidatePassword === this.password;
  } catch (error) {
    console.error("Password comparison error:", error);
    return candidatePassword === this.password;
  }
};

// Delete existing model to force recompilation
if (mongoose.models.Staff) {
  delete mongoose.models.Staff;
}

const Staff: Model<IStaff> = mongoose.model<IStaff>("Staff", staffSchema);

export default Staff;
