// مسیر مقصد این فایل (فایل جدید): src/lib/sms/smsConfig.ts
//
// تمام تنظیمات اتصال به پنل پیامکی ایران از اینجا خوانده می‌شوند.
// دقیقاً با همان الگوی src/lib/otaghak/config.ts — وقتی کلید پنل پیامکی
// (مثلاً کاوه‌نگار / ملی‌پیامک) رسید، فقط متغیرهای محیطی زیر را در
// .env.local پر کنید:
//
// SMS_API_KEY=...
// SMS_SENDER_LINE=...
// SMS_USE_MOCK=false        <-- وقتی پنل واقعی وصل شد، false کنید

export const SMS_CONFIG = {
  apiKey: process.env.SMS_API_KEY || "",
  senderLine: process.env.SMS_SENDER_LINE || "",

  // اگر کلید API ست نشده باشد یا صراحتاً SMS_USE_MOCK=true باشد،
  // سیستم به‌صورت خودکار کد تایید را فقط در کنسول سرور چاپ می‌کند
  // (دقیقاً مثل رفتار فعلی فاز ۲) تا توسعه بدون وقفه ادامه پیدا کند.
  useMock: process.env.SMS_USE_MOCK === "true" || !process.env.SMS_API_KEY,
};