// مسیر: src/components/profile/WalletView.tsx
//
// 🆕 تسک ۷ چک‌لیست کارفرما (تفکیک کیف پول سازمانی + شارژ خودکار + غیرفعال‌سازی سازمان):
// کارت «کیف پول سازمانی» از این پس دیگر wallet.orgBalance (که همیشه ۰ است) را نشان
// نمی‌دهد؛ به‌جای آن، موجودی مشترک واقعی سازمان (که src/app/api/user/wallet/route.ts
// در فیلد جدید «organization» برمی‌گرداند) نمایش داده می‌شود. چون این موجودی متعلق به
// کل سازمان است (نه فقط این کاربر)، دکمه‌ی «+» برای شارژ مستقیم توسط کاربر از این کارت
// حذف شد — شارژ کیف پول سازمانی از این پس فقط توسط مدیر ارشد بالکن (دستی یا خودکار)
// از پنل ادمین انجام می‌شود. اگر سازمان توسط مدیریت غیرفعال شده باشد، یک بنر هشدار
// به‌جای دکمه نمایش داده می‌شود.
//
// 🆕 بند ۲۷ (بازگشت کیف پول سازمانی به موجودی مستقل هر کارمند):
// طبق درخواست صریح کارفرما، دیگر هیچ استخر مشترکی بین پرسنل یک سازمان وجود ندارد.
// بنابراین از این پس wallet.orgBalance دوباره معنای واقعی و مستقل خودش را دارد
// (دقیقاً برعکس توضیح تسک ۷ بالا) و این کارت آن را نشان می‌دهد، نه organization.walletBalance
// را (که اصلاً دیگر توسط API برگردانده نمی‌شود). خط تغییرکرده مشخص شده با 🆕 پایین‌تر.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet as WalletIcon, TrendingUp, TrendingDown, Loader2, Plus, CreditCard, X, AlertTriangle, User as UserIcon } from "lucide-react";
import { formatPrice } from "@/utils/priceCalculator";
import type { Wallet, Transaction, UserType } from "@/types/database";

interface WalletViewProps {
  userId: string;
  userType: UserType;
}

interface OrganizationWalletInfo {
  id: string;
  name: string;
  isActive: boolean;
  autoChargeEnabled: boolean;
  // 🆕 بند ۲۷: فیلد walletBalance عمداً از این تایپ حذف شد چون API دیگر آن را
  // برنمی‌گرداند — موجودی واقعی از این پس همیشه wallet.orgBalance است.
}

// 🆕 تسک ۲۰ (شفاف‌سازی تاریخچه کیف پول کاربر): از این پس هر تراکنشی که از
// GET /api/user/wallet برمی‌گردد، همراه با فیلد «source» است — دقیقاً همان
// ساختاری که در تسک ۱/۴ برای تاریخچه‌ی کیف پول پنل ادمین استفاده شده.
interface TransactionWithSource extends Transaction {
  source: {
    category: string;
    label: string;
    description: string;
    direction: "IN" | "OUT";
  };
}

interface WalletData {
  wallet: Wallet;
  recentTransactions: TransactionWithSource[];
  organization: OrganizationWalletInfo | null;
}

