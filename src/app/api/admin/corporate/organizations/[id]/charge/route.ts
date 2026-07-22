// مسیر: src/app/api/admin/corporate/organizations/[id]/charge/route.ts
//
// 🆕 بند ۲۷ (بازگشت کیف پول سازمانی به موجودی مستقل هر کارمند):
// این روت قبلاً روی یک استخر مشترک (organizations.walletBalance) کار می‌کرد.
// طبق درخواست صریح کارفرما، از این پس دیگر هیچ استخر مشترکی وجود ندارد؛ این
// دکمه («شارژ/کسر») حالا یعنی: «همین مبلغ را، به‌طور کامل و جداگانه، به کیف
// پول سازمانی مستقل تک‌تک پرسنل فعلی این سازمان اضافه/از آن کم کن» — دقیقاً
// مثل زمانی که کارفرما می‌گوید «نفری ۱۰ میلیون تومان شارژ کنید»، برای کارمندانی
// که از قبل در بالکن ثبت‌نام کرده‌اند.
//
// برای شارژ گروهی که هم‌زمان شامل کارمندانی می‌شود که هنوز ثبت‌نام نکرده‌اند،
// یا وقتی می‌خواهید یک لیست شماره‌موبایل دقیق (نه «همه پرسنل فعلی») را شارژ
// کنید، از ابزار جدید «شارژ گروهی از لیست شماره‌ها»
// (src/app/api/admin/corporate/organizations/[id]/bulk-charge-members/route.ts) استفاده کنید.
//
// برای کسر (WITHDRAWAL): هر کارمندی که موجودی سازمانی‌اش کمتر از مبلغ درخواستی
// باشد، رد می‌شود (skipped) و بقیه‌ی کارمندان طبیعی پردازش می‌شوند — تا یک نفر
// کم‌موجودی، مانع کسر از بقیه نشود.
//
// دسترسی: منحصراً SUPER_ADMIN (طبق سیاست مالی بالکن، همان سطح دسترسی wallet-adjust).

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole, logAdminAction } from "@/lib/auth/adminAuth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id: organizationId } = await params;
  const body = await request.json().catch(() => ({}));
  const { direction, amount, reason } = body as { direction?: string; amount?: number; reason?: string };

  if (direction !== "DEPOSIT" && direction !== "WITHDRAWAL") {
    return NextResponse.json({ success: false, error: "نوع عملیات نامعتبر است" }, { status: 400 });
  }
  const numericAmount = Number(amount);
  if (!numericAmount || numericAmount <= 0) {
    return NextResponse.json({ success: false, error: "مبلغ باید عددی مثبت باشد" }, { status: 400 });
  }
  if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
    return NextResponse.json(
      { success: false, error: "درج دلیل این تغییر دستی الزامی است (حداقل ۵ کاراکتر)" },
      { status: 400 }
    );
  }

  const { data: organization, error: fetchError } = await supabaseAdmin
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .maybeSingle();

  if (fetchError || !organization) {
    return NextResponse.json({ success: false, error: "سازمان مورد نظر یافت نشد" }, { status: 404 });
  }

  const { data: members, error: membersError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("userType", "ORGANIZATIONAL")
    .eq("organizationName", organization.name);

  if (membersError) {
    console.error("Organization Members Fetch Error:", membersError);
    return NextResponse.json({ success: false, error: "خطا در دریافت لیست پرسنل سازمان" }, { status: 500 });
  }

  if (!members || members.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error:
          "این سازمان هنوز هیچ پرسنل ثبت‌نام‌شده‌ای ندارد. برای شارژ افرادی که هنوز ثبت‌نام نکرده‌اند، از «شارژ گروهی از لیست شماره‌ها» استفاده کنید.",
      },
      { status: 400 }
    );
  }

  let chargedCount = 0;
  let skippedCount = 0;
  let totalAmountMoved = 0;

  for (let i = 0; i < members.length; i++) {
    const memberUserId = members[i].id;

    let { data: wallet } = await supabaseAdmin.from("wallets").select("*").eq("userId", memberUserId).maybeSingle();
    if (!wallet) {
      const { data: newWallet } = await supabaseAdmin.from("wallets").insert([{ userId: memberUserId }]).select().single();
      wallet = newWallet;
    }
    if (!wallet) {
      skippedCount++;
      continue;
    }

    const currentBalance = Number(wallet.orgBalance);
    const delta = direction === "DEPOSIT" ? numericAmount : -numericAmount;
    const newBalance = currentBalance + delta;

    if (newBalance < 0) {
      // موجودی این کارمند برای کسر کافی نیست — رد می‌شود، بقیه ادامه پیدا می‌کنند
      skippedCount++;
      continue;
    }

    const { data: updatedWallet } = await supabaseAdmin
      .from("wallets")
      .update({ orgBalance: newBalance, updatedAt: new Date().toISOString() })
      .eq("id", wallet.id)
      .eq("orgBalance", currentBalance)
      .select()
      .maybeSingle();

    if (!updatedWallet) {
      // موجودی هم‌زمان تغییر کرده بود؛ این نفر رد می‌شود، بقیه ادامه پیدا می‌کنند
      skippedCount++;
      continue;
    }

    const { error: txError } = await supabaseAdmin.from("transactions").insert([
      {
        walletId: wallet.id,
        organizationId: organization.id,
        amount: numericAmount,
        type: direction,
        walletType: "ORGANIZATIONAL",
        gatewayStatus: "SUCCESS",
        trackingCode: `ORG-MEMBERCHARGE-${admin.userId.slice(0, 8)}-${i}`,
      },
    ]);

    if (txError) {
      console.error("Org Member Charge Transaction Insert Error (rolled back for this member):", txError);
      await supabaseAdmin
        .from("wallets")
        .update({ orgBalance: currentBalance, updatedAt: new Date().toISOString() })
        .eq("id", wallet.id);
      skippedCount++;
      continue;
    }

    chargedCount++;
    totalAmountMoved += numericAmount;
  }

  // مجموع فعلی موجودی واقعی تمام پرسنل این سازمان (برای بازگرداندن به فرانت‌اند، جهت رفرش جدول)
  const { data: walletsAfter } = await supabaseAdmin
    .from("wallets")
    .select("orgBalance")
    .in("userId", members.map((m) => m.id));
  const totalMemberBalance = (walletsAfter || []).reduce((sum, w) => sum + Number(w.orgBalance), 0);

  await logAdminAction({
    adminId: admin.userId,
    actionType: "ORGANIZATION_CHANGE",
    description: `${direction === "DEPOSIT" ? "شارژ دستی" : "کسر دستی"} ${numericAmount.toLocaleString(
      "fa-IR"
    )} تومان ${direction === "DEPOSIT" ? "به" : "از"} کیف پول سازمانی هرکدام از پرسنل «${organization.name}» — ${chargedCount} نفر اعمال شد${
      skippedCount > 0 ? `، ${skippedCount} نفر رد شد (موجودی ناکافی یا خطا)` : ""
    } — دلیل: ${reason.trim()}`,
    previousValue: String(members.length),
    newValue: `${chargedCount} نفر شارژ شدند`,
  });

  return NextResponse.json({
    success: true,
    organization: { ...organization, walletBalance: totalMemberBalance, memberCount: members.length },
    chargedCount,
    skippedCount,
    totalAmountMoved,
    message: `عملیات روی ${chargedCount} نفر از پرسنل انجام شد${skippedCount > 0 ? ` (${skippedCount} نفر رد شدند)` : ""}`,
  });
}
