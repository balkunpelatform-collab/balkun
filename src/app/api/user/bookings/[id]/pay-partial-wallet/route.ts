// مسیر: src/app/api/user/bookings/[id]/pay-partial-wallet/route.ts
// این فایل جدید است — آن را در مسیر بالا در پروژه ایجاد کنید.
//
// 🆕 تسک ۲۷ چک‌لیست کارفرما (منطق پرداخت ترکیبی کیف پول + درگاه):
// «اگر کاربر سازمانی یا عادی موجودی کیف پولش به اندازه مبلغ رزرو نباشد: ابتدا
// تمام مبلغ موجود از کیف پول کسر شود، فقط باقیمانده مبلغ از طریق درگاه آنلاین
// پرداخت شود.»
//
// این Route Handler دقیقاً همین کار را انجام می‌دهد و کاملاً مکمل
// src/app/api/user/bookings/[id]/pay-with-wallet/route.ts است (که فقط برای
// حالتی است که موجودی کیف پول کامل کافی باشد):
//
//   ۱. هر چقدر از موجودی کیف پول انتخاب‌شده (شخصی یا مشترک سازمانی) که در
//      دسترس است را کسر می‌کند (حداکثر تا سقف مبلغ باقیمانده‌ی رزرو).
//   ۲. اگر همین مبلغ کل باقیمانده را پوشش داد، رزرو بلافاصله قطعی می‌شود
//      (دقیقاً مثل پرداخت کامل از کیف پول).
//   ۳. اگر مبلغ کیف پول کافی نبود، مبلغ باقیمانده روی خودِ رزرو
//      (ستون walletAmountApplied) ثبت می‌شود تا کاربر برای آن به درگاه
//      هدایت شود؛ src/app/api/payment/request/route.ts از این پس فقط همین
//      مبلغ باقیمانده (نه کل مبلغ رزرو) را از کاربر می‌گیرد.
//
// نکات امنیتی: دقیقاً هم‌الگو با pay-with-wallet — مبلغ همیشه از دیتابیس خوانده
// می‌شود (نه از بدنه‌ی درخواست)، کسر موجودی با UPDATE شرطی (CAS) انجام می‌شود
// تا در برابر Race Condition ایمن باشد، و در صورت بروز خطای نیمه‌کاره، مبلغ
// بلافاصله به کیف پول برمی‌گردد (Rollback).

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { expireStalePendingBookings, isPaymentDeadlinePassed } from "@/lib/booking/expirePendingBookings";
import { sendBookingConfirmedSms, sendVoucherIssuedSms } from "@/lib/sms/smsService";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = req.headers.get("x-balkun-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "احراز هویت ناموفق" }, { status: 401 });
    }

    const { id: bookingId } = await params;
    const body = await req.json().catch(() => ({}));
    const walletType: "NORMAL" | "ORGANIZATIONAL" = body.walletType === "ORGANIZATIONAL" ? "ORGANIZATIONAL" : "NORMAL";

    // ۱. دریافت رزرو (فقط اگر متعلق به همین کاربر باشد)
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("userId", userId)
      .maybeSingle();

    if (!booking) {
      return NextResponse.json({ success: false, error: "رزرو یافت نشد" }, { status: 404 });
    }

    // ۲. بررسی مهلت پرداخت — اگر گذشته، منقضی می‌کنیم (که خودش عودت هر مبلغ
    // پیش‌کسرشده‌ای از کیف پول را هم انجام می‌دهد — نگاه کنید به expirePendingBookings.ts)
    if (booking.status === "WAITING_FOR_PAYMENT" && isPaymentDeadlinePassed(booking.createdAt)) {
      await expireStalePendingBookings({ bookingId: booking.id });
      return NextResponse.json(
        {
          success: false,
          error: "مهلت پرداخت این رزرو به پایان رسیده و به‌صورت خودکار منقضی شده است. لطفاً یک رزرو جدید ثبت کنید.",
        },
        { status: 410 }
      );
    }

    if (booking.status !== "WAITING_FOR_PAYMENT") {
      return NextResponse.json({ success: false, error: "این رزرو قابل پرداخت نیست" }, { status: 400 });
    }

    // مبلغ باقیمانده‌ی این رزرو (با احتساب مبلغی که احتمالاً قبلاً از کیف پول کسر شده)
    const remainingAmount = Number(booking.totalPaidAmount) - Number(booking.walletAmountApplied || 0);

    if (remainingAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "این رزرو قبلاً به‌طور کامل از کیف پول تسویه شده است. لطفاً صفحه را رفرش کنید." },
        { status: 400 }
      );
    }

    // ۳. مسیر پرداخت ترکیبی از کیف پول سازمانی (استخر مشترک سازمان)
    if (walletType === "ORGANIZATIONAL") {
      const { data: userRow } = await supabaseAdmin
        .from("users")
        .select("userType, organizationName")
        .eq("id", userId)
        .maybeSingle();

      if (!userRow || userRow.userType !== "ORGANIZATIONAL" || !userRow.organizationName) {
        return NextResponse.json(
          { success: false, error: "کیف پول سازمانی فقط برای کاربران سازمانی قابل استفاده است" },
          { status: 403 }
        );
      }

      const { data: organization } = await supabaseAdmin
        .from("organizations")
        .select("*")
        .eq("name", userRow.organizationName)
        .maybeSingle();

      if (!organization) {
        return NextResponse.json(
          { success: false, error: "سازمان شما هنوز در سیستم کیف پول ثبت نشده است. لطفاً با پشتیبانی بالکن تماس بگیرید." },
          { status: 404 }
        );
      }

      if (!organization.isActive) {
        return NextResponse.json(
          {
            success: false,
            error: "سازمان شما توسط مدیریت بالکن غیرفعال شده و امکان استفاده از کیف پول سازمانی وجود ندارد.",
          },
          { status: 403 }
        );
      }

      const currentOrgBalance = Number(organization.walletBalance);
      if (currentOrgBalance <= 0) {
        return NextResponse.json(
          { success: false, error: "موجودی کیف پول مشترک سازمان صفر است؛ امکان پرداخت ترکیبی وجود ندارد." },
          { status: 400 }
        );
      }

      const walletPortion = Math.min(currentOrgBalance, remainingAmount);

      // کسر شرطی (CAS) از استخر مشترک سازمان
      const { data: updatedOrganization } = await supabaseAdmin
        .from("organizations")
        .update({ walletBalance: currentOrgBalance - walletPortion, updatedAt: new Date().toISOString() })
        .eq("id", organization.id)
        .eq("walletBalance", currentOrgBalance)
        .select()
        .maybeSingle();

      if (!updatedOrganization) {
        return NextResponse.json(
          { success: false, error: "موجودی کیف پول سازمان هم‌زمان تغییر کرده است. لطفاً دوباره تلاش کنید." },
          { status: 409 }
        );
      }

      let { data: personalWallet } = await supabaseAdmin.from("wallets").select("*").eq("userId", userId).maybeSingle();
      if (!personalWallet) {
        const { data: newWallet } = await supabaseAdmin.from("wallets").insert([{ userId }]).select().single();
        if (newWallet) personalWallet = newWallet;
      }

      const trackingCode = `WALLET-PARTIAL-${booking.id.split("-")[0].toUpperCase()}`;

      const rollbackOrgBalance = async () => {
        await supabaseAdmin
          .from("organizations")
          .update({ walletBalance: currentOrgBalance, updatedAt: new Date().toISOString() })
          .eq("id", organization.id);
      };

      const { error: txError } = await supabaseAdmin.from("transactions").insert([
        {
          walletId: personalWallet ? personalWallet.id : null,
          organizationId: organization.id,
          amount: walletPortion,
          type: "WITHDRAWAL",
          walletType: "ORGANIZATIONAL",
          gatewayStatus: "SUCCESS",
          trackingCode,
          bookingId: booking.id,
        },
      ]);

      if (txError) {
        console.error("Org Partial Wallet Payment Transaction Insert Error (rolled back):", txError);
        await rollbackOrgBalance();
        return NextResponse.json({ success: false, error: "خطا در ثبت تراکنش؛ مبلغی از کیف پول سازمان کسر نشد" }, { status: 500 });
      }

      return await finalizePartialPayment({
        booking,
        walletPortion,
        remainingAmount,
        walletType: "ORGANIZATIONAL",
        rollback: rollbackOrgBalance,
        trackingCode,
        userId,
      });
    }

    // ۴. مسیر پرداخت ترکیبی از کیف پول شخصی (NORMAL)
    let { data: wallet } = await supabaseAdmin.from("wallets").select("*").eq("userId", userId).maybeSingle();
    if (!wallet) {
      const { data: newWallet } = await supabaseAdmin.from("wallets").insert([{ userId }]).select().single();
      if (newWallet) wallet = newWallet;
    }
    if (!wallet) throw new Error("کیف پول یافت نشد");

    const currentBalance = Number(wallet.normalBalance);
    if (currentBalance <= 0) {
      return NextResponse.json(
        { success: false, error: "موجودی کیف پول شما صفر است؛ امکان پرداخت ترکیبی وجود ندارد." },
        { status: 400 }
      );
    }

    const walletPortion = Math.min(currentBalance, remainingAmount);

    const { data: updatedWallet } = await supabaseAdmin
      .from("wallets")
      .update({ normalBalance: currentBalance - walletPortion, updatedAt: new Date().toISOString() })
      .eq("id", wallet.id)
      .eq("normalBalance", currentBalance)
      .select()
      .maybeSingle();

    if (!updatedWallet) {
      return NextResponse.json(
        { success: false, error: "موجودی کیف پول شما هم‌زمان تغییر کرده است. لطفاً دوباره تلاش کنید." },
        { status: 409 }
      );
    }

    const trackingCode = `WALLET-PARTIAL-${booking.id.split("-")[0].toUpperCase()}`;

    const rollbackNormalBalance = async () => {
      await supabaseAdmin
        .from("wallets")
        .update({ normalBalance: currentBalance, updatedAt: new Date().toISOString() })
        .eq("id", wallet.id);
    };

    const { error: txError } = await supabaseAdmin.from("transactions").insert([
      {
        walletId: wallet.id,
        amount: walletPortion,
        type: "WITHDRAWAL",
        walletType: "NORMAL",
        gatewayStatus: "SUCCESS",
        trackingCode,
        bookingId: booking.id,
      },
    ]);

    if (txError) {
      console.error("Partial Wallet Payment Transaction Insert Error (rolled back):", txError);
      await rollbackNormalBalance();
      return NextResponse.json({ success: false, error: "خطا در ثبت تراکنش؛ مبلغی از کیف پول شما کسر نشد" }, { status: 500 });
    }

    return await finalizePartialPayment({
      booking,
      walletPortion,
      remainingAmount,
      walletType: "NORMAL",
      rollback: rollbackNormalBalance,
      trackingCode,
      userId,
    });
  } catch (error) {
    console.error("Pay Partial Wallet API Error:", error);
    return NextResponse.json({ success: false, error: "خطا در پردازش پرداخت ترکیبی" }, { status: 500 });
  }
}

