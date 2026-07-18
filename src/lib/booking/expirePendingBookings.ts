// مسیر: src/lib/booking/expirePendingBookings.ts
// این فایل جدید است — آن را در مسیر بالا در پروژه ایجاد کنید.
//
// 🆕 اصلاح مورد ۱ از لیست موارد نیمه‌کاره (۲۰۲۶/۰۷/۱۱):
// «تاریخ‌های رزرو پرداخت‌نشده، برای همیشه بلاک می‌مونن»
//
// مشکل قبلی: وقتی مهمانی رزرو ثبت می‌کرد ولی هرگز پرداخت را کامل نمی‌کرد،
// رزرو در وضعیت WAITING_FOR_PAYMENT برای همیشه باقی می‌ماند و چون این وضعیت
// هم مثل رزرو قطعی (PAID_CONFIRMED) در چک همپوشانی تاریخ لحاظ می‌شد، آن بازه‌ی
// تاریخی برای همیشه از دسترس مهمانان دیگر خارج می‌شد.
//
// راه‌حل: یک وضعیت جدید "EXPIRED" به BookingStatus اضافه شد. این فایل یک
// کمک‌تابع مشترک ارائه می‌دهد که در چند نقطه‌ی کلیدی (ثبت رزرو جدید، درخواست
// پرداخت، و دریافت لیست رزروهای کاربر) صدا زده می‌شود تا رزروهای منقضی‌شده را
// به‌صورت «تنبل» (Lazy) و بدون نیاز به Cron Job جداگانه، پاک‌سازی کند.
//
// ⚠️ برای کار کردن این فایل باید ستون status جدول bookings طوری migrate بشه
// که مقدار 'EXPIRED' رو هم قبول کنه — به فایل SQL همراه این تغییر مراجعه کنید.
//
// 🆕 تسک ۲۷ چک‌لیست کارفرما (منطق پرداخت ترکیبی کیف پول + درگاه): اگر روی یکی از
// رزروهایی که الان منقضی می‌شود، قبلاً بخشی از مبلغ از طریق پرداخت ترکیبی از کیف
// پول (شخصی یا مشترک سازمانی) کسر شده باشد (bookings.walletAmountApplied)، قبل
// از منقضی‌کردن، همان مبلغ به کیف پول برمی‌گردد — با تابع مشترک
// refundAppliedWalletAmount — وگرنه با انقضای خودکار رزرو، آن مبلغ بدون دلیل از
// کاربر گرفته می‌ماند.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { PAYMENT_DEADLINE_MINUTES } from "@/constants/booking";
import { refundAppliedWalletAmount } from "@/lib/wallet/refundAppliedWalletAmount";

interface ExpireStaleBookingsOptions {
  // محدود کردن پاک‌سازی به یک اقامتگاه مشخص (هنگام ثبت رزرو جدید برای همان اتاق)
  roomId?: string;
  // محدود کردن پاک‌سازی به رزروهای یک کاربر مشخص (هنگام باز کردن لیست «رزروهای من»)
  userId?: string;
  // محدود کردن پاک‌سازی به یک رزرو مشخص (هنگام تلاش برای پرداخت یک رزرو خاص)
  bookingId?: string;
}

/**
 * رزروهایی که در وضعیت WAITING_FOR_PAYMENT هستند و مهلت پرداختشان
 * (PAYMENT_DEADLINE_MINUTES) گذشته، را به‌صورت خودکار به وضعیت EXPIRED
 * تغییر می‌دهد. این تابع «غیرمخرب» است: اگر خطایی رخ دهد فقط لاگ می‌شود و
 * جریان اصلی درخواست (رزرو/پرداخت/لیست) را مختل نمی‌کند.
 */
export async function expireStalePendingBookings(
  options: ExpireStaleBookingsOptions = {}
): Promise<void> {
  try {
    const cutoffIso = new Date(Date.now() - PAYMENT_DEADLINE_MINUTES * 60 * 1000).toISOString();

    // 🆕 تسک ۲۷: قبل از منقضی‌کردن، ابتدا خودِ ردیف‌ها را می‌خوانیم (نه مستقیم UPDATE)
    // تا در صورت وجود پیش‌پرداخت ترکیبی از کیف پول (walletAmountApplied > 0)، بتوانیم
    // همان مبلغ را پیش از تغییر وضعیت به EXPIRED عودت دهیم.
    let selectQuery = supabaseAdmin
      .from("bookings")
      .select("id, userId, walletAmountApplied, walletTypeApplied")
      .eq("status", "WAITING_FOR_PAYMENT")
      .lt("createdAt", cutoffIso);

    if (options.roomId) selectQuery = selectQuery.eq("roomId", options.roomId);
    if (options.userId) selectQuery = selectQuery.eq("userId", options.userId);
    if (options.bookingId) selectQuery = selectQuery.eq("id", options.bookingId);

    const { data: staleBookings, error: selectError } = await selectQuery;

    if (selectError) {
      console.error("Expire Stale Pending Bookings Select Error (non-blocking):", selectError);
      return;
    }

    if (!staleBookings || staleBookings.length === 0) return;

    for (const staleBooking of staleBookings) {
      if (Number(staleBooking.walletAmountApplied || 0) > 0) {
        await refundAppliedWalletAmount(staleBooking);
      }
    }

    const staleIds = staleBookings.map((b) => b.id);

    const { error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({
        status: "EXPIRED",
        cancelReason: "به دلیل عدم پرداخت در مهلت مقرر، این رزرو به‌صورت خودکار منقضی شد",
      })
      .in("id", staleIds);

    if (updateError) {
      // این خطا نباید کل درخواست را متوقف کند — پاک‌سازی خودکار یک عملیات
      // کمکی/غیرحیاتی است و نباید تجربه‌ی کاربر را مختل کند.
      console.error("Expire Stale Pending Bookings Update Error (non-blocking):", updateError);
    }
  } catch (err) {
    console.error("Expire Stale Pending Bookings Unexpected Error (non-blocking):", err);
  }
}

/** آیا مهلت پرداخت یک رزروِ در انتظار پرداخت، تا این لحظه به پایان رسیده است؟ */
export function isPaymentDeadlinePassed(createdAt: string | Date): boolean {
  const createdTime = new Date(createdAt).getTime();
  const deadlineTime = createdTime + PAYMENT_DEADLINE_MINUTES * 60 * 1000;
  return Date.now() > deadlineTime;
}