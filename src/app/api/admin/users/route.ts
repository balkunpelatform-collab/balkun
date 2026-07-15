// مسیر: src/app/api/admin/users/route.ts
// GET: لیست کاربران با قابلیت جستجو بر اساس نام یا شماره موبایل (صفحه‌بندی سمت سرور طبق سند فاز ۹)
// 🆕 فیلتر اختیاری userType اضافه شد (مثلاً userType=ORGANIZATIONAL) تا تب «سازمانی»
// پنل ادمین بتواند فقط کاربران سازمانی را از همین یک منبع واحد نمایش دهد —
// بدون تکرار کوئری یا ساخت جدول/روت جدید.
// 🆕 تسک ۳ (دسترسی داشبورد برای مدیر مالی): نقش FINANCE_MANAGER هم به این روت
// (فقط GET / فقط-خواندنی) دسترسی گرفت تا بتواند لیست کاربران را ببیند. توجه: روت‌های
// نوشتنی روی کاربر (تغییر نقش/نوع/دسترسی/کیف پول در src/app/api/admin/users/[id]/*)
// دست‌نخورده باقی ماندند و همچنان منحصراً SUPER_ADMIN هستند — مدیر مالی فقط می‌بیند،
// چیزی را تغییر نمی‌دهد.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole } from "@/lib/auth/adminAuth";

export async function GET(request: Request) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN", "FINANCE_MANAGER"]);
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