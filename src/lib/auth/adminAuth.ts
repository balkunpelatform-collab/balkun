// مسیر: src/lib/auth/adminAuth.ts
// خط دفاعی دوم و معتبرِ پنل ادمین.
// میدلور (src/middleware.ts) فقط یک بررسی سریع روی نقشِ داخل JWT انجام می‌دهد تا کاربر عادی
// حتی وارد صفحه هم نشود؛ اما چون JWT تا ۳۰ روز معتبر است و ممکن است نقش یا دسترسی‌های یک
// ادمین در همین بازه پس گرفته شود، هر Route Handler زیر مسیر /api/admin باید با این تابع، نقش را
// «تازه، مستقیم از دیتابیس» دوباره بررسی کند. این استاندارد امنیتی Bank-grade سند راهبردی است.
//
// نوع actionType از src/types/database.ts (AdminActionType) ایمپورت می‌شود تا هیچ‌وقت این فایل
// و تایپ اصلی دیتابیس از هم عقب نیفتند.
//
// 🆕 فاز ۱۱ / بخش ۳: سیستم دسترسی سطح‌بندی‌شده تب‌به‌تب اضافه شد.
// تصمیم معماری: SUPER_ADMIN همیشه و بدون قیدوشرط به تمام تب‌ها دسترسی کامل دارد
// (تا هیچ‌وقت مدیر اصلی خودش را قفل نکند)؛ ستون permissions روی جدول users
// فقط برای کاربران با نقش SUPPORT_AGENT معنا و کاربرد دارد.
//
// 🆕 تسک ۱۱ چک‌لیست کارفرما (افزودن نقش مدیر مالی به سیستم): FINANCE_MANAGER هم
// حالا می‌تواند از همین requireAdminTabAccess عبور کند، اما بر خلاف SUPPORT_AGENT
// دسترسی‌اش «تفویضی» نیست (هیچ‌وقت از ستون permissions خوانده نمی‌شود) بلکه «ثابت»
// و محدود به یک لیست کوچک از پیش تعیین‌شده از تب‌هاست (FINANCE_MANAGER_FIXED_TABS
// پایین همین فایل) — دقیقاً همان الگوی دسترسی ثابتی که مدیر مالی از تسک ۱ تا کنون
// داشته (داشبورد، تاریخچه کیف پول، پرداخت‌ها، کاربران). فعلاً تنها تب داخل این لیست
// «logs» (لاگ‌های سیستم/یادداشت‌های داخلی) است؛ «bookings» (مشاهده رزروها) و
// «سازمان‌ها» با منطق جداگانه‌ای در همان Route Handler مربوطه کنترل می‌شوند، نه از
// این تابع عمومی، چون آن دو مسیر شامل عملیات نوشتنی/حساس (لغو یا حذف رزرو، شارژ
// کیف پول سازمانی) هم هستند که باید همچنان منحصراً SUPER_ADMIN/SUPPORT_AGENT بمانند
// و مدیر مالی هرگز نباید با تغییر همین یک تابع عمومی، به‌طور ناخواسته به آن‌ها
// دسترسی نوشتنی پیدا کند.

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { UserRole, AdminActionType } from "@/types/database";
import { type AdminTabKey, isValidAdminTabKey } from "@/constants/adminPermissions";

export interface AdminContext {
  userId: string;
  role: UserRole;
  permissions: AdminTabKey[];
}

// لیست ثابت تب‌هایی که FINANCE_MANAGER بدون هیچ تفویضی همیشه به آن‌ها دسترسی دارد
// (نگاه کنید به توضیح تسک ۱۱ در بالای همین فایل).
const FINANCE_MANAGER_FIXED_TABS: AdminTabKey[] = ["logs"];

export async function requireAdminRole(
  request: Request,
  allowedRoles: UserRole[]
): Promise<AdminContext | null> {
  const userId = request.headers.get("x-balkun-user-id");
  if (!userId) return null;

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id, role, isActive, permissions")
    .eq("id", userId)
    .maybeSingle();

  if (error || !user || !user.isActive) return null;
  if (!allowedRoles.includes(user.role as UserRole)) return null;

  const rawPermissions: unknown = user.permissions;
  const permissions: AdminTabKey[] = Array.isArray(rawPermissions)
    ? rawPermissions.filter(
        (p): p is AdminTabKey => typeof p === "string" && isValidAdminTabKey(p)
      )
    : [];

  return { userId: user.id, role: user.role as UserRole, permissions };
}

// 🆕 بررسی دسترسی به یک تب مشخص از پنل ادمین.
// SUPER_ADMIN همیشه اجازه دارد. SUPPORT_AGENT فقط اگر tabKey داخل permissions او باشد.
// از این تابع در روت‌های GET/POST/PATCH تب‌های اقامتگاه‌ها/رزروها/تیکتینگ/لاگ‌ها استفاده کنید
// (نه برای عملیات مالی/حساس مثل تغییر نقش، شارژ کیف پول یا حذف رزرو که همچنان
// منحصراً با requireAdminRole(request, ["SUPER_ADMIN"]) کنترل می‌شوند).
export async function requireAdminTabAccess(
  request: Request,
  tabKey: AdminTabKey
): Promise<AdminContext | null> {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN", "SUPPORT_AGENT", "FINANCE_MANAGER"]);
  if (!admin) return null;
  if (admin.role === "SUPER_ADMIN") return admin;
  if (admin.role === "FINANCE_MANAGER") {
    // دسترسی مدیر مالی هرگز از ستون permissions خوانده نمی‌شود؛ فقط لیست ثابت بالا.
    return FINANCE_MANAGER_FIXED_TABS.includes(tabKey) ? admin : null;
  }
  if (!admin.permissions.includes(tabKey)) return null;
  return admin;
}

// ثبت اجباری هر اقدام حساس ادمین (طبق الزام سند فاز ۹)
export async function logAdminAction(params: {
  adminId: string;
  actionType: AdminActionType;
  targetUserId?: string | null;
  description: string;
  previousValue?: string | null;
  newValue?: string | null;
}): Promise<void> {
  await supabaseAdmin.from("admin_audit_logs").insert([
    {
      adminId: params.adminId,
      actionType: params.actionType,
      targetUserId: params.targetUserId ?? null,
      description: params.description,
      previousValue: params.previousValue ?? null,
      newValue: params.newValue ?? null,
    },
  ]);
}