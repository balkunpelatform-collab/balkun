// مسیر: src/app/api/admin/users/[id]/wallet-adjust/route.ts
// شارژ/کسر دستی کیف پول توسط ادمین طبق بخش ۲ سند فاز ۹.
// طبق سیاست مالی بالکن، کاربران هرگز نمی‌توانند موجودی را برداشت کنند؛ این مسیر فقط برای
// شرایط خاص پشتیبانی (مثل جبران خسارت یا اصلاح خطا) است و ثبت لاگ اجباری در admin_audit_logs دارد.
// دسترسی: فقط SUPER_ADMIN (عملیات مالی حساس طبق بخش ۵ سند فاز ۹).
//
// 🆕 تسک ۷ چک‌لیست کارفرما (تفکیک کیف پول سازمانی + شارژ خودکار + غیرفعال‌سازی سازمان):
// از این پس این صفحه دیگر به‌طور مستقیم روی wallets.orgBalance (که دیگر استفاده نمی‌شود)
// کار نمی‌کند. وقتی walletType=ORGANIZATIONAL انتخاب شود:
//   ۱. کاربر هدف باید واقعاً سازمانی باشد و سازمانش در جدول `organizations` وجود داشته باشد.
//   ۲. شارژ/کسر روی موجودی مشترک همان سازمان (organizations.walletBalance) اعمال می‌شود —
//      یعنی این عملیات روی کل پرسنل آن سازمان اثر می‌گذارد، نه فقط کاربر انتخاب‌شده.
//   ۳. برای شارژ/کسر مستقل از یک کاربر خاص (بدون نیاز به رفتن به صفحه‌ی یک کاربر مشخص)،
//      از تب جدید «کیف پول‌های سازمانی» در src/app/admin/corporate/page.tsx (که به
//      src/app/api/admin/corporate/organizations/[id]/charge/route.ts وصل است) استفاده کنید.
// شارژ/کسر کیف پول شخصی (NORMAL) هیچ تغییری نکرده است.
//
// 🔧 اصلاحیه قبلی (بدون تغییر): متن لاگ ادمین برای هر دو حالت شارژ (DEPOSIT) و کسر
// (WITHDRAWAL) اصلاح‌شده باقی مانده است.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole, logAdminAction } from "@/lib/auth/adminAuth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
    if (!admin) {
      return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const { id: targetUserId } = await params;
    const body = await request.json();
    const { walletType, direction, amount, reason } = body;

    if (walletType !== "NORMAL" && walletType !== "ORGANIZATIONAL") {
      return NextResponse.json({ success: false, error: "نوع کیف پول نامعتبر است" }, { status: 400 });
    }
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

    const { data: targetUser, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, firstName, lastName, phoneNumber, userType, organizationName")
      .eq("id", targetUserId)
      .maybeSingle();

    if (userError || !targetUser) {
      return NextResponse.json({ success: false, error: "کاربر مورد نظر یافت نشد" }, { status: 404 });
    }

    // ==================================================================
    // مسیر ۱: شارژ/کسر کیف پول مشترک سازمانی (اثرگذار روی کل پرسنل سازمان)
    // ==================================================================
    if (walletType === "ORGANIZATIONAL") {
      if (targetUser.userType !== "ORGANIZATIONAL" || !targetUser.organizationName) {
        return NextResponse.json(
          { success: false, error: "این کاربر سازمانی نیست؛ کیف پول سازمانی برای او تعریف نشده است" },
          { status: 400 }
        );
      }

      const { data: organization, error: orgError } = await supabaseAdmin
        .from("organizations")
        .select("*")
        .eq("name", targetUser.organizationName)
        .maybeSingle();

      if (orgError || !organization) {
        return NextResponse.json(
          { success: false, error: "سازمان این کاربر هنوز در سیستم کیف پول ثبت نشده است" },
          { status: 404 }
        );
      }

      const currentOrgBalance = Number(organization.walletBalance);
      const delta = direction === "DEPOSIT" ? numericAmount : -numericAmount;
      const newOrgBalance = currentOrgBalance + delta;

      if (newOrgBalance < 0) {
        return NextResponse.json(
          { success: false, error: "موجودی کیف پول سازمان برای این مقدار کسر کافی نیست" },
          { status: 400 }
        );
      }

      const { data: updatedOrganization, error: orgUpdateError } = await supabaseAdmin
        .from("organizations")
        .update({ walletBalance: newOrgBalance, updatedAt: new Date().toISOString() })
        .eq("id", organization.id)
        .eq("walletBalance", currentOrgBalance)
        .select()
        .maybeSingle();

      if (orgUpdateError || !updatedOrganization) {
        return NextResponse.json(
          { success: false, error: "موجودی سازمان هم‌زمان تغییر کرده است. لطفاً دوباره تلاش کنید." },
          { status: 409 }
        );
      }

      // کیف پول شخصی کاربر انتخاب‌شده فقط برای پیوست‌کردن walletId به تراکنش لازم است
      // (تا این تراکنش هم در صفحه‌ی «تاریخچه کیف پول» کاربر و هم گزارش‌های سازمانی دیده شود)
      let { data: personalWallet } = await supabaseAdmin.from("wallets").select("*").eq("userId", targetUserId).maybeSingle();
      if (!personalWallet) {
        const { data: newWallet } = await supabaseAdmin.from("wallets").insert([{ userId: targetUserId }]).select().single();
        if (newWallet) personalWallet = newWallet;
      }

      const { error: txError } = await supabaseAdmin.from("transactions").insert([
        {
          walletId: personalWallet ? personalWallet.id : null,
          organizationId: organization.id,
          amount: numericAmount,
          type: direction,
          walletType: "ORGANIZATIONAL",
          gatewayStatus: "SUCCESS",
          trackingCode: `ADMIN-MANUAL-${admin.userId.slice(0, 8)}`,
        },
      ]);

      if (txError) {
        console.error("Admin Org Wallet Transaction Insert Error:", txError);
        // Rollback موجودی سازمان
        await supabaseAdmin
          .from("organizations")
          .update({ walletBalance: currentOrgBalance, updatedAt: new Date().toISOString() })
          .eq("id", organization.id);
        return NextResponse.json({ success: false, error: "خطا در ثبت تراکنش" }, { status: 500 });
      }

      await logAdminAction({
        adminId: admin.userId,
        actionType: "WALLET_ADJUST",
        targetUserId,
        description: `${direction === "DEPOSIT" ? "شارژ دستی" : "کسر دستی"} ${numericAmount.toLocaleString(
          "fa-IR"
        )} تومان ${direction === "DEPOSIT" ? "به" : "از"} کیف پول مشترک سازمانِ «${targetUser.organizationName}» (از طریق پروفایل کاربر ${
          targetUser.firstName
        } ${targetUser.lastName} — ${targetUser.phoneNumber}) — دلیل: ${reason.trim()}`,
        previousValue: String(currentOrgBalance),
        newValue: String(newOrgBalance),
      });

      // پاسخ در همان قالب قبلی (wallet) برگردانده می‌شود تا فرانت‌اند فعلی بدون تغییر کار کند؛
      // فقط orgBalance آن از این پس همیشه ۰ خواهد بود (چون دیگر معنا ندارد) و موجودی واقعی
      // سازمانی را باید از پاسخ organization بخوانید.
      return NextResponse.json({
        success: true,
        wallet: personalWallet,
        organization: updatedOrganization,
        message: "موجودی کیف پول مشترک سازمان با موفقیت به‌روزرسانی شد",
      });
    }

    // ==================================================================
    // مسیر ۲: شارژ/کسر کیف پول شخصی (NORMAL) — بدون تغییر نسبت به قبل
    // ==================================================================
    let { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("userId", targetUserId)
      .maybeSingle();

    if (walletError) {
      console.error("Admin Wallet Fetch Error:", walletError);
      throw new Error("خطا در دریافت کیف پول");
    }

    if (!wallet) {
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from("wallets")
        .insert([{ userId: targetUserId }])
        .select()
        .single();
      if (createError) throw new Error("خطا در ایجاد کیف پول");
      wallet = newWallet;
    }

    const currentBalance = Number(wallet.normalBalance);
    const delta = direction === "DEPOSIT" ? numericAmount : -numericAmount;
    const newBalance = currentBalance + delta;

    if (newBalance < 0) {
      return NextResponse.json(
        { success: false, error: "موجودی کیف پول کاربر برای این مقدار کسر کافی نیست" },
        { status: 400 }
      );
    }

    const { data: updatedWallet, error: updateError } = await supabaseAdmin
      .from("wallets")
      .update({ normalBalance: newBalance, updatedAt: new Date().toISOString() })
      .eq("id", wallet.id)
      .select()
      .single();

    if (updateError) {
      console.error("Admin Wallet Update Error:", updateError);
      throw new Error("خطا در به‌روزرسانی موجودی");
    }

    const { error: txError } = await supabaseAdmin.from("transactions").insert([
      {
        walletId: wallet.id,
        amount: numericAmount,
        type: direction,
        walletType: "NORMAL",
        gatewayStatus: "SUCCESS",
        trackingCode: `ADMIN-MANUAL-${admin.userId.slice(0, 8)}`,
      },
    ]);

    if (txError) {
      console.error("Admin Wallet Transaction Insert Error:", txError);
      throw new Error("خطا در ثبت تراکنش");
    }

    await logAdminAction({
      adminId: admin.userId,
      actionType: "WALLET_ADJUST",
      targetUserId,
      description: `${direction === "DEPOSIT" ? "شارژ دستی" : "کسر دستی"} ${numericAmount.toLocaleString(
        "fa-IR"
      )} تومان ${direction === "DEPOSIT" ? "به" : "از"} کیف پول عادی کاربر ${targetUser.firstName} ${
        targetUser.lastName
      } (${targetUser.phoneNumber}) — دلیل: ${reason.trim()}`,
      previousValue: String(currentBalance),
      newValue: String(newBalance),
    });

    return NextResponse.json({ success: true, wallet: updatedWallet, message: "موجودی با موفقیت به‌روزرسانی شد" });
  } catch (error) {
    console.error("Wallet Adjust API Error:", error);
    return NextResponse.json({ success: false, error: "خطا در پردازش درخواست" }, { status: 500 });
  }
}