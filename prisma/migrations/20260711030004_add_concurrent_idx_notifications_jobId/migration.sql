-- @transaction - false
CREATE INDEX CONCURRENTLY "notifications_jobId_idx" ON "notifications"("jobId");
