// مسیر: src/app/api/user/wallet/route.ts
// API دریافت اطلاعات کیف پول و تراکنش‌ها — متصل به جداول واقعی wallets/transactions.
// شارژ واقعی کیف پول (POST) عمداً به فاز ۶ موکول شده چون به درگاه بانکی نیاز دارد.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-balkun-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "احراز هویت ناموفق" }, { status: 401 });
    }

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

    return NextResponse.json({ success: true, wallet, recentTransactions: transactions ?? [] });
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