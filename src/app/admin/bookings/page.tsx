"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, CalendarDays, ExternalLink, User } from "lucide-react";
import { formatPrice } from "@/utils/priceCalculator";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  WAITING_FOR_HOST: { label: "در انتظار تایید", color: "bg-balkun-yellow/10 text-balkun-yellow" },
  WAITING_FOR_PAYMENT: { label: "در انتظار پرداخت", color: "bg-balkun-orange/10 text-balkun-orange" },
  PAID_CONFIRMED: { label: "رزرو قطعی", color: "bg-green-100 text-green-700" },
  CANCELLED_BY_HOST: { label: "لغو توسط میزبان", color: "bg-red-50 text-red-600" },
  CANCELLED_BY_GUEST: { label: "لغو توسط مسافر", color: "bg-red-50 text-red-600" },
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchBookings();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, phone, status, page]);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        ...(search && { search }),
        ...(phone && { phone }),
        ...(status && { status }),
      });
      const res = await fetch(`/api/admin/bookings?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setBookings(data.bookings || []);
        setTotal(data.pagination.total || 0);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-balkun-navy">مدیریت رزروها (CRM)</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            پیگیری تمامی رزروهای سیستم (تعداد کل: {total})
          </p>
        </div>
      </div>

      <div className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="جستجوی نام اقامتگاه یا شناسه..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm font-medium focus:outline-none focus:border-balkun-cyan"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
        </div>
        <div className="relative w-full">
          <input
            type="text"
            dir="ltr"
            placeholder="شماره موبایل مسافر..."
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setPage(1); }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm font-medium focus:outline-none focus:border-balkun-cyan text-right placeholder:text-right"
          />
          <User className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:outline-none focus:border-balkun-cyan"
        >
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(STATUS_MAP).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">مسافر</th>
                <th className="px-6 py-4">اقامتگاه</th>
                <th className="px-6 py-4">تاریخ ورود/خروج</th>
                <th className="px-6 py-4">مبلغ پرداختی (تومان)</th>
                <th className="px-6 py-4">وضعیت</th>
                <th className="px-6 py-4">تاریخ ثبت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 text-balkun-cyan animate-spin mx-auto mb-2" />
                    <span className="text-slate-500 font-bold">در حال دریافت رزروها...</span>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-bold">
                    رزروی با این مشخصات یافت نشد
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      {b.guest ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{b.guest.firstName} {b.guest.lastName}</span>
                          <span className="text-xs text-slate-500" dir="ltr">{b.guest.phoneNumber}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">ناشناس</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      <div className="flex flex-col">
                        <span>{b.roomName}</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          <ExternalLink className="w-3 h-3" />
                          شناسه اتاقک: {b.otaghakBookingId || "ندارد"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-xs font-bold text-slate-600 gap-1">
                        <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5 text-balkun-cyan" /> {new Date(b.checkInDate).toLocaleDateString("fa-IR")}</span>
                        <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5 text-balkun-orange" /> {new Date(b.checkOutDate).toLocaleDateString("fa-IR")}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-balkun-navy">
                      {formatPrice(b.totalPaidAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${STATUS_MAP[b.status]?.color || "bg-slate-100"}`}>
                        {STATUS_MAP[b.status]?.label || b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">
                      {new Date(b.createdAt).toLocaleDateString("fa-IR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            صفحه {page} از {Math.ceil(total / 20) || 1}
          </span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-100">قبلی</button>
            <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-100">بعدی</button>
          </div>
        </div>
      </div>
    </div>
  );
}