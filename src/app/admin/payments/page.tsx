// مسیر: src/app/admin/payments/page.tsx
//
// 🆕 تسک ۴ چک‌لیست کارفرما (مشاهده کامل پرداخت‌ها توسط مدیر مالی و مدیر ارشد):
// این صفحه‌ی جدید، تمام پرداخت‌های مرتبط با رزرو در کل سیستم را نشان می‌دهد:
//   - پرداخت‌های درگاه (آنلاین)
//   - پرداخت‌های کیف پول (عادی یا سازمانی)
//   - برگشت وجه‌های مرتبط با لغو رزرو
// هر ردیف شامل: مهمان، اقامتگاه/تاریخ رزرو، روش پرداخت، مبلغ، وضعیت پرداخت، وضعیت
// فعلی رزرو و کد پیگیری است. چون همه‌ی تراکنش‌های مرتبط با یک رزرو (حتی تلاش‌های
// ناموفق قبلی) به‌صورت ردیف‌های جداگانه نمایش داده می‌شوند، همین لیست خودش «تاریخچه
// کامل تراکنش‌ها»یی است که کارفرما در متن تسک خواسته.
//
// دسترسی: فقط برای نقش‌های SUPER_ADMIN و FINANCE_MANAGER در سایدبار نمایش داده
// می‌شود (src/components/admin/AdminSidebar.tsx)؛ دسترسی واقعی هم در سطح API
// (src/app/api/admin/payments/route.ts) با requireAdminRole کنترل می‌شود — پس حتی
// با تایپ مستقیم آدرس هم، کاربر بدون نقش مجاز چیزی جز خطای ۴۰۳ نمی‌بیند.

"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Loader2,
  CreditCard,
  Landmark,
  Wallet,
  Undo2,
  CalendarDays,
  Filter,
} from "lucide-react";
import { formatPrice } from "@/utils/priceCalculator";

interface PaymentRow {
  id: string;
  amount: number;
  type: "DEPOSIT" | "WITHDRAWAL";
  walletType: "NORMAL" | "ORGANIZATIONAL";
  gatewayStatus: "SUCCESS" | "PENDING" | "FAILED";
  trackingCode: string | null;
  bookingId: string | null;
  createdAt: string;
  source: { category: string; label: string; description: string; direction: "IN" | "OUT" };
  booking: { roomName: string; checkInDate: string; checkOutDate: string; status: string } | null;
  guest: { firstName: string; lastName: string; phoneNumber: string } | null;
}

const GATEWAY_STATUS_MAP: Record<string, { label: string; color: string }> = {
  SUCCESS: { label: "موفق", color: "bg-green-100 text-green-700" },
  PENDING: { label: "در انتظار", color: "bg-balkun-yellow/10 text-amber-700" },
  FAILED: { label: "ناموفق", color: "bg-red-50 text-red-600" },
};

const BOOKING_STATUS_LABELS: Record<string, string> = {
  WAITING_FOR_HOST: "در انتظار تایید",
  WAITING_FOR_PAYMENT: "در انتظار پرداخت",
  PAID_CONFIRMED: "رزرو قطعی",
  CANCELLED_BY_HOST: "لغو توسط میزبان",
  CANCELLED_BY_GUEST: "لغو توسط مسافر",
  EXPIRED: "منقضی‌شده",
};

