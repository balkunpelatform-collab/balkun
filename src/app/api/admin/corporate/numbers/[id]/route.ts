// مسیر: src/app/api/admin/corporate/numbers/[id]/route.ts
// DELETE: حذف یک شماره از لیست سفید سازمانی. توجه: این عملیات فقط جلوی
// تشخیص خودکار سازمانی‌بودنِ ثبت‌نام‌های آینده را می‌گیرد؛ کاربرانی که قبلاً
// با این شماره ثبت‌نام کرده‌اند تغییری نمی‌کنند (باید از تب «کاربران و مالی»
// نوع حساب‌شان جداگانه ویرایش شود).

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminTabAccess, logAdminAction } from "@/lib/auth/adminAuth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminTabAccess(request, "corporate");
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id } = await params;

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("organizational_numbers")
    .select("id, phoneNumber, organizationName")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ success: false, error: "شماره یافت نشد" }, { status: 404 });
  }

  const { error: deleteError } = await supabaseAdmin.from("organizational_numbers").delete().eq("id", id);

  if (deleteError) {
    console.error("Admin Corporate Number Delete Error:", deleteError);
    return NextResponse.json({ success: false, error: "خطا در حذف شماره سازمانی" }, { status: 500 });
  }

  await logAdminAction({
    adminId: admin.userId,
    actionType: "CORPORATE_NUMBER_CHANGE",
    description: `حذف شماره ${existing.phoneNumber} از لیست سفید سازمانی (${existing.organizationName})`,
    previousValue: existing.phoneNumber,
  });

  return NextResponse.json({ success: true });
}