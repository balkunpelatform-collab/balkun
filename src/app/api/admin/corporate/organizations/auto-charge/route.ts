// مسیر: src/app/api/admin/corporate/organizations/auto-charge/route.ts
//
// 🆕 بند ۲۷ (بازگشت کیف پول سازمانی به موجودی مستقل هر کارمند):
// شارژ خودکار دوره‌ای هم مثل شارژ دستی از این پس دیگر یک استخر مشترک را شارژ
// نمی‌کند؛ برای هر سازمانی که شارژ خودکارش فعال و سررسیدش رسیده، مبلغ
// autoChargeAmount به‌طور کامل و جداگانه به کیف پول سازمانی مستقل تک‌تک
// پرسنل فعلی آن سازمان اضافه می‌شود.
//
// این روت هم از دکمه‌ی «اجرای شارژ خودکار الان» در پنل ادمین (توسط SUPER_ADMIN)
// و هم از یک Cron Job روزانه (با هدر x-cron-secret) صدا زده می‌شود — دقیقاً
// همان دو مسیر دسترسی قبلی، بدون تغییر.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole, logAdminAction } from "@/lib/auth/adminAuth";

function isDue(lastAutoChargeAt: string | null, intervalDays: number): boolean {
  if (!lastAutoChargeAt) return true;
  const last = new Date(lastAutoChargeAt).getTime();
  const now = Date.now();
  const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
  return now - last >= intervalMs;
}

async function runAutoCharge(): Promise<{ chargedCount: number; details: string[] }> {
  const { data: organizations, error } = await supabaseAdmin
    .from("organizations")
    .select("*")
    .eq("autoChargeEnabled", true)
    .eq("isActive", true)
    .gt("autoChargeAmount", 0);

  if (error || !organizations) {
    console.error("Auto Charge Fetch Organizations Error:", error);
    return { chargedCount: 0, details: [] };
  }

  const dueOrganizations = organizations.filter((org) => isDue(org.lastAutoChargeAt, org.autoChargeIntervalDays));

  let chargedCount = 0;
  const details: string[] = [];

  for (const org of dueOrganizations) {
    const { data: members } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("userType", "ORGANIZATIONAL")
      .eq("organizationName", org.name);

    if (!members || members.length === 0) {
      details.push(`«${org.name}»: بدون پرسنل ثبت‌نام‌شده — رد شد`);
      continue; // سازمانی بدون پرسنل؛ lastAutoChargeAt هم به‌روز نمی‌شود تا وقتی پرسنلی اضافه شد، دوباره امتحان شود
    }

    let memberChargedCount = 0;
    for (let i = 0; i < members.length; i++) {
      const memberUserId = members[i].id;

      let { data: wallet } = await supabaseAdmin.from("wallets").select("*").eq("userId", memberUserId).maybeSingle();
      if (!wallet) {
        const { data: newWallet } = await supabaseAdmin.from("wallets").insert([{ userId: memberUserId }]).select().single();
        wallet = newWallet;
      }
      if (!wallet) continue;

      const currentBalance = Number(wallet.orgBalance);
      const newBalance = currentBalance + Number(org.autoChargeAmount);

      const { data: updatedWallet } = await supabaseAdmin
        .from("wallets")
        .update({ orgBalance: newBalance, updatedAt: new Date().toISOString() })
        .eq("id", wallet.id)
        .eq("orgBalance", currentBalance)
        .select()
        .maybeSingle();

      if (!updatedWallet) continue;

      await supabaseAdmin.from("transactions").insert([
        {
          walletId: wallet.id,
          organizationId: org.id,
          amount: Number(org.autoChargeAmount),
          type: "DEPOSIT",
          walletType: "ORGANIZATIONAL",
          gatewayStatus: "SUCCESS",
          trackingCode: `ORG-AUTOCHARGE-${org.id.slice(0, 8)}-${i}`,
        },
      ]);

      memberChargedCount++;
    }

    await supabaseAdmin
      .from("organizations")
      .update({ lastAutoChargeAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .eq("id", org.id);

    chargedCount++;
    details.push(`«${org.name}»: ${memberChargedCount} نفر از پرسنل، هرکدام ${Number(org.autoChargeAmount).toLocaleString("fa-IR")} تومان شارژ شدند`);
  }

  return { chargedCount, details };
}

// اجرای دستی از پنل ادمین (دکمه‌ی «اجرای شارژ خودکار الان»)
export async function POST(request: NextRequest) {
  // مسیر ۱: فراخوانی از یک Cron Job زمان‌بندی‌شده (بدون نشست ادمین، فقط با یک رمز مشترک)
  const cronSecretHeader = request.headers.get("x-cron-secret");
  const expectedCronSecret = process.env.CRON_SECRET;

  if (expectedCronSecret && cronSecretHeader === expectedCronSecret) {
    const { chargedCount, details } = await runAutoCharge();
    return NextResponse.json({ success: true, chargedCount, details, source: "cron" });
  }

  // مسیر ۲: فراخوانی دستی توسط SUPER_ADMIN از پنل ادمین
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { chargedCount, details } = await runAutoCharge();

  if (chargedCount > 0) {
    await logAdminAction({
      adminId: admin.userId,
      actionType: "ORGANIZATION_CHANGE",
      description: `اجرای دستی شارژ خودکار سازمان‌ها: ${chargedCount} سازمان شارژ شدند.\n${details.join("\n")}`,
      newValue: `${chargedCount} سازمان`,
    });
  }

  return NextResponse.json({ success: true, chargedCount, details, source: "manual" });
}
