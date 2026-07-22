// مسیر: src/app/api/admin/users/[id]/wallet-adjust/route.ts
// شارژ/کسر دستی کیف پول توسط ادمین طبق بخش ۲ سند فاز ۹.
// طبق سیاست مالی بالکن، کاربران هرگز نمی‌توانند موجودی را برداشت کنند؛ این مسیر فقط برای
// شرایط خاص پشتیبانی (مثل جبران خسارت یا اصلاح خطا) است و ثبت لاگ اجباری در admin_audit_logs دارد.
// دسترسی: فقط SUPER_ADMIN (عملیات مالی حساس طبق بخش ۵ سند فاز ۹).
//
// 🆕 بند ۲۷ (بازگشت کیف پول سازمانی به موجودی مستقل هر کارمند):
// از این پس، وقتی walletType=ORGANIZATIONAL انتخاب شود، شارژ/کسر دقیقاً روی
// موجودی مستقل خودِ همان یک کاربر انتخاب‌شده (wallets.orgBalance) اعمال می‌شود —
// نه روی یک استخر مشترک بین کل پرسنل سازمانش. یعنی این عملیات، دقیقاً مثل
// شارژ/کسر کیف پول شخصی (NORMAL)، فقط و فقط روی همین یک کاربر اثر دارد.
// برای شارژ گروهی چند کارمند با یک لیست شماره‌موبایل، از ابزار جدید «شارژ
// گروهی از لیست شماره‌ها» (src/app/api/admin/corporate/organizations/[id]/bulk-charge-members/route.ts)
// در تب «کیف پول‌های سازمانی» استفاده کنید.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole, logAdminAction } from "@/lib/auth/adminAuth";
import { getOrCreateOrganizationId } from "@/lib/wallet/ensureOrganization";

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
    // مسیر ۱: شارژ/کسر کیف پول سازمانی مستقل همین یک کاربر
    // ==================================================================
    if (walletType === "ORGANIZATIONAL") {
      if (targetUser.userType !== "ORGANIZATIONAL" || !targetUser.organizationName) {
        return NextResponse.json(
          { success: false, error: "این کاربر سازمانی نیست؛ کیف پول سازمانی برای او تعریف نشده است" },
          { status: 400 }
        );
      }

      // تضمین وجود ردیف سازمان (برای گزارش‌گیری/organizationId روی تراکنش)
      const organizationId = await getOrCreateOrganizationId(targetUser.organizationName);

      let { data: wallet, error: walletError } = await supabaseAdmin
        .from("wallets")
        .select("*")
        .eq("userId", targetUserId)
        .maybeSingle();

      if (walletError) {
        console.error("Admin Org Wallet Fetch Error:", walletError);
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

      const currentBalance = Number(wallet.orgBalance);
      const delta = direction === "DEPOSIT" ? numericAmount : -numericAmount;
      const newBalance = currentBalance + delta;

      if (newBalance < 0) {
        return NextResponse.json(
          { success: false, error: "موجودی کیف پول سازمانی این کاربر برای این مقدار کسر کافی نیست" },
          { status: 400 }
        );
      }

      // کسر/افزایش شرطی (CAS) برای جلوگیری از Race Condition
      const { data: updatedWallet, error: updateError } = await supabaseAdmin
        .from("wallets")
        .update({ orgBalance: newBalance, updatedAt: new Date().toISOString() })
        .eq("id", wallet.id)
        .eq("orgBalance", currentBalance)
        .select()
        .maybeSingle();

      if (updateError || !updatedWallet) {
        return NextResponse.json(
          { success: false, error: "موجودی این کاربر هم‌زمان تغییر کرده است. لطفاً دوباره تلاش کنید." },
          { status: 409 }
        );
      }

      const { error: txError } = await supabaseAdmin.from("transactions").insert([
        {
          walletId: wallet.id,
          organizationId,
          amount: numericAmount,
          type: direction,
          walletType: "ORGANIZATIONAL",
          gatewayStatus: "SUCCESS",
          trackingCode: `ADMIN-MANUAL-${admin.userId.slice(0, 8)}`,
        },
      ]);

      if (txError) {
        console.error("Admin Org Wallet Transaction Insert Error:", txError);
        // Rollback موجودی این کاربر
        await supabaseAdmin
          .from("wallets")
          .update({ orgBalance: currentBalance, updatedAt: new Date().toISOString() })
          .eq("id", wallet.id);
        return NextResponse.json({ success: false, error: "خطا در ثبت تراکنش" }, { status: 500 });
      }

      await logAdminAction({
        adminId: admin.userId,
        actionType: "WALLET_ADJUST",
        targetUserId,
        description: `${direction === "DEPOSIT" ? "شارژ دستی" : "کسر دستی"} ${numericAmount.toLocaleString(
          "fa-IR"
        )} تومان ${direction === "DEPOSIT" ? "به" : "از"} کیف پول سازمانی کاربر ${targetUser.firstName} ${
          targetUser.lastName
        } (${targetUser.phoneNumber} — سازمان «${targetUser.organizationName}») — دلیل: ${reason.trim()}`,
        previousValue: String(currentBalance),
        newValue: String(newBalance),
      });

      return NextResponse.json({ success: true, wallet: updatedWallet, message: "موجودی کیف پول سازمانی این کاربر با موفقیت به‌روزرسانی شد" });
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
