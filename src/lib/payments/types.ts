import { PaymentMethod } from "@prisma/client";

export interface CreatePaymentParams {
  id: string;
  orderNumber: string;
  totalAmount: number;
  customerEmail: string;
  customerName: string;
  customerPhone?: string | null;
}

export interface PaymentResult {
  success: boolean;
  paymentReference?: string;
  checkoutUrl?: string; // Redirect URL for hosted checkout (e.g. PayMongo)
  requiresAction?: boolean;
  message?: string;
  error?: string;
}

export interface PaymentProvider {
  method: PaymentMethod;
  createPayment(order: CreatePaymentParams): Promise<PaymentResult>;
  markPaid(
    orderId: string,
    paymentReference?: string
  ): Promise<{ success: boolean; error?: string; message?: string; orderNumber?: string }>;
}
