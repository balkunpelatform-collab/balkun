// مسیر: src/app/api/admin/corporate/organizations/route.ts
//
// 🆕 تسک ۷ چک‌لیست قدیمی: GET لیست تمام سازمان‌ها به همراه وضعیت فعال/غیرفعال،
// تنظیمات شارژ خودکار و تعداد پرسنل هر سازمان — منبع اصلی تب «کیف پول‌های
// سازمانی» در src/app/admin/corporate/page.tsx.
//
// 🆕 بند ۲۷ (بازگشت کیف پول سازمانی به موجودی مستقل هر کارمند):
// فیلد walletBalance که این روت برمی‌گرداند از این پس دیگر ستون خام
// organizations.walletBalance (که یک استخر مشترک بود و الان فقط برای پول
// «تخصیص‌نیافته» باقیمانده معنا دارد) نیست؛ به‌جایش همین‌جا، مجموع واقعیِ
// موجودی مستقل کیف پول تمام پرسنل ثبت‌نام‌شده‌ی همان سازمان (جمع wallets.orgBalance
// آن‌ها) محاسبه و برگردانده می‌شود. این کار عمداً انجام شده تا فرانت‌اند پنل
// ادمین (src/app/admin/corporate/page.tsx) بدون هیچ تغییری در نام فیلدها،
// همچنان عدد درست و به‌روز را نشان دهد — فقط معنایش عوض شده: از «یک استخر
// مشترک قابل‌خرج» به «مجموع گزارشی موجودی‌های مستقل و جداگانه‌ی هرکس».
//
// دسترسی: SUPER_ADMIN و FINANCE_MANAGER (فقط-خواندنی، مثل بقیه گزارش‌های مالی).

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

  // تمام کاربران سازمانی، به همراه شناسه (برای پیوند به کیف پول‌شان)
  const { data: orgUsers } = await supabaseAdmin
    .from("users")
    .select("id, organizationName")
    .eq("userType", "ORGANIZATIONAL");

  const userIds = (orgUsers || []).map((u) => u.id);

  // 🆕 بند ۲۷: موجودی مستقل تک‌تک همین کاربران، برای جمع‌زدن به تفکیک سازمان
  const { data: orgWallets } =
    userIds.length > 0
      ? await supabaseAdmin.from("wallets").select("userId, orgBalance").in("userId", userIds)
      : { data: [] as { userId: string; orgBalance: number }[] };

  const balanceByUserId: Record<string, number> = {};
  (orgWallets || []).forEach((w) => {
    balanceByUserId[w.userId] = Number(w.orgBalance);
  });

  const memberCounts: Record<string, number> = {};
  const totalBalanceByOrgName: Record<string, number> = {};
  (orgUsers || []).forEach((u) => {
    if (!u.organizationName) return;
    memberCounts[u.organizationName] = (memberCounts[u.organizationName] || 0) + 1;
    totalBalanceByOrgName[u.organizationName] =
      (totalBalanceByOrgName[u.organizationName] || 0) + (balanceByUserId[u.id] || 0);
  });

  const result = (organizations || []).map((org) => ({
    ...org,
    memberCount: memberCounts[org.name] || 0,
    // 🆕 بند ۲۷: جایگزین شد با مجموع موجودی مستقل پرسنل — نه استخر مشترک قدیمی
    walletBalance: totalBalanceByOrgName[org.name] || 0,
    // مبلغی که هنوز در ستون خام organizations.walletBalance مانده (پول تخصیص‌نیافته،
    // معمولاً باقیمانده‌ی خردِ تقسیم گام ۳ فایل sql/band-27-per-employee-wallet.sql،
    // یا سازمانی که هنوز هیچ پرسنلی ثبت‌نام نکرده)
    unallocatedPoolBalance: Number(org.walletBalance) || 0,
  }));

  return NextResponse.json({ success: true, organizations: result });
}
