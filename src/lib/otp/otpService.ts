// مسیر: src/lib/otp/otpService.ts
// این فایل را به‌طور کامل جایگزین فایل فعلی کنید

import { supabaseAdmin } from "@/lib/supabase-admin";

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 2);
const OTP_RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);

function generateSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * یک کد تایید جدید برای شماره داده‌شده می‌سازد و در دیتابیس ذخیره می‌کند.
 * اگر کاربر در بازه‌ی Cooldown درخواست تکراری بدهد، خطا می‌دهد.
 */
export async function createOtp(
  phoneNumber: string
): Promise<{ success: true; code: string } | { success: false; error: string }> {
  // 🟢 بررسی صحت اتصال Supabase Admin پیش از هر کاری — اگر env خالی باشد همینجا مشخص می‌شود
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Supabase Admin env variables are missing!");
    return {
      success: false,
      error:
        process.env.NODE_ENV !== "production"
          ? "خطا در تولید کد تایید [DEBUG: متغیرهای NEXT_PUBLIC_SUPABASE_URL یا SUPABASE_SERVICE_ROLE_KEY در .env.local خالی هستند — سرور را ری‌استارت کنید]"
          : "خطا در تولید کد تایید",
    };
  }

  const { data: lastOtp } = await supabaseAdmin
    .from("otp_codes")
    .select("createdAt")
    .eq("phoneNumber", phoneNumber)
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastOtp) {
    const secondsSinceLast = (Date.now() - new Date(lastOtp.createdAt).getTime()) / 1000;
    if (secondsSinceLast < OTP_RESEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast);
      return { success: false, error: `لطفا ${wait} ثانیه دیگر مجددا تلاش کنید` };
    }
  }

  const code = generateSixDigitCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from("otp_codes")
    .insert([{ phoneNumber, code, expiresAt, isUsed: false }]);

  if (error) {
    console.error("Create OTP Error:", error);
    // 🟢 در حالت توسعه، پیام دقیق Supabase را هم برمی‌گردانیم تا علت واقعی مشخص شود
    const debugSuffix =
      process.env.NODE_ENV !== "production"
        ? ` [DEBUG: ${error.message}${error.hint ? " | hint: " + error.hint : ""}${
            error.code ? " | code: " + error.code : ""
          }]`
        : "";
    return { success: false, error: "خطا در تولید کد تایید" + debugSuffix };
  }

  return { success: true, code };
}

/**
 * اعتبار کد تایید را چک می‌کند (بدون مصرف کردن آن) — چون در جریان ثبت‌نام،
 * یک کد در دو مرحله (verify-otp و سپس register) دوباره بررسی می‌شود.
 */
export async function isOtpValid(phoneNumber: string, code: string): Promise<boolean> {
  if (!phoneNumber || !code) return false;

  const { data, error } = await supabaseAdmin
    .from("otp_codes")
    .select("expiresAt")
    .eq("phoneNumber", phoneNumber)
    .eq("code", code)
    .eq("isUsed", false)
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("isOtpValid Error:", error);
  }

  if (!data) return false;
  return new Date(data.expiresAt).getTime() > Date.now();
}

/**
 * کد تایید را به‌عنوان مصرف‌شده علامت می‌زند — فقط بعد از تکمیل قطعی
 * فرآیند (ورود موفق یا ثبت‌نام موفق) باید صدا زده شود.
 */
export async function consumeOtp(phoneNumber: string, code: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("otp_codes")
    .update({ isUsed: true })
    .eq("phoneNumber", phoneNumber)
    .eq("code", code);

  if (error) {
    console.error("consumeOtp Error:", error);
  }
}