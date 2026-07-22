// مسیر: src/app/api/user/bookings/[id]/pay-with-wallet/route.ts
//
// 🆕 تسک ۲ از Task.md (۲۰۲۶/۰۷/۱۱): «کیف پول رو نمی‌شه مستقیم برای رزرو خرج کرد»
// راه‌حل: این Route Handler مبلغ رزرو را مستقیماً و به‌صورت اتمیک از موجودی کیف پول
// کاربر (عادی یا سازمانی) کسر می‌کند و بلافاصله رزرو را قطعی می‌کند — بدون نیاز به
// هیچ درگاه بانکی.
//
// 🆕 بند ۲۷ (بازگشت کیف پول سازمانی به موجودی مستقل هر کارمند):
// طبق درخواست صریح کارفرما («هرکسی استفاده کرد فقط خودش کم بشه، نه کل اعضا»)،
// از این پس پرداخت از کیف پول سازمانی دیگر از یک استخر مشترک (organizations.walletBalance)
// کسر نمی‌شود؛ دقیقاً از موجودی مستقل خودِ همین کاربر (wallets.orgBalance) کسر می‌شود —
// یعنی مصرف یک کارمند هیچ اثری روی موجودی بقیه‌ی همکارانش ندارد. وضعیت فعال/غیرفعال
// بودن خودِ سازمان (organizations.isActive) همچنان بررسی می‌شود: اگر مدیریت بالکن
// سازمان را غیرفعال کرده باشد، هیچ‌کدام از پرسنلش نمی‌توانند از کیف پول سازمانی
// استفاده کنند، حتی اگر موجودی شخصی‌شان کافی باشد.
//
// نکات امنیتی/فنی که رعایت شده (بدون تغییر نسبت به قبل):
// ۱. این مسیر زیرمجموعه‌ی «/api/user» است، پس middleware.ts به‌صورت خودکار نشست
//    کاربر را بررسی و هدر امن x-balkun-user-id را تزریق می‌کند.
// ۲. مبلغ رزرو هرگز از بدنه‌ی درخواست خوانده نمی‌شود؛ همیشه از totalPaidAmount
//    ثبت‌شده در دیتابیس خوانده می‌شود.
// ۳. جلوگیری از Race Condition: کسر موجودی با یک UPDATE شرطی (CAS) انجام می‌شود.
// ۴. مدیریت خطای نیمه‌کاره: اگر موجودی کسر شد ولی قطعی‌کردن رزرو ناموفق بود، مبلغ
//    بلافاصله برگردانده می‌شود (Rollback).

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

    // ۲. بررسی مهلت پرداخت — اگر گذشته، منقضی می‌کنیم
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

    const amount = Number(booking.totalPaidAmount);

    // ۳. مسیر پرداخت از کیف پول سازمانی (موجودی مستقل خودِ همین کاربر)
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
        .select("id, isActive")
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

      let { data: personalWallet } = await supabaseAdmin.from("wallets").select("*").eq("userId", userId).maybeSingle();
      if (!personalWallet) {
        const { data: newWallet } = await supabaseAdmin.from("wallets").insert([{ userId }]).select().single();
        personalWallet = newWallet;
      }
      if (!personalWallet) {
        return NextResponse.json({ success: false, error: "خطا در دسترسی به کیف پول شما" }, { status: 500 });
      }

      const currentBalance = Number(personalWallet.orgBalance);
      if (currentBalance < amount) {
        return NextResponse.json(
          {
            success: false,
            error: "موجودی کیف پول سازمانی شما کافی نیست",
            currentBalance,
            requiredAmount: amount,
            shortfall: amount - currentBalance,
          },
          { status: 400 }
        );
      }

      // کسر شرطی (CAS) از موجودی مستقل همین کاربر
      const { data: updatedWallet } = await supabaseAdmin
        .from("wallets")
        .update({ orgBalance: currentBalance - amount, updatedAt: new Date().toISOString() })
        .eq("id", personalWallet.id)
        .eq("orgBalance", currentBalance)
        .select()
        .maybeSingle();

      if (!updatedWallet) {
        return NextResponse.json(
          { success: false, error: "موجودی کیف پول شما هم‌زمان تغییر کرده است. لطفاً دوباره تلاش کنید." },
          { status: 409 }
        );
      }

      const trackingCode = `WALLET-${booking.id.split("-")[0].toUpperCase()}`;

      const rollbackWalletBalance = async () => {
        await supabaseAdmin
          .from("wallets")
          .update({ orgBalance: currentBalance, updatedAt: new Date().toISOString() })
          .eq("id", personalWallet!.id);
      };

      const { error: txError } = await supabaseAdmin.from("transactions").insert([
        {
          walletId: personalWallet.id,
          organizationId: organization.id,
          amount,
          type: "WITHDRAWAL",
          walletType: "ORGANIZATIONAL",
          gatewayStatus: "SUCCESS",
          trackingCode,
          bookingId: booking.id,
        },
      ]);

      if (txError) {
        console.error("Org Wallet Payment Transaction Insert Error (rolled back):", txError);
        await rollbackWalletBalance();
        return NextResponse.json({ success: false, error: "خطا در ثبت تراکنش؛ مبلغی از کیف پول شما کسر نشد" }, { status: 500 });
      }

      const { data: confirmedBooking } = await supabaseAdmin
        .from("bookings")
        .update({ status: "PAID_CONFIRMED" })
        .eq("id", booking.id)
        .eq("status", "WAITING_FOR_PAYMENT")
        .select()
        .maybeSingle();

      if (!confirmedBooking) {
        console.error(`Org Wallet Payment Rollback: booking ${booking.id} was no longer WAITING_FOR_PAYMENT.`);
        await rollbackWalletBalance();
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
        console.error("Org Wallet Payment Confirmation SMS Error (non-blocking):", smsError);
      }

      return NextResponse.json({
        success: true,
        message: "پرداخت از کیف پول سازمانی با موفقیت انجام شد و رزرو شما قطعی گردید.",
        booking: confirmedBooking,
      });
    }

    // ۴. مسیر پرداخت از کیف پول شخصی (NORMAL) — بدون تغییر
    let { data: wallet } = await supabaseAdmin.from("wallets").select("*").eq("userId", userId).maybeSingle();
    if (!wallet) {
      const { data: newWallet } = await supabaseAdmin.from("wallets").insert([{ userId }]).select().single();
      wallet = newWallet;
    }
    if (!wallet) {
      return NextResponse.json({ success: false, error: "خطا در دسترسی به کیف پول شما" }, { status: 500 });
    }

    const currentBalance = Number(wallet.normalBalance);
    if (currentBalance < amount) {
      return NextResponse.json(
        {
          success: false,
          error: "موجودی کیف پول شما کافی نیست",
          currentBalance,
          requiredAmount: amount,
          shortfall: amount - currentBalance,
        },
        { status: 400 }
      );
    }

    const { data: updatedWallet } = await supabaseAdmin
      .from("wallets")
      .update({ normalBalance: currentBalance - amount, updatedAt: new Date().toISOString() })
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

    const trackingCode = `WALLET-${booking.id.split("-")[0].toUpperCase()}`;

    const rollbackNormalBalance = async () => {
      await supabaseAdmin
        .from("wallets")
        .update({ normalBalance: currentBalance, updatedAt: new Date().toISOString() })
        .eq("id", wallet!.id);
    };

    const { error: txError } = await supabaseAdmin.from("transactions").insert([
      {
        walletId: wallet.id,
        amount,
        type: "WITHDRAWAL",
        walletType: "NORMAL",
        gatewayStatus: "SUCCESS",
        trackingCode,
        bookingId: booking.id,
      },
    ]);

    if (txError) {
      console.error("Wallet Payment Transaction Insert Error (rolled back):", txError);
      await rollbackNormalBalance();
      return NextResponse.json({ success: false, error: "خطا در ثبت تراکنش؛ مبلغی از کیف پول شما کسر نشد" }, { status: 500 });
    }

    const { data: confirmedBooking } = await supabaseAdmin
      .from("bookings")
      .update({ status: "PAID_CONFIRMED" })
      .eq("id", booking.id)
      .eq("status", "WAITING_FOR_PAYMENT")
      .select()
      .maybeSingle();

    if (!confirmedBooking) {
      console.error(`Wallet Payment Rollback: booking ${booking.id} was no longer WAITING_FOR_PAYMENT.`);
      await rollbackNormalBalance();
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
      console.error("Wallet Payment Confirmation SMS Error (non-blocking):", smsError);
    }

    return NextResponse.json({
      success: true,
      message: "پرداخت از کیف پول با موفقیت انجام شد و رزرو شما قطعی گردید.",
      booking: confirmedBooking,
    });
  } catch (error) {
    console.error("Pay With Wallet API Error:", error);
    return NextResponse.json({ success: false, error: "خطا در پردازش پرداخت" }, { status: 500 });
  }
}
