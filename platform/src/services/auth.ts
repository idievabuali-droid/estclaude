/**
 * Auth service — currently mocks Telegram Bot OTP flow.
 * When wired: sends OTP via Telegram bot, verifies, sets a Supabase
 * session cookie. The page-level UI calls these functions and gets
 * back success/error without caring how the OTP was delivered.
 */

export type OTPRequest = { phone: string };
export type OTPVerify = { phone: string; code: string };

export async function requestOtp({ phone }: OTPRequest): Promise<{
  ok: boolean;
  channel: 'telegram' | 'sms';
  error?: string;
}> {
  // Basic E.164 sanity check
  const clean = phone.replace(/[^0-9+]/g, '');
  if (!/^\+992\d{9}$/.test(clean)) {
    return { ok: false, channel: 'telegram', error: 'Введите номер +992 и 9 цифр' };
  }
  // SPEC-GAP: real Telegram bot integration deferred — for now the UI
  // shows the user a "code sent" toast and accepts any 6-digit code.
  return { ok: true, channel: 'telegram' };
}

export async function verifyOtp({ phone, code }: OTPVerify): Promise<{
  ok: boolean;
  userId?: string;
  error?: string;
}> {
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: 'Код должен быть из 6 цифр' };
  }
  // SPEC-GAP: real verification + session set deferred to Supabase wiring.
  return { ok: true, userId: `mock-${phone.slice(-9)}` };
}

export async function getCurrentUserPhone(): Promise<string | null> {
  // SPEC-GAP: returns null until Supabase auth is wired.
  return null;
}
