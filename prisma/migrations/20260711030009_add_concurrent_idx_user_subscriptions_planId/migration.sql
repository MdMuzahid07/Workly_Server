-- @transaction - false
CREATE INDEX CONCURRENTLY "user_subscriptions_planId_idx" ON "user_subscriptions"("planId");
