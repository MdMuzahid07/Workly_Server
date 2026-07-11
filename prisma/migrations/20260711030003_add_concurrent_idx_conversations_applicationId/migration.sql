-- @transaction - false
CREATE INDEX CONCURRENTLY "conversations_applicationId_idx" ON "conversations"("applicationId");
