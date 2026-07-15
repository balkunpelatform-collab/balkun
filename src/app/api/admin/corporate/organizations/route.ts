// مسیر: src/app/api/admin/corporate/organizations/route.ts
// این فایل جدید است — آن را در مسیر بالا در پروژه ایجاد کنید.
//
// 🆕 تسک ۷ چک‌لیست کارفرما (تفکیک کیف پول سازمانی + شارژ خودکار + غیرفعال‌سازی سازمان):
// GET: لیست تمام سازمان‌ها به همراه موجودی کیف پول مشترک، وضعیت فعال/غیرفعال،
// تنظیمات شارژ خودکار و تعداد پرسنل هر سازمان — منبع اصلی تب جدید «کیف پول‌های
// سازمانی» در src/app/admin/corporate/page.tsx.
//
// دسترسی: SUPER_ADMIN و FINANCE_MANAGER (فقط-خواندنی، مثل بقیه گزارش‌های مالی —
// تسک‌های ۱ و ۴ چک‌لیست). عملیات نوشتنی (شارژ دستی، فعال/غیرفعال‌سازی، تنظیم شارژ
// خودکار) در organizations/[id]/route.ts و organizations/[id]/charge/route.ts قرار
// دارند و طبق سیاست مالی بالکن منحصراً SUPER_ADMIN هستند.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole } from "@/lib/auth/adminAuth";

export async function GET(request: NextRequest) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN", "FINANCE_MANAGER"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";

  let query = supabaseAdmin.from("organizations").select("*").order("name", { ascending: true });
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data: organizations, error } = await query;

  if (error) {
    console.error("Admin Organizations Fetch Error:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت لیست سازمان‌ها" }, { status: 500 });
  }

  // تعداد پرسنل هر سازمان (کاربرانی که userType=ORGANIZATIONAL و organizationName منطبق دارند)
  const { data: orgUsers } = await supabaseAdmin
    .from("users")
    .select("organizationName")
    .eq("userType", "ORGANIZATIONAL");

  const memberCounts: Record<string, number> = {};
  (orgUsers || []).forEach((u) => {
    if (!u.organizationName) return;
    memberCounts[u.organizationName] = (memberCounts[u.organizationName] || 0) + 1;
  });

  const result = (organizations || []).map((org) => ({
    ...org,
    memberCount: memberCounts[org.name] || 0,
  }));

  return NextResponse.json({ success: true, organizations: result });
}