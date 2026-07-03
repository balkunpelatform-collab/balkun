"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, LayoutDashboard } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin Panel Error Caught:", error);
  }, [error]);

  return (
    <div className="w-full h-[60vh] flex items-center justify-center">
      <div className="bg-white max-w-md w-full rounded-[2rem] shadow-sm border border-slate-100 p-8 text-center flex flex-col items-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>

        <h1 className="text-xl font-black text-balkun-navy mb-3">خطایی در پنل مدیریت رخ داد</h1>
        <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
          مشکلی در بارگذاری این بخش از پنل پیش آمده است. می‌توانید دوباره تلاش کنید یا به داشبورد اصلی بازگردید.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={() => reset()}
            className="flex-1 bg-balkun-navy hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            تلاش مجدد
          </button>
          <Link
            href="/admin"
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            داشبورد اصلی
          </Link>
        </div>
      </div>
    </div>
  );
}