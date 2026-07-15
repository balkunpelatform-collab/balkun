// مسیر: src/constants/adminPermissions.ts
// تعریف مرکزی تب‌های قابل تخصیص در سیستم دسترسی سطح‌بندی‌شده ادمین.
// این فایل هم در کامپوننت‌های کلاینت (AdminSidebar، صفحه ویرایش کاربر) و هم در
// Route Handlerهای سرور (adminAuth.ts) استفاده می‌شود — پس هرگز نباید ایمپورت
// سرور-تنها (مثل supabaseAdmin) داشته باشد.
//
// 🆕 فاز ۱۱ / بخش ۴: تب "blog" اضافه شد (مدیریت کامل بلاگ برای هر ادمینی که
// این دسترسی به او داده شده باشد؛ برخلاف اقامتگاه‌ها، برای بلاگ هیچ عملیات
// SUPER_ADMIN-only جداگانه‌ای وجود ندارد چون محتوای بلاگ مالی/حساس نیست).
//
// 🆕 تب "corporate" اضافه شد: مرکز مدیریت تمام درخواست‌ها و امور مربوط به
// مشتریان سازمانی (لیدهای ورودی از صفحه‌ی /corporate + لیست سفید شماره‌های
// سازمانی). مثل بلاگ، این تب هم مالی/حساس نیست (خودِ عملیات شارژ کیف پول یا
// تغییر نقش کاربر همچنان منحصراً SUPER_ADMIN است و از این تب انجام نمی‌شود)،
// پس برای SUPPORT_AGENT هم قابل واگذاری است.
//
// 🆕 تب "banners" اضافه شد (تسک ۱۸ چک‌لیست کارفرما): مدیریت بنرهای اسلایدر
// صفحه اول (عکس، متن، کمپین/جشنواره، لینک، ترتیب و فعال/غیرفعال بودن). دقیقاً
// هم‌الگو با "blog" — محتوایی است، نه مالی/حساس، پس برای SUPPORT_AGENT هم
// قابل واگذاری است.

export const ADMIN_TAB_KEYS = ["accommodations", "bookings", "tickets", "logs", "blog", "corporate", "banners"] as const;

export type AdminTabKey = (typeof ADMIN_TAB_KEYS)[number];

export const ADMIN_TAB_LABELS: Record<AdminTabKey, string> = {
  accommodations: "اقامتگاه‌های اختصاصی",
  bookings: "مدیریت رزروها",
  tickets: "مرکز تیکتینگ",
  logs: "لاگ‌های سیستم",
  blog: "مدیریت بلاگ",
  corporate: "سازمانی",
  banners: "بنر اصلی صفحه اول",
};

export function isValidAdminTabKey(value: string): value is AdminTabKey {
  return (ADMIN_TAB_KEYS as readonly string[]).includes(value);
}
