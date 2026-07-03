// مسیر: src/app/api/admin/users/[id]/type/route.ts
// PATCH: ارتقا/تنزل نوع کاربر بین NORMAL و ORGANIZATIONAL طبق بخش ۲ سند فاز ۹.
// دسترسی: فقط SUPER_ADMIN. هر تغییر به‌صورت اجباری در admin_audit_logs ثبت می‌شود.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole, logAdminAction } from "@/lib/auth/adminAuth";
import type { UserType } from "@/types/database";

const VALID_TYPES: UserType[] = ["NORMAL", "ORGANIZATIONAL"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id: targetUserId } = await params;
  const { userType, organizationName } = await request.json();

  if (!VALID_TYPES.includes(userType)) {
    return NextResponse.json({ success: false, error: "نوع کاربر نامعتبر است" }, { status: 400 });
  }
  if (userType === "ORGANIZATIONAL" && (!organizationName || organizationName.trim().length < 2)) {
    return NextResponse.json(
      { success: false, error: "برای کاربر سازمانی، درج نام سازمان الزامی است" },
      { status: 400 }
    );
  }

  const { data: targetUser, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("id, userType, firstName, lastName, phoneNumber")
    .eq("id", targetUserId)
    .maybeSingle();

  if (fetchError || !targetUser) {
    return NextResponse.json({ success: false, error: "کاربر مورد نظر یافت نشد" }, { status: 404 });
  }

  const previousType = targetUser.userType;
  const newOrgName = userType === "ORGANIZATIONAL" ? organizationName.trim() : null;

  const { data: updatedUser, error: updateError } = await supabaseAdmin
    .from("users")
    .update({ userType, organizationName: newOrgName })
    .eq("id", targetUserId)
    .select()
    .single();

  if (updateError) {
    console.error("Admin User Type Update Error:", updateError);
    return NextResponse.json({ success: false, error: "خطا در به‌روزرسانی نوع کاربر" }, { status: 500 });
  }

  await logAdminAction({
    adminId: admin.userId,
    actionType: "USER_STATUS_CHANGE",
    targetUserId,
    description: `تغییر نوع کاربر ${targetUser.firstName} ${targetUser.lastName} (${targetUser.phoneNumber}) از ${previousType} به ${userType}${
      newOrgName ? ` (سازمان: ${newOrgName})` : ""
    }`,
    previousValue: previousType,
    newValue: userType,
  });

  return NextResponse.json({ success: true, user: updatedUser, message: "نوع کاربر با موفقیت تغییر کرد" });
}