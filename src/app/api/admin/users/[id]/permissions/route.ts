// مسیر: src/app/api/admin/users/[id]/permissions/route.ts
// PATCH: تعیین دسترسی یک کاربر با نقش SUPPORT_AGENT به تب‌های پنل مدیریت (فاز ۱۱، بخش ۳).
// توجه: SUPER_ADMIN مستقل از این جدول، همیشه به تمام تب‌ها دسترسی کامل دارد؛
// این مسیر فقط دسترسی کاربران SUPPORT_AGENT را کنترل می‌کند.
// دسترسی این مسیر: فقط SUPER_ADMIN. هر تغییر به‌صورت اجباری در admin_audit_logs ثبت می‌شود
// (دقیقاً همان الگوی role/route.ts).

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole, logAdminAction } from "@/lib/auth/adminAuth";
import { ADMIN_TAB_KEYS, ADMIN_TAB_LABELS, isValidAdminTabKey } from "@/constants/adminPermissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id: targetUserId } = await params;
  const body = await request.json();
  const requested = body?.permissions;

  if (
    !Array.isArray(requested) ||
    !requested.every((p) => typeof p === "string" && isValidAdminTabKey(p))
  ) {
    return NextResponse.json(
      {
        success: false,
        error: `دسترسی‌ها باید آرایه‌ای از این مقادیر معتبر باشند: ${ADMIN_TAB_KEYS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const { data: targetUser, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("id, role, firstName, lastName, phoneNumber, permissions")
    .eq("id", targetUserId)
    .maybeSingle();

  if (fetchError || !targetUser) {
    return NextResponse.json({ success: false, error: "کاربر مورد نظر یافت نشد" }, { status: 404 });
  }

  if (targetUser.role !== "SUPPORT_AGENT") {
    return NextResponse.json(
      {
        success: false,
        error:
          "تعیین دسترسی تب‌به‌تب فقط برای نقش «پشتیبان» (SUPPORT_AGENT) معنا دارد. مدیر ارشد همیشه دسترسی کامل دارد و کاربر عادی اصلاً به پنل دسترسی ندارد.",
      },
      { status: 400 }
    );
  }

  const newPermissions = Array.from(new Set(requested)) as string[];
  const previousPermissions: string[] = targetUser.permissions || [];

  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({ permissions: newPermissions })
    .eq("id", targetUserId);

  if (updateError) {
    console.error("Admin Permissions Update Error:", updateError);
    return NextResponse.json({ success: false, error: "خطا در به‌روزرسانی دسترسی‌ها" }, { status: 500 });
  }

  const labelize = (keys: string[]) =>
    keys.length > 0
      ? keys.map((k) => ADMIN_TAB_LABELS[k as keyof typeof ADMIN_TAB_LABELS] || k).join("، ")
      : "هیچ‌کدام";

  await logAdminAction({
    adminId: admin.userId,
    actionType: "PERMISSIONS_CHANGE",
    targetUserId,
    description: `تغییر دسترسی تب‌های پنل کاربر ${targetUser.firstName} ${targetUser.lastName} (${targetUser.phoneNumber}) از [${labelize(
      previousPermissions
    )}] به [${labelize(newPermissions)}]`,
    previousValue: JSON.stringify(previousPermissions),
    newValue: JSON.stringify(newPermissions),
  });

  return NextResponse.json({
    success: true,
    permissions: newPermissions,
    message: "دسترسی‌های کاربر با موفقیت به‌روزرسانی شد",
  });
}