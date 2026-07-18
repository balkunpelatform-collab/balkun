"use client";

// 🆕 بهبود تجربه‌ی کاربری (درخواست کارفرما): نوار بالای صفحه که قبلاً فقط در
// موبایل بود و فقط عنوان ثابت پنل را نشان می‌داد ("Mobile Topbar")، با کامپوننت
// جدید AdminHeader جایگزین شد که هم در موبایل و هم در دسکتاپ نمایش داده می‌شود و
// شامل دکمه‌های «بازگشت به سایت» و «خروج از پنل» است — این دو دکمه قبلاً فقط
// پایین سایدبار بودند و کاربر مجبور بود برای رسیدن به آن‌ها اسکرول کند.

import { useState } from "react";
import { X } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    // با استفاده از fixed inset-0 و z-100 تمام اجزای سایت اصلی (هدر و فوتر) رو زیر این لایه مخفی می‌کنیم
    <div className="fixed inset-0 z-[100] bg-slate-50 flex overflow-hidden dir-rtl font-sans text-slate-900">
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-72 shrink-0 h-full shadow-2xl z-20">
        <AdminSidebar />
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-4/5 max-w-sm h-full bg-balkun-navy shadow-2xl flex flex-col animate-in slide-in-from-right">
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-6 left-6 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-50"
            >
              <X className="w-5 h-5" />
            </button>
            <AdminSidebar onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* هدر بالای صفحه — حالا هم در دسکتاپ و هم موبایل نمایش داده می‌شود (قبلاً فقط موبایل) */}
        <AdminHeader onMenuClick={() => setMobileMenuOpen(true)} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}