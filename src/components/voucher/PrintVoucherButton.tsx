// مسیر: src/components/voucher/PrintVoucherButton.tsx
// این فایل جدید است (قبلاً وجود نداشت).
// چرا این فایل لازم شد: در فایل اصلی صفحه‌ی ووچر، دکمه‌ی «چاپ ووچر» یک onClick داشت که
// مستقیماً window.print() را صدا می‌زد. چون صفحه‌ی ووچر یک Server Component است (برای سئو و
// امنیت لازم است همین‌طور بماند)، نمی‌شود در دل آن مستقیماً از رویدادهایی مثل onClick استفاده کرد؛
// Next.js همچین چیزی را رد می‌کند و صفحه با خطا مواجه می‌شود. برای همین این یک دکمه‌ی کوچک
// و مجزا (Client Component) ساخته شد که فقط وظیفه‌ی چاپ کردن را دارد.

"use client";

import { Printer } from "lucide-react";

export default function PrintVoucherButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 text-sm font-bold text-white bg-balkun-cyan hover:bg-balkun-cyan-dark px-4 py-2 rounded-xl shadow-sm"
    >
      <Printer className="w-4 h-4" /> چاپ ووچر
    </button>
  );
}