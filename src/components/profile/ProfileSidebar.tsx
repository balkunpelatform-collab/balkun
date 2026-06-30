// مسیر مقصد این فایل (فایل جدید): src/components/profile/ProfileSidebar.tsx

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Wallet, Settings, LogOut, Briefcase, ChevronLeft, Heart } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import type { User as UserType } from "@/types/database";

interface ProfileSidebarProps {
  activeTab: string;
  user: UserType;
}

export default function ProfileSidebar({ activeTab, user }: ProfileSidebarProps) {
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const MENU_ITEMS = [
    { id: "bookings", label: "سفرهای من", icon: User },
    { id: "saved", label: "علاقه‌مندی‌ها", icon: Heart },
    { id: "wallet", label: "کیف پول", icon: Wallet },
    { id: "settings", label: "تنظیمات حساب", icon: Settings },
  ];

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden sticky top-24">
      
      {/* هدر پروفایل */}
      <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-balkun-cyan/10 text-balkun-cyan flex items-center justify-center font-black text-xl shrink-0">
          {user.firstName?.charAt(0) || "ب"}
        </div>
        <div className="flex flex-col">
          <h2 className="font-black text-balkun-navy text-lg">{user.firstName} {user.lastName}</h2>
          <span className="text-xs font-bold text-slate-400 mt-0.5" dir="ltr">{user.phoneNumber}</span>
        </div>
      </div>

      {/* بج سازمانی */}
      {user.userType === "ORGANIZATIONAL" && (
        <div className="mx-6 mt-4 bg-balkun-orange/10 border border-balkun-orange/20 rounded-xl p-3 flex items-center gap-3">
          <Briefcase className="w-5 h-5 text-balkun-orange shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-balkun-orange uppercase tracking-wider">حساب سازمانی</span>
            <span className="text-xs font-black text-slate-700">{user.organizationName}</span>
          </div>
        </div>
      )}

      {/* منوی ناوبری */}
      <nav className="p-4 flex flex-col gap-1">
        {MENU_ITEMS.map((item) => {
          const isActive = activeTab === item.id || (activeTab === "active" && item.id === "bookings");
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={`/profile?tab=${item.id}`}
              className={`flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors ${
                isActive 
                  ? "bg-balkun-cyan text-white shadow-md shadow-balkun-cyan/20" 
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span className={`text-sm ${isActive ? "font-black" : "font-bold"}`}>{item.label}</span>
              </div>
              {isActive && <ChevronLeft className="w-4 h-4 opacity-70" />}
            </Link>
          );
        })}

        <div className="w-full h-px bg-slate-100 my-2"></div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors w-full text-right"
        >
          <LogOut className="w-5 h-5 opacity-70" />
          <span className="text-sm font-bold">خروج از حساب</span>
        </button>
      </nav>
    </div>
  );
}