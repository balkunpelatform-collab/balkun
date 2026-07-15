// مسیر: src/components/layout/bottom-nav/BottomNav.tsx
// این فایل را به‌طور کامل جایگزین فایل فعلی کنید
//
// 🐛→✅ تسک ۲۴: رفع باگ صدور ووچر PDF از صفحه سایت
// همان دلیل Header/Footer: این نوار هم داخل Layout اصلی سایت رندر می‌شود و روی
// موبایل (که اکثر کاربران از همان‌جا PDF می‌گیرند) همیشه پایین صفحه است. کلاس
// print:hidden اضافه شد تا هنگام چاپ/PDF گرفتن از صفحه‌ی ووچر، این نوار وارد
// خروجی نشود.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_NAV_LINKS } from "@/constants/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="print:hidden md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] pb-safe rounded-t-3xl">
      <div className="flex items-center justify-around h-20 px-4">
        {BOTTOM_NAV_LINKS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-16 h-full gap-1.5 transition-all duration-300 relative ${
                isActive ? "text-balkun-cyan" : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <div className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${isActive ? "bg-balkun-cyan/10" : "bg-transparent"}`}>
                <Icon 
                  className={`w-6 h-6 transition-all duration-300 ${
                    isActive ? "fill-balkun-cyan/20 stroke-balkun-cyan scale-110" : "stroke-current"
                  }`} 
                />
              </div>
              <span className={`text-[11px] ${isActive ? "font-bold" : "font-medium"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}