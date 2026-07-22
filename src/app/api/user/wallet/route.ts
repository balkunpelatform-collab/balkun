// مسیر: src/app/api/user/wallet/route.ts
// API دریافت اطلاعات کیف پول و تراکنش‌ها — متصل به جداول واقعی wallets/transactions.
// شارژ واقعی کیف پول (POST) عمداً به فاز ۶ موکول شده چون به درگاه بانکی نیاز دارد.
//
// 🆕 بند ۲۷ (بازگشت کیف پول سازمانی به موجودی مستقل هر کارمند):
// از این پس wallet.orgBalance دوباره موجودی واقعی و مستقل کیف پول سازمانی
// همین کاربر است (نه یک استخر مشترک بین کل پرسنل). فیلد جداگانه‌ی «organization»
// همچنان برگردانده می‌شود، اما فقط شامل هویت و وضعیت فعال/غیرفعال سازمان است —
// دیگر هیچ عدد موجودی‌ای در آن نیست (چون موجودی واقعی همان wallet.orgBalance است).

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

    // 🆕 بند ۲۷: برای کاربران سازمانی، فقط هویت و وضعیت فعال/غیرفعال سازمان برگردانده
    // می‌شود — موجودی واقعی همان wallet.orgBalance بالاست، نه یک عدد جداگانه اینجا.
    let organization: { id: string; name: string; isActive: boolean; autoChargeEnabled: boolean } | null = null;
    if (userRow?.userType === "ORGANIZATIONAL" && userRow.organizationName) {
      const { data: orgRow } = await supabaseAdmin
        .from("organizations")
        .select("id, name, isActive, autoChargeEnabled")
        .eq("name", userRow.organizationName)
        .maybeSingle();
      organization = orgRow || null;
    }

    // 🆕 تسک ۲۰ (شفاف‌سازی تاریخچه کیف پول کاربر): هر تراکنش همراه با فیلد «source» است.
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
