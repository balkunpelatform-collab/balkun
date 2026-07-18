// مسیر: src/components/profile/BookingCard.tsx
//
// 🔧 اصلاح باگ تسک ۷ چک‌لیست کارفرما (تفکیک کیف پول سازمانی + شارژ خودکار + غیرفعال‌سازی سازمان):
// این فایل قبلاً موجودی «کیف پول سازمانی» را از فیلد قدیمی wallet.orgBalance می‌خواند.
// طبق طراحی جدید تسک ۷ (نگاه کنید به src/lib/wallet/ensureOrganization.ts و
// src/app/api/user/wallet/route.ts)، ستون wallets.orgBalance دیگر استفاده نمی‌شود و همیشه
// ۰ است؛ موجودی واقعی و مشترک سازمان از این پس فقط در organizations.walletBalance نگه
// داشته می‌شود و روت GET /api/user/wallet آن را در فیلد جداگانه‌ی «organization» برمی‌گرداند.
//
// نتیجه‌ی این باگ قبل از اصلاح: در مودال «پرداخت از کیف پول»، گزینه‌ی «کیف پول سازمانی»
// همیشه موجودی ۰ تومان نشان می‌داد و دکمه‌ی «تایید و پرداخت» برای آن همیشه غیرفعال بود —
// یعنی کاربران سازمانی عملاً هیچ‌وقت نمی‌توانستند از کیف پول مشترک سازمان‌شان برای پرداخت
// رزرو استفاده کنند، حتی اگر موجودی سازمان کافی بود (چون خودِ Route Handler پرداخت،
// src/app/api/user/bookings/[id]/pay-with-wallet/route.ts، درست پیاده‌سازی شده بود).
//
// اصلاح: موجودی سازمانی حالا از data.organization.walletBalance خوانده می‌شود، نه
// data.wallet.orgBalance. همچنین وضعیت فعال/غیرفعال بودن سازمان (organization.isActive)
// هم در نظر گرفته می‌شود: اگر سازمان غیرفعال شده باشد، گزینه‌ی کیف پول سازمانی با پیام
// روشن «غیرفعال شده» نمایش داده می‌شود (نه فقط «کافی نیست»)، و انتخاب/پرداخت از آن مسدود
// می‌شود — دقیقاً همان رفتاری که در Route Handler پرداخت هم اعمال شده.
//
// 🆕 تسک ۲۷ چک‌لیست کارفرما (منطق پرداخت ترکیبی کیف پول + درگاه): اگر موجودی کیف پول
// انتخاب‌شده کمتر از مبلغ باقیمانده‌ی رزرو باشد ولی صفر نباشد، یک دکمه‌ی «پرداخت ترکیبی»
// اضافه شده که ابتدا همان مبلغ موجود را از کیف پول کسر می‌کند (از طریق روت جدید
// api/user/bookings/[id]/pay-partial-wallet) و بلافاصله کاربر را برای پرداخت فقط
// باقیمانده به درگاه بانکی هدایت می‌کند — به‌جای اینکه یا منتظر شارژ کامل کیف پول بماند،
// یا کل مبلغ رزرو دوباره از درگاه کسر شود. «مبلغ قابل پرداخت» در این مودال هم از این پس
// amountDue (یعنی totalPaidAmount منهای هر مبلغی که قبلاً اعمال شده) است، نه کل مبلغ رزرو.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Users, CalendarDays, Receipt, Loader2, XCircle, FileText, Lock, Wallet as WalletIcon, X, AlertTriangle } from "lucide-react";
import { formatPrice } from "@/utils/priceCalculator";
import { CANCELLATION_DEADLINE_HOURS } from "@/constants/booking";
import { useAuthStore } from "@/store/authStore";
import type { Booking } from "@/types/database";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  WAITING_FOR_HOST: { label: "در انتظار تایید میزبان", color: "text-balkun-yellow", bg: "bg-balkun-yellow/10" },
  WAITING_FOR_PAYMENT: { label: "در انتظار پرداخت", color: "text-balkun-orange", bg: "bg-balkun-orange/10" },
  PAID_CONFIRMED: { label: "رزرو قطعی", color: "text-green-600", bg: "bg-green-100" },
  CANCELLED_BY_HOST: { label: "لغو توسط میزبان", color: "text-red-600", bg: "bg-red-50" },
  CANCELLED_BY_GUEST: { label: "لغو توسط مسافر", color: "text-red-600", bg: "bg-red-50" },
  // 🆕 اصلاح مورد ۱ (۲۰۲۶/۰۷/۱۱): رزروهایی که پرداخت نشدند و مهلتشان تمام شد
  EXPIRED: { label: "مهلت پرداخت تمام شد", color: "text-slate-500", bg: "bg-slate-100" },
};

