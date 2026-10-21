import { PaymentMethod } from "@prisma/client";
import { PaymentProvider } from "./types";
import { CodPaymentProvider } from "./cod";
import { DemoPaymentProvider } from "./demo";

export * from "./types";
export * from "./order-payment";
export * from "./mode";
export * from "./demo";

const codProvider = new CodPaymentProvider();
const demoGcashProvider = new DemoPaymentProvider(PaymentMethod.GCASH);
const demoMayaProvider = new DemoPaymentProvider(PaymentMethod.MAYA);
const demoCardProvider = new DemoPaymentProvider(PaymentMethod.CARD);
const demoTestProvider = new DemoPaymentProvider(PaymentMethod.TEST);

export function getPaymentProvider(method: PaymentMethod): PaymentProvider {
  switch (method) {
    case PaymentMethod.COD:
      return codProvider;
    case PaymentMethod.GCASH:
      return demoGcashProvider;
    case PaymentMethod.MAYA:
      return demoMayaProvider;
    case PaymentMethod.CARD:
      return demoCardProvider;
    case PaymentMethod.TEST:
      return demoTestProvider;
    default:
      throw new Error(`Unsupported payment method: ${method}`);
  }
}
