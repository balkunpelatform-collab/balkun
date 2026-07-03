"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Users, CalendarDays, Receipt, Loader2, XCircle, FileText } from "lucide-react";
import { formatPrice } from "@/utils/priceCalculator";
import type { Booking } from "@/types/database";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  WAITING_FOR_HOST: { label: "در انتظار تایید میزبان", color: "text-balkun-yellow", bg: "bg-balkun-yellow/10" },
  WAITING_FOR_PAYMENT: { label: "در انتظار پرداخت", color: "text-balkun-orange", bg: "bg-balkun-orange/10" },
  PAID_CONFIRMED: { label: "رزرو قطعی", color: "text-green-600", bg: "bg-green-100" },
  CANCELLED_BY_HOST: { label: "لغو توسط میزبان", color: "text-red-600", bg: "bg-red-50" },
  CANCELLED_BY_GUEST: { label: "لغو توسط مسافر", color: "text-red-600", bg: "bg-red-50" },
};

export default function BookingCard({ booking }: { booking: Booking }) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const statusInfo = STATUS_MAP[booking.status] || { label: "نامشخص", color: "text-slate-500", bg: "bg-slate-100" };
  const checkIn = new Date(booking.checkInDate).toLocaleDateString("fa-IR");
  const checkOut = new Date(booking.checkOutDate).toLocaleDateString("fa-IR");
  const totalGuests = booking.basePersonCount + booking.extraPersonCount;

  // هندلر پرداخت
  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/payment/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "BOOKING_PAYMENT",
          bookingId: booking.id,
          amount: booking.totalPaidAmount
        })
      });
      const data = await res.json();
      if (data.success && data.url) {
        router.push(data.url);
      } else {
        alert(data.error || "خطا در اتصال به درگاه");
        setIsProcessing(false);
      }
    } catch {
      alert("خطای شبکه");
      setIsProcessing(false);
    }
  };

  // هندلر لغو رزرو
  const handleCancel = async () => {
    if (!confirm("آیا از لغو این رزرو اطمینان دارید؟ در صورت پرداخت، مبلغ به کیف پول شما عودت داده می‌شود.")) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/user/bookings/${booking.id}/cancel`, {
        method: "POST"
      });
      const data = await res.json();
      alert(data.message || data.error);
      if (data.success) {
        window.location.reload(); // رفرش ساده برای نمایش تغییر وضعیت
      }
    } catch {
      alert("خطا در ارتباط با سرور");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="border border-slate-100 rounded-2xl p-4 md:p-5 hover:border-balkun-cyan/30 transition-colors shadow-sm flex flex-col gap-4">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-2">
          <span className={`text-[10px] md:text-xs font-black px-3 py-1.5 rounded-lg w-max ${statusInfo.bg} ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          <h3 className="text-base md:text-lg font-black text-balkun-navy leading-tight mt-1">
            {booking.roomName}
          </h3>
          <span className="text-xs text-slate-400 font-bold" dir="ltr">ID: {booking.id.split('-')[0].toUpperCase()}</span>
        </div>
        
        {/* دکمه‌های اکشن */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {booking.status === "WAITING_FOR_PAYMENT" && (
            <button 
              onClick={handlePayment}
              disabled={isProcessing}
              className="flex-1 md:flex-none bg-balkun-orange text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-balkun-orange/20 hover:-translate-y-0.5 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : "پرداخت آنلاین"}
            </button>
          )}

          {booking.status === "PAID_CONFIRMED" && (
            <Link 
              href={`/voucher/${booking.id}`}
              target="_blank"
              className="flex-1 md:flex-none bg-balkun-cyan text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-balkun-cyan/20 hover:-translate-y-0.5 transition-transform flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" /> دانلود ووچر
            </Link>
          )}

          {/* امکان لغو برای رزروهای قطعی یا در انتظار پرداخت */}
          {["WAITING_FOR_PAYMENT", "PAID_CONFIRMED"].includes(booking.status) && (
            <button 
              onClick={handleCancel}
              disabled={isProcessing}
              className="flex-1 md:flex-none bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" /> لغو رزرو
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100/50">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1"><CalendarDays className="w-3 h-3" /> ورود</span>
          <span className="text-sm font-bold text-slate-700">{checkIn}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1"><CalendarDays className="w-3 h-3" /> خروج</span>
          <span className="text-sm font-bold text-slate-700">{checkOut}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1"><Users className="w-3 h-3" /> نفرات</span>
          <span className="text-sm font-bold text-slate-700">{totalGuests} مسافر</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1"><Receipt className="w-3 h-3" /> مبلغ پرداختی</span>
          <span className="text-sm font-black text-balkun-cyan">{formatPrice(booking.totalPaidAmount)} <span className="text-[9px] font-bold text-slate-500">تومان</span></span>
        </div>
      </div>
    </div>
  );
}