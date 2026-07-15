// مسیر: src/app/api/admin/corporate/organizations/auto-charge/route.ts
// این فایل جدید است — آن را در مسیر بالا در پروژه ایجاد کنید.
//
// 🆕 تسک ۷ چک‌لیست کارفرما (تفکیک کیف پول سازمانی + شارژ خودکار + غیرفعال‌سازی سازمان):
// اجرای دسته‌جمعی «شارژ خودکار» کیف پول سازمان‌هایی که این قابلیت برایشان فعال است.
// این روت هر سازمانی را که autoChargeEnabled=true و isActive=true دارد و از آخرین
// شارژ خودکارش (lastAutoChargeAt) به‌اندازه‌ی autoChargeIntervalDays گذشته (یا اصلاً
// هنوز شارژ خودکاری نداشته)، به‌مقدار autoChargeAmount شارژ می‌کند.
//
// دو راه فراخوانی:
//  ۱) دستی از پنل ادمین (دکمه‌ی «اجرای شارژ خودکار الان» در تب «کیف پول‌های سازمانی») —
//     نیازمند نشست SUPER_ADMIN.
//  ۲) زمان‌بندی‌شده (مثلاً Vercel Cron روزانه) — با ارسال هدر x-cron-secret برابر با
//     مقدار متغیر محیطی CRON_SECRET (باید در .env.local و تنظیمات Vercel اضافه شود).
//     اگر CRON_SECRET تنظیم نشده باشد، این مسیر فراخوانی زمان‌بندی‌شده را نمی‌پذیرد و
//     فقط از طریق پنل ادمین (SUPER_ADMIN) قابل اجراست — یعنی همین امروز، بدون هیچ
//     تنظیم اضافه‌ای، دکمه‌ی دستی در پنل ادمین کاملاً کار می‌کند.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole, logAdminAction } from "@/lib/auth/adminAuth";

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = request.headers.get("x-cron-secret");
  const isCronCall = Boolean(cronSecret) && providedSecret === cronSecret;

  let triggeredByAdminId: string | null = null;
  if (!isCronCall) {
    const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
    if (!admin) {
      return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
    }
    triggeredByAdminId = admin.userId;
  }

  const { data: dueOrganizations, error } = await supabaseAdmin
    .from("organizations")
    .select("*")
    .eq("autoChargeEnabled", true)
    .eq("isActive", true)
    .gt("autoChargeAmount", 0);

  if (error) {
    console.error("Auto-Charge Fetch Error:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت لیست سازمان‌ها" }, { status: 500 });
  }

  const now = Date.now();
  const results: { organizationId: string; name: string; status: "charged" | "skipped" }[] = [];

  for (const org of dueOrganizations || []) {
    const intervalMs = (org.autoChargeIntervalDays || 30) * 24 * 60 * 60 * 1000;
    const lastChargeMs = org.lastAutoChargeAt ? new Date(org.lastAutoChargeAt).getTime() : null;
    const isDue = lastChargeMs === null || now - lastChargeMs >= intervalMs;

    if (!isDue) {
      results.push({ organizationId: org.id, name: org.name, status: "skipped" });
      continue;
    }

    const amount = Number(org.autoChargeAmount);
    const newBalance = Number(org.walletBalance) + amount;
    const nowIso = new Date().toISOString();

    // به‌روزرسانی شرطی (CAS) روی موجودی، تا اگر هم‌زمان یک شارژ/کسر دستی دیگر رخ داده بود این دور رد شود
    const { data: updatedOrg } = await supabaseAdmin
      .from("organizations")
      .update({ walletBalance: newBalance, lastAutoChargeAt: nowIso, updatedAt: nowIso })
      .eq("id", org.id)
      .eq("walletBalance", org.walletBalance)
      .select()
      .maybeSingle();

    if (!updatedOrg) {
      // موجودی هم‌زمان تغییر کرده بود؛ این دور را رد می‌کنیم، دفعه‌ی بعدِ اجرای این روت دوباره امتحان می‌شود
      results.push({ organizationId: org.id, name: org.name, status: "skipped" });
      continue;
    }

    await supabaseAdmin.from("transactions").insert([
      {
        walletId: null,
        organizationId: org.id,
        amount,
        type: "DEPOSIT",
        walletType: "ORGANIZATIONAL",
        gatewayStatus: "SUCCESS",
        trackingCode: `ORG-AUTOCHARGE-${org.id.slice(0, 8)}`,
      },
    ]);

    results.push({ organizationId: org.id, name: org.name, status: "charged" });
  }

  const chargedCount = results.filter((r) => r.status === "charged").length;

  // ثبت لاگ ممیزی فقط وقتی توسط یک ادمین واقعی (نه Cron) اجرا شده — چون ستون adminId جدول
  // admin_audit_logs به جدول users ارجاع دارد و نمی‌تواند شناسه‌ی سیستمی/غیرکاربری بگیرد.
  if (chargedCount > 0 && triggeredByAdminId) {
    await logAdminAction({
      adminId: triggeredByAdminId,
      actionType: "ORGANIZATION_CHANGE",
      description: `اجرای دستی شارژ خودکار سازمان‌ها از پنل ادمین: ${chargedCount} سازمان شارژ شد`,
      newValue: `${chargedCount} سازمان`,
    });
  }

  return NextResponse.json({ success: true, results, chargedCount });
}