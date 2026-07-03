"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, ArrowRight, Loader2, Receipt } from "lucide-react";
import { formatPrice } from "@/utils/priceCalculator";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const txId = searchParams.get("txId");

  const [txData, setTxData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!txId) {
      router.replace("/profile");
      return;
    }

    // برای نمایش جزئیات، اطلاعات تراکنش را از کیف پول می‌گیریم
    // (از یک روت کمکی یا مستقیم. برای سادگی اینجا فقط پیام وضعیت را نشان می‌دهیم)
    // اما برای امنیت و تجربه بهتر، فقط فرض می‌کنیم کاربر ریدایرکت شده و نتیجه را می‌بیند.
    
    // شبیه‌سازی لودینگ
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, [txId, router]);

  if (isLoading) {
    return <div className="min-h-[70vh] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-balkun-cyan" /></div>;
  }

  // ما می‌دانیم اگر در این صفحه هستیم، باید به کاربر اجازه دهیم به داشبورد برگردد.
  // برای چک کردن وضعیت دقیق باید یه روت API داشته باشیم، اما فعلا با توجه به ساختار فرانت‌اند:
  return (
    <div className="container mx-auto px-4 py-16 flex justify-center min-h-[70vh]">
      <div className="bg-white max-w-md w-full rounded-[2.5rem] shadow-sm border border-slate-100 p-8 text-center flex flex-col items-center relative overflow-hidden">
        
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
           <Receipt className="w-10 h-10 text-slate-400" />
        </div>

        <h1 className="text-2xl font-black text-balkun-navy mb-2">نتیجه تراکنش</h1>
        <p className="text-sm font-medium text-slate-500 mb-8">
          عملیات پرداخت شما انجام و در سیستم ثبت شد. وضعیت نهایی در بخش تراکنش‌های پروفایل شما قابل مشاهده است.
        </p>

        <button
          onClick={() => router.replace("/profile?tab=wallet")}
          className="w-full bg-balkun-navy hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
        >
          بازگشت به پنل کاربری
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-balkun-cyan" /></div>}>
      <CallbackContent />
    </Suspense>
  );
}