// اگر مبلغ کسرشده از کیف پول کل باقیمانده را پوشش داد، رزرو را همان لحظه قطعی
// می‌کند (دقیقاً مثل pay-with-wallet)؛ در غیر این صورت فقط مبلغ کسرشده را روی
// رزرو ثبت می‌کند تا کاربر برای باقیمانده به درگاه هدایت شود.
async function finalizePartialPayment(options: {
  booking: { id: string; roomName: string; walletAmountApplied: number | null };
  walletPortion: number;
  remainingAmount: number;
  walletType: "NORMAL" | "ORGANIZATIONAL";
  rollback: () => Promise<void>;
  trackingCode: string;
  userId: string;
}) {
  const { booking, walletPortion, remainingAmount, walletType, rollback, trackingCode, userId } = options;
  const alreadyApplied = Number(booking.walletAmountApplied || 0);
  const stillRemainingAfter = remainingAmount - walletPortion;

  if (stillRemainingAfter <= 0) {
    // موجودی کیف پول کل باقیمانده را پوشش داد → رزرو همین الان قطعی می‌شود
    const { data: confirmedBooking } = await supabaseAdmin
      .from("bookings")
      .update({ status: "PAID_CONFIRMED", walletAmountApplied: alreadyApplied + walletPortion, walletTypeApplied: walletType })
      .eq("id", booking.id)
      .eq("status", "WAITING_FOR_PAYMENT")
      .select()
      .maybeSingle();

    if (!confirmedBooking) {
      console.error(`Partial Wallet Payment Rollback: booking ${booking.id} was no longer WAITING_FOR_PAYMENT.`);
      await rollback();
      await supabaseAdmin
        .from("transactions")
        .update({ gatewayStatus: "FAILED" })
        .eq("bookingId", booking.id)
        .eq("trackingCode", trackingCode);

      return NextResponse.json(
        { success: false, error: "این رزرو دیگر قابل پرداخت نبود. مبلغی از کیف پول شما کسر نشد." },
        { status: 409 }
      );
    }

    try {
      const { data: guestUser } = await supabaseAdmin
        .from("users")
        .select("phoneNumber, firstName")
        .eq("id", userId)
        .maybeSingle();

      if (guestUser) {
        await sendBookingConfirmedSms(guestUser.phoneNumber, guestUser.firstName, booking.roomName, trackingCode);
        await sendVoucherIssuedSms(guestUser.phoneNumber, guestUser.firstName, booking.id);
      }
    } catch (smsError) {
      console.error("Partial Wallet Payment Confirmation SMS Error (non-blocking):", smsError);
    }

    return NextResponse.json({
      success: true,
      fullyPaid: true,
      message: "پرداخت از کیف پول با موفقیت انجام شد و رزرو شما قطعی گردید.",
      booking: confirmedBooking,
    });
  }

  // موجودی کیف پول کافی نبود → فقط همین مقدار را روی رزرو ثبت می‌کنیم؛ رزرو هنوز
  // در انتظار پرداخت باقیمانده از درگاه است
  const { data: updatedBooking, error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({ walletAmountApplied: alreadyApplied + walletPortion, walletTypeApplied: walletType })
    .eq("id", booking.id)
    .eq("status", "WAITING_FOR_PAYMENT")
    .select()
    .maybeSingle();

  if (updateError || !updatedBooking) {
    console.error("Partial Wallet Payment Booking Update Error (rolled back):", updateError);
    await rollback();
    await supabaseAdmin
      .from("transactions")
      .update({ gatewayStatus: "FAILED" })
      .eq("bookingId", booking.id)
      .eq("trackingCode", trackingCode);

    return NextResponse.json(
      { success: false, error: "خطا در ثبت پرداخت ترکیبی؛ مبلغی از کیف پول شما کسر نشد" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    fullyPaid: false,
    walletAmountApplied: walletPortion,
    remainingAmount: stillRemainingAfter,
    message: `مبلغ ${walletPortion.toLocaleString("fa-IR")} تومان از کیف پول شما کسر شد. برای تکمیل پرداخت، به درگاه بانکی برای مبلغ باقیمانده هدایت می‌شوید.`,
    booking: updatedBooking,
  });
}