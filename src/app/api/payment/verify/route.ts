// مسیر: src/app/api/payment/verify/route.ts
//
// 🆕 تسک ۱۵ چک‌لیست کارفرما (نمایش زنگوله‌ی هدر واقعی): بعد از تایید موفق پرداخت،
// علاوه بر پیامک، یک اعلان درون‌برنامه‌ای هم برای کاربر ثبت می‌شود — چه برای تایید
// رزرو (بخش الف) و چه برای شارژ موفق کیف پول شخصی (بخش ب). هر دو داخل try/catch
// جداگانه و غیرحیاتی هستند، پس هرگز جریان اصلی پرداخت را مختل نمی‌کنند.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendBookingConfirmedSms, sendVoucherIssuedSms } from "@/lib/sms/smsService";
import { createNotification } from "@/lib/notifications/notificationService";
import { formatPrice } from "@/utils/priceCalculator";

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

                // 🆕 تسک ۱۵ چک‌لیست کارفرما — ثبت اعلان درون‌برنامه‌ای تایید رزرو (زنگوله‌ی هدر).
                // دقیقاً هم‌الگو با پیامک بالا: در همین try/catch غیرحیاتی قرار گرفته تا خطای
                // احتمالی آن هرگز جریان موفق پرداخت را مختل نکند.
                await createNotification({
                   userId: confirmedBooking.userId,
                   type: "BOOKING_CONFIRMED",
                   title: "رزرو شما تایید شد",
                   message: `پرداخت رزرو «${confirmedBooking.roomName}» با موفقیت انجام شد و ووچر اقامت شما آماده است.`,
                   linkUrl: `/voucher/${tx.bookingId}`,
                });
             }
          } catch (smsError) {
             console.error("Booking Confirmation SMS Error (non-blocking):", smsError);
          }
       } else {
          // ب: شارژ کیف پول بوده است
          // رفع خطای TypeScript با جداسازی صریح لاجیک کیف پول عادی و سازمانی
          const { data: wallet } = await supabaseAdmin.from("wallets").select("userId, normalBalance, orgBalance").eq("id", tx.walletId).single();
          
          if (wallet) {
              if (tx.walletType === "NORMAL") {
                  const newBalance = Number(wallet.normalBalance) + Number(tx.amount);
                  await supabaseAdmin.from("wallets").update({ 
                      normalBalance: newBalance, 
                      updatedAt: new Date().toISOString() 
                  }).eq("id", tx.walletId);

                  // 🆕 تسک ۱۵ چک‌لیست کارفرما — اعلان شارژ موفق کیف پول شخصی (زنگوله‌ی هدر).
                  // فقط برای شارژ کیف پول شخصی (NORMAL) می‌فرستیم؛ شارژ کیف پول مشترک سازمانی
                  // متعلق به یک کاربر مشخص نیست، پس اعلان شخصی برایش معنا ندارد.
                  try {
                      await createNotification({
                          userId: wallet.userId,
                          type: "WALLET_CHARGED",
                          title: "کیف پول شما شارژ شد",
                          message: `مبلغ ${formatPrice(Number(tx.amount))} تومان با موفقیت به کیف پول شما اضافه شد.`,
                          linkUrl: "/profile?tab=wallet",
                      });
                  } catch (notifyError) {
                      console.error("Wallet Charge Notification Error (non-blocking):", notifyError);
                  }
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