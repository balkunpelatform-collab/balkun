// مسیر مقصد این فایل (فایل جدید): src/components/profile/BookingsManager.tsx

"use client";

import { useEffect, useState } from "react";
import BookingCard from "./BookingCard";
import type { Booking } from "@/types/database";

interface BookingsManagerProps {
  defaultTab: "ACTIVE" | "PAST" | "CANCELLED";
  token: string; // شناسه کاربر برای استفاده به عنوان Mock Token
}

export default function BookingsManager({ defaultTab, token }: BookingsManagerProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/user/bookings", {
          headers: {
            // توکن Mock (تا فاز ۷ که JWT واقعی وصل بشه)
            Authorization: `Bearer balkun-token-${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          setBookings(data.bookings);
        }
      } catch (error) {
        console.error("Error loading bookings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [token]);

  // دسته‌بندی رزروها
  const activeBookings = bookings.filter(b => 
    ["WAITING_FOR_HOST", "WAITING_FOR_PAYMENT", "PAID_CONFIRMED"].includes(b.status)
  );
  
  // منطق ۱۵ دقیقه: رزروهای لغو شده توسط میزبان فقط ۱۵ دقیقه نمایش داده می‌شوند
  const cancelledBookings = bookings.filter(b => {
    if (!["CANCELLED_BY_HOST", "CANCELLED_BY_GUEST"].includes(b.status)) {
      return false;
    }
    
    // برای رزروهای لغو شده توسط میزبان، چک می‌کنیم که آیا هنوز در بازه ۱۵ دقیقه است یا نه
    if (b.status === "CANCELLED_BY_HOST") {
      const cancelTime = new Date(b.createdAt).getTime();
      const now = Date.now();
      const fifteenMinutes = 15 * 60 * 1000;
      
      // اگر بیش از ۱۵ دقیقه گذشته، نمایش نده
      if (now - cancelTime > fifteenMinutes) {
        return false;
      }
    }
    
    return true;
  });
  
  // سفرهای پیشین (رزروهای قطعی شده که تاریخ چک اوت آن‌ها گذشته)
  const pastBookings = bookings.filter(b => {
    if (b.status !== "PAID_CONFIRMED") return false;
    const checkOutDate = new Date(b.checkOutDate).getTime();
    return checkOutDate < Date.now();
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
           <div className="w-8 h-8 border-4 border-balkun-cyan border-t-transparent rounded-full animate-spin mb-4"></div>
           <span className="font-bold text-slate-500">در حال دریافت سفرهای شما...</span>
        </div>
      );
    }

    let itemsToRender: Booking[] = [];
    if (activeTab === "ACTIVE") itemsToRender = activeBookings;
    if (activeTab === "CANCELLED") itemsToRender = cancelledBookings;
    if (activeTab === "PAST") itemsToRender = pastBookings;

    if (itemsToRender.length === 0) {
      return (
        <div className="bg-slate-50 rounded-3xl p-10 text-center flex flex-col items-center justify-center border border-slate-100 mt-6">
          <div className="text-4xl mb-4">🏜️</div>
          <h3 className="text-lg font-black text-slate-700 mb-2">لیست شما خالی است</h3>
          <p className="text-sm font-medium text-slate-500">
            در این دسته‌بندی هنوز هیچ رزروی ثبت نشده است.
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 mt-6">
        {itemsToRender.map((booking) => (
          <BookingCard key={booking.id} booking={booking} />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 md:p-6">
      
      {/* هدر و تب‌ها */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-4 overflow-x-auto [&::-webkit-scrollbar]:hidden snap-x">
        <button
          onClick={() => setActiveTab("ACTIVE")}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors shrink-0 snap-start ${
            activeTab === "ACTIVE" 
              ? "bg-balkun-cyan/10 text-balkun-cyan" 
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          سفرهای جاری
        </button>
        <button
          onClick={() => setActiveTab("PAST")}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors shrink-0 snap-start ${
            activeTab === "PAST" 
              ? "bg-balkun-cyan/10 text-balkun-cyan" 
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          سفرهای پیشین
        </button>
        <button
          onClick={() => setActiveTab("CANCELLED")}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors shrink-0 snap-start ${
            activeTab === "CANCELLED" 
              ? "bg-red-50 text-red-600" 
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          لغو شده
        </button>
      </div>

      {/* محتوای تب‌ها */}
      {renderContent()}

    </div>
  );
}