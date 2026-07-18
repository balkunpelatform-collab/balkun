// مسیر: src/components/admin/AdminHeader.tsx
//
// 🆕 بهبود تجربه‌ی کاربری (درخواست کارفرما): قبلاً دکمه‌های «بازگشت به سایت» و
// «خروج از پنل» فقط پایین سایدبار بودند و با اضافه شدن آیتم‌های زیاد به منو
// (الان ۱۵ آیتم)، کاربر مجبور بود اسکرول کند تا به آن‌ها برسد. این کامپوننت
// جدید یک هدر ثابت (sticky) بالای صفحه می‌سازد — دقیقاً هم‌الگو با هدر اصلی سایت
// (src/components/layout/header/Header.tsx) — که این دو دکمه همیشه و بدون هیچ
// اسکرولی در دسترس‌اند. قبلاً یک نوار مشابه فقط در حالت موبایل («Mobile Topbar»
// داخل admin/layout.tsx) وجود داشت که فقط عنوان پنل را نشان می‌داد؛ این کامپوننت
// جایگزین همان نوار شد و حالا هم در موبایل و هم در دسکتاپ نمایش داده می‌شود.
//
// عنوان وسط هدر به‌صورت پویا از روی مسیر جاری و همان آرایه‌ی ADMIN_NAV
// (export شده از AdminSidebar.tsx) پیدا می‌شود، تا لیست صفحات پنل فقط در یک جا
// (خودِ AdminSidebar.tsx) نگه‌داری شود و این دو فایل هیچ‌وقت از هم عقب نیفتند.

"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu, ExternalLink, LogOut, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { ADMIN_NAV } from "./AdminSidebar";

export default function AdminHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const activeItem = ADMIN_NAV.find(
    (item) => pathname.startsWith(item.href) && (item.href !== "/admin" || pathname === "/admin")
  );
  const pageTitle = activeItem?.label || "داشبورد کلان";

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error", error);
    } finally {
      logout();
      router.push("/login");
    }
  };

  return (
    <header className="sticky top-0 z-10 h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 bg-slate-100 rounded-xl text-slate-700 hover:bg-slate-200 transition-colors shrink-0"
          aria-label="باز کردن منو"
        >
          <Menu className="w-5 h-5" />
        </button>

        <ShieldCheck className="hidden md:block w-5 h-5 text-balkun-cyan shrink-0" />
        <span className="font-black text-balkun-navy truncate">{pageTitle}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {user && (
          <span className="hidden lg:block text-xs font-bold text-slate-400 ml-2">
            {user.firstName} {user.lastName}
          </span>
        )}

        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span className="hidden sm:inline">بازگشت به سایت</span>
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 text-xs sm:text-sm font-bold transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">خروج از پنل</span>
        </button>
      </div>
    </header>
  );
}