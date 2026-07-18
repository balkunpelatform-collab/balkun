// مسیر: src/lib/sms/kavenegarClient.ts
//
// 🆕 مورد ۲۶ چک‌لیست کارفرما (عدم نمایش پنل کاوه‌نگار / وضعیت ارسال پیامک):
// این فایل، کد واقعیِ اتصال به API سرویس پیامکی کاوه‌نگار است — طبق مستندات رسمی
// کاوه‌نگار (متد sms/send.json). این فایل فقط توسط src/lib/sms/smsService.ts و
// فقط وقتی SMS_CONFIG.useMock === false باشد فراخوانی می‌شود؛ یعنی فقط بعد از
// اینکه SMS_API_KEY و SMS_SENDER_LINE واقعی در .env.local قرار بگیرند و
// SMS_USE_MOCK=false شود. تا آن زمان این فایل کاملاً غیرفعال است و هیچ درخواستی
// به سمت کاوه‌نگار ارسال نمی‌کند — دقیقاً طبق تصمیم کارفرما مبنی بر اینکه فعلاً
// فقط زیرساخت آماده شود، نه اتصال واقعی.
//
// نکته: خروجی این تابع هیچ‌وقت throw نمی‌کند؛ همیشه یک نتیجه‌ی ساختاریافته
// (success/error) برمی‌گرداند تا src/lib/sms/smsService.ts بتواند بدون نیاز به
// try/catch اضافه، هم پیامک را مدیریت کند و هم نتیجه را در جدول sms_logs ثبت کند.

import { SMS_CONFIG, KAVENEGAR_BASE_URL } from "./smsConfig";

export interface KavenegarSendResult {
  success: boolean;
  messageId?: string;
  errorMessage?: string;
}

// شکل خلاصه‌شده‌ی پاسخ رسمی کاوه‌نگار (فقط فیلدهایی که اینجا لازم داریم)
interface KavenegarApiResponse {
  return?: {
    status?: number;
    message?: string;
  };
  entries?: Array<{
    messageid?: number | string;
    status?: number;
    statustext?: string;
  }>;
}

export async function sendKavenegarSms(receptor: string, message: string): Promise<KavenegarSendResult> {
  if (!SMS_CONFIG.apiKey) {
    return { success: false, errorMessage: "کلید API کاوه‌نگار (SMS_API_KEY) هنوز در .env.local تنظیم نشده است." };
  }

  const endpoint = `${KAVENEGAR_BASE_URL}/${SMS_CONFIG.apiKey}/sms/send.json`;
  const params = new URLSearchParams({
    receptor,
    message,
    ...(SMS_CONFIG.senderLine ? { sender: SMS_CONFIG.senderLine } : {}),
  });

  try {
    const response = await fetch(`${endpoint}?${params.toString()}`, { method: "GET" });
    const data = (await response.json()) as KavenegarApiResponse;

    if (!response.ok || data?.return?.status !== 200) {
      return {
        success: false,
        errorMessage: data?.return?.message || `خطای سرویس کاوه‌نگار (کد HTTP: ${response.status})`,
      };
    }

    const firstEntry = data.entries?.[0];
    return {
      success: true,
      messageId: firstEntry?.messageid !== undefined ? String(firstEntry.messageid) : undefined,
    };
  } catch (err) {
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : "خطای شبکه در اتصال به سرور کاوه‌نگار",
    };
  }
}