import Link from "next/link";
import Image from "next/image";
import { Search, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
      <div className="relative w-48 h-48 mb-6 opacity-80 grayscale">
        <Image src="/logo.png" alt="پیدا نشد" fill className="object-contain" />
      </div>
      
      <h1 className="text-4xl md:text-6xl font-black text-balkun-navy mb-4">404</h1>
      <h2 className="text-xl font-black text-slate-700 mb-3">صفحه مورد نظر پیدا نشد!</h2>
      <p className="text-sm font-medium text-slate-500 mb-8 max-w-md">
        احتمالاً آدرس را اشتباه وارد کرده‌اید یا این اقامتگاه از سیستم حذف شده است.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/search"
          className="bg-balkun-orange hover:bg-balkun-orange-dark text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-balkun-orange/20 flex items-center justify-center gap-2"
        >
          <Search className="w-4 h-4" />
          جستجوی اقامتگاه‌ها
        </Link>
        <Link
          href="/"
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold px-6 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          بازگشت به خانه
        </Link>
      </div>
    </div>
  );
}