// lib/ticketTransitions.ts
// Aggregation-pipeline update builders for ticket status transitions.
//
// The Ticket pre("save") hook maintains statusHistory and the wait/service
// time metrics, but every post-creation transition uses findOneAndUpdate,
// which bypasses document middleware — so those fields were never recorded.
// These pipeline updates compute them atomically inside the same
// status-guarded findOneAndUpdate. Requires MongoDB >= 5.0 ($dateDiff).

type PipelineStage = Record<string, unknown>;

function historyAppend(status: string, changedBy: string) {
  return {
    $concatArrays: [
      { $ifNull: ["$statusHistory", []] },
      [{ status, timestamp: "$$NOW", changedBy }],
    ],
  };
}

function secondsBetween(startExpr: unknown) {
  return {
    $dateDiff: { startDate: startExpr, endDate: "$$NOW", unit: "second" },
  };
}

/** pending → serving */
export function buildServingUpdate(staffId: string): PipelineStage[] {
  return [
    {
      $set: {
        status: "serving",
        servedBy: staffId,
        assignedTo: staffId,
        servedAt: "$$NOW",
        waitTime: secondsBetween("$createdAt"),
        statusHistory: historyAppend("serving", staffId),
      },
    },
  ];
}

/**
 * pending → serving, driven from the admin dashboard. Attribution stays with
 * the assigned counter staff (servedBy ← assignedTo) so per-cashier stats
 * count the serve; only the history entry records the admin.
 */
export function buildAdminServingUpdate(): PipelineStage[] {
  return [
    {
      $set: {
        status: "serving",
        servedBy: { $ifNull: ["$assignedTo", "$servedBy"] },
        servedAt: "$$NOW",
        waitTime: secondsBetween("$createdAt"),
        statusHistory: historyAppend("serving", "admin"),
      },
    },
  ];
}

/** serving → completed */
export function buildCompletedUpdate(changedBy: string): PipelineStage[] {
  return [
    {
      $set: {
        status: "completed",
        completedAt: "$$NOW",
        serviceTime: secondsBetween({ $ifNull: ["$servedAt", "$createdAt"] }),
        totalTime: secondsBetween("$createdAt"),
        statusHistory: historyAppend("completed", changedBy),
      },
    },
  ];
}

/** pending|serving → cancelled (also used for skip) */
export function buildCancelledUpdate(changedBy: string): PipelineStage[] {
  return [
    {
      $set: {
        status: "cancelled",
        cancelledAt: "$$NOW",
        totalTime: secondsBetween("$createdAt"),
        statusHistory: historyAppend("cancelled", changedBy),
      },
    },
  ];
}
