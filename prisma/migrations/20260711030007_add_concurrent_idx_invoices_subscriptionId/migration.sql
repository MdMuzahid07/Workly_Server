-- @transaction - false
CREATE INDEX CONCURRENTLY "invoices_subscriptionId_idx" ON "invoices"("subscriptionId");