// 🆕 تسک ۲ (۲۰۲۶/۰۷/۱۱) — پرداخت مستقیم رزرو از موجودی کیف پول
type WalletBalances = { normalBalance: number; orgBalance: number };

// 🔧 اصلاح تسک ۷: اطلاعات کیف پول مشترک سازمان (از فیلد organization در پاسخ /api/user/wallet)
interface OrganizationWalletInfo {
  isActive: boolean;
  walletBalance: number;
}

export default function BookingCard({ booking }: { booking: Booking }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);

  // مودال پرداخت از کیف پول
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [walletBalances, setWalletBalances] = useState<WalletBalances | null>(null);
  // 🔧 اصلاح تسک ۷: وضعیت واقعی سازمان (فعال/غیرفعال) کنار موجودی نگه داشته می‌شود
  const [organizationInfo, setOrganizationInfo] = useState<OrganizationWalletInfo | null>(null);
  const [selectedWalletType, setSelectedWalletType] = useState<"NORMAL" | "ORGANIZATIONAL">("NORMAL");
  const [isPayingWithWallet, setIsPayingWithWallet] = useState(false);

  const statusInfo = STATUS_MAP[booking.status] || { label: "نامشخص", color: "text-slate-500", bg: "bg-slate-100" };
  const checkIn = new Date(booking.checkInDate).toLocaleDateString("fa-IR");
  const checkOut = new Date(booking.checkOutDate).toLocaleDateString("fa-IR");
  const totalGuests = booking.basePersonCount + booking.extraPersonCount;
  const isOrganizational = user?.userType === "ORGANIZATIONAL";

  // 🆕 تسک ۱.۶ — آیا مهلت لغو رایگان این رزرو قطعی‌شده به پایان رسیده؟
  // (فقط برای رزروهای PAID_CONFIRMED معنا دارد؛ رزروهای در انتظار پرداخت همیشه قابل لغو‌اند)
  const hoursUntilCheckIn = (new Date(booking.checkInDate).getTime() - Date.now()) / (1000 * 60 * 60);
  const isCancellationWindowClosed =
    booking.status === "PAID_CONFIRMED" && hoursUntilCheckIn < CANCELLATION_DEADLINE_HOURS;

  // هندلر پرداخت از درگاه بانکی
  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/payment/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "BOOKING_PAYMENT",
          bookingId: booking.id,
          amount: booking.totalPaidAmount
        })
      });
      const data = await res.json();
      if (data.success && data.url) {
        router.push(data.url);
      } else {
        alert(data.error || "خطا در اتصال به درگاه");
        setIsProcessing(false);
      }
    } catch {
      alert("خطای شبکه");
      setIsProcessing(false);
    }
  };

  // 🆕 تسک ۲ — باز کردن مودال پرداخت از کیف پول و دریافت موجودی به‌روز
  // 🔧 اصلاح تسک ۷: موجودی سازمانی از data.organization.walletBalance خوانده می‌شود،
  // نه از data.wallet.orgBalance (که همیشه ۰ است). وضعیت فعال/غیرفعال سازمان هم ذخیره می‌شود.
  const openWalletModal = async () => {
    setIsWalletModalOpen(true);
    setWalletError("");
    setWalletBalances(null);
    setOrganizationInfo(null);
    setSelectedWalletType("NORMAL");
    setIsWalletLoading(true);
    try {
      const res = await fetch("/api/user/wallet");
      const data = await res.json();
      if (data.success && data.wallet) {
        const orgInfo: OrganizationWalletInfo | null = data.organization
          ? { isActive: Boolean(data.organization.isActive), walletBalance: Number(data.organization.walletBalance) }
          : null;
        const balances: WalletBalances = {
          normalBalance: Number(data.wallet.normalBalance),
          orgBalance: orgInfo ? orgInfo.walletBalance : 0,
        };
        setOrganizationInfo(orgInfo);
        setWalletBalances(balances);
        // 🆕 تسک ۲۷: مقایسه با مبلغ باقیمانده (amountDue)، نه کل مبلغ رزرو
        const amountDueNow = Number(booking.totalPaidAmount) - Number(booking.walletAmountApplied || 0);
        // پیش‌فرض هوشمند: اگر کاربر سازمانی است، سازمانش فعال است و موجودی سازمانی کافی دارد، همان انتخاب شود
        if (isOrganizational && orgInfo?.isActive && balances.orgBalance >= amountDueNow) {
          setSelectedWalletType("ORGANIZATIONAL");
        } else {
          setSelectedWalletType("NORMAL");
        }
      } else {
        setWalletError(data.error || "خطا در دریافت موجودی کیف پول");
      }
    } catch {
      setWalletError("خطای شبکه در دریافت موجودی کیف پول");
    } finally {
      setIsWalletLoading(false);
    }
  };

  // 🆕 تسک ۲ — ثبت نهایی پرداخت از کیف پول
  const handleWalletPayment = async () => {
    setIsPayingWithWallet(true);
    setWalletError("");
    try {
      const res = await fetch(`/api/user/bookings/${booking.id}/pay-with-wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletType: selectedWalletType }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.reload(); // رفرش ساده برای نمایش وضعیت قطعی‌شده رزرو
      } else {
        setWalletError(data.error || "پرداخت از کیف پول ناموفق بود");
      }
    } catch {
      setWalletError("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsPayingWithWallet(false);
    }
  };

  // 🆕 تسک ۲۷ — پرداخت ترکیبی: ابتدا هر چقدر از کیف پول انتخاب‌شده در دسترس است کسر
  // می‌شود، سپس کاربر برای پرداخت فقط باقیمانده به درگاه هدایت می‌شود.
  const handleCombinedPayment = async () => {
    setIsPayingWithWallet(true);
    setWalletError("");
    try {
      const res = await fetch(`/api/user/bookings/${booking.id}/pay-partial-wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletType: selectedWalletType }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.fullyPaid) {
          window.location.reload(); // موجودی کیف پول کل مبلغ باقیمانده را پوشش داد؛ رزرو قطعی شد
          return;
        }
        // بخشی از مبلغ از کیف پول کسر شد؛ حالا برای باقیمانده به درگاه هدایت می‌شویم.
        // handlePayment مبلغ را از سرور و بر اساس مقدار به‌روزشده‌ی walletAmountApplied
        // دوباره محاسبه می‌کند، پس نیازی به محاسبه‌ی دستی باقیمانده در همین‌جا نیست.
        setIsWalletModalOpen(false);
        await handlePayment();
      } else {
        setWalletError(data.error || "پرداخت ترکیبی ناموفق بود");
        setIsPayingWithWallet(false);
      }
    } catch {
      setWalletError("خطای شبکه. لطفاً دوباره تلاش کنید.");
      setIsPayingWithWallet(false);
    }
  };

  // هندلر لغو رزرو
  const handleCancel = async () => {
    if (!confirm("آیا از لغو این رزرو اطمینان دارید؟ در صورت پرداخت، مبلغ به کیف پول شما عودت داده می‌شود.")) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/user/bookings/${booking.id}/cancel`, {
        method: "POST"
      });
      const data = await res.json();
      alert(data.message || data.error);
      if (data.success) {
        window.location.reload(); // رفرش ساده برای نمایش تغییر وضعیت
      }
    } catch {
      alert("خطا در ارتباط با سرور");
    } finally {
      setIsProcessing(false);
    }
  };

  // 🆕 تسک ۲۷: مبلغ واقعاً قابل پرداخت این رزرو — اگر قبلاً بخشی از کیف پول کسر
  // شده باشد (پرداخت ترکیبی)، این مقدار کمتر از totalPaidAmount خواهد بود.
  const amountDue = Math.max(0, Number(booking.totalPaidAmount) - Number(booking.walletAmountApplied || 0));

  const selectedBalance = walletBalances
    ? (selectedWalletType === "ORGANIZATIONAL" ? walletBalances.orgBalance : walletBalances.normalBalance)
    : 0;
  // 🔧 اصلاح تسک ۷: اگر کیف پول سازمانی انتخاب شده، علاوه بر کافی‌بودن موجودی، سازمان هم باید فعال باشد
  // 🆕 تسک ۲۷: مقایسه با amountDue (مبلغ باقیمانده)، نه کل مبلغ رزرو
  const hasEnoughBalance = walletBalances
    ? selectedWalletType === "ORGANIZATIONAL"
      ? Boolean(organizationInfo?.isActive) && selectedBalance >= amountDue
      : selectedBalance >= amountDue
    : false;
  // 🆕 تسک ۲۷: آیا امکان پرداخت ترکیبی وجود دارد؟ یعنی موجودی کیف پول انتخاب‌شده
  // بیشتر از صفر است ولی به‌تنهایی کل مبلغ باقیمانده را پوشش نمی‌دهد
  const canPayCombined =
    walletBalances !== null &&
    selectedBalance > 0 &&
    selectedBalance < amountDue &&
    !(selectedWalletType === "ORGANIZATIONAL" && !organizationInfo?.isActive);

  return (
    <div className="border border-slate-100 rounded-2xl p-4 md:p-5 hover:border-balkun-cyan/30 transition-colors shadow-sm flex flex-col gap-4">

      {/* 🆕 تسک ۲ — مودال پرداخت از کیف پول */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isPayingWithWallet && setIsWalletModalOpen(false)}></div>
          <div className="bg-white rounded-[2rem] p-6 max-w-sm w-full relative z-10 shadow-2xl">
            <button
              onClick={() => !isPayingWithWallet && setIsWalletModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2 mt-2">
              <div className="w-11 h-11 bg-balkun-cyan/10 rounded-2xl flex items-center justify-center shrink-0">
                <WalletIcon className="w-5 h-5 text-balkun-cyan" />
              </div>
              <h3 className="text-lg font-black text-balkun-navy">پرداخت از کیف پول</h3>
            </div>

            <p className="text-xs font-medium text-slate-500 mb-5">
              مبلغ رزرو مستقیماً از موجودی کیف پول شما کسر می‌شود و رزرو بلافاصله قطعی خواهد شد.
            </p>

            {isWalletLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="w-7 h-7 text-balkun-cyan animate-spin" />
                <span className="text-xs font-bold text-slate-400">در حال دریافت موجودی کیف پول...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <span className="text-xs font-bold text-slate-500">مبلغ باقیمانده قابل پرداخت</span>
                  <span className="text-base font-black text-balkun-navy">
                    {formatPrice(amountDue)} <span className="text-[10px] font-bold text-slate-400">تومان</span>
                  </span>
                </div>

                {/* 🆕 تسک ۲۷: اگر قبلاً بخشی از این رزرو با پرداخت ترکیبی از کیف پول کسر شده */}
                {Number(booking.walletAmountApplied || 0) > 0 && (
                  <p className="text-[10px] font-bold text-slate-400 -mt-2 leading-relaxed">
                    تاکنون {formatPrice(Number(booking.walletAmountApplied || 0))} تومان از مبلغ کل این رزرو ({formatPrice(booking.totalPaidAmount)} تومان) از کیف پول شما کسر شده است.
                  </p>
                )}

                {walletBalances && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setSelectedWalletType("NORMAL")}
                      disabled={isPayingWithWallet}
                      className={`w-full text-right rounded-xl border-2 p-3.5 transition-colors flex items-center justify-between gap-3 ${
                        selectedWalletType === "NORMAL" ? "border-balkun-cyan bg-balkun-cyan/5" : "border-slate-100"
                      } ${walletBalances.normalBalance < amountDue ? "opacity-60" : ""}`}
                    >
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="text-xs font-black text-slate-700">کیف پول عادی</span>
                        <span className="text-[10px] font-bold text-slate-400">
                          موجودی: {formatPrice(walletBalances.normalBalance)} تومان
                        </span>
                      </div>
                      {walletBalances.normalBalance < amountDue && (
                        <span className="text-[10px] font-bold text-red-500 shrink-0">کافی نیست</span>
                      )}
                    </button>

                    {/* 🔧 اصلاح تسک ۷: گزینه‌ی کیف پول سازمانی حالا موجودی واقعی مشترک سازمان
                        (organization.walletBalance) را نشان می‌دهد، نه فیلد قدیمی و همیشه-صفرِ
                        wallet.orgBalance. اگر سازمان غیرفعال باشد یا هنوز در سیستم ثبت نشده باشد،
                        پیام روشن مربوطه نشان داده می‌شود و امکان انتخاب/پرداخت مسدود می‌ماند. */}
                    {isOrganizational && (
                      <button
                        onClick={() => {
                          if (isPayingWithWallet) return;
                          if (!organizationInfo?.isActive) return;
                          setSelectedWalletType("ORGANIZATIONAL");
                        }}
                        disabled={isPayingWithWallet || !organizationInfo?.isActive}
                        className={`w-full text-right rounded-xl border-2 p-3.5 transition-colors flex items-center justify-between gap-3 ${
                          selectedWalletType === "ORGANIZATIONAL" ? "border-balkun-orange bg-balkun-orange/5" : "border-slate-100"
                        } ${
                          !organizationInfo?.isActive || walletBalances.orgBalance < amountDue
                            ? "opacity-60"
                            : ""
                        }`}
                      >
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="text-xs font-black text-slate-700">کیف پول سازمانی</span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {organizationInfo
                              ? `موجودی مشترک سازمان: ${formatPrice(walletBalances.orgBalance)} تومان`
                              : "سازمان شما هنوز در سیستم کیف پول ثبت نشده است"}
                          </span>
                        </div>
                        {!organizationInfo ? null : !organizationInfo.isActive ? (
                          <span className="text-[10px] font-bold text-red-500 shrink-0">غیرفعال شده</span>
                        ) : (
                          walletBalances.orgBalance < amountDue && (
                            <span className="text-[10px] font-bold text-red-500 shrink-0">کافی نیست</span>
                          )
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* 🔧 اصلاح تسک ۷: پیام راهنمای اختصاصی وقتی سازمان غیرفعال است */}
                {isOrganizational && selectedWalletType === "ORGANIZATIONAL" && organizationInfo && !organizationInfo.isActive && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-red-600 leading-relaxed">
                      سازمان شما توسط مدیریت بالکن غیرفعال شده و امکان استفاده از کیف پول سازمانی وجود ندارد.
                      لطفاً از کیف پول عادی یا پرداخت آنلاین استفاده کنید.
                    </p>
                  </div>
                )}

                {!hasEnoughBalance && walletBalances && !(isOrganizational && selectedWalletType === "ORGANIZATIONAL" && organizationInfo && !organizationInfo.isActive) && (
                  <div className="bg-balkun-yellow/10 border border-balkun-yellow/20 rounded-xl p-3 flex gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-balkun-yellow shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-slate-600 leading-relaxed">
                      {canPayCombined
                        ? "موجودی این کیف پول کافی نیست، اما می‌توانید همین موجودی را کسر کنید و فقط باقیمانده را از درگاه بانکی پرداخت کنید (پرداخت ترکیبی)."
                        : "موجودی این کیف پول کافی نیست. می‌توانید ابتدا از بخش «کیف پول» موجودی را افزایش دهید یا از پرداخت آنلاین استفاده کنید."}
                    </p>
                  </div>
                )}

                {walletError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-[11px] font-bold text-center">
                    {walletError}
                  </div>
                )}

                {/* 🆕 تسک ۲۷ — دکمه‌ی پرداخت ترکیبی: کسر کل موجودی کیف پول + هدایت به درگاه برای باقیمانده */}
                {canPayCombined && (
                  <button
                    onClick={handleCombinedPayment}
                    disabled={isPayingWithWallet || isProcessing}
                    className="w-full bg-balkun-orange hover:bg-balkun-orange-dark text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-balkun-orange/20 disabled:opacity-50 flex items-center justify-center gap-2 text-center"
                  >
                    {isPayingWithWallet ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <span>
                        پرداخت ترکیبی: {formatPrice(selectedBalance)} از کیف پول + {formatPrice(amountDue - selectedBalance)} از درگاه
                      </span>
                    )}
                  </button>
                )}

                <button
                  onClick={handleWalletPayment}
                  disabled={isPayingWithWallet || !hasEnoughBalance}
                  className="w-full bg-balkun-cyan hover:bg-balkun-cyan-dark text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-balkun-cyan/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isPayingWithWallet ? <Loader2 className="w-5 h-5 animate-spin" /> : "تایید و پرداخت از کیف پول"}
                </button>

                {!hasEnoughBalance && !canPayCombined && selectedWalletType === "NORMAL" && (
                  <Link
                    href="/profile?tab=wallet"
                    className="text-center text-[11px] font-bold text-balkun-cyan hover:underline -mt-1"
                  >
                    افزایش موجودی کیف پول
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-2">
          <span className={`text-[10px] md:text-xs font-black px-3 py-1.5 rounded-lg w-max ${statusInfo.bg} ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          <h3 className="text-base md:text-lg font-black text-balkun-navy leading-tight mt-1">
            {booking.roomName}
          </h3>
          <span className="text-xs text-slate-400 font-bold" dir="ltr">ID: {booking.id.split('-')[0].toUpperCase()}</span>
        </div>

        {/* دکمه‌های اکشن */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {booking.status === "WAITING_FOR_PAYMENT" && (
            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="flex-1 md:flex-none bg-balkun-orange text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-balkun-orange/20 hover:-translate-y-0.5 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : "پرداخت آنلاین"}
            </button>
          )}

          {/* 🆕 تسک ۲ — پرداخت مستقیم از کیف پول */}
          {booking.status === "WAITING_FOR_PAYMENT" && (
            <button
              onClick={openWalletModal}
              disabled={isProcessing}
              className="flex-1 md:flex-none bg-white text-balkun-cyan border-2 border-balkun-cyan text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-balkun-cyan/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <WalletIcon className="w-4 h-4" /> پرداخت از کیف پول
            </button>
          )}

          {booking.status === "PAID_CONFIRMED" && (
            <Link
              href={`/voucher/${booking.id}`}
              target="_blank"
              className="flex-1 md:flex-none bg-balkun-cyan text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-balkun-cyan/20 hover:-translate-y-0.5 transition-transform flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" /> دانلود ووچر
            </Link>
          )}

          {/* امکان لغو برای رزروهای در انتظار پرداخت: همیشه و بدون محدودیت زمانی مجاز است */}
          {booking.status === "WAITING_FOR_PAYMENT" && (
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="flex-1 md:flex-none bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" /> لغو رزرو
            </button>
          )}

          {/* 🆕 تسک ۱.۶ — امکان لغو برای رزروهای قطعی: فقط تا CANCELLATION_DEADLINE_HOURS ساعت مانده به ورود */}
          {booking.status === "PAID_CONFIRMED" && (
            isCancellationWindowClosed ? (
              <span
                title={`مهلت لغو رایگان این رزرو (تا ${CANCELLATION_DEADLINE_HOURS} ساعت مانده به ورود) به پایان رسیده است`}
                className="flex-1 md:flex-none bg-slate-50 text-slate-400 text-[11px] font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-center cursor-not-allowed"
              >
                <Lock className="w-3.5 h-3.5" /> مهلت لغو رایگان تمام شده
              </span>
            ) : (
              <button
                onClick={handleCancel}
                disabled={isProcessing}
                className="flex-1 md:flex-none bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" /> لغو رزرو
              </button>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100/50">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1"><CalendarDays className="w-3 h-3" /> ورود</span>
          <span className="text-sm font-bold text-slate-700">{checkIn}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1"><CalendarDays className="w-3 h-3" /> خروج</span>
          <span className="text-sm font-bold text-slate-700">{checkOut}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1"><Users className="w-3 h-3" /> نفرات</span>
          <span className="text-sm font-bold text-slate-700">{totalGuests} مسافر</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1"><Receipt className="w-3 h-3" /> مبلغ پرداختی</span>
          <span className="text-sm font-black text-balkun-cyan">{formatPrice(booking.totalPaidAmount)} <span className="text-[9px] font-bold text-slate-500">تومان</span></span>
          {/* 🆕 تسک ۲۷: اگر بخشی از این رزرو با پرداخت ترکیبی از کیف پول کسر شده، همین‌جا هم مشخص شود */}
          {booking.status === "WAITING_FOR_PAYMENT" && Number(booking.walletAmountApplied || 0) > 0 && (
            <span className="text-[9px] font-bold text-balkun-orange mt-0.5">
              {formatPrice(Number(booking.walletAmountApplied || 0))} تومان از کیف پول کسر شده
            </span>
          )}
        </div>
      </div>
    </div>
  );
}