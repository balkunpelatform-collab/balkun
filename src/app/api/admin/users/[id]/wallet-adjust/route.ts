// مسیر: src/app/api/admin/users/[id]/wallet-adjust/route.ts
// شارژ/کسر دستی کیف پول توسط ادمین طبق بخش ۲ سند فاز ۹.
// طبق سیاست مالی بالکن، کاربران هرگز نمی‌توانند موجودی را برداشت کنند؛ این مسیر فقط برای
// شرایط خاص پشتیبانی (مثل جبران خسارت یا اصلاح خطا) است و ثبت لاگ اجباری در admin_audit_logs دارد.
// دسترسی: فقط SUPER_ADMIN (عملیات مالی حساس طبق بخش ۵ سند فاز ۹).

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
      .select("id, firstName, lastName, phoneNumber")
      .eq("id", targetUserId)
      .maybeSingle();

    if (userError || !targetUser) {
      return NextResponse.json({ success: false, error: "کاربر مورد نظر یافت نشد" }, { status: 404 });
    }

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

    const balanceField = walletType === "NORMAL" ? "normalBalance" : "orgBalance";
    const currentBalance = Number(wallet[balanceField]);
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
      .update({ [balanceField]: newBalance, updatedAt: new Date().toISOString() })
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
        walletType,
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
      )} تومان از کیف پول ${walletType === "NORMAL" ? "عادی" : "سازمانی"} کاربر ${targetUser.firstName} ${
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