import { PaymentMethod } from "@prisma/client";
import { PaymentProvider } from "./types";
import { TestPaymentProvider } from "./test";
import { CodPaymentProvider } from "./cod";

export * from "./types";
export * from "./order-payment";

const testProvider = new TestPaymentProvider();
const codProvider = new CodPaymentProvider();

export function getPaymentProvider(method: PaymentMethod): PaymentProvider {
  switch (method) {
    case PaymentMethod.TEST:
      return testProvider;
    case PaymentMethod.COD:
      return codProvider;
    default:
      throw new Error(`Unsupported payment method: ${method}`);
  }
}
