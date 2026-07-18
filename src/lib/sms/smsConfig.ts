// مسیر مقصد این فایل: src/lib/sms/smsConfig.ts
//
// تمام تنظیمات اتصال به پنل پیامکی ایران از اینجا خوانده می‌شوند.
// دقیقاً با همان الگوی src/lib/otaghak/config.ts — وقتی کلید پنل پیامکی
// (کاوه‌نگار) رسید، فقط متغیرهای محیطی زیر را در .env.local پر کنید:
//
// SMS_API_KEY=...
// SMS_SENDER_LINE=...
// SMS_USE_MOCK=false        <-- وقتی پنل واقعی وصل شد، false کنید
//
// 🆕 مورد ۲۶ چک‌لیست کارفرما (عدم نمایش پنل کاوه‌نگار / وضعیت ارسال پیامک):
// آدرس پایه‌ی API کاوه‌نگار هم اینجا اضافه شد. src/lib/sms/kavenegarClient.ts
// (فایل جدید، حاوی کد واقعی اتصال به کاوه‌نگار — فعلاً غیرفعال چون useMock
// همچنان true است) فقط از همین ثابت استفاده می‌کند تا اگر روزی آدرس API
// کاوه‌نگار عوض شد، فقط همین یک فایل نیاز به تغییر داشته باشد.
export const KAVENEGAR_BASE_URL = "https://api.kavenegar.com/v1";

export const SMS_CONFIG = {
  apiKey: process.env.SMS_API_KEY || "",
  senderLine: process.env.SMS_SENDER_LINE || "",

  // اگر کلید API ست نشده باشد یا صراحتاً SMS_USE_MOCK=true باشد،
  // سیستم به‌صورت خودکار کد تایید را فقط در کنسول سرور چاپ می‌کند
  // (دقیقاً مثل رفتار فعلی فاز ۲) تا توسعه بدون وقفه ادامه پیدا کند.
  useMock: process.env.SMS_USE_MOCK === "true" || !process.env.SMS_API_KEY,
};