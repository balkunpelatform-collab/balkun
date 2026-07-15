// مسیر: src/app/api/user/bookings/[id]/pay-with-wallet/route.ts
//
// 🆕 تسک ۲ از Task.md (۲۰۲۶/۰۷/۱۱): «کیف پول رو نمی‌شه مستقیم برای رزرو خرج کرد»
// راه‌حل: این Route Handler مبلغ رزرو را مستقیماً و به‌صورت اتمیک از موجودی کیف پول
// کاربر (عادی یا سازمانی) کسر می‌کند و بلافاصله رزرو را قطعی می‌کند — بدون نیاز به
// هیچ درگاه بانکی.
//
// 🆕 تسک ۷ چک‌لیست کارفرما (تفکیک کیف پول سازمانی + شارژ خودکار + غیرفعال‌سازی سازمان):
// قبل از این تغییر، هر کاربر سازمانی موجودی «سازمانی» شخصی و مجزای خودش را داشت
// (wallets.orgBalance) — که با تعریف صفحه‌ی سازمانی («اعتبار اختصاصی سازمان که توسط
// تمام پرسنل قابل استفاده است») در تناقض بود. از این پس:
//   ۱. موجودی واقعی کیف پول سازمانی از جدول جدید `organizations` (فیلد walletBalance)
//      خوانده و کسر می‌شود — یعنی یک استخر مشترک واحد برای کل پرسنل همان سازمان.
//   ۲. اگر سازمان کاربر غیرفعال (isActive=false) شده باشد، پرداخت از کیف پول سازمانی
//      کاملاً مسدود می‌شود (حتی اگر موجودی کافی باشد).
//   ۳. تراکنش ثبت‌شده هم‌زمان walletId (کیف پول شخصی کاربرِ پرداخت‌کننده — برای حفظ
//      سازگاری کامل با گزارش‌های موجود مثل «تاریخچه کیف پول» و «پرداخت‌ها») و هم
//      organizationId (برای گزارش‌گیری در سطح کل سازمان) را دارد.
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

    // ۳. مسیر پرداخت از کیف پول سازمانی (استخر مشترک سازمان)
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
      if (currentOrgBalance < amount) {
        return NextResponse.json(
          {
            success: false,
            error: "موجودی کیف پول مشترک سازمان کافی نیست",
            currentBalance: currentOrgBalance,
            requiredAmount: amount,
            shortfall: amount - currentOrgBalance,
          },
          { status: 400 }
        );
      }

      // کسر شرطی (CAS) از استخر مشترک سازمان
      const { data: updatedOrganization } = await supabaseAdmin
        .from("organizations")
        .update({ walletBalance: currentOrgBalance - amount, updatedAt: new Date().toISOString() })
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

      // کیف پول شخصی کاربر فقط برای پیوست‌کردن walletId به تراکنش (سازگاری با گزارش‌های موجود) لازم است
      let { data: personalWallet } = await supabaseAdmin.from("wallets").select("*").eq("userId", userId).maybeSingle();
      if (!personalWallet) {
        const { data: newWallet } = await supabaseAdmin.from("wallets").insert([{ userId }]).select().single();
        if (newWallet) personalWallet = newWallet;
      }

      const trackingCode = `WALLET-${booking.id.split("-")[0].toUpperCase()}`;

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
        await rollbackOrgBalance();
        return NextResponse.json({ success: false, error: "خطا در ثبت تراکنش؛ مبلغی از کیف پول سازمان کسر نشد" }, { status: 500 });
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
        await rollbackOrgBalance();
        await supabaseAdmin
          .from("transactions")
          .update({ gatewayStatus: "FAILED" })
          .eq("organizationId", organization.id)
          .eq("trackingCode", trackingCode);

        return NextResponse.json(
          { success: false, error: "این رزرو دیگر قابل پرداخت نبود. مبلغی از کیف پول سازمان کسر نشد." },
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
        message: "پرداخت از کیف پول مشترک سازمان با موفقیت انجام شد و رزرو شما قطعی گردید.",
        booking: confirmedBooking,
      });
    }

    // ۴. مسیر پرداخت از کیف پول شخصی (NORMAL) — بدون تغییر نسبت به قبل
    let { data: wallet } = await supabaseAdmin.from("wallets").select("*").eq("userId", userId).maybeSingle();
    if (!wallet) {
      const { data: newWallet } = await supabaseAdmin.from("wallets").insert([{ userId }]).select().single();
      if (newWallet) wallet = newWallet;
    }
    if (!wallet) throw new Error("کیف پول یافت نشد");

    const currentBalance = Number(wallet.normalBalance);

    if (currentBalance < amount) {
      return NextResponse.json(
        {
          success: false,
          error: "موجودی کیف پول کافی نیست",
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
      await supabaseAdmin
        .from("wallets")
        .update({ normalBalance: currentBalance, updatedAt: new Date().toISOString() })
        .eq("id", wallet.id);
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
      await supabaseAdmin
        .from("wallets")
        .update({ normalBalance: currentBalance, updatedAt: new Date().toISOString() })
        .eq("id", wallet.id);
      await supabaseAdmin
        .from("transactions")
        .update({ gatewayStatus: "FAILED" })
        .eq("walletId", wallet.id)
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
    return NextResponse.json({ success: false, error: "خطا در پردازش پرداخت از کیف پول" }, { status: 500 });
  }
}