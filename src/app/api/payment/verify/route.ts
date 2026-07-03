import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendBookingConfirmedSms, sendVoucherIssuedSms } from "@/lib/sms/smsService";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const txId = url.searchParams.get("txId");
  const status = url.searchParams.get("status"); // 'OK' or 'NOK'

  if (!txId) return NextResponse.redirect(new URL("/profile", req.url));

  try {
    // ۱. استخراج تراکنش از دیتابیس
    const { data: tx } = await supabaseAdmin.from("transactions").select("*").eq("id", txId).maybeSingle();
    
    // اگر تراکنش پیدا نشد یا قبلاً وریفای شده، فقط ریدایرکت می‌کنیم تا دوباره اعمال نشود (جلوگیری از Race Condition)
    if (!tx || tx.gatewayStatus !== "PENDING") {
       return NextResponse.redirect(new URL(`/payment/callback?txId=${txId}`, req.url));
    }

    const trackingCode = `BLK-${Math.floor(10000000 + Math.random() * 90000000)}`;

    if (status === "OK") {
       // تراکنش موفق است
       await supabaseAdmin.from("transactions").update({ gatewayStatus: "SUCCESS", trackingCode }).eq("id", txId);

       if (tx.bookingId) {
          // الف: پرداخت بابت رزرو بوده است
          await supabaseAdmin.from("bookings").update({ status: "PAID_CONFIRMED" }).eq("id", tx.bookingId);
          // TODO فاز ۶: در اینجا متد ConfirmBooking در API واقعی اتاقک باید فراخوانی شود تا ووچر صادر گردد

          // اطلاع‌رسانی پیامکی تایید رزرو + صدور ووچر (غیرحیاتی — نباید جریان پرداخت را مختل کند)
          try {
             const { data: confirmedBooking } = await supabaseAdmin
                .from("bookings")
                .select("userId, roomName")
                .eq("id", tx.bookingId)
                .maybeSingle();

             if (confirmedBooking) {
                const { data: guestUser } = await supabaseAdmin
                   .from("users")
                   .select("phoneNumber, firstName")
                   .eq("id", confirmedBooking.userId)
                   .maybeSingle();

                if (guestUser) {
                   await sendBookingConfirmedSms(guestUser.phoneNumber, guestUser.firstName, confirmedBooking.roomName, trackingCode);
                   await sendVoucherIssuedSms(guestUser.phoneNumber, guestUser.firstName, tx.bookingId);
                }
             }
          } catch (smsError) {
             console.error("Booking Confirmation SMS Error (non-blocking):", smsError);
          }
       } else {
          // ب: شارژ کیف پول بوده است
          // رفع خطای TypeScript با جداسازی صریح لاجیک کیف پول عادی و سازمانی
          const { data: wallet } = await supabaseAdmin.from("wallets").select("normalBalance, orgBalance").eq("id", tx.walletId).single();
          
          if (wallet) {
              if (tx.walletType === "NORMAL") {
                  const newBalance = Number(wallet.normalBalance) + Number(tx.amount);
                  await supabaseAdmin.from("wallets").update({ 
                      normalBalance: newBalance, 
                      updatedAt: new Date().toISOString() 
                  }).eq("id", tx.walletId);
              } else {
                  const newBalance = Number(wallet.orgBalance) + Number(tx.amount);
                  await supabaseAdmin.from("wallets").update({ 
                      orgBalance: newBalance, 
                      updatedAt: new Date().toISOString() 
                  }).eq("id", tx.walletId);
              }
          }
       }
    } else {
       // تراکنش ناموفق است
       await supabaseAdmin.from("transactions").update({ gatewayStatus: "FAILED", trackingCode: null }).eq("id", txId);
    }

    // هدایت به صفحه نمایش نتیجه پرداخت
    return NextResponse.redirect(new URL(`/payment/callback?txId=${txId}`, req.url));

  } catch (error) {
    console.error("Payment Verify Error:", error);
    return NextResponse.redirect(new URL(`/profile`, req.url));
  }
}