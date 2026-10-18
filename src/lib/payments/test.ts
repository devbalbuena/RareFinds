import { PaymentMethod } from "@prisma/client";
import { CreatePaymentParams, PaymentProvider, PaymentResult } from "./types";
import { completeOrderPayment } from "./order-payment";

export class TestPaymentProvider implements PaymentProvider {
  method = PaymentMethod.TEST;

  private isAllowed(): boolean {
    return (
      process.env.NODE_ENV !== "production" ||
      process.env.ENABLE_TEST_PAYMENTS === "true"
    );
  }

  async createPayment(order: CreatePaymentParams): Promise<PaymentResult> {
    if (!this.isAllowed()) {
      return {
        success: false,
        error: "Test payments are disabled in production environment.",
      };
    }

    const testRef = `TEST-${order.orderNumber}-${Date.now()}`;

    return {
      success: true,
      paymentReference: testRef,
      message: "Test payment order created. 15-minute reservation started.",
    };
  }

  async markPaid(
    orderId: string,
    paymentReference?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isAllowed()) {
      return {
        success: false,
        error: "Test payments are disabled in production environment.",
      };
    }

    const res = await completeOrderPayment(orderId, paymentReference);
    return {
      success: res.success,
      error: res.error,
    };
  }
}
