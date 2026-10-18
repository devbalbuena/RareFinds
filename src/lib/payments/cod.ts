import { PaymentMethod } from "@prisma/client";
import { CreatePaymentParams, PaymentProvider, PaymentResult } from "./types";
import { completeOrderPayment } from "./order-payment";

export class CodPaymentProvider implements PaymentProvider {
  method = PaymentMethod.COD;

  async createPayment(order: CreatePaymentParams): Promise<PaymentResult> {
    return {
      success: true,
      paymentReference: `COD-${order.orderNumber}`,
      message: "Cash on Delivery order confirmed. Sneaker allocated.",
    };
  }

  async markPaid(
    orderId: string,
    paymentReference?: string
  ): Promise<{ success: boolean; error?: string }> {
    const res = await completeOrderPayment(orderId, paymentReference || `COD-COLLECTED-${Date.now()}`);
    return {
      success: res.success,
      error: res.error,
    };
  }
}
