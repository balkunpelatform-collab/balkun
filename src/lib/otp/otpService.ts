// مسیر: src/lib/otp/otpService.ts
// این فایل را به‌طور کامل جایگزین فایل فعلی کنید

import { supabaseAdmin } from "@/lib/supabase-admin";

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 2);
const OTP_RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);

// 🔒 محدودیت‌های ضد اسپم و Brute-Force (فاز ۱۰ - بند ۲ سند فاز ۱۰: Rate Limiting)
const MAX_OTP_PER_PHONE_PER_HOUR = Number(process.env.MAX_OTP_PER_PHONE_PER_HOUR || 5);
const MAX_OTP_PER_IP_PER_WINDOW = Number(process.env.MAX_OTP_PER_IP_PER_WINDOW || 8);
const IP_WINDOW_MINUTES = Number(process.env.OTP_IP_WINDOW_MINUTES || 30);
const MAX_VERIFY_ATTEMPTS = Number(process.env.MAX_OTP_VERIFY_ATTEMPTS || 5);

function generateSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * یک کد تایید جدید برای شماره داده‌شده می‌سازد و در دیتابیس ذخیره می‌کند.
 * سه لایه محافظتی دارد: کول‌داون بین دو درخواست، سقف ساعتی به‌ازای شماره،
 * و سقف بازه‌ای به‌ازای IP (برای جلوگیری از اسپم روی چند شماره مختلف).
 */
export async function createOtp(
  phoneNumber: string,
  ipAddress: string | null
): Promise<{ success: true; code: string } | { success: false; error: string }> {
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

  // ۱. کول‌داون بین دو درخواست متوالی برای همین شماره
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

  // ۲. سقف تعداد درخواست در ساعت برای همین شماره موبایل (ضد اسپم پیامکی)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: phoneCount, error: phoneCountError } = await supabaseAdmin
    .from("otp_codes")
    .select("id", { count: "exact", head: true })
    .eq("phoneNumber", phoneNumber)
    .gte("createdAt", oneHourAgo);

  if (phoneCountError) {
    console.error("OTP phone rate-check error:", phoneCountError);
  } else if ((phoneCount || 0) >= MAX_OTP_PER_PHONE_PER_HOUR) {
    return {
      success: false,
      error: "تعداد درخواست کد تایید برای این شماره بیش از حد مجاز است. لطفا یک ساعت دیگر تلاش کنید",
    };
  }

  // ۳. سقف تعداد درخواست در بازه زمانی برای همین IP (جلوگیری از اسپم روی چند شماره مختلف)
  if (ipAddress) {
    const ipWindowStart = new Date(Date.now() - IP_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count: ipCount, error: ipCountError } = await supabaseAdmin
      .from("otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("ipAddress", ipAddress)
      .gte("createdAt", ipWindowStart);

    if (ipCountError) {
      console.error("OTP IP rate-check error:", ipCountError);
    } else if ((ipCount || 0) >= MAX_OTP_PER_IP_PER_WINDOW) {
      return {
        success: false,
        error: "تعداد درخواست از این دستگاه بیش از حد مجاز است. کمی بعد دوباره تلاش کنید",
      };
    }
  }

  const code = generateSixDigitCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from("otp_codes")
    .insert([{ phoneNumber, code, expiresAt, isUsed: false, ipAddress: ipAddress || null, attemptCount: 0 }]);

  if (error) {
    console.error("Create OTP Error:", error);
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
 * اعتبار کد تایید را چک می‌کند (بدون مصرف کردن آن).
 * محافظت Brute-Force: هر تلاش ناموفق شمارش می‌شود و بعد از عبور از سقف مجاز،
 * حتی کد صحیح هم دیگر پذیرفته نمی‌شود (باید دوباره send-otp بزند).
 */
export async function isOtpValid(phoneNumber: string, code: string): Promise<boolean> {
  if (!phoneNumber || !code) return false;

  const { data: latest } = await supabaseAdmin
    .from("otp_codes")
    .select("id, code, expiresAt, isUsed, attemptCount")
    .eq("phoneNumber", phoneNumber)
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest || latest.isUsed) return false;

  if ((latest.attemptCount || 0) >= MAX_VERIFY_ATTEMPTS) {
    return false;
  }

  const isExpired = new Date(latest.expiresAt).getTime() <= Date.now();
  const isMatch = latest.code === code;

  if (!isMatch || isExpired) {
    await supabaseAdmin
      .from("otp_codes")
      .update({ attemptCount: (latest.attemptCount || 0) + 1 })
      .eq("id", latest.id);
    return false;
  }

  return true;
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