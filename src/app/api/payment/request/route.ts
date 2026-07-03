import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-balkun-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "احراز هویت ناموفق" }, { status: 401 });
    }

    const body = await req.json();
    const { type, amount, bookingId, walletType = "NORMAL" } = body;

    let finalAmount = Number(amount);

    // ۱. پردازش پرداخت بابت رزرو
    if (type === "BOOKING_PAYMENT") {
      if (!bookingId) return NextResponse.json({ success: false, error: "شناسه رزرو الزامی است" }, { status: 400 });

      const { data: booking } = await supabaseAdmin
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .eq("userId", userId)
        .maybeSingle();

      if (!booking) return NextResponse.json({ success: false, error: "رزرو یافت نشد" }, { status: 404 });
      if (booking.status !== "WAITING_FOR_PAYMENT") {
        return NextResponse.json({ success: false, error: "این رزرو قابل پرداخت نیست" }, { status: 400 });
      }
      
      // امنیت: مبلغ را از دیتابیس می‌گیریم تا قابل دستکاری نباشد
      finalAmount = Number(booking.totalPaidAmount);
    } 
    // ۲. پردازش شارژ کیف پول
    else if (type === "WALLET_CHARGE") {
      if (!finalAmount || finalAmount < 10000) {
        return NextResponse.json({ success: false, error: "حداقل مبلغ شارژ ۱۰,۰۰۰ تومان است" }, { status: 400 });
      }
    } else {
       return NextResponse.json({ success: false, error: "نوع درخواست نامعتبر است" }, { status: 400 });
    }

    // دریافت یا ساخت کیف پول کاربر
    let { data: wallet } = await supabaseAdmin.from("wallets").select("id").eq("userId", userId).maybeSingle();
    if(!wallet) {
        const { data: newWallet } = await supabaseAdmin.from("wallets").insert([{ userId }]).select().single();
        if(newWallet) wallet = newWallet;
    }

    if (!wallet) throw new Error("کیف پول یافت نشد");

    // ثبت تراکنش معلق در دیتابیس
    const { data: tx, error: txError } = await supabaseAdmin.from("transactions").insert([{
        walletId: wallet.id,
        amount: finalAmount,
        type: "DEPOSIT", // پول وارد پلتفرم می‌شود
        walletType,
        gatewayStatus: "PENDING",
        bookingId: type === "BOOKING_PAYMENT" ? bookingId : null
    }]).select().single();

    if (txError) throw new Error("خطا در ایجاد تراکنش");

    // ریدایرکت به درگاه شبیه‌ساز (Mock Gateway)
    // در آینده این URL به آدرس زرین‌پال/ملت تغییر می‌کند
    const gatewayUrl = `/payment/mock-gateway?txId=${tx.id}&amount=${finalAmount}`;

    return NextResponse.json({ success: true, url: gatewayUrl });

  } catch (err) {
     console.error("Payment Request Error:", err);
     return NextResponse.json({ success: false, error: "خطای سرور در ایجاد تراکنش" }, { status: 500 });
  }
}