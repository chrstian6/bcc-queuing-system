import connectDB from "@/lib/mongodb";
import mongoose, { Schema } from "mongoose";

interface IdempotencyDoc {
  key: string;
  status: "pending" | "completed";
  response?: unknown;
  expiresAt: Date;
}

const IdempotencySchema = new Schema<IdempotencyDoc>({
  key: { type: String, required: true, unique: true },
  status: { type: String, required: true, enum: ["pending", "completed"] },
  response: { type: Schema.Types.Mixed },
  expiresAt: { type: Date, required: true },
});

IdempotencySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const IdempotencyModel =
  mongoose.models.IdempotencyKey ||
  mongoose.model<IdempotencyDoc>("IdempotencyKey", IdempotencySchema);

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h covers a delayed retry/resubmit

export class IdempotencyConflictError extends Error {
  constructor() {
    super("This request is already being processed.");
    this.name = "IdempotencyConflictError";
  }
}

/**
 * Runs `fn` exactly once per key. A retried/duplicated call (double
 * click, client retry after a timeout) returns the original result
 * instead of re-running the side effect.
 */
export async function withIdempotency<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  await connectDB();

  const expiresAt = new Date(Date.now() + ttlMs);

  let claimed = false;
  try {
    await IdempotencyModel.create({ key, status: "pending", expiresAt });
    claimed = true;
  } catch (error: any) {
    if (error.code !== 11000) throw error; // not a duplicate-key error
  }

  if (!claimed) {
    const existing = await IdempotencyModel.findOne({
      key,
    }).lean<IdempotencyDoc>();

    if (!existing) {
      // Expired/cleaned up between our failed insert and this read.
      return withIdempotency(key, fn, ttlMs);
    }
    if (existing.status === "completed") {
      return existing.response as T;
    }
    throw new IdempotencyConflictError(); // still in flight
  }

  try {
    const result = await fn();
    await IdempotencyModel.updateOne(
      { key },
      { $set: { status: "completed", response: result } },
    );
    return result;
  } catch (error) {
    // Don't leave a dangling "pending" row blocking future retries.
    await IdempotencyModel.deleteOne({ key, status: "pending" });
    throw error;
  }
}
