"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet as WalletIcon, TrendingUp, TrendingDown, Loader2, Plus, CreditCard, X } from "lucide-react";
import { formatPrice } from "@/utils/priceCalculator";
import type { Wallet, Transaction, UserType } from "@/types/database";

interface WalletViewProps {
  userId: string;
  userType: UserType;
}

interface WalletData {
  wallet: Wallet;
  recentTransactions: Transaction[];
}

export default function WalletView({ userId, userType }: WalletViewProps) {
  const router = useRouter();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  // مدال شارژ کیف پول
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeWalletType, setChargeWalletType] = useState<"NORMAL" | "ORGANIZATIONAL">("NORMAL");
  const [isCharging, setIsCharging] = useState(false);

  useEffect(() => {
    fetchWalletData();
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
          walletType: chargeWalletType
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

  const { wallet, recentTransactions } = walletData;
  const isOrganizational = userType === "ORGANIZATIONAL";

  return (
    <div className="flex flex-col gap-6 relative">
      
      {/* Modal شارژ */}
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
              onClick={() => { setChargeWalletType("NORMAL"); setIsChargeModalOpen(true); }}
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
          <div className="bg-gradient-to-br from-balkun-orange to-balkun-orange-dark rounded-[2rem] p-6 md:p-8 text-white shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold opacity-80">کیف پول سازمانی</span>
                  <span className="text-[10px] opacity-60">اختصاصی پرسنل</span>
                </div>
              </div>
              <button 
                onClick={() => { setChargeWalletType("ORGANIZATIONAL"); setIsChargeModalOpen(true); }}
                className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-colors flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-3xl md:text-4xl font-black tracking-tight">{formatPrice(wallet.orgBalance)}</span>
              <span className="text-sm font-bold opacity-70">تومان</span>
            </div>
          </div>
        )}
      </div>

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
              const isDeposit = transaction.type === "DEPOSIT";
              const statusColor = transaction.gatewayStatus === "SUCCESS" ? "text-green-600" : transaction.gatewayStatus === "PENDING" ? "text-balkun-yellow" : "text-red-600";
              return (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-balkun-cyan/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDeposit ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                      {isDeposit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{isDeposit ? "واریز / پرداخت آنلاین" : "برداشت از کیف پول"}</span>
                      <span className="text-[10px] font-bold text-slate-400" dir="ltr">{new Date(transaction.createdAt).toLocaleString("fa-IR")}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-base font-black ${isDeposit ? "text-green-600" : "text-red-600"}`}>{isDeposit ? "+" : "-"}{formatPrice(transaction.amount)} تومان</span>
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