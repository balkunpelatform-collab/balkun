// مسیر: src/components/admin/AdminSidebar.tsx
// 🆕 فاز ۱۱ / بخش ۴: آیتم «مدیریت بلاگ» با tabKey="blog" اضافه شد.

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  HeadphonesIcon,
  ScrollText,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Home,
  Newspaper,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import type { UserRole } from "@/types/database";
import type { AdminTabKey } from "@/constants/adminPermissions";

interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  tabKey?: AdminTabKey;
}

const ADMIN_NAV: AdminNavItem[] = [
  { id: "dashboard", label: "داشبورد کلان", href: "/admin", icon: LayoutDashboard, roles: ["SUPER_ADMIN"] },
  { id: "users", label: "کاربران و مالی", href: "/admin/users", icon: Users, roles: ["SUPER_ADMIN"] },
  { id: "accommodations", label: "اقامتگاه‌های اختصاصی", href: "/admin/accommodations", icon: Home, roles: ["SUPER_ADMIN", "SUPPORT_AGENT"], tabKey: "accommodations" },
  { id: "blog", label: "مدیریت بلاگ", href: "/admin/blog", icon: Newspaper, roles: ["SUPER_ADMIN", "SUPPORT_AGENT"], tabKey: "blog" },
  { id: "bookings", label: "مدیریت رزروها", href: "/admin/bookings", icon: CalendarDays, roles: ["SUPER_ADMIN", "SUPPORT_AGENT"], tabKey: "bookings" },
  { id: "tickets", label: "مرکز تیکتینگ", href: "/admin/tickets", icon: HeadphonesIcon, roles: ["SUPER_ADMIN", "SUPPORT_AGENT"], tabKey: "tickets" },
  { id: "logs", label: "لاگ‌های سیستم", href: "/admin/logs", icon: ScrollText, roles: ["SUPER_ADMIN", "SUPPORT_AGENT"], tabKey: "logs" },
];

export default function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

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

  if (!user) return null;

  const userPermissions: string[] = user.permissions || [];

  return (
    <aside className="w-full h-full bg-balkun-navy text-slate-300 flex flex-col">
      <div className="h-20 flex items-center gap-3 px-6 border-b border-white/5 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-balkun-cyan/20 text-balkun-cyan flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="font-black text-white text-lg tracking-wide">پنل مدیریت</span>
          <span className="text-[10px] font-bold text-balkun-yellow uppercase tracking-widest">
            {user.role === "SUPER_ADMIN" ? "Super Admin" : "Support Agent"}
          </span>
        </div>
      </div>

      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-black text-white">
            {user.firstName?.charAt(0)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-white text-sm truncate">{user.firstName} {user.lastName}</span>
            <span className="text-xs font-medium text-slate-400" dir="ltr">{user.phoneNumber}</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-4 flex flex-col gap-1">
        {ADMIN_NAV.map((item) => {
          if (!item.roles.includes(user.role as UserRole)) return null;

          if (item.tabKey && user.role === "SUPPORT_AGENT" && !userPermissions.includes(item.tabKey)) {
            return null;
          }

          const isActive = pathname.startsWith(item.href) && (item.href !== "/admin" || pathname === "/admin");
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                isActive
                  ? "bg-balkun-cyan text-white shadow-lg shadow-balkun-cyan/20"
                  : "hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5 flex flex-col gap-2 shrink-0">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          بازگشت به سایت
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-400 hover:text-red-300 text-sm font-bold transition-colors"
        >
          <LogOut className="w-4 h-4" />
          خروج از پنل
        </button>
      </div>
    </aside>
  );
}