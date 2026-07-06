// مسیر: src/constants/adminPermissions.ts
// تعریف مرکزی تب‌های قابل تخصیص در سیستم دسترسی سطح‌بندی‌شده ادمین.
// این فایل هم در کامپوننت‌های کلاینت (AdminSidebar، صفحه ویرایش کاربر) و هم در
// Route Handlerهای سرور (adminAuth.ts) استفاده می‌شود — پس هرگز نباید ایمپورت
// سرور-تنها (مثل supabaseAdmin) داشته باشد.
//
// 🆕 فاز ۱۱ / بخش ۴: تب "blog" اضافه شد (مدیریت کامل بلاگ برای هر ادمینی که
// این دسترسی به او داده شده باشد؛ برخلاف اقامتگاه‌ها، برای بلاگ هیچ عملیات
// SUPER_ADMIN-only جداگانه‌ای وجود ندارد چون محتوای بلاگ مالی/حساس نیست).

export const ADMIN_TAB_KEYS = ["accommodations", "bookings", "tickets", "logs", "blog"] as const;

export type AdminTabKey = (typeof ADMIN_TAB_KEYS)[number];

export const ADMIN_TAB_LABELS: Record<AdminTabKey, string> = {
  accommodations: "اقامتگاه‌های اختصاصی",
  bookings: "مدیریت رزروها",
  tickets: "مرکز تیکتینگ",
  logs: "لاگ‌های سیستم",
  blog: "مدیریت بلاگ",
};

export function isValidAdminTabKey(value: string): value is AdminTabKey {
  return (ADMIN_TAB_KEYS as readonly string[]).includes(value);
}