-- @transaction - false
CREATE INDEX CONCURRENTLY "subscriptions_planId_idx" ON "subscriptions"("planId");
