export function normalizeIsraeliPhoneForWhatsApp(input: string): string {
  const digits = input.replace(/\D/g, "");

  if (/^05\d{8}$/.test(digits)) {
    return `972${digits.slice(1)}`;
  }

  if (/^9725\d{8}$/.test(digits)) {
    return digits;
  }

  throw new Error("Invalid Israeli mobile phone number");
}
