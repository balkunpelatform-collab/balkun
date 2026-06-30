// مسیر مقصد این فایل (فایل جدید): src/components/profile/BookingCard.tsx

import { MapPin, Users, CalendarDays, Receipt } from "lucide-react";
import { formatPrice } from "@/utils/priceCalculator";
import type { Booking } from "@/types/database";

// مدیریت رنگ و لیبل وضعیت‌ها
const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  WAITING_FOR_HOST: { label: "در انتظار تایید میزبان", color: "text-balkun-yellow", bg: "bg-balkun-yellow/10" },
  WAITING_FOR_PAYMENT: { label: "در انتظار پرداخت", color: "text-balkun-orange", bg: "bg-balkun-orange/10" },
  PAID_CONFIRMED: { label: "رزرو قطعی", color: "text-green-600", bg: "bg-green-100" },
  CANCELLED_BY_HOST: { label: "لغو توسط میزبان", color: "text-red-600", bg: "bg-red-50" },
  CANCELLED_BY_GUEST: { label: "لغو توسط مسافر", color: "text-red-600", bg: "bg-red-50" },
};

export default function BookingCard({ booking }: { booking: Booking }) {
  const statusInfo = STATUS_MAP[booking.status] || { label: "نامشخص", color: "text-slate-500", bg: "bg-slate-100" };
  
  const checkIn = new Date(booking.checkInDate).toLocaleDateString("fa-IR");
  const checkOut = new Date(booking.checkOutDate).toLocaleDateString("fa-IR");
  
  const totalGuests = booking.basePersonCount + booking.extraPersonCount;

  return (
    <div className="border border-slate-100 rounded-2xl p-4 md:p-5 hover:border-balkun-cyan/30 transition-colors shadow-sm flex flex-col gap-4">
      
      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-col gap-2">
          <span className={`text-[10px] md:text-xs font-black px-3 py-1.5 rounded-lg w-max ${statusInfo.bg} ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          <h3 className="text-base md:text-lg font-black text-balkun-navy leading-tight mt-1">
            {booking.roomName}
          </h3>
        </div>
        
        {/* دکمه اکشن (مثلا برای پرداخت) */}
        {booking.status === "WAITING_FOR_PAYMENT" && (
          <button className="bg-balkun-orange text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-balkun-orange/20 shrink-0 hover:-translate-y-0.5 transition-transform">
            پرداخت فاکتور
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100/50">
        
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1">
            <CalendarDays className="w-3 h-3" /> تاریخ ورود
          </span>
          <span className="text-sm font-bold text-slate-700">{checkIn}</span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1">
             <CalendarDays className="w-3 h-3" /> تاریخ خروج
          </span>
          <span className="text-sm font-bold text-slate-700">{checkOut}</span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1">
             <Users className="w-3 h-3" /> نفرات
          </span>
          <span className="text-sm font-bold text-slate-700">{totalGuests} نفر</span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1">
             <Receipt className="w-3 h-3" /> مبلغ پرداختی
          </span>
          <span className="text-sm font-black text-balkun-cyan">{formatPrice(booking.totalPaidAmount)} <span className="text-[9px] font-bold text-slate-500">تومان</span></span>
        </div>

      </div>

    </div>
  );
}