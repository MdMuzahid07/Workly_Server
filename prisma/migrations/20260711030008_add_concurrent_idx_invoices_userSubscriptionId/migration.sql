-- @transaction - false
CREATE INDEX CONCURRENTLY "invoices_userSubscriptionId_idx" ON "invoices"("userSubscriptionId");
