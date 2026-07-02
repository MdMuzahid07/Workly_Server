import AppError from "../error/AppError.js";

/**
 * P2 — BOLA (Broken Object-Level Authorization) ownership check.
 *
 * Throws 404, NOT 403, on mismatch. Returning 403 would confirm to the caller
 * that the record exists but they're not allowed — 404 reveals nothing.
 * This is consistent with OWASP API Security Top 10: API1:2023.
 *
 * Usage (after role check passes):
 *   assertOwnsOrThrow(job.postedById, req.user.id);
 *   assertOwnsOrThrow(application.applicantId, req.user.id, application.job.companyId, req.user.companyId);
 *
 * Business rules pending confirmation (Q2 / Q3):
 *   Application (EMPLOYER): postedById match OR companyId match? — awaiting Q2 answer
 *   Job edit/delete: postedById only, or any company employee? — awaiting Q3 answer
 *
 * Models requiring assertOwnsOrThrow calls (add once Q2/Q3 are answered):
 *   Application, SavedJob, Resume, SavedCandidate, Conversation, Message,
 *   PushToken, UserSettings, Notification, Job (edit/delete), PaymentTransaction
 */
export function assertOwnsOrThrow(
  resourceOwnerId: string,
  requestUserId: string,
  resourceCompanyId?: string | null,
  requestUserCompanyId?: string | null,
): void {
  const ownerMatch = resourceOwnerId === requestUserId;

  // Company-level match: only considered when BOTH sides have a companyId.
  // Prevents a null/null match from accidentally authorising a request.
  const companyMatch =
    resourceCompanyId != null &&
    requestUserCompanyId != null &&
    resourceCompanyId === requestUserCompanyId;

  if (!ownerMatch && !companyMatch) {
    // 404 — never confirm the record exists to an unauthorised caller
    throw new AppError(404, "Resource not found");
  }
}
