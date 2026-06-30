// مسیر مقصد این فایل: src/components/layout/header/Header.tsx
// این فایل را به‌طور کامل جایگزین فایل فعلی کنید
// تغییر اصلی: کامپوننت اکنون "use client" است تا بتواند به وضعیت ورود کاربر (Zustand) گوش دهد

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { User, Menu, Bell, LogOut, Wallet } from "lucide-react";
import { HEADER_LINKS } from "@/constants/navigation";
import { useAuthStore } from "@/store/authStore";

export default function Header() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // بستن منوی کاربر با کلیک بیرون از آن
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">

        <div className="flex-1 flex items-center justify-start gap-4">
          <button className="md:hidden p-2 -mr-2 text-slate-700 hover:text-balkun-cyan transition-colors">
            <Menu className="w-6 h-6" />
          </button>

          <nav className="hidden md:flex items-center gap-6">
            {HEADER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-slate-700 hover:text-balkun-cyan transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Center: Logo */}
        <div className="flex-1 flex items-center justify-center">
          <Link href="/" className="flex items-center group">
            <div className="relative w-14 h-14 md:w-16 md:h-16 transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="لوگوی بالکن"
                fill
                className="object-contain"
                sizes="64px"
                priority
              />
            </div>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-end gap-3">
          <button className="relative p-2 text-slate-700 hover:text-balkun-cyan transition-colors">
            <Bell className="w-6 h-6" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-balkun-orange rounded-full border-2 border-white"></span>
          </button>

          {isAuthenticated && user ? (
            <div className="relative hidden sm:block" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-balkun-navy pl-4 pr-2 py-2 rounded-xl transition-all duration-300 font-bold text-sm"
              >
                <span className="w-7 h-7 rounded-full bg-balkun-cyan/10 text-balkun-cyan flex items-center justify-center font-black text-xs">
                  {user.firstName?.charAt(0) || "ب"}
                </span>
                <span>{user.firstName}</span>
              </button>

              {menuOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-black/5 overflow-hidden py-2 text-right">
                  {user.userType === "ORGANIZATIONAL" && (
                    <span className="block px-4 py-1.5 text-[11px] font-bold text-balkun-orange">
                      حساب سازمانی
                    </span>
                  )}
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    پروفایل من
                  </Link>
                  <Link
                    href="/wallet"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Wallet className="w-4 h-4" />
                    کیف پول
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    خروج از حساب
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden sm:flex items-center gap-2 bg-balkun-cyan hover:bg-balkun-cyan-dark text-white px-4 py-2 rounded-xl transition-all duration-300 font-medium text-sm shadow-md shadow-balkun-cyan/20"
            >
              <User className="w-4 h-4" />
              <span>ورود / ثبت‌نام</span>
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}