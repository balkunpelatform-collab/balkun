import Link from "next/link";
import { SearchX, LayoutDashboard } from "lucide-react";

export default function AdminNotFound() {
  return (
    <div className="w-full h-[60vh] flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
        <SearchX className="w-10 h-10 text-slate-400" />
      </div>

      <h1 className="text-xl font-black text-balkun-navy mb-3">این بخش از پنل پیدا نشد</h1>
      <p className="text-sm font-medium text-slate-500 mb-8 max-w-sm leading-relaxed">
        آدرسی که وارد کرده‌اید در پنل مدیریت بالکن وجود ندارد. ممکن است لینک اشتباه باشد یا این بخش جابه‌جا شده باشد.
      </p>

      <Link
        href="/admin"
        className="bg-balkun-navy hover:bg-slate-800 text-white font-bold px-6 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
      >
        <LayoutDashboard className="w-4 h-4" />
        بازگشت به داشبورد
      </Link>
    </div>
  );
}