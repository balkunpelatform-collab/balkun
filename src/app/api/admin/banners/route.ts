// مسیر: src/app/api/admin/banners/route.ts
// مدیریت بنر اصلی صفحه اول (تسک ۱۸ چک‌لیست کارفرما) یک عملیات مالی/حساس نیست
// (دقیقاً مثل بلاگ و سازمانی). به همین دلیل تمام عملیات این روت (GET و POST)
// صرفاً با requireAdminTabAccess و کلید "banners" کنترل می‌شوند: هر SUPER_ADMIN،
// و هر SUPPORT_AGENT که مدیر ارشد تب "banners" را برایش فعال کرده باشد، اجازه‌ی
// مدیریت کامل بنرها (شامل ایجاد/ویرایش/حذف) را دارد.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminTabAccess } from "@/lib/auth/adminAuth";

export async function GET(request: NextRequest) {
  const admin = await requireAdminTabAccess(request, "banners");
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { data: banners, error } = await supabaseAdmin
    .from("homepage_banners")
    .select("*")
    .order("displayOrder", { ascending: true });

  if (error) {
    console.error("Admin Banners Fetch Error:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت لیست بنرها" }, { status: 500 });
  }

  return NextResponse.json({ success: true, banners: banners || [] });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminTabAccess(request, "banners");
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (!body.imageUrl?.trim()) {
      return NextResponse.json({ success: false, error: "تصویر بنر الزامی است" }, { status: 400 });
    }

    // بنر جدید پیش‌فرض بعد از آخرین بنر موجود قرار می‌گیرد (انتهای صف نمایش)
    const { data: lastBanner } = await supabaseAdmin
      .from("homepage_banners")
      .select("displayOrder")
      .order("displayOrder", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (lastBanner?.displayOrder ?? 0) + 1;
    const now = new Date().toISOString();

    const newBanner = {
      id: crypto.randomUUID(),
      imageUrl: body.imageUrl.trim(),
      title: body.title?.trim() || null,
      subtitle: body.subtitle?.trim() || null,
      badgeText: body.badgeText?.trim() || null,
      linkUrl: body.linkUrl?.trim() || null,
      displayOrder: typeof body.displayOrder === "number" ? body.displayOrder : nextOrder,
      isActive: body.isActive !== false,
      createdAt: now,
      updatedAt: now,
    };

    const { data: banner, error } = await supabaseAdmin
      .from("homepage_banners")
      .insert(newBanner)
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from("admin_audit_logs").insert({
      adminId: admin.userId,
      actionType: "BANNER_CHANGE",
      description: `ایجاد بنر جدید صفحه اول${newBanner.badgeText ? ` (${newBanner.badgeText})` : ""}`,
    });

    return NextResponse.json({ success: true, banner }, { status: 201 });
  } catch (error) {
    console.error("Admin Banners POST Error:", error);
    return NextResponse.json({ success: false, error: "خطا در ایجاد بنر" }, { status: 500 });
  }
}
