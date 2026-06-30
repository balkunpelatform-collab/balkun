// مسیر: src/components/profile/WalletView.tsx
// کامپوننت نمایش کیف پول کاربری (عادی و سازمانی)

"use client";

import { useEffect, useState } from "react";
import { Wallet as WalletIcon, TrendingUp, TrendingDown, Loader2, Plus, CreditCard } from "lucide-react";
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
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchWalletData();
  }, [userId]);

  const fetchWalletData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/user/wallet`, {
        headers: {
          Authorization: `Bearer balkun-token-${userId}`
        }
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-balkun-cyan animate-spin mb-4" />
        <span className="font-bold text-slate-500">در حال بارگذاری...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-[2rem] border border-red-100 p-6 text-center">
        <p className="text-sm font-bold text-red-600">{error}</p>
      </div>
    );
  }

  // اگر ولت موجود نیست، پیام نمایش می‌دهیم
  if (!walletData) {
    return (
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <WalletIcon className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-lg font-black text-slate-700 mb-2">کیف پول شما آماده نیست</h3>
        <p className="text-sm font-medium text-slate-500 max-w-md">
          این بخش در فاز ۶ (درگاه پرداخت) فعال خواهد شد.
        </p>
      </div>
    );
  }

  const { wallet, recentTransactions } = walletData;
  const isOrganizational = userType === "ORGANIZATIONAL";

  return (
    <div className="flex flex-col gap-6">
      {/* کارت‌های موجودی */}
      <div className={`grid gap-4 ${isOrganizational ? "md:grid-cols-2" : "grid-cols-1"}`}>
        {/* کیف پول عادی */}
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
            <button className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-colors flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-3xl md:text-4xl font-black tracking-tight">
              {formatPrice(wallet.normalBalance)}
            </span>
            <span className="text-sm font-bold opacity-70">تومان</span>
          </div>
        </div>

        {/* کیف پول سازمانی */}
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
              <button className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-colors flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-3xl md:text-4xl font-black tracking-tight">
                {formatPrice(wallet.orgBalance)}
              </span>
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
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-400">هنوز تراکنشی ثبت نشده است</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentTransactions.map((transaction) => {
              const isDeposit = transaction.type === "DEPOSIT";
              const statusColor = 
                transaction.gatewayStatus === "SUCCESS" ? "text-green-600" :
                transaction.gatewayStatus === "PENDING" ? "text-balkun-yellow" :
                "text-red-600";

              return (
                <div 
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-balkun-cyan/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isDeposit ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                    }`}>
                      {isDeposit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">
                        {isDeposit ? "واریز به کیف پول" : "برداشت از کیف پول"}
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        {new Date(transaction.createdAt).toLocaleDateString("fa-IR")}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-base font-black ${isDeposit ? "text-green-600" : "text-red-600"}`}>
                      {isDeposit ? "+" : "-"}{formatPrice(transaction.amount)} تومان
                    </span>
                    <span className={`text-[10px] font-bold ${statusColor}`}>
                      {transaction.gatewayStatus === "SUCCESS" ? "موفق" :
                       transaction.gatewayStatus === "PENDING" ? "در انتظار" : "ناموفق"}
                    </span>
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
            {isOrganizational && " کیف پول سازمانی شما توسط مدیر سازمان شارژ می‌شود."}
          </p>
        </div>
      </div>
    </div>
  );
}
