// مسیر: src/lib/wallet/refundAppliedWalletAmount.ts
//
// 🆕 تسک ۲۷ (قدیمی) چک‌لیست کارفرما (پرداخت ترکیبی کیف‌پول + درگاه):
// وقتی کاربر موجودی کیف‌پولش کمتر از مبلغ رزرو است، ابتدا تمام موجودی کیف پول
// (شخصی یا سازمانی) به‌صورت پیش‌پرداخت کسر می‌شود و فقط باقیمانده از طریق درگاه
// گرفته می‌شود (نگاه کنید به src/app/api/user/bookings/[id]/pay-partial-wallet/route.ts).
//
// حالا اگر همان رزرو، قبل از تکمیل پرداخت باقیمانده از درگاه، لغو شود (توسط خود
// کاربر) یا به‌خاطر گذشتن مهلت پرداخت به‌صورت خودکار منقضی شود، آن مبلغی که از
// قبل از کیف پول کسر شده بود باید به کیف پول برگردد — وگرنه کاربر بدون اینکه
// رزروش نهایی شده باشد، آن مبلغ را برای همیشه از دست می‌دهد.
//
// این تابع دقیقاً همین کار را انجام می‌دهد و از دو نقطه فراخوانی می‌شود تا منطق
// در یک‌جا متمرکز بماند و دوباره‌نویسی نشود:
//   ۱. src/app/api/user/bookings/[id]/cancel/route.ts (لغو دستی توسط کاربر)
//   ۲. src/lib/booking/expirePendingBookings.ts (انقضای خودکار به‌خاطر مهلت پرداخت)
//
// 🆕 بند ۲۷ (بازگشت کیف پول سازمانی به موجودی مستقل هر کارمند): عودت مبلغ
// سازمانی حالا به موجودی مستقل خودِ همین کاربر (wallets.orgBalance) برمی‌گردد،
// نه به یک استخر مشترک سازمان — دقیقاً از همان‌جایی که کسر شده بود.
//
// عملیات عمداً «غیرمخرب» است: اگر خطایی رخ دهد فقط در کنسول سرور لاگ می‌شود و
// جریان اصلی (لغو/انقضای رزرو) هرگز متوقف نمی‌شود.

import { supabaseAdmin } from "@/lib/supabase-admin";

interface BookingForRefund {
  id: string;
  userId: string;
  walletAmountApplied: number | null;
  walletTypeApplied: "NORMAL" | "ORGANIZATIONAL" | null;
}

/**
 * اگر روی این رزرو مبلغی از کیف پول به‌صورت پیش‌پرداخت ترکیبی کسر شده باشد
 * (walletAmountApplied > 0)، همان مبلغ را به کیف پول مربوطه (شخصی یا سازمانی
 * مستقل همین کاربر) برمی‌گرداند و یک تراکنش واریزی (با پیشوند REFUND- دقیقاً
 * هم‌الگو با بقیه‌ی عودت‌های پروژه) ثبت می‌کند. در پایان، walletAmountApplied
 * همان رزرو صفر می‌شود.
 */
export async function refundAppliedWalletAmount(booking: BookingForRefund): Promise<void> {
  const amount = Number(booking.walletAmountApplied || 0);
  if (amount <= 0) return;

  try {
    const trackingCode = `REFUND-${booking.id.split("-")[0].toUpperCase()}`;

    if (booking.walletTypeApplied === "ORGANIZATIONAL") {
      const { data: userRow } = await supabaseAdmin
        .from("users")
        .select("organizationName")
        .eq("id", booking.userId)
        .maybeSingle();

      if (!userRow?.organizationName) {
        console.error(
          `Refund Applied Wallet Amount: user ${booking.userId} has no organizationName (booking ${booking.id})`
        );
        return;
      }

      const { data: organization } = await supabaseAdmin
        .from("organizations")
        .select("id")
        .eq("name", userRow.organizationName)
        .maybeSingle();

      // موجودی مستقل خودِ همین کاربر (wallets.orgBalance) — دقیقاً از همان‌جایی
      // که کسر شده بود، به همان‌جا برمی‌گردد.
      let { data: personalWallet } = await supabaseAdmin
        .from("wallets")
        .select("id, orgBalance")
        .eq("userId", booking.userId)
        .maybeSingle();
      if (!personalWallet) {
        const { data: newWallet } = await supabaseAdmin
          .from("wallets")
          .insert([{ userId: booking.userId }])
          .select()
          .single();
        if (newWallet) personalWallet = newWallet;
      }
      if (!personalWallet) {
        console.error(
          `Refund Applied Wallet Amount: wallet not found/creatable for user ${booking.userId} (booking ${booking.id})`
        );
        return;
      }

      await supabaseAdmin
        .from("wallets")
        .update({
          orgBalance: Number(personalWallet.orgBalance) + amount,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", personalWallet.id);

      await supabaseAdmin.from("transactions").insert([
        {
          walletId: personalWallet.id,
          organizationId: organization?.id ?? null,
          amount,
          type: "DEPOSIT",
          walletType: "ORGANIZATIONAL",
          gatewayStatus: "SUCCESS",
          trackingCode,
          bookingId: booking.id,
        },
      ]);
    } else {
      // عودت به کیف پول شخصی کاربر (NORMAL)
      let { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("id, normalBalance")
        .eq("userId", booking.userId)
        .maybeSingle();
      if (!wallet) {
        const { data: newWallet } = await supabaseAdmin
          .from("wallets")
          .insert([{ userId: booking.userId }])
          .select()
          .single();
        if (newWallet) wallet = newWallet;
      }
      if (!wallet) {
        console.error(
          `Refund Applied Wallet Amount: wallet not found/creatable for user ${booking.userId} (booking ${booking.id})`
        );
        return;
      }

      await supabaseAdmin
        .from("wallets")
        .update({
          normalBalance: Number(wallet.normalBalance) + amount,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", wallet.id);

      await supabaseAdmin.from("transactions").insert([
        {
          walletId: wallet.id,
          amount,
          type: "DEPOSIT",
          walletType: "NORMAL",
          gatewayStatus: "SUCCESS",
          trackingCode,
          bookingId: booking.id,
        },
      ]);
    }

    await supabaseAdmin.from("bookings").update({ walletAmountApplied: 0 }).eq("id", booking.id);
  } catch (err) {
    console.error(
      `Refund Applied Wallet Amount Unexpected Error (booking ${booking.id}, non-blocking):`,
      err
    );
  }
}
