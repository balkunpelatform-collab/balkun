// مسیر: src/app/admin/wallet-history/page.tsx
//
// 🆕 تسک ۱ چک‌لیست کارفرما (تاریخچه کیف پول برای مالی و مدیر ارشد):
// این صفحه فقط برای نقش‌های SUPER_ADMIN و FINANCE_MANAGER در سایدبار نمایش داده می‌شود
// (src/components/admin/AdminSidebar.tsx) و دسترسی واقعی آن هم در سطح API
// (src/app/api/admin/wallet-history/route.ts) با requireAdminRole کنترل می‌شود — پس
// حتی با تایپ مستقیم آدرس هم، کاربر بدون نقش مجاز چیزی جز خطای ۴۰۳ نمی‌بیند.
//
// نمایش می‌دهد: واریزها، برداشت‌ها، شارژهای دستی، برگشت‌ها/عودت‌ها — همراه با منبع دقیق
// تراکنش، تاریخ و ساعت، و کاربر/سازمان مرتبط؛ دقیقاً طبق مورد ۱ فایل درخواست‌های کارفرما.

"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, Wallet, ArrowDownCircle, ArrowUpCircle, Briefcase, User, Filter } from "lucide-react";
import { formatPrice } from "@/utils/priceCalculator";
import { TRANSACTION_SOURCE_CATEGORIES } from "@/lib/wallet/transactionSource";

interface WalletHistoryRow {
  id: string;
  walletId: string;
  amount: number;
  type: "DEPOSIT" | "WITHDRAWAL";
  walletType: "NORMAL" | "ORGANIZATIONAL";
  gatewayStatus: "SUCCESS" | "PENDING" | "FAILED";
  trackingCode: string | null;
  bookingId: string | null;
  createdAt: string;
  source: { category: string; label: string; description: string; direction: "IN" | "OUT" };
  owner: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    userType: string;
    organizationName: string | null;
  } | null;
}

const GATEWAY_STATUS_MAP: Record<string, { label: string; color: string }> = {
  SUCCESS: { label: "موفق", color: "bg-green-100 text-green-700" },
  PENDING: { label: "در انتظار", color: "bg-balkun-yellow/10 text-amber-700" },
  FAILED: { label: "ناموفق", color: "bg-red-50 text-red-600" },
};

export default function AdminWalletHistoryPage() {
  const [transactions, setTransactions] = useState<WalletHistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [walletType, setWalletType] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchHistory();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, walletType, type, category, dateFrom, dateTo, page]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        ...(search && { search }),
        ...(walletType && { walletType }),
        ...(type && { type }),
        ...(category && { category }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });
      const res = await fetch(`/api/admin/wallet-history?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions || []);
        setTotal(data.pagination.total || 0);
      }
    } catch (error) {
      console.error("Error fetching wallet history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setWalletType("");
    setType("");
    setCategory("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-balkun-navy flex items-center gap-2">
            <Wallet className="w-6 h-6 text-balkun-yellow" />
            تاریخچه کامل کیف پول
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            تمام واریزها، برداشت‌ها، شارژهای دستی و برگشت‌های کیف پول در کل سیستم (تعداد کل: {total})
          </p>
        </div>
      </div>

      {/* فیلترها */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-slate-500 font-bold text-xs">
          <Filter className="w-4 h-4" />
          فیلترها
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <input
              type="text"
              placeholder="جستجو با نام، موبایل یا نام سازمان..."
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
            value={walletType}
            onChange={(e) => {
              setWalletType(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:border-balkun-cyan outline-none"
          >
            <option value="">همه‌ی کیف پول‌ها</option>
            <option value="NORMAL">کیف پول عادی</option>
            <option value="ORGANIZATIONAL">کیف پول سازمانی</option>
          </select>

          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:border-balkun-cyan outline-none"
          >
            <option value="">واریز و برداشت</option>
            <option value="DEPOSIT">فقط واریزها</option>
            <option value="WITHDRAWAL">فقط برداشت‌ها</option>
          </select>

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:border-balkun-cyan outline-none"
          >
            <option value="">همه‌ی منابع تراکنش</option>
            {TRANSACTION_SOURCE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
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
        {(search || walletType || type || category || dateFrom || dateTo) && (
          <button
            onClick={resetFilters}
            className="self-start text-xs font-bold text-balkun-orange hover:underline"
          >
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
                <th className="px-6 py-4">کاربر / سازمان</th>
                <th className="px-6 py-4">نوع کیف پول</th>
                <th className="px-6 py-4">منبع تراکنش</th>
                <th className="px-6 py-4">مبلغ</th>
                <th className="px-6 py-4">وضعیت</th>
                <th className="px-6 py-4">کد پیگیری</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 text-balkun-cyan animate-spin mx-auto mb-2" />
                    <span className="text-slate-500 font-bold">در حال بارگذاری...</span>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-bold">
                    تراکنشی با این مشخصات یافت نشد
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-medium text-slate-500 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleString("fa-IR")}
                    </td>
                    <td className="px-6 py-4">
                      {tx.owner ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            {tx.owner.userType === "ORGANIZATIONAL" ? (
                              <Briefcase className="w-3.5 h-3.5 text-balkun-orange" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            {tx.owner.firstName} {tx.owner.lastName}
                          </span>
                          <span className="text-[11px] text-slate-400" dir="ltr">
                            {tx.owner.phoneNumber}
                          </span>
                          {tx.owner.organizationName && (
                            <span className="text-[11px] text-balkun-orange font-bold">
                              {tx.owner.organizationName}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">نامشخص</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-md ${
                          tx.walletType === "ORGANIZATIONAL"
                            ? "bg-balkun-orange/10 text-balkun-orange"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {tx.walletType === "ORGANIZATIONAL" ? "سازمانی" : "عادی"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        {tx.source.direction === "IN" ? (
                          <ArrowDownCircle className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <ArrowUpCircle className="w-3.5 h-3.5 text-red-500" />
                        )}
                        {tx.source.label}
                      </span>
                    </td>
                    <td
                      className={`px-6 py-4 font-black whitespace-nowrap ${
                        tx.source.direction === "IN" ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {tx.source.direction === "IN" ? "+" : "−"}
                      {formatPrice(tx.amount)}
                      <span className="text-[10px] font-normal text-slate-400"> تومان</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                          GATEWAY_STATUS_MAP[tx.gatewayStatus]?.color || "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {GATEWAY_STATUS_MAP[tx.gatewayStatus]?.label || tx.gatewayStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500" dir="ltr">
                      {tx.trackingCode || "—"}
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
