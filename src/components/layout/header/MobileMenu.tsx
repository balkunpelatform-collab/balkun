// مسیر: src/components/layout/header/MobileMenu.tsx
// منوی کشویی (Drawer) موبایل که با دکمه همبرگری در Header.tsx باز می‌شود.
// دلیل باگ قبلی: دکمه همبرگری هیچ onClick و هیچ کامپوننت drawer ای پشتش نداشت.

"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, User, Wallet, LogOut, ShieldCheck } from "lucide-react";
import { HEADER_LINKS } from "@/constants/navigation";
import type { User as BalkunUser } from "@/types/database";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: BalkunUser | null;
  isAuthenticated: boolean;
  onLogout: () => void;
}

export default function MobileMenu({ isOpen, onClose, user, isAuthenticated, onLogout }: MobileMenuProps) {
  // جلوگیری از اسکرول پشت‌زمینه وقتی منو باز است
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "SUPPORT_AGENT";

  return (
    <div
      className={`fixed inset-0 z-[60] md:hidden transition-opacity duration-300 ${
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!isOpen}
    >
      {/* پس‌زمینه تیره - کلیک روی آن منو را می‌بندد */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* پنل کشویی از راست (چون سایت راست‌به‌چپ است) */}
      <div
        className={`absolute top-0 right-0 h-full w-[80%] max-w-xs bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-100">
          <div className="relative w-10 h-10">
            <Image src="/logo.png" alt="لوگوی بالکن" fill className="object-contain" sizes="40px" />
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-balkun-cyan transition-colors"
            aria-label="بستن منو"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {isAuthenticated && user && (
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
            <span className="w-10 h-10 rounded-full bg-balkun-cyan/10 text-balkun-cyan flex items-center justify-center font-black text-sm">
              {user.firstName?.charAt(0) || "ب"}
            </span>
            <div>
              <p className="font-bold text-balkun-navy text-sm">{user.firstName} {user.lastName}</p>
              {user.userType === "ORGANIZATIONAL" && (
                <span className="text-[11px] font-bold text-balkun-orange">حساب سازمانی</span>
              )}
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-2">
          {HEADER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="block px-5 py-3 text-slate-700 hover:bg-slate-50 hover:text-balkun-cyan font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}

          {isAuthenticated && (
            <>
              <div className="my-2 border-t border-slate-100" />
              <Link
                href="/profile"
                onClick={onClose}
                className="flex items-center gap-2 px-5 py-3 text-slate-700 hover:bg-slate-50 hover:text-balkun-cyan font-medium transition-colors"
              >
                <User className="w-4 h-4" /> پروفایل من
              </Link>
              <Link
                href="/wallet"
                onClick={onClose}
                className="flex items-center gap-2 px-5 py-3 text-slate-700 hover:bg-slate-50 hover:text-balkun-cyan font-medium transition-colors"
              >
                <Wallet className="w-4 h-4" /> کیف پول
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={onClose}
                  className="flex items-center gap-2 px-5 py-3 text-balkun-orange hover:bg-orange-50 font-bold transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" /> پنل مدیریت
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
          {isAuthenticated ? (
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-red-500 bg-red-50 hover:bg-red-100 font-bold text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" /> خروج از حساب
            </button>
          ) : (
            <Link
              href="/login"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-balkun-cyan hover:bg-balkun-cyan-dark text-white font-bold text-sm transition-colors"
            >
              <User className="w-4 h-4" /> ورود / ثبت‌نام
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}