export default function WalletView({ userId, userType }: WalletViewProps) {
  const router = useRouter();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // مدال شارژ (فقط برای کیف پول شخصی — نگاه کنید به توضیح بالای فایل)
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [chargeAmount, setChargeAmount] = useState("");
  const [isCharging, setIsCharging] = useState(false);

  useEffect(() => {
    fetchWalletData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchWalletData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/user/wallet`, {
        headers: { Authorization: `Bearer balkun-token-${userId}` }
      });
      const data = await res.json();
      if (data.success) {
        setWalletData(data);
      } else {
        setError(data.error || "خطا در دریافت اطلاعات کیف پول");
      }
    } catch (err) {
      setError("خطا در ارتباط با سرور");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChargeWallet = async () => {
    if (!chargeAmount || Number(chargeAmount) < 10000) return;
    setIsCharging(true);
    try {
      const res = await fetch("/api/payment/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "WALLET_CHARGE",
          amount: Number(chargeAmount),
          walletType: "NORMAL"
        })
      });
      const data = await res.json();
      if (data.success && data.url) {
        router.push(data.url); // ریدایرکت به درگاه پرداخت
      } else {
        setError(data.error || "خطا در اتصال به درگاه");
        setIsCharging(false);
      }
    } catch (err) {
      setError("خطای شبکه");
      setIsCharging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-balkun-cyan animate-spin mb-4" />
        <span className="font-bold text-slate-500">در حال بارگذاری...</span>
      </div>
    );
  }

  if (error) {
    return <div className="bg-red-50 rounded-[2rem] border border-red-100 p-6 text-center"><p className="text-sm font-bold text-red-600">{error}</p></div>;
  }

  if (!walletData) return null;

  const { wallet, recentTransactions, organization } = walletData;
  const isOrganizational = userType === "ORGANIZATIONAL";

  return (
    <div className="flex flex-col gap-6 relative">
      
      {/* Modal شارژ کیف پول شخصی */}
      {isChargeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsChargeModalOpen(false)}></div>
           <div className="bg-white rounded-[2rem] p-6 max-w-sm w-full relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
             <button onClick={() => setIsChargeModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-full"><X className="w-5 h-5"/></button>
             <h3 className="text-lg font-black text-balkun-navy mb-6 mt-2">افزایش موجودی</h3>
             
             <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500">مبلغ شارژ (تومان)</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    dir="ltr"
                    value={chargeAmount} 
                    onChange={(e) => setChargeAmount(e.target.value.replace(/\D/g, ""))}
                    placeholder="مثال: 500000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-left font-black text-lg text-balkun-navy outline-none focus:border-balkun-cyan"
                  />
                  <span className="text-[10px] text-slate-400 font-medium text-right mt-1">حداقل مبلغ شارژ ۱۰,۰۰۰ تومان می‌باشد</span>
                </div>
                
                <button 
                  onClick={handleChargeWallet}
                  disabled={isCharging || Number(chargeAmount) < 10000}
                  className="w-full bg-balkun-cyan hover:bg-balkun-cyan-dark text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-balkun-cyan/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCharging ? <Loader2 className="w-5 h-5 animate-spin"/> : "انتقال به درگاه پرداخت"}
                </button>
             </div>
           </div>
        </div>
      )}

      {/* کارت‌های موجودی */}
      <div className={`grid gap-4 ${isOrganizational ? "md:grid-cols-2" : "grid-cols-1"}`}>
        <div className="bg-gradient-to-br from-balkun-cyan to-balkun-cyan-dark rounded-[2rem] p-6 md:p-8 text-white shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <WalletIcon className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold opacity-80">کیف پول عادی</span>
                <span className="text-[10px] opacity-60">قابل استفاده برای رزرو</span>
              </div>
            </div>
            <button 
              onClick={() => setIsChargeModalOpen(true)}
              className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-colors flex items-center justify-center"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-3xl md:text-4xl font-black tracking-tight">{formatPrice(wallet.normalBalance)}</span>
            <span className="text-sm font-bold opacity-70">تومان</span>
          </div>
        </div>

        {isOrganizational && (
          <div className={`rounded-[2rem] p-6 md:p-8 text-white shadow-xl ${
            organization?.isActive === false
              ? "bg-gradient-to-br from-slate-400 to-slate-500"
              : "bg-gradient-to-br from-balkun-orange to-balkun-orange-dark"
          }`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold opacity-80">کیف پول سازمانی</span>
                  {/* 🆕 بند ۲۷: قبلاً «مشترک بین تمام پرسنل» — چون دیگر استخر مشترک نداریم،
                      حالا صریحاً گفته می‌شود این موجودی مخصوص خودِ همین کاربر است */}
                  <span className="text-[10px] opacity-60 flex items-center gap-1">
                    <UserIcon className="w-3 h-3" /> سهم اختصاصی شما در {organization?.name ? `«${organization.name}»` : "سازمان"}
                  </span>
                </div>
              </div>
            </div>
            {organization?.isActive === false ? (
              <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold leading-relaxed">
                  سازمان شما توسط بالکن غیرفعال شده و امکان استفاده از این کیف پول وجود ندارد.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {/* 🆕 بند ۲۷: قبلاً {formatPrice(organization?.walletBalance ?? 0)} — حالا
                    موجودی مستقل و واقعی خودِ همین کاربر از wallet.orgBalance خوانده می‌شود */}
                <span className="text-3xl md:text-4xl font-black tracking-tight">{formatPrice(wallet.orgBalance)}</span>
                <span className="text-sm font-bold opacity-70">تومان</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* یادداشت درباره‌ی شارژ کیف پول سازمانی */}
      {isOrganizational && organization?.isActive !== false && (
        <div className="bg-balkun-orange/10 border border-balkun-orange/20 rounded-2xl p-4 flex gap-3">
          <CreditCard className="w-5 h-5 text-balkun-orange shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-slate-600 leading-relaxed">
            {/* 🆕 بند ۲۷: متن اصلاح شد — این دیگر یک استخر مشترک نیست */}
            کیف پول سازمانی سهمی اختصاصی و مستقل است که توسط مدیریت بالکن برای شما در نظر
            گرفته می‌شود (به‌صورت دستی یا خودکار طبق قرارداد سازمان شما) و فقط خودِ شما
            می‌توانید از آن برای پرداخت رزرو استفاده کنید؛ استفاده‌ی شما هیچ اثری روی
            موجودی سایر همکاران این سازمان ندارد.
          </p>
        </div>
      )}

      {/* تاریخچه تراکنش‌ها */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
        <h3 className="text-lg font-black text-balkun-navy mb-4">تاریخچه تراکنش‌ها</h3>
        {recentTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><TrendingUp className="w-8 h-8 text-slate-300" /></div>
            <p className="text-sm font-medium text-slate-400">هنوز تراکنشی ثبت نشده است</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentTransactions.map((transaction) => {
              // 🆕 تسک ۲۰: به‌جای برچسب یکنواخت قبلی («واریز / پرداخت آنلاین» یا
              // «برداشت از کیف پول» برای همه‌ی تراکنش‌ها)، حالا از منبع دقیق هر
              // تراکنش (transaction.source) استفاده می‌شود — هم برای عنوان کوتاه
              // (label) و هم برای توضیح کامل و شفاف زیر آن (description)، دقیقاً
              // مطابق دو مثال متن خواسته‌شده کارفرما در چک‌لیست.
              const isIncoming = transaction.source.direction === "IN";
              const statusColor = transaction.gatewayStatus === "SUCCESS" ? "text-green-600" : transaction.gatewayStatus === "PENDING" ? "text-balkun-yellow" : "text-red-600";
              return (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-balkun-cyan/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isIncoming ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                      {isIncoming ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{transaction.source.label}</span>
                      <span className="text-[11px] font-medium text-slate-500 leading-relaxed mt-0.5">{transaction.source.description}</span>
                      <span className="text-[10px] font-bold text-slate-400 mt-1" dir="ltr">{new Date(transaction.createdAt).toLocaleString("fa-IR")}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 pr-2">
                    <span className={`text-base font-black ${isIncoming ? "text-green-600" : "text-red-600"}`}>{isIncoming ? "+" : "-"}{formatPrice(transaction.amount)} تومان</span>
                    <span className={`text-[10px] font-bold ${statusColor}`}>{transaction.gatewayStatus === "SUCCESS" ? "موفق" : transaction.gatewayStatus === "PENDING" ? "در انتظار" : "ناموفق"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* نکته امنیتی */}
      <div className="bg-balkun-yellow/10 border border-balkun-yellow/20 rounded-2xl p-4 flex gap-3">
        <span className="text-2xl shrink-0">💡</span>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-black text-slate-700">نکته مهم</span>
          <p className="text-xs font-medium text-slate-600 leading-relaxed">
            موجودی کیف پول بالکن غیرقابل برداشت نقدی است و فقط برای رزرو اقامتگاه‌ها قابل استفاده می‌باشد.
          </p>
        </div>
      </div>
    </div>
  );
}
