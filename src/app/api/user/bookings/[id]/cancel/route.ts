// مسیر: src/app/api/user/bookings/[id]/cancel/route.ts
//
// 🆕 تسک ۱۵ چک‌لیست کارفرما (نمایش زنگوله‌ی هدر واقعی): بعد از لغو موفق رزرو،
// علاوه بر پیامک، یک اعلان درون‌برنامه‌ای هم برای همان کاربر ثبت می‌شود تا در
// تاریخچه‌ی زنگوله‌ی هدرش هم بماند.
//
// 🆕 تسک ۲۷ چک‌لیست کارفرما (منطق پرداخت ترکیبی کیف پول + درگاه): اگر رزرویی که
// لغو می‌شود هنوز «قطعی» نشده باشد ولی بخشی از مبلغش را طی پرداخت ترکیبی از کیف
// پول (شخصی یا مشترک سازمانی) پیش‌کسر کرده باشد (bookings.walletAmountApplied)،
// همان مبلغ باید عودت داده شود — وگرنه با لغو رزرو، آن مبلغ بدون دلیل از کاربر
// گرفته می‌ماند. این بخش با تابع مشترک refundAppliedWalletAmount انجام می‌شود.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendBookingCancelledSms, sendRefundSms } from "@/lib/sms/smsService";
import { createNotification } from "@/lib/notifications/notificationService";
import { formatPrice } from "@/utils/priceCalculator";
import { CANCELLATION_DEADLINE_HOURS } from "@/constants/booking";
import { refundAppliedWalletAmount } from "@/lib/wallet/refundAppliedWalletAmount";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get("x-balkun-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "احراز هویت ناموفق" }, { status: 401 });
    }

    const { id: bookingId } = await params;

    // ۱. دریافت اطلاعات رزرو
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("userId", userId)
      .single();

    if (!booking) {
      return NextResponse.json({ success: false, error: "رزرو یافت نشد" }, { status: 404 });
    }

    if (["CANCELLED_BY_GUEST", "CANCELLED_BY_HOST"].includes(booking.status)) {
      return NextResponse.json({ success: false, error: "این رزرو قبلاً لغو شده است" }, { status: 400 });
    }

    const wasPaidConfirmed = booking.status === "PAID_CONFIRMED";
    // 🆕 تسک ۲۷: این رزرو هنوز قطعی نشده، اما بخشی از مبلغش قبلاً طی پرداخت ترکیبی
    // از کیف پول کسر شده (منتظر تکمیل باقیمانده از درگاه بود که حالا لغو می‌شود)
    const hadPartialWalletPrepayment = !wasPaidConfirmed && Number(booking.walletAmountApplied || 0) > 0;

    // 🆕 تسک ۱.۶ — بررسی مهلت زمانی لغو رایگان برای رزروهای قطعی‌شده (پرداخت‌شده).
    // رزروهای «در انتظار پرداخت» هیچ محدودیت زمانی ندارند چون هنوز مبلغی از
    // کاربر دریافت نشده است.
    if (wasPaidConfirmed) {
      const checkInTime = new Date(booking.checkInDate).getTime();
      const hoursUntilCheckIn = (checkInTime - Date.now()) / (1000 * 60 * 60);

      if (hoursUntilCheckIn < CANCELLATION_DEADLINE_HOURS) {
        return NextResponse.json(
          {
            success: false,
            error: `مهلت لغو رایگان این رزرو به پایان رسیده است. لغو رزرو قطعی‌شده تنها تا ${CANCELLATION_DEADLINE_HOURS} ساعت مانده به تاریخ ورود امکان‌پذیر است. برای بررسی شرایط استثنایی با پشتیبانی بالکن تماس بگیرید.`,
          },
          { status: 400 }
        );
      }
    }

    // ۲. اگر رزرو قطعی (پرداخت‌شده) بود، پول را به کیف پول برمی‌گردانیم
    if (wasPaidConfirmed) {
      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("id, normalBalance")
        .eq("userId", userId)
        .single();

      if (wallet) {
        const newBalance = Number(wallet.normalBalance) + Number(booking.totalPaidAmount);
        
        // آپدیت موجودی کیف پول
        await supabaseAdmin
          .from("wallets")
          .update({ normalBalance: newBalance, updatedAt: new Date().toISOString() })
          .eq("id", wallet.id);

        // ثبت تراکنش عودت وجه
        await supabaseAdmin.from("transactions").insert([
          {
            walletId: wallet.id,
            amount: booking.totalPaidAmount,
            type: "DEPOSIT",
            walletType: "NORMAL",
            gatewayStatus: "SUCCESS",
            bookingId: booking.id,
            trackingCode: `REFUND-${booking.id.split("-")[0]}`,
          },
        ]);
      }
    }

    // 🆕 تسک ۲۷: اگر این رزرو (که هنوز قطعی نشده) بخشی از مبلغش را طی پرداخت
    // ترکیبی از کیف پول پیش‌کسر کرده بود، همان مبلغ عودت داده می‌شود.
    if (hadPartialWalletPrepayment) {
      await refundAppliedWalletAmount({
        id: booking.id,
        userId: booking.userId,
        walletAmountApplied: booking.walletAmountApplied,
        walletTypeApplied: booking.walletTypeApplied,
      });
    }

    // ۳. تغییر وضعیت رزرو به لغوشده
    await supabaseAdmin
      .from("bookings")
      .update({ status: "CANCELLED_BY_GUEST" })
      .eq("id", bookingId);

    // ۴. اطلاع‌رسانی پیامکی لغو رزرو + عودت وجه (غیرحیاتی — نباید پاسخ موفق را مختل کند)
    try {
      const { data: guestUser } = await supabaseAdmin
        .from("users")
        .select("phoneNumber, firstName")
        .eq("id", userId)
        .maybeSingle();

      if (guestUser) {
        await sendBookingCancelledSms(guestUser.phoneNumber, guestUser.firstName, booking.roomName, "GUEST");
        if (wasPaidConfirmed) {
          await sendRefundSms(guestUser.phoneNumber, guestUser.firstName, formatPrice(booking.totalPaidAmount));
        } else if (hadPartialWalletPrepayment) {
          // 🆕 تسک ۲۷: اطلاع‌رسانی عودت همان مبلغی که پیش‌تر از کیف پول کسر شده بود
          await sendRefundSms(guestUser.phoneNumber, guestUser.firstName, formatPrice(Number(booking.walletAmountApplied || 0)));
        }
      }

      // 🆕 تسک ۱۵ چک‌لیست کارفرما — ثبت اعلان درون‌برنامه‌ای لغو رزرو (زنگوله‌ی هدر)
      await createNotification({
        userId,
        type: "BOOKING_CANCELLED",
        title: "رزرو شما لغو شد",
        message: wasPaidConfirmed
          ? `رزرو «${booking.roomName}» طبق درخواست شما لغو شد و مبلغ پرداختی به کیف پول شما بازگردانده شد.`
          : hadPartialWalletPrepayment
          ? `رزرو «${booking.roomName}» طبق درخواست شما لغو شد و مبلغ ${formatPrice(Number(booking.walletAmountApplied || 0))} تومانی که از کیف پول شما کسر شده بود، به کیف پولتان بازگردانده شد.`
          : `رزرو «${booking.roomName}» طبق درخواست شما لغو شد.`,
        linkUrl: "/profile?tab=bookings",
      });
    } catch (smsError) {
      console.error("Booking Cancellation SMS Error (non-blocking):", smsError);
    }

    return NextResponse.json({
      success: true,
      message:
        "رزرو با موفقیت لغو شد" +
        (wasPaidConfirmed
          ? " و مبلغ به کیف پول شما عودت داده شد."
          : hadPartialWalletPrepayment
          ? ` و مبلغ ${formatPrice(Number(booking.walletAmountApplied || 0))} تومانی که از کیف پول شما کسر شده بود، به کیف پولتان بازگردانده شد.`
          : "."),
    });
  } catch (error) {
    console.error("Cancel Booking Error:", error);
    return NextResponse.json({ success: false, error: "خطا در پردازش درخواست" }, { status: 500 });
  }
}