// models/User.ts
import mongoose, { Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

// Role enum as numbers
export enum UserRole {
  ADMIN = 1,
  STUDENT = 2,
}

export interface IUser extends Document {
  email: string;
  password: string;
  role: UserRole;
  name?: string;
  // Student profile fields (role STUDENT only; admins leave them unset)
  schoolId?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  suffix?: string;
  year?: string;
  campus?: string;
  contactNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't return password by default
    },
    role: {
      type: Number,
      enum: [UserRole.ADMIN, UserRole.STUDENT],
      default: UserRole.STUDENT,
      required: [true, "Role is required"],
    },
    name: {
      type: String,
      trim: true,
    },
    // Student profile — sparse unique so admin docs without schoolId don't collide
    schoolId: {
      type: String,
      trim: true,
      index: { unique: true, sparse: true },
    },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    middleName: { type: String, trim: true, default: "" },
    suffix: { type: String, trim: true, default: "" },
    year: { type: String, trim: true },
    campus: { type: String, trim: true },
    contactNumber: { type: String, trim: true, default: "" },
  },
  {
    timestamps: true,
  },
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return;

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error: any) {}
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

// Prevent duplicate model creation in development
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;
