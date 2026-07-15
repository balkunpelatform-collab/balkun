// مسیر: src/app/api/admin/corporate/numbers/route.ts
// GET: لیست شماره‌های سفید سازمانی (organizational_numbers) — همان شماره‌هایی
// که در لحظه ثبت‌نام به‌صورت خودکار userType=ORGANIZATIONAL می‌گیرند
// (src/app/api/auth/register/route.ts این جدول را می‌خواند).
// POST: افزودن شماره جدید به این لیست سفید.
//
// 🆕 تسک ۷ چک‌لیست کارفرما (تفکیک کیف پول سازمانی + شارژ خودکار + غیرفعال‌سازی سازمان):
// بعد از افزودن موفق یک شماره جدید، اگر نام سازمان آن هنوز در جدول جدید `organizations`
// وجود نداشته باشد، همین‌جا ساخته می‌شود (ensureOrganizationExists) تا بلافاصله در تب
// «کیف پول‌های سازمانی» پنل ادمین قابل مدیریت باشد — نیازی نیست منتظر ثبت‌نام واقعی
// کاربر بمانیم.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminTabAccess, logAdminAction } from "@/lib/auth/adminAuth";
import { ensureOrganizationExists } from "@/lib/wallet/ensureOrganization";

export async function GET(request: NextRequest) {
  const admin = await requireAdminTabAccess(request, "corporate");
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from("organizational_numbers")
    .select("*", { count: "exact" })
    .order("createdAt", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(`phoneNumber.ilike.%${search}%,organizationName.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Admin Corporate Numbers Fetch Error:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت لیست شماره‌های سازمانی" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    numbers: data || [],
    pagination: { page, pageSize, total: count || 0 },
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminTabAccess(request, "corporate");
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const body = await request.json();
  const { phoneNumber, organizationName } = body as { phoneNumber?: string; organizationName?: string };

  const phoneRegex = /^09[0-9]{9}$/;
  if (!phoneNumber || !phoneRegex.test(phoneNumber)) {
    return NextResponse.json({ success: false, error: "شماره موبایل وارد شده معتبر نیست" }, { status: 400 });
  }
  if (!organizationName || organizationName.trim().length < 2) {
    return NextResponse.json({ success: false, error: "نام سازمان الزامی است" }, { status: 400 });
  }

  const { data: newNumber, error } = await supabaseAdmin
    .from("organizational_numbers")
    .insert([{ phoneNumber, organizationName: organizationName.trim() }])
    .select()
    .single();

  if (error) {
    // کد ۲۳۵۰۵ پستگرس یعنی نقض محدودیت یکتا بودن (این شماره قبلاً در لیست هست)
    if (error.code === "23505") {
      return NextResponse.json({ success: false, error: "این شماره موبایل قبلاً در لیست سفید سازمانی ثبت شده است" }, { status: 409 });
    }
    console.error("Admin Corporate Number Insert Error:", error);
    return NextResponse.json({ success: false, error: "خطا در افزودن شماره سازمانی" }, { status: 500 });
  }

  // 🆕 تسک ۷: تضمین وجود ردیف سازمان (برای کیف پول مشترک سازمانی)
  await ensureOrganizationExists(organizationName.trim());

  await logAdminAction({
    adminId: admin.userId,
    actionType: "CORPORATE_NUMBER_CHANGE",
    description: `افزودن شماره ${phoneNumber} به لیست سفید سازمانی (${organizationName.trim()})`,
    newValue: phoneNumber,
  });

  return NextResponse.json({ success: true, number: newNumber });
}