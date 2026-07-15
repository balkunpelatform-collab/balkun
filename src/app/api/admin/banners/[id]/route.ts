// مسیر: src/app/api/admin/banners/[id]/route.ts
// همانند route.ts اصلی، تمام عملیات (GET/PATCH/DELETE) با کلید تب "banners"
// کنترل می‌شوند — دقیقاً هم‌الگو با src/app/api/admin/blog/[id]/route.ts.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminTabAccess } from "@/lib/auth/adminAuth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminTabAccess(request, "banners");
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("homepage_banners")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ success: false, error: "بنر یافت نشد" }, { status: 404 });
  }

  return NextResponse.json({ success: true, banner: data });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminTabAccess(request, "banners");
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const { data: current, error: fetchError } = await supabaseAdmin
      .from("homepage_banners")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !current) {
      return NextResponse.json({ success: false, error: "بنر یافت نشد" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl?.trim() || null;
    if (body.title !== undefined) updates.title = body.title?.trim() || null;
    if (body.subtitle !== undefined) updates.subtitle = body.subtitle?.trim() || null;
    if (body.badgeText !== undefined) updates.badgeText = body.badgeText?.trim() || null;
    if (body.linkUrl !== undefined) updates.linkUrl = body.linkUrl?.trim() || null;
    if (body.displayOrder !== undefined) updates.displayOrder = body.displayOrder;
    if (body.isActive !== undefined) updates.isActive = !!body.isActive;

    if (updates.imageUrl === null) {
      return NextResponse.json({ success: false, error: "تصویر بنر الزامی است" }, { status: 400 });
    }

    const { data: updated, error } = await supabaseAdmin
      .from("homepage_banners")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from("admin_audit_logs").insert({
      adminId: admin.userId,
      actionType: "BANNER_CHANGE",
      description: `ویرایش بنر صفحه اول (${updated.badgeText || updated.title || updated.id})`,
    });

    return NextResponse.json({ success: true, banner: updated });
  } catch (error) {
    console.error("Admin Banners PATCH Error:", error);
    return NextResponse.json({ success: false, error: "خطا در ویرایش بنر" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminTabAccess(request, "banners");
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const { data: banner } = await supabaseAdmin
      .from("homepage_banners")
      .select("title, badgeText")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabaseAdmin.from("homepage_banners").delete().eq("id", id);
    if (error) throw error;

    await supabaseAdmin.from("admin_audit_logs").insert({
      adminId: admin.userId,
      actionType: "BANNER_CHANGE",
      description: `حذف بنر صفحه اول: ${banner?.badgeText || banner?.title || id}`,
    });

    return NextResponse.json({ success: true, message: "با موفقیت حذف شد" });
  } catch (error) {
    console.error("Admin Banners DELETE Error:", error);
    return NextResponse.json({ success: false, error: "خطا در حذف بنر" }, { status: 500 });
  }
}
