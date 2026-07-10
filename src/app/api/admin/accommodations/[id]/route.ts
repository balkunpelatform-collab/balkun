// این فایل جایگزین فایل فعلی شود در مسیر:
// src/app/api/admin/accommodations/[id]/route.ts

// مسیر: src/app/api/admin/accommodations/[id]/route.ts
// 🔧 اصلاح بند ۳.۱: تصمیم گرفته شد ادمین پشتیبان (SUPPORT_AGENT) که دسترسی تب
// "accommodations" به او داده شده، بتواند ویرایش و حذف هم انجام دهد؛ نه فقط مشاهده.
// به همین دلیل GET/PATCH/DELETE هر سه از requireAdminTabAccess استفاده می‌کنند
// (قبلاً PATCH/DELETE منحصراً برای SUPER_ADMIN بود).
//
// 🐛 رفع باگ (۲۰۲۶/۰۷/۱۰): قبلاً PATCH کل بدنه‌ی درخواست را بدون فیلتر و بدون هیچ
// اعتبارسنجی روی دیتابیس اعمال می‌کرد — یعنی می‌شد قیمت منفی، ظرفیت صفر/منفی یا
// وضعیتی خارج از مقادیر مجاز ثبت کرد (که همان لحظه در نتایج جستجو و صفحه‌ی اتاق
// به همه‌ی کاربران نمایش داده می‌شود). حالا فقط فیلدهای مجاز فرم پذیرفته می‌شوند و
// مقادیر عددی/وضعیت پیش از ذخیره اعتبارسنجی می‌شوند.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminTabAccess } from "@/lib/auth/adminAuth";
import { CATEGORIES } from "@/constants/categories";
import { AccommodationStatus } from "@/types/database";

const VALID_STATUSES: AccommodationStatus[] = ["ACTIVE", "INACTIVE", "PENDING_REVIEW"];

// فقط این فیلدها از فرم ادمین قابل تغییرند — هر کلید دیگری در بدنه‌ی درخواست
// (حتی اگر اشتباهی یا از یک ابزار خارجی ارسال شود) نادیده گرفته می‌شود.
const EDITABLE_FIELDS = [
  "title", "description", "location", "address", "category", "status",
  "pricePerNight", "maxGuests", "bedrooms", "bathrooms", "area",
  "amenities", "images", "contactPhone", "contactEmail",
  "checkInTime", "checkOutTime", "houseRules", "cancellationPolicy",
] as const;

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
  const admin = await requireAdminTabAccess(request, "accommodations");
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

    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ success: false, error: "وضعیت انتخاب‌شده معتبر نیست" }, { status: 400 });
    }

    // اعتبارسنجی مقادیر عددی — فقط اگر در بدنه‌ی درخواست ارسال شده باشند
    const numericChecks: { field: string; min: number; label: string }[] = [
      { field: "pricePerNight", min: 1, label: "قیمت شبی" },
      { field: "maxGuests", min: 1, label: "ظرفیت مسافر" },
      { field: "bedrooms", min: 0, label: "تعداد اتاق" },
      { field: "bathrooms", min: 0, label: "تعداد سرویس بهداشتی" },
      { field: "area", min: 1, label: "متراژ" },
    ];

    for (const { field, min, label } of numericChecks) {
      if (body[field] === undefined) continue;
      const num = Number(body[field]);
      if (!Number.isFinite(num) || num < min) {
        return NextResponse.json(
          { success: false, error: `مقدار «${label}» نامعتبر است (باید عددی و حداقل ${min} باشد)` },
          { status: 400 }
        );
      }
    }

    // فقط فیلدهای مجاز را از بدنه‌ی درخواست استخراج می‌کنیم — هر کلید دیگری
    // (مثل id، adminId، createdAt) که در body باشد نادیده گرفته می‌شود.
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    const { data: updated, error } = await supabaseAdmin
      .from("accommodations")
      .update(updates)
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
    console.error("Admin Accommodation PATCH Error:", error);
    return NextResponse.json({ success: false, error: "خطا در ویرایش اقامتگاه" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminTabAccess(request, "accommodations");
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