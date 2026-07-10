"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { CalendarCheck, HeadphonesIcon, Users, Wallet, Loader2, TrendingUp, Building2 } from "lucide-react";
import { formatPrice } from "@/utils/priceCalculator";

interface DashboardData {
  success: boolean;
  kpis: {
    todayBookingsCount: number;
    openTicketsCount: number;
    newUsersThisMonth: number;
    monthlyRevenue: number;
    unreadCorporateLeadsCount: number;
  };
  bookingsTrend: { date: string; count: number }[];
  error?: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    
    // اگر کاربر پشتیبان است، به داشبورد مالی دسترسی ندارد، او را به لیست تیکت‌ها بفرست
    if (user?.role === "SUPPORT_AGENT") {
      router.replace("/admin/tickets");
      return;
    }

    fetchDashboardData();
  }, [isAuthenticated, user, router]);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-balkun-cyan animate-spin mb-4" />
        <span className="font-bold text-slate-500">در حال دریافت اطلاعات کلان...</span>
      </div>
    );
  }

  if (!data?.success || !data.kpis) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-2xl font-bold text-center">
        {data?.error || "خطا در دریافت اطلاعات داشبورد"}
      </div>
    );
  }

  const { kpis, bookingsTrend } = data;
  const maxTrend = Math.max(...bookingsTrend.map((t) => t.count), 1); // جلوگیری از تقسیم بر صفر

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-balkun-navy">نمای کلی سیستم</h1>
        <p className="text-sm font-medium text-slate-500 mt-2">خلاصه وضعیت پلتفرم بالکن در لحظه</p>
      </div>

      {/* 🆕 بنر هشدار درخواست‌های سازمانی خوانده‌نشده — فقط وقتی موردی هست نمایش داده می‌شود */}
      {kpis.unreadCorporateLeadsCount > 0 && (
        <Link
          href="/admin/corporate"
          className="flex items-center justify-between gap-4 bg-balkun-orange/10 hover:bg-balkun-orange/15 border border-balkun-orange/20 rounded-2xl px-6 py-4 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-balkun-orange/20 text-balkun-orange rounded-xl flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm text-balkun-navy">
              {kpis.unreadCorporateLeadsCount} درخواست سازمانی جدید منتظر بررسی است
            </span>
          </div>
          <span className="text-xs font-black text-balkun-orange group-hover:underline shrink-0">مشاهده در تب سازمانی ←</span>
        </Link>
      )}

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-balkun-cyan/10 rounded-full blur-2xl group-hover:bg-balkun-cyan/20 transition-colors"></div>
          <div className="w-12 h-12 bg-balkun-cyan/10 text-balkun-cyan rounded-2xl flex items-center justify-center shrink-0">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-sm font-bold text-slate-500 mb-1">رزروهای امروز</span>
            <span className="text-3xl font-black text-slate-800">{kpis.todayBookingsCount}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-balkun-orange/10 rounded-full blur-2xl group-hover:bg-balkun-orange/20 transition-colors"></div>
          <div className="w-12 h-12 bg-balkun-orange/10 text-balkun-orange rounded-2xl flex items-center justify-center shrink-0">
            <HeadphonesIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-sm font-bold text-slate-500 mb-1">تیکت‌های در حال بررسی</span>
            <span className="text-3xl font-black text-slate-800">{kpis.openTicketsCount}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-balkun-yellow/20 rounded-full blur-2xl group-hover:bg-balkun-yellow/30 transition-colors"></div>
          <div className="w-12 h-12 bg-balkun-yellow/20 text-balkun-yellow rounded-2xl flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-sm font-bold text-slate-500 mb-1">کاربران جدید (این ماه)</span>
            <span className="text-3xl font-black text-slate-800">{kpis.newUsersThisMonth}</span>
          </div>
        </div>

        <Link
          href="/admin/corporate"
          className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 relative overflow-hidden group hover:border-balkun-orange/30 transition-colors"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-balkun-orange/10 rounded-full blur-2xl group-hover:bg-balkun-orange/20 transition-colors"></div>
          <div className="w-12 h-12 bg-balkun-orange/10 text-balkun-orange rounded-2xl flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-sm font-bold text-slate-500 mb-1">درخواست‌های سازمانی خوانده‌نشده</span>
            <span className="text-3xl font-black text-slate-800">{kpis.unreadCorporateLeadsCount}</span>
          </div>
        </Link>

        <div className="bg-gradient-to-br from-balkun-navy to-balkun-navy-dark p-6 rounded-[2rem] shadow-xl flex flex-col gap-4 relative overflow-hidden group text-white">
          <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors"></div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6 text-balkun-cyan" />
          </div>
          <div>
            <span className="block text-sm font-bold text-slate-300 mb-1">درآمد بالکن (حاشیه سود ۵٪)</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black tracking-tight">{formatPrice(kpis.monthlyRevenue)}</span>
              <span className="text-xs font-bold text-slate-400">تومان</span>
            </div>
          </div>
        </div>

      </div>

      {/* Pure CSS Native Chart */}
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm mt-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-black text-balkun-navy flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-balkun-cyan" />
            روند ۳۰ روزه رزروها
          </h2>
        </div>
        
        <div className="w-full h-48 md:h-64 flex items-end justify-between gap-1 md:gap-2 px-2 border-b border-slate-100 pb-2 relative">
          {/* خطوط راهنمای پس زمینه */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
             <div className="w-full border-t border-black"></div>
             <div className="w-full border-t border-black"></div>
             <div className="w-full border-t border-black"></div>
          </div>

          {bookingsTrend.map((day, idx) => {
            const heightPercent = (day.count / maxTrend) * 100;
            return (
              <div key={idx} className="relative flex flex-col items-center flex-1 h-full justify-end group">
                
                {/* تولتیپ */}
                <div className="absolute -top-10 bg-balkun-navy text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                  {day.count} رزرو
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-balkun-navy"></div>
                </div>

                {/* ستون نمودار */}
                <div 
                  className={`w-full max-w-[24px] rounded-t-md transition-all duration-700 ease-out ${
                    day.count > 0 ? "bg-balkun-cyan/80 group-hover:bg-balkun-cyan" : "bg-slate-100"
                  }`}
                  style={{ height: `${Math.max(heightPercent, 2)}%` }} // حداقل ۲ درصد برای نمایش روزهای صفر
                ></div>
              </div>
            );
          })}
        </div>

        <div className="w-full flex justify-between px-2 mt-4 text-[10px] md:text-xs font-bold text-slate-400">
          <span>۳۰ روز پیش</span>
          <span>۱۵ روز پیش</span>
          <span>امروز</span>
        </div>
      </div>

    </div>
  );
}