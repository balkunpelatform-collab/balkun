// مسیر: src/lib/auth/adminAuth.ts
// خط دفاعی دوم و معتبرِ پنل ادمین.
// میدلور (src/middleware.ts) فقط یک بررسی سریع روی نقشِ داخل JWT انجام می‌دهد تا کاربر عادی
// حتی وارد صفحه هم نشود؛ اما چون JWT تا ۳۰ روز معتبر است و ممکن است نقش یک ادمین در همین
// بازه پس گرفته شود، هر Route Handler زیر مسیر /api/admin باید با این تابع، نقش را
// «تازه، مستقیم از دیتابیس» دوباره بررسی کند. این استاندارد امنیتی Bank-grade سند راهبردی است.

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { UserRole } from "@/types/database";

export interface AdminContext {
  userId: string;
  role: UserRole;
}

export async function requireAdminRole(
  request: Request,
  allowedRoles: UserRole[]
): Promise<AdminContext | null> {
  const userId = request.headers.get("x-balkun-user-id");
  if (!userId) return null;

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id, role, isActive")
    .eq("id", userId)
    .maybeSingle();

  if (error || !user || !user.isActive) return null;
  if (!allowedRoles.includes(user.role as UserRole)) return null;

  return { userId: user.id, role: user.role as UserRole };
}

// ثبت اجباری هر اقدام حساس ادمین (طبق الزام سند فاز ۹)
export async function logAdminAction(params: {
  adminId: string;
  actionType: "ROLE_CHANGE" | "WALLET_ADJUST" | "USER_STATUS_CHANGE" | "OTHER";
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