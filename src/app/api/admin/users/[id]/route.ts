// مسیر: src/app/api/admin/users/[id]/route.ts
// GET: جزئیات کامل یک کاربر برای صفحه پروفایل کاربر در پنل ادمین —
// شامل اطلاعات پایه، موجودی کیف پول، ۱۰ تراکنش اخیر و ۱۰ رزرو اخیر (یعنی «فعالیت کاربر»).
// 🆕 تسک ۳ (دسترسی داشبورد برای مدیر مالی): نقش FINANCE_MANAGER به این روت (فقط GET)
// اضافه شد تا «مشاهده کاربران و فعالیت کاربران» طبق چک‌لیست فراهم شود. سایر روت‌های
// همین پوشه (role, type, permissions, wallet-adjust) که نوشتنی/حساس هستند دست‌نخورده و
// منحصراً SUPER_ADMIN باقی ماندند.
//
// 🔧 اصلاحیه (۲۰۲۶/۰۷/۱۵) — رفع باگ «کارت موجودی سازمانی همیشه ۰» در صفحه‌ی جزئیات کاربر:
// از زمان تسک ۷ چک‌لیست کارفرما (تفکیک کیف پول سازمانی)، موجودی واقعی کاربران سازمانی
// دیگر در wallets.orgBalance نگه‌داری نمی‌شود (آن ستون همیشه ۰ است) بلکه در استخر مشترک
// organizations.walletBalance ذخیره می‌شود. این روت حالا، اگر کاربر سازمانی باشد، سازمان
// مربوطه را هم واکشی و در پاسخ برمی‌گرداند تا فرانت‌اند بتواند موجودی واقعی را نمایش دهد.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole } from "@/lib/auth/adminAuth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN", "FINANCE_MANAGER"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id: targetUserId } = await params;

  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", targetUserId)
    .maybeSingle();

  if (userError || !user) {
    return NextResponse.json({ success: false, error: "کاربر مورد نظر یافت نشد" }, { status: 404 });
  }

  const { data: wallet } = await supabaseAdmin
    .from("wallets")
    .select("*")
    .eq("userId", targetUserId)
    .maybeSingle();

  // 🆕 موجودی واقعی کیف پول سازمانی (استخر مشترک) — فقط برای کاربران سازمانی که
  // سازمانشان از قبل در جدول organizations ثبت شده باشد؛ در غیر این صورت null
  // می‌ماند و فرانت‌اند پیام «سازمان هنوز ثبت نشده» را نشان می‌دهد.
  const { data: organization } =
    user.userType === "ORGANIZATIONAL" && user.organizationName
      ? await supabaseAdmin
          .from("organizations")
          .select("id, name, isActive, walletBalance, autoChargeEnabled, autoChargeAmount, autoChargeIntervalDays")
          .eq("name", user.organizationName)
          .maybeSingle()
      : { data: null };

  const [{ data: transactions }, { data: bookings }] = await Promise.all([
    wallet
      ? supabaseAdmin
          .from("transactions")
          .select("*")
          .eq("walletId", wallet.id)
          .order("createdAt", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("userId", targetUserId)
      .order("createdAt", { ascending: false })
      .limit(10),
  ]);

  return NextResponse.json({
    success: true,
    user,
    wallet: wallet || null,
    organization: organization || null,
    recentTransactions: transactions ?? [],
    recentBookings: bookings ?? [],
  });
}