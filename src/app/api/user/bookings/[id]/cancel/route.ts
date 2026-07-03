import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendBookingCancelledSms, sendRefundSms } from "@/lib/sms/smsService";
import { formatPrice } from "@/utils/priceCalculator";

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
        }
      }
    } catch (smsError) {
      console.error("Booking Cancellation SMS Error (non-blocking):", smsError);
    }

    return NextResponse.json({
      success: true,
      message: "رزرو با موفقیت لغو شد" + (wasPaidConfirmed ? " و مبلغ به کیف پول شما عودت داده شد." : "."),
    });
  } catch (error) {
    console.error("Cancel Booking Error:", error);
    return NextResponse.json({ success: false, error: "خطا در پردازش درخواست" }, { status: 500 });
  }
}