// مسیر: src/app/api/admin/users/route.ts
// GET: لیست کاربران با قابلیت جستجو بر اساس نام یا شماره موبایل (صفحه‌بندی سمت سرور طبق سند فاز ۹)
// 🆕 فیلتر اختیاری userType اضافه شد (مثلاً userType=ORGANIZATIONAL) تا تب «سازمانی»
// پنل ادمین بتواند فقط کاربران سازمانی را از همین یک منبع واحد نمایش دهد —
// بدون تکرار کوئری یا ساخت جدول/روت جدید. دسترسی همچنان فقط SUPER_ADMIN است
// (بدون تغییر نسبت به قبل)، چون این روت اطلاعات نقش کاربران را هم برمی‌گرداند.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole } from "@/lib/auth/adminAuth";

export async function GET(request: Request) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";
  const userType = searchParams.get("userType")?.trim() || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from("users")
    .select("id, phoneNumber, firstName, lastName, userType, organizationName, role, isActive, joinedAt", { count: "exact" })
    .order("joinedAt", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(
      `phoneNumber.ilike.%${search}%,firstName.ilike.%${search}%,lastName.ilike.%${search}%`
    );
  }

  if (userType === "ORGANIZATIONAL" || userType === "NORMAL") {
    query = query.eq("userType", userType);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: "خطا در دریافت لیست کاربران" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    users: data,
    pagination: { page, pageSize, total: count || 0 },
  });
}