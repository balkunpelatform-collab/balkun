// مسیر: src/app/api/admin/accommodations/route.ts
// رفع باگ: جایگزینی پکیج خارجی uuid با متد داخلی و استاندارد crypto.randomUUID()
// 🆕 فاز ۱۱ / بخش ۳: GET حالا به‌جای requireAdminRole ساده، از requireAdminTabAccess
// با کلید "accommodations" استفاده می‌کند تا SUPPORT_AGENT فقط در صورت داشتن این دسترسی وارد شود.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole, requireAdminTabAccess } from "@/lib/auth/adminAuth";
import { CATEGORIES } from "@/constants/categories";
import { Accommodation, AccommodationStatus } from "@/types/database";

const VALID_STATUSES: AccommodationStatus[] = ["ACTIVE", "INACTIVE", "PENDING_REVIEW"];

export async function GET(request: NextRequest) {
  const admin = await requireAdminTabAccess(request, "accommodations");
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim() || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from("accommodations")
    .select("id, title, category, pricePerNight, status, createdAt", { count: "exact" })
    .order("createdAt", { ascending: false })
    .range(from, to);

  if (status && VALID_STATUSES.includes(status as AccommodationStatus)) {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,location.ilike.%${search}%`);
  }

  const { data: accommodations, error, count } = await query;

  if (error) {
    console.error("Admin Accommodations Fetch Error:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت لیست اقامتگاه‌ها" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    accommodations: accommodations || [],
    pagination: { page, pageSize, total: count || 0 },
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "فقط مدیر ارشد مجاز به ثبت اقامتگاه است" }, { status: 403 });
  }

  try {
    const body = await request.json();
    
    // اعتبارسنجی دسته‌بندی با Constants
    const validCategoryIds = CATEGORIES.map(c => c.id);
    if (!validCategoryIds.includes(body.category)) {
      return NextResponse.json({ success: false, error: "دسته‌بندی انتخاب‌شده معتبر نیست" }, { status: 400 });
    }

    // استفاده از متد داخلی جاوااسکریپت به جای پکیج uuid
    const accommodationId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const newAccommodation: Partial<Accommodation> = {
      id: accommodationId,
      adminId: admin.userId,
      title: body.title?.trim() || "بدون عنوان",
      description: body.description?.trim() || "",
      location: body.location?.trim() || "",
      address: body.address?.trim() || "",
      pricePerNight: Number(body.pricePerNight) || 0,
      rating: 0,
      maxGuests: Number(body.maxGuests) || 1,
      bedrooms: Number(body.bedrooms) || 0,
      bathrooms: Number(body.bathrooms) || 0,
      area: Number(body.area) || 0,
      amenities: Array.isArray(body.amenities) ? body.amenities : [],
      images: Array.isArray(body.images) ? body.images : [],
      category: body.category,
      status: body.status || "PENDING_REVIEW",
      contactPhone: body.contactPhone?.trim() || "",
      contactEmail: body.contactEmail?.trim() || "",
      checkInTime: body.checkInTime || "14:00",
      checkOutTime: body.checkOutTime || "12:00",
      houseRules: body.houseRules?.trim() || "",
      cancellationPolicy: body.cancellationPolicy?.trim() || "",
      createdAt: now,
      updatedAt: now,
    };

    const { data: accommodation, error } = await supabaseAdmin
      .from("accommodations")
      .insert(newAccommodation)
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from("admin_audit_logs").insert({
      adminId: admin.userId,
      actionType: "OTHER",
      description: `ایجاد اقامتگاه اختصاصی: ${newAccommodation.title}`,
    });

    return NextResponse.json({ success: true, accommodation }, { status: 201 });

  } catch (error) {
    console.error("Admin Accommodation POST Error:", error);
    return NextResponse.json({ success: false, error: "خطا در ایجاد اقامتگاه" }, { status: 500 });
  }
}