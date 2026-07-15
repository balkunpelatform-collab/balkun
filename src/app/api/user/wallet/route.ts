// مسیر: src/app/api/user/wallet/route.ts
// API دریافت اطلاعات کیف پول و تراکنش‌ها — متصل به جداول واقعی wallets/transactions.
// شارژ واقعی کیف پول (POST) عمداً به فاز ۶ موکول شده چون به درگاه بانکی نیاز دارد.
//
// 🆕 تسک ۷ چک‌لیست کارفرما (تفکیک کیف پول سازمانی + شارژ خودکار + غیرفعال‌سازی سازمان):
// از این پس موجودی سازمانی دیگر روی wallet.orgBalance نیست (آن ستون همیشه ۰ است).
// اگر کاربر سازمانی باشد، اطلاعات کیف پول مشترک سازمانش (نام، موجودی، وضعیت فعال/غیرفعال)
// هم در فیلد جدید «organization» برگردانده می‌شود تا src/components/profile/WalletView.tsx
// بتواند آن را نمایش دهد.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { classifyTransactionSource } from "@/lib/wallet/transactionSource";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-balkun-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "احراز هویت ناموفق" }, { status: 401 });
    }

    // اطلاعات پایه کاربر (برای تشخیص سازمانی بودن و نام سازمان)
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("userType, organizationName")
      .eq("id", userId)
      .maybeSingle();

    let { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("userId", userId)
      .maybeSingle();

    if (walletError) {
      console.error("Wallet Fetch Error:", walletError);
      throw new Error("خطا در ارتباط با پایگاه داده");
    }

    // خودترمیمی: اگر کاربری (مثلاً از داده‌های قدیمی تست) فاقد کیف پول بود، همین‌جا برایش ساخته می‌شود
    if (!wallet) {
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from("wallets")
        .insert([{ userId }])
        .select()
        .single();

      if (createError) {
        console.error("Wallet Auto-Create Error:", createError);
        throw new Error("خطا در ایجاد کیف پول");
      }
      wallet = newWallet;
    }

    const { data: transactions, error: txError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("walletId", wallet.id)
      .order("createdAt", { ascending: false })
      .limit(10);

    if (txError) {
      console.error("Transactions Fetch Error:", txError);
      throw new Error("خطا در ارتباط با پایگاه داده");
    }

    // 🆕 تسک ۷: برای کاربران سازمانی، موجودی و وضعیت کیف پول مشترک سازمان هم برگردانده می‌شود
    let organization: { id: string; name: string; isActive: boolean; walletBalance: number; autoChargeEnabled: boolean } | null = null;
    if (userRow?.userType === "ORGANIZATIONAL" && userRow.organizationName) {
      const { data: orgRow } = await supabaseAdmin
        .from("organizations")
        .select("id, name, isActive, walletBalance, autoChargeEnabled")
        .eq("name", userRow.organizationName)
        .maybeSingle();
      organization = orgRow || null;
    }

    // 🆕 تسک ۲۰: به هر تراکنش، منبع دقیق آن (واریز از درگاه / شارژ دستی پشتیبانی /
    // برگشت وجه / برداشت بابت رزرو و ...) اضافه می‌شود تا در کیف پول خودِ کاربر هم
    // دقیقاً همان توضیح شفاف («این مبلغ از طریق درگاه پرداخت اضافه شد» و مشابه آن)
    // نمایش داده شود — با همان تابع مشترکی که در تسک ۱ و ۴ برای پنل ادمین استفاده شد.
    const enrichedTransactions = (transactions ?? []).map((tx) => ({
      ...tx,
      source: classifyTransactionSource({ type: tx.type, trackingCode: tx.trackingCode }),
    }));

    return NextResponse.json({
      success: true,
      wallet,
      recentTransactions: enrichedTransactions,
      organization,
    });
  } catch (error) {
    console.error("Error fetching wallet:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت اطلاعات کیف پول" }, { status: 500 });
  }
}

// POST: شارژ کیف پول — در فاز ۶ (اتصال درگاه پرداخت) فعال می‌شود
export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-balkun-user-id");
  if (!userId) {
    return NextResponse.json({ success: false, error: "احراز هویت ناموفق" }, { status: 401 });
  }

  return NextResponse.json({
    success: false,
    error: "شارژ کیف پول در فاز ۶ (اتصال درگاه پرداخت) فعال خواهد شد",
  });
}