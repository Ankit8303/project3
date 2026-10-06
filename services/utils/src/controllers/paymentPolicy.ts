export type PaymentProvider = "stripe" | "demo";

export function getPaymentMode(value: string | undefined): PaymentProvider {
  return value === "demo" ? "demo" : "stripe";
}

export function parseDemoSession(sessionId: string): string | null {
  const match = /^demo_session_([a-f\d]{24})_[0-9a-f-]+$/i.exec(sessionId);
  return match?.[1] ?? null;
}

export function amountsMatch(expected: number, receivedMinorUnits: number, currency: string, expectedCurrency = "INR"): boolean {
  return Math.round(expected * 100) === Math.round(receivedMinorUnits) && currency.toUpperCase() === expectedCurrency.toUpperCase();
}
