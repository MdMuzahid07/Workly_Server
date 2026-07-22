import { PaymentCategory } from '../../../generated/prisma/index.js';

export interface InitiatePaymentPayload {
  planId: string;
  category: PaymentCategory;
  currency: string;
  cusName: string;
  cusEmail: string;
  cusPhone: string;
  cusAdd1?: string;
  cusCity?: string;
  cusPostcode?: string;
  cusCountry?: string;
  frontendUrl?: string;
  backendUrl?: string;
  paymentChannel?: string;
}
