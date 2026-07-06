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

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { UserRole, AdminActionType } from "@/types/database";
import { type AdminTabKey, isValidAdminTabKey } from "@/constants/adminPermissions";

export interface AdminContext {
  userId: string;
  role: UserRole;
  permissions: AdminTabKey[];
}

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
  const admin = await requireAdminRole(request, ["SUPER_ADMIN", "SUPPORT_AGENT"]);
  if (!admin) return null;
  if (admin.role === "SUPER_ADMIN") return admin;
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