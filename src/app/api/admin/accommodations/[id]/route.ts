// مسیر: src/app/api/admin/accommodations/[id]/route.ts
// 🆕 فاز ۱۱ / بخش ۳: GET حالا به‌جای requireAdminRole ساده، از requireAdminTabAccess
// با کلید "accommodations" استفاده می‌کند. PATCH و DELETE عملیات حساس هستند و
// طبق تصمیم معماری، همچنان منحصراً برای SUPER_ADMIN باقی می‌مانند.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole, requireAdminTabAccess } from "@/lib/auth/adminAuth";
import { CATEGORIES } from "@/constants/categories";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminTabAccess(request, "accommodations");
  if (!admin) return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });

  const { id } = await params;
  const { data, error } = await supabaseAdmin.from("accommodations").select("*").eq("id", id).maybeSingle();

  if (error || !data) return NextResponse.json({ success: false, error: "اقامتگاه یافت نشد" }, { status: 404 });
  return NextResponse.json({ success: true, accommodation: data });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();

    if (body.category) {
      const validCategoryIds = CATEGORIES.map(c => c.id);
      if (!validCategoryIds.includes(body.category)) {
        return NextResponse.json({ success: false, error: "دسته‌بندی نامعتبر" }, { status: 400 });
      }
    }

    const { data: updated, error } = await supabaseAdmin
      .from("accommodations")
      .update({ ...body, updatedAt: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from("admin_audit_logs").insert({
      adminId: admin.userId,
      actionType: "OTHER",
      description: `ویرایش اقامتگاه اختصاصی: ${updated.title}`,
    });

    return NextResponse.json({ success: true, accommodation: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: "خطا در ویرایش اقامتگاه" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });

  try {
    const { id } = await params;

    const { data: acc } = await supabaseAdmin.from("accommodations").select("title").eq("id", id).single();

    const { error } = await supabaseAdmin.from("accommodations").delete().eq("id", id);
    if (error) throw error;

    await supabaseAdmin.from("admin_audit_logs").insert({
      adminId: admin.userId,
      actionType: "OTHER",
      description: `حذف اقامتگاه اختصاصی: ${acc?.title || id}`,
    });

    return NextResponse.json({ success: true, message: "با موفقیت حذف شد" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "خطا در حذف اقامتگاه" }, { status: 500 });
  }
}