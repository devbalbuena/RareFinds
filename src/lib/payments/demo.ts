import { PaymentMethod } from "@prisma/client";
import { CreatePaymentParams, PaymentProvider, PaymentResult } from "./types";
import { completeOrderPayment } from "./order-payment";
import { getPaymentMode } from "./mode";

export class DemoPaymentProvider implements PaymentProvider {
  constructor(public method: PaymentMethod) {}

  private isAllowed(): boolean {
    return getPaymentMode() === "demo";
  }

  async createPayment(order: CreatePaymentParams): Promise<PaymentResult> {
    if (!this.isAllowed()) {
      return {
        success: false,
        error: "Demo payments are disabled in the current configuration.",
      };
    }

    const demoRef = `DEMO-${this.method}-${order.orderNumber}-${Date.now()}`;

    return {
      success: true,
      paymentReference: demoRef,
      message: `Demo ${this.method} payment authorized. Order marked as paid.`,
    };
  }

  async markPaid(
    orderId: string,
    paymentReference?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isAllowed()) {
      return {
        success: false,
        error: "Demo payments are disabled in the current configuration.",
      };
    }

    const res = await completeOrderPayment(orderId, paymentReference, true);
    return {
      success: res.success,
      error: res.error,
    };
  }
}
