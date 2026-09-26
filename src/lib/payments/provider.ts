/**
 * Provider-agnostic payment interface. All amounts are in KOBO; adapters
 * convert to whatever unit their gateway uses.
 */

export type PaymentKind = "nikah" | "donation";

export interface PaymentMetadata {
  /** Which table the webhook should settle. */
  kind: PaymentKind;
  /** NikahBooking.id or Donation.id. */
  id: string;
  /** Donation purpose or "nikah". */
  purpose?: string;
  /** Optional payer details some gateways require (ServiceFabric). */
  payerName?: string;
  payerPhone?: string;
  narration?: string;
  [key: string]: unknown;
}

export interface InitializeInput {
  amountKobo: number;
  email: string;
  /** Our unique reference (see makeReference). */
  reference: string;
  /** Absolute URL the gateway redirects back to after checkout. */
  callbackUrl: string;
  metadata: PaymentMetadata;
  /** Paystack plan code for recurring (monthly) giving. */
  plan?: string;
}

export interface InitializeResult {
  /** Hosted checkout URL: redirect the payer here. */
  authorizationUrl: string;
  accessCode?: string;
  /** Gateway-side id when it differs from our reference (ServiceFabric payref). Store it. */
  providerRef?: string;
}

export type VerifyStatus = "success" | "failed" | "pending";

export interface VerifyResult {
  status: VerifyStatus;
  amountKobo: number;
  channel?: string;
  paidAt?: Date;
  raw: unknown;
}

export type ProviderId = "PAYSTACK" | "SERVICEFABRIC";

export interface PaymentProvider {
  /** Matches the Prisma `PaymentProvider` enum value to store on Payment/Donation. */
  readonly id: ProviderId;
  initialize(input: InitializeInput): Promise<InitializeResult>;
  /**
   * Verify a transaction. Paystack: pass our reference. ServiceFabric: pass
   * the `providerRef` returned by initialize.
   */
  verify(reference: string): Promise<VerifyResult>;
}

export class PaymentConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentConfigError";
  }
}

export class PaymentGatewayError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "PaymentGatewayError";
  }
}
