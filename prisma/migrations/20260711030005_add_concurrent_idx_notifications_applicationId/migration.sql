-- @transaction - false
CREATE INDEX CONCURRENTLY "notifications_applicationId_idx" ON "notifications"("applicationId");
