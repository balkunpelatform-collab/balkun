// مسیر مقصد این فایل: src/lib/otaghak/config.ts
//
// تمام تنظیمات اتصال به اتاقک از اینجا خوانده می‌شوند.
// وقتی API واقعی اتاقک رسید، فقط کافیست متغیرهای محیطی زیر را
// در فایل .env.local پر کنید — هیچ کد دیگری نیاز به تغییر ندارد.
//
// OTAGHAK_API_BASE_URL=https://api.otaghak.com   <-- آدرس واقعی را اینجا بگذارید
// OTAGHAK_USERNAME=...
// OTAGHAK_PASSWORD=...
// OTAGHAK_USE_MOCK=false                          <-- وقتی API واقعی وصل شد، false کنید

export const OTAGHAK_CONFIG = {
  baseUrl: process.env.OTAGHAK_API_BASE_URL || "",
  username: process.env.OTAGHAK_USERNAME || "",
  password: process.env.OTAGHAK_PASSWORD || "",

  // اگر آدرس API ست نشده باشد یا صراحتاً OTAGHAK_USE_MOCK=true باشد،
  // سیستم به‌صورت خودکار از داده‌های Mock استفاده می‌کند.
  // به این ترتیب کل پروژه (جستجو، فیلترها و...) همین الان قابل توسعه و تست است
  // بدون اینکه منتظر رسیدن API واقعی بمانیم.
  useMock: process.env.OTAGHAK_USE_MOCK === "true" || !process.env.OTAGHAK_API_BASE_URL,

  // مدت اعتبار توکن قبل از انقضا (بر حسب ثانیه) — این مقدار را بعد از دریافت
  // مستندات رسمی اتاقک با مقدار واقعی جایگزین کنید.
  tokenTtlSeconds: 50 * 60, // فرض: ۵۰ دقیقه (محافظه‌کارانه نسبت به انقضای احتمالی ۱ ساعته)
};

export const BALKUN_MARGIN_RATE = 1.05; // قانون تجاری ثابت: ۵٪ افزایش قیمت بالکن