function methodBadge(category: string) {
  if (category === "GATEWAY_DEPOSIT") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md bg-balkun-cyan/10 text-balkun-cyan w-fit">
        <CreditCard className="w-3.5 h-3.5" /> درگاه پرداخت
      </span>
    );
  }
  if (category === "BOOKING_PAYMENT") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md bg-balkun-orange/10 text-balkun-orange w-fit">
        <Wallet className="w-3.5 h-3.5" /> کیف پول
      </span>
    );
  }
  if (category === "REFUND") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-600 w-fit">
        <Undo2 className="w-3.5 h-3.5" /> برگشت وجه
      </span>
    );
  }
  return <span className="text-xs font-bold text-slate-400">—</span>;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPayments();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, method, status, dateFrom, dateTo, page]);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        ...(search && { search }),
        ...(method && { method }),
        ...(status && { status }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });
      const res = await fetch(`/api/admin/payments?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments || []);
        setTotal(data.pagination.total || 0);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setMethod("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-balkun-navy flex items-center gap-2">
            <Landmark className="w-6 h-6 text-balkun-cyan" />
            پرداخت‌ها
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            تمام پرداخت‌های درگاه، پرداخت‌های کیف پول و برگشت‌وجه‌های مرتبط با رزرو در کل سیستم (تعداد کل: {total})
          </p>
        </div>
      </div>

      {/* فیلترها */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-slate-500 font-bold text-xs">
          <Filter className="w-4 h-4" />
          فیلترها
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <input
              type="text"
              placeholder="جستجو با نام/موبایل مهمان یا نام اقامتگاه..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm font-medium focus:outline-none focus:border-balkun-cyan focus:ring-1 focus:ring-balkun-cyan"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          </div>

          <select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:border-balkun-cyan outline-none"
          >
            <option value="">همه روش‌های پرداخت</option>
            <option value="GATEWAY">فقط پرداخت‌های درگاه</option>
            <option value="WALLET">فقط پرداخت‌های کیف پول</option>
            <option value="REFUND">فقط برگشت وجه‌ها</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:border-balkun-cyan outline-none"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="SUCCESS">موفق</option>
            <option value="PENDING">در انتظار</option>
            <option value="FAILED">ناموفق</option>
          </select>

          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-bold focus:border-balkun-cyan outline-none"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-bold focus:border-balkun-cyan outline-none"
            />
          </div>
        </div>
        {(search || method || status || dateFrom || dateTo) && (
          <button onClick={resetFilters} className="self-start text-xs font-bold text-balkun-orange hover:underline">
            پاک کردن فیلترها
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">تاریخ و ساعت</th>
                <th className="px-6 py-4">مهمان</th>
                <th className="px-6 py-4">رزرو</th>
                <th className="px-6 py-4">روش پرداخت</th>
                <th className="px-6 py-4">مبلغ</th>
                <th className="px-6 py-4">وضعیت پرداخت</th>
                <th className="px-6 py-4">وضعیت رزرو</th>
                <th className="px-6 py-4">کد پیگیری</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 text-balkun-cyan animate-spin mx-auto mb-2" />
                    <span className="text-slate-500 font-bold">در حال بارگذاری...</span>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500 font-bold">
                    پرداختی با این مشخصات یافت نشد
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-medium text-slate-500 whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleString("fa-IR")}
                    </td>
                    <td className="px-6 py-4">
                      {p.guest ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">
                            {p.guest.firstName} {p.guest.lastName}
                          </span>
                          <span className="text-[11px] text-slate-400" dir="ltr">
                            {p.guest.phoneNumber}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">نامشخص</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {p.booking ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-700 text-xs">{p.booking.roomName}</span>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3 h-3 text-balkun-cyan" />
                              {new Date(p.booking.checkInDate).toLocaleDateString("fa-IR")}
                            </span>
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3 h-3 text-balkun-orange" />
                              {new Date(p.booking.checkOutDate).toLocaleDateString("fa-IR")}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{methodBadge(p.source.category)}</td>
                    <td
                      className={`px-6 py-4 font-black whitespace-nowrap ${
                        p.source.direction === "IN" ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {p.source.direction === "IN" ? "+" : "−"}
                      {formatPrice(p.amount)}
                      <span className="text-[10px] font-normal text-slate-400"> تومان</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                          GATEWAY_STATUS_MAP[p.gatewayStatus]?.color || "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {GATEWAY_STATUS_MAP[p.gatewayStatus]?.label || p.gatewayStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-bold text-slate-500">
                        {p.booking ? BOOKING_STATUS_LABELS[p.booking.status] || p.booking.status : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500" dir="ltr">
                      {p.trackingCode || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            صفحه {page} از {Math.ceil(total / 25) || 1}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-100 transition-colors"
            >
              قبلی
            </button>
            <button
              disabled={page * 25 >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-100 transition-colors"
            >
              بعدی
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}