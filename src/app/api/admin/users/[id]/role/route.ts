// مسیر: src/app/api/admin/users/[id]/role/route.ts
// PATCH: تغییر نقش یک کاربر (ارتقا به SUPPORT_AGENT، FINANCE_MANAGER یا SUPER_ADMIN، یا بازگرداندن به USER).
// فقط SUPER_ADMIN مجاز است. هر تغییر به‌صورت اجباری در admin_audit_logs ثبت می‌شود.
//
// 🆕 تسک ۱ (تاریخچه کیف پول برای مالی و مدیر ارشد): نقش FINANCE_MANAGER به VALID_ROLES
// اضافه شد تا مدیر ارشد بتواند از همین پنل (صفحه‌ی جزئیات کاربر) این نقش را به هر کاربری تخصیص دهد.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole, logAdminAction } from "@/lib/auth/adminAuth";
import type { UserRole } from "@/types/database";

const VALID_ROLES: UserRole[] = ["USER", "SUPPORT_AGENT", "FINANCE_MANAGER", "SUPER_ADMIN"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id: targetUserId } = await params;
  const { role: newRole } = await request.json();

  if (!VALID_ROLES.includes(newRole)) {
    return NextResponse.json({ success: false, error: "نقش نامعتبر است" }, { status: 400 });
  }

  // جلوگیری از اینکه یک مدیر ارشد، نقش خودش را (به‌صورت اشتباهی) پایین بیاورد و قفل شود
  if (targetUserId === admin.userId && newRole !== "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, error: "نمی‌توانید نقش خودتان را کاهش دهید. از یک مدیر ارشد دیگر بخواهید این کار را انجام دهد." },
      { status: 400 }
    );
  }

  const { data: targetUser, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("id, role, firstName, lastName, phoneNumber")
    .eq("id", targetUserId)
    .maybeSingle();

  if (fetchError || !targetUser) {
    return NextResponse.json({ success: false, error: "کاربر مورد نظر یافت نشد" }, { status: 404 });
  }

  const previousRole = targetUser.role;

  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({ role: newRole })
    .eq("id", targetUserId);

  if (updateError) {
    return NextResponse.json({ success: false, error: "خطا در بروزرسانی نقش کاربر" }, { status: 500 });
  }

  await logAdminAction({
    adminId: admin.userId,
    actionType: "ROLE_CHANGE",
    targetUserId,
    description: `تغییر نقش کاربر ${targetUser.firstName} ${targetUser.lastName} (${targetUser.phoneNumber}) از ${previousRole} به ${newRole}`,
    previousValue: previousRole,
    newValue: newRole,
  });

  return NextResponse.json({ success: true, message: "نقش کاربر با موفقیت تغییر کرد" });
}
