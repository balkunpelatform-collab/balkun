"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, ShieldCheck, Loader2 } from "lucide-react";
import { formatPrice } from "@/utils/priceCalculator";

function MockGatewayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const txId = searchParams.get("txId");
  const amount = searchParams.get("amount");

  if (!txId || !amount) {
    return <div className="p-10 text-center font-bold text-red-500">اطلاعات تراکنش نامعتبر است</div>;
  }

  // هدایت به روت وریفای با وضعیت موفق یا ناموفق
  const handlePayment = (status: "OK" | "NOK") => {
    router.replace(`/api/payment/verify?txId=${txId}&status=${status}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 dir-rtl">
      <div className="bg-white max-w-md w-full rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-slate-800 p-6 flex flex-col items-center justify-center text-white border-b-4 border-balkun-cyan">
          <Building2 className="w-12 h-12 mb-3 text-balkun-cyan" />
          <h1 className="text-lg font-black tracking-widest">درگاه پرداخت شبیه‌ساز (آزمایشی)</h1>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
            اتصال امن برقرار است
          </p>
        </div>

        <div className="p-8 flex flex-col gap-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-500">پذیرنده:</span>
            <span className="text-sm font-black text-slate-800">پلتفرم بالکن</span>
          </div>

          <div className="flex flex-col items-center gap-2 py-4">
            <span className="text-xs font-bold text-slate-400">مبلغ قابل پرداخت</span>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-balkun-navy">{formatPrice(Number(amount))}</span>
              <span className="text-sm font-bold text-slate-500">تومان</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <button
              onClick={() => handlePayment("OK")}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-green-500/30 transition-all"
            >
              پرداخت موفق (شبیه‌سازی)
            </button>
            <button
              onClick={() => handlePayment("NOK")}
              className="w-full bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-500 font-bold py-4 rounded-2xl transition-all"
            >
              انصراف و بازگشت
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MockGatewayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-balkun-cyan" /></div>}>
      <MockGatewayContent />
    </Suspense>
  );
}