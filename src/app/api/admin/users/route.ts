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
//
// 🔧 رفع تسک ۲۳ (فعال نشدن تیک سازمانی برای پشتیبان):
// قبلاً این روت فقط به SUPER_ADMIN و FINANCE_MANAGER اجازه‌ی ورود می‌داد. یعنی حتی اگر
// سوپرادمین از صفحه‌ی مدیریت کاربر (admin/users/[id]) تیکِ تب «سازمانی» (corporate) را
// برای یک پشتیبان (SUPPORT_AGENT) فعال می‌کرد، بخش «کاربران سازمانی فعال» در تب سازمانی
// (src/app/admin/corporate/page.tsx) همچنان با خطای ۴۰۳ روبرو می‌شد — چون این روت اصلاً
// نقش SUPPORT_AGENT را در requireAdminRole نمی‌پذیرفت. یعنی تیک در دیتابیس درست ذخیره و
// اعمال می‌شد، اما هیچ‌وقت واقعاً «فعال» (کاربردی) نمی‌شد.
//
// راه‌حل: اگر ادمین SUPER_ADMIN یا FINANCE_MANAGER نیست، حالا با requireAdminTabAccess
// بررسی می‌کنیم که آیا او یک SUPPORT_AGENT با دسترسی تب «corporate» است — و اگر بله،
// اجازه‌ی ورود می‌دهیم، اما فقط وقتی درخواست صریحاً userType=ORGANIZATIONAL باشد (یعنی
// دقیقاً همان چیزی که بخش «کاربران سازمانی فعال» می‌فرستد)، نه کل لیست کاربران سایت.
// همچنین در همین حالت، ستون حساس role از پاسخ حذف می‌شود تا پشتیبان به اطلاعات نقش
// سایر کاربران (که ربطی به کار او ندارد) دسترسی پیدا نکند. SUPER_ADMIN و FINANCE_MANAGER
// دقیقاً مثل قبل، دسترسی کامل و بدون این محدودیت دارند.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole, requireAdminTabAccess } from "@/lib/auth/adminAuth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";
  const userType = searchParams.get("userType")?.trim() || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let admin = await requireAdminRole(request, ["SUPER_ADMIN", "FINANCE_MANAGER"]);

  // 🔧 تسک ۲۳: مسیر دسترسیِ دوم — پشتیبانی (SUPPORT_AGENT) که تب «سازمانی» به او
  // واگذار شده، فقط برای مشاهده‌ی کاربران سازمانی (نه کل لیست کاربران) مجاز است.
  let isCorporateRestrictedAccess = false;
  if (!admin && userType === "ORGANIZATIONAL") {
    admin = await requireAdminTabAccess(request, "corporate");
    if (admin) isCorporateRestrictedAccess = true;
  }

  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  // پشتیبانِ محدودشده به تب سازمانی، ستون role را در پاسخ نمی‌بیند (اطلاعات نقش سایر
  // کاربران به کارش مربوط نیست)؛ SUPER_ADMIN/FINANCE_MANAGER مثل قبل کامل می‌بینند.
  const selectFields = isCorporateRestrictedAccess
    ? "id, phoneNumber, firstName, lastName, userType, organizationName, isActive, joinedAt"
    : "id, phoneNumber, firstName, lastName, userType, organizationName, role, isActive, joinedAt";

  let query = supabaseAdmin
    .from("users")
    .select(selectFields, { count: "exact" })
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