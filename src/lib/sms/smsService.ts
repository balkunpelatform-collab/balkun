// مسیر مقصد این فایل (فایل جدید): src/lib/sms/smsService.ts
//
// تنها نقطه‌ی ارسال پیامک در کل پروژه. تمام بخش‌های دیگر (OTP، خوش‌آمدگویی،
// و در فاز ۷ اطلاع‌رسانی رزرو) باید فقط از همین فایل استفاده کنند تا اتصال
// به پنل پیامکی واقعی در یک‌جا متمرکز و قابل تعویض باشد.

import { SMS_CONFIG } from "./smsConfig";

/**
 * ارسال کد تایید (OTP) به شماره موبایل کاربر.
 * در حالت Mock، کد فقط در کنسول سرور چاپ می‌شود.
 */
export async function sendOtpSms(phoneNumber: string, code: string): Promise<void> {
  if (SMS_CONFIG.useMock) {
    console.log(`[Balkun MOCK SMS] کد تایید برای شماره ${phoneNumber} : ${code}`);
    return;
  }

  // TODO فاز ۷: اتصال واقعی به پنل پیامکی ایران (به محض دریافت کلید API).
  throw new Error(
    "اتصال واقعی پنل پیامکی هنوز پیاده‌سازی نشده است (فاز ۷). لطفا SMS_USE_MOCK=true قرار دهید."
  );
}

/**
 * ارسال پیامک خوش‌آمدگویی پس از ثبت‌نام موفق (متن متفاوت برای کاربر عادی/سازمانی).
 * طبق چک‌لیست فاز ۲ که به فاز ۷ موکول شده بود.
 */
export async function sendWelcomeSms(
  phoneNumber: string,
  firstName: string,
  userType: "NORMAL" | "ORGANIZATIONAL"
): Promise<void> {
  const message =
    userType === "ORGANIZATIONAL"
      ? `${firstName} عزیز، به حساب سازمانی بالکن خوش آمدید! از این پس می‌توانید با اعتبار سازمان خود رزرو کنید.`
      : `${firstName} عزیز، به بالکن خوش آمدید! سفر شما از همین‌جا شروع می‌شود.`;

  if (SMS_CONFIG.useMock) {
    console.log(`[Balkun MOCK SMS - Welcome] به ${phoneNumber}: ${message}`);
    return;
  }

  // غیرحیاتی است — اگر پنل واقعی هنوز وصل نباشد، ثبت‌نام را متوقف نمی‌کنیم
  console.warn("⚠️ ارسال پیامک خوش‌آمدگویی نادیده گرفته شد (پنل پیامکی واقعی هنوز وصل نشده).");
}