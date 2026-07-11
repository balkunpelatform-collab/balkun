// مسیر: src/app/api/user/bookings/[id]/pay-with-wallet/route.ts
//
// 🆕 تسک ۲ از Task.md (۲۰۲۶/۰۷/۱۱): «کیف پول رو نمی‌شه مستقیم برای رزرو خرج کرد»
// این فایل جدید است — آن را در مسیر بالا در پروژه ایجاد کنید.
//
// مشکل قبلی: تنها راه پرداخت رزرو، هدایت به درگاه (Mock Gateway) بود؛ حتی اگر
// کاربر موجودی کافی در کیف پول عادی یا سازمانی خودش داشت، مجبور بود به درگاه برود.
// این دقیقاً همان قابلیتی است که در صفحه‌ی سازمانی («کیف پول سازمانی: اعتبار
// اختصاصی برای سازمان شما که توسط تمام پرسنل برای رزرو قابل استفاده است») وعده
// داده شده بود.
//
// راه‌حل: این Route Handler جدید، مبلغ رزرو را مستقیماً و به‌صورت اتمیک از موجودی
// کیف پول کاربر (عادی یا سازمانی) کسر می‌کند و بلافاصله رزرو را قطعی می‌کند —
// بدون نیاز به هیچ درگاه بانکی.
//
// نکات امنیتی/فنی که رعایت شده:
// ۱. این مسیر زیرمجموعه‌ی «/api/user» است، پس middleware.ts به‌صورت خودکار نشست
//    کاربر را بررسی و هدر امن x-balkun-user-id را تزریق می‌کند (کاربر نمی‌تواند
//    userId دلخواه بفرستد).
// ۲. مبلغ رزرو هرگز از بدنه‌ی درخواست خوانده نمی‌شود؛ همیشه از totalPaidAmount
//    ثبت‌شده در دیتابیس خوانده می‌شود (طبق همان الگوی api/payment/request).
// ۳. جلوگیری از Race Condition (مثلاً کلیک دوبار پشت‌سرهم روی دکمه پرداخت، یا دو
//    تب باز): کسر موجودی با یک UPDATE شرطی (Optimistic/Compare-And-Swap) انجام
//    می‌شود — فقط اگر موجودی هنوز همان مقداری باشد که لحظه‌ی قبل خوانده شد، کسر
//    انجام می‌شود. تغییر وضعیت رزرو هم فقط از حالت WAITING_FOR_PAYMENT مجاز است.
// ۴. مدیریت خطای نیمه‌کاره: اگر موجودی کسر شد ولی به هر دلیل (مثلاً رزرو هم‌زمان
//    توسط کاربر دیگر منقضی/لغو شده) قطعی‌کردن رزرو ناموفق بود، مبلغ بلافاصله به
//    کیف پول کاربر برگردانده می‌شود (Rollback) — کاربر هرگز بدون رزرو، پول از
//    دست نمی‌دهد.

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

    // ۲. بررسی مهلت پرداخت (همان منطق api/payment/request) — اگر گذشته، منقضی می‌کنیم
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

    // ۳. اگر کاربر می‌خواهد از کیف پول سازمانی پرداخت کند، باید واقعاً کاربر سازمانی باشد
    if (walletType === "ORGANIZATIONAL") {
      const { data: userRow } = await supabaseAdmin
        .from("users")
        .select("userType")
        .eq("id", userId)
        .maybeSingle();

      if (!userRow || userRow.userType !== "ORGANIZATIONAL") {
        return NextResponse.json(
          { success: false, error: "کیف پول سازمانی فقط برای کاربران سازمانی قابل استفاده است" },
          { status: 403 }
        );
      }
    }

    // ۴. دریافت کیف پول کاربر (اگر نداشت، مثل سایر مسیرها برایش ساخته می‌شود)
    let { data: wallet } = await supabaseAdmin.from("wallets").select("*").eq("userId", userId).maybeSingle();
    if (!wallet) {
      const { data: newWallet } = await supabaseAdmin.from("wallets").insert([{ userId }]).select().single();
      if (newWallet) wallet = newWallet;
    }
    if (!wallet) throw new Error("کیف پول یافت نشد");

    const amount = Number(booking.totalPaidAmount);
    const balanceField = walletType === "ORGANIZATIONAL" ? "orgBalance" : "normalBalance";
    const currentBalance = Number(wallet[balanceField]);

    // ۵. بررسی کفایت موجودی
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

    // ۶. کسر موجودی — به‌صورت شرطی (CAS) تا در صورت درخواست هم‌زمان، دوبار کسر نشود
    const { data: updatedWallet } = await supabaseAdmin
      .from("wallets")
      .update({ [balanceField]: currentBalance - amount, updatedAt: new Date().toISOString() })
      .eq("id", wallet.id)
      .eq(balanceField, currentBalance)
      .select()
      .maybeSingle();

    if (!updatedWallet) {
      return NextResponse.json(
        { success: false, error: "موجودی کیف پول شما هم‌زمان تغییر کرده است. لطفاً دوباره تلاش کنید." },
        { status: 409 }
      );
    }

    const trackingCode = `WALLET-${booking.id.split("-")[0].toUpperCase()}`;

    // ۷. ثبت تراکنش برداشت
    const { error: txError } = await supabaseAdmin.from("transactions").insert([
      {
        walletId: wallet.id,
        amount,
        type: "WITHDRAWAL",
        walletType,
        gatewayStatus: "SUCCESS",
        trackingCode,
        bookingId: booking.id,
      },
    ]);

    if (txError) {
      // Rollback: ثبت تراکنش شکست خورد، پس موجودی کسرشده را برمی‌گردانیم
      console.error("Wallet Payment Transaction Insert Error (rolled back):", txError);
      await supabaseAdmin
        .from("wallets")
        .update({ [balanceField]: currentBalance, updatedAt: new Date().toISOString() })
        .eq("id", wallet.id);
      return NextResponse.json({ success: false, error: "خطا در ثبت تراکنش؛ مبلغی از کیف پول شما کسر نشد" }, { status: 500 });
    }

    // ۸. قطعی‌کردن رزرو — فقط اگر هنوز در وضعیت WAITING_FOR_PAYMENT باشد
    const { data: confirmedBooking } = await supabaseAdmin
      .from("bookings")
      .update({ status: "PAID_CONFIRMED" })
      .eq("id", booking.id)
      .eq("status", "WAITING_FOR_PAYMENT")
      .select()
      .maybeSingle();

    if (!confirmedBooking) {
      // Rollback کامل: رزرو دیگر قابل پرداخت نبود (مثلاً هم‌زمان لغو/منقضی شده) —
      // هم موجودی کیف پول را برمی‌گردانیم و هم تراکنش را FAILED علامت می‌زنیم
      console.error(`Wallet Payment Rollback: booking ${booking.id} was no longer WAITING_FOR_PAYMENT.`);
      await supabaseAdmin
        .from("wallets")
        .update({ [balanceField]: currentBalance, updatedAt: new Date().toISOString() })
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

    // ۹. اطلاع‌رسانی پیامکی (غیرحیاتی — نباید جریان پرداخت را مختل کند)
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
      trackingCode,
    });
  } catch (error) {
    console.error("Pay With Wallet Error:", error);
    return NextResponse.json({ success: false, error: "خطای سرور در پردازش پرداخت" }, { status: 500 });
  }
}