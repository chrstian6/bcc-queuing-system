// models/SystemSetting.ts
import mongoose, { Schema, Model } from "mongoose";

export const SYSTEM_SETTINGS_ID = "global";

export interface ISystemSetting {
  _id: string;
  queueOpen: boolean;
  updatedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const SystemSettingSchema = new Schema(
  {
    _id: { type: String, required: true },
    queueOpen: { type: Boolean, default: true },
    updatedBy: { type: String, default: "" },
  },
  {
    timestamps: true,
    _id: false,
  },
);

const SystemSetting: Model<any> =
  mongoose.models?.SystemSetting ||
  mongoose.model("SystemSetting", SystemSettingSchema);

export default SystemSetting;
