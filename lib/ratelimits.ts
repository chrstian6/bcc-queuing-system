import connectDB from "@/lib/mongodb";
import mongoose, { Schema } from "mongoose";

interface RateLimitDoc {
  key: string;
  windowStart: Date;
  count: number;
  expiresAt: Date;
}

const RateLimitSchema = new Schema<RateLimitDoc>({
  key: { type: String, required: true },
  windowStart: { type: Date, required: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
});

RateLimitSchema.index({ key: 1, windowStart: 1 }, { unique: true });
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto-cleanup

const RateLimitModel =
  mongoose.models.RateLimit ||
  mongoose.model<RateLimitDoc>("RateLimit", RateLimitSchema);

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Fixed-window rate limiter backed by Mongo. Safe across Vercel's
 * stateless function instances, unlike an in-memory counter.
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  await connectDB();

  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs);
  const key = `${action}:${identifier}`;

  const doc = await RateLimitModel.findOneAndUpdate(
    { key, windowStart },
    { $inc: { count: 1 }, $setOnInsert: { key, windowStart, expiresAt } },
    { upsert: true, returnDocument: "after" },
  ).lean<RateLimitDoc>();

  const count = doc?.count ?? 1;
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: expiresAt,
  };
}

/**
 * Best-effort client IP for server actions, which don't expose a raw
 * `req`. Falls back to a shared bucket if headers are missing (e.g.
 * local dev without a proxy in front).
 */
export function getClientIp(headersList: Headers): string {
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headersList.get("x-real-ip") ?? "unknown";
}
