// مسیر: src/app/admin/sms-logs/page.tsx
//
// 🆕 مورد ۲۶ چک‌لیست کارفرما (عدم نمایش پنل کاوه‌نگار / وضعیت ارسال پیامک):
// این صفحه برای هر سه نقش SUPER_ADMIN، SUPPORT_AGENT و FINANCE_MANAGER در سایدبار
// نمایش داده می‌شود (src/components/admin/AdminSidebar.tsx). دسترسی واقعی هم در
// سطح API (src/app/api/admin/sms-logs/route.ts) با requireAdminRole کنترل می‌شود —
// پس حتی با تایپ مستقیم آدرس هم، کاربر بدون نقش مجاز چیزی جز خطای ۴۰۳ نمی‌بیند.
//
// نمایش می‌دهد: تمام پیامک‌های ارسالی سیستم، وضعیت دقیق هر کدام (حالت آزمایشی
// Mock / ارسال موفق / ارسال ناموفق)، متن کامل پیامک، خطای دریافتی از سرویس‌دهنده
// (در صورت وجود)، رکورد مرتبط (کاربر/رزرو/تیکت — در صورت ثبت) و کد پیگیری
// کاوه‌نگار (providerMessageId، فقط بعد از اتصال واقعی).
//
// ⚠️ این پنل فقط زیرساخت است: تا وقتی کلید API کاوه‌نگار در .env.local تنظیم
// نشده، تمام ردیف‌ها با وضعیت «حالت آزمایشی» ثبت می‌شوند. یک بنر راهنما (بر
// اساس فیلد mockMode در پاسخ API) همین موضوع را به‌صورت شفاف به ادمین اطلاع
// می‌دهد.

"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Loader2,
  MessageSquare,
  Filter,
  CheckCircle2,
  XCircle,
  FlaskConical,
  Info,
  User,
  CalendarDays,
  HeadphonesIcon,
} from "lucide-react";

type SmsMessageType =
  | "OTP"
  | "WELCOME"
  | "BOOKING_CONFIRMED"
  | "VOUCHER_ISSUED"
  | "BOOKING_CANCELLED"
  | "REFUND"
  | "TICKET_REPLY";

type SmsLogStatus = "MOCK" | "SENT" | "FAILED";

interface SmsLogRow {
  id: string;
  messageType: SmsMessageType;
  recipientPhone: string;
  messageText: string;
  status: SmsLogStatus;
  providerMessageId: string | null;
  errorMessage: string | null;
  createdAt: string;
  relatedUser: { firstName: string; lastName: string; phoneNumber: string } | null;
  relatedBooking: { roomName: string } | null;
  relatedTicket: { subject: string } | null;
}

const MESSAGE_TYPE_LABELS: Record<SmsMessageType, string> = {
  OTP: "کد تایید (OTP)",
  WELCOME: "خوش‌آمدگویی",
  BOOKING_CONFIRMED: "تایید رزرو",
  VOUCHER_ISSUED: "صدور ووچر",
  BOOKING_CANCELLED: "لغو رزرو",
  REFUND: "عودت وجه",
  TICKET_REPLY: "پاسخ تیکت",
};

const STATUS_MAP: Record<SmsLogStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  MOCK: { label: "حالت آزمایشی (Mock)", color: "bg-slate-100 text-slate-600", icon: FlaskConical },
  SENT: { label: "ارسال موفق", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  FAILED: { label: "ارسال ناموفق", color: "bg-red-50 text-red-600", icon: XCircle },
};

export default function AdminSmsLogsPage() {
  const [logs, setLogs] = useState<SmsLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [mockMode, setMockMode] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [messageType, setMessageType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchLogs();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, messageType, dateFrom, dateTo, page]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        ...(search && { search }),
        ...(status && { status }),
        ...(messageType && { messageType }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });
      const res = await fetch(`/api/admin/sms-logs?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        setTotal(data.pagination.total || 0);
        setMockMode(Boolean(data.mockMode));
      }
    } catch (error) {
      console.error("Error fetching sms logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setMessageType("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-balkun-navy flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-balkun-yellow" />
            کاوه‌نگار — وضعیت ارسال پیامک‌ها
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            تمام پیامک‌های ارسالی سیستم به همراه وضعیت دقیق هر کدام (تعداد کل: {total})
          </p>
        </div>
      </div>

      {mockMode && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium leading-6">
            هنوز کلید API واقعی کاوه‌نگار در سیستم تنظیم نشده، پس همه‌ی پیامک‌های زیر با وضعیت
            «حالت آزمایشی (Mock)» ثبت شده‌اند و در واقعیت به شماره‌ی کاربر ارسال نشده‌اند. به محض
            دریافت کلید API از کارفرما و تنظیم آن، همین پنل بدون هیچ تغییر دیگری وضعیت واقعی
            ارسال (موفق/ناموفق) را نشان خواهد داد.
          </p>
        </div>
      )}

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
              placeholder="جستجو با شماره موبایل گیرنده..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm font-medium focus:outline-none focus:border-balkun-cyan focus:ring-1 focus:ring-balkun-cyan"
              dir="ltr"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:border-balkun-cyan outline-none"
          >
            <option value="">همه‌ی وضعیت‌ها</option>
            <option value="MOCK">حالت آزمایشی</option>
            <option value="SENT">ارسال موفق</option>
            <option value="FAILED">ارسال ناموفق</option>
          </select>

          <select
            value={messageType}
            onChange={(e) => {
              setMessageType(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:border-balkun-cyan outline-none"
          >
            <option value="">همه‌ی انواع پیامک</option>
            {Object.entries(MESSAGE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <div className="flex gap-2 lg:col-span-2">
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
        {(search || status || messageType || dateFrom || dateTo) && (
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
                <th className="px-6 py-4">گیرنده</th>
                <th className="px-6 py-4">نوع پیامک</th>
                <th className="px-6 py-4">متن پیامک</th>
                <th className="px-6 py-4">وضعیت</th>
                <th className="px-6 py-4">مرتبط با</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 text-balkun-cyan animate-spin mx-auto mb-2" />
                    <span className="text-slate-500 font-bold">در حال بارگذاری...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-bold">
                    پیامکی با این مشخصات یافت نشد
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const statusInfo = STATUS_MAP[log.status];
                  const StatusIcon = statusInfo.icon;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors align-top">
                      <td className="px-6 py-4 text-xs font-medium text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("fa-IR")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800" dir="ltr">
                            {log.recipientPhone}
                          </span>
                          {log.relatedUser && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {log.relatedUser.firstName} {log.relatedUser.lastName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold px-2 py-1 rounded-md bg-balkun-cyan/10 text-balkun-cyan whitespace-nowrap">
                          {MESSAGE_TYPE_LABELS[log.messageType]}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-xs text-slate-600 leading-5 line-clamp-2" title={log.messageText}>
                          {log.messageText}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`flex items-center gap-1.5 w-fit text-[10px] font-bold px-2 py-1 rounded-md ${statusInfo.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                        {log.status === "FAILED" && log.errorMessage && (
                          <p className="text-[10px] text-red-500 mt-1 leading-4">{log.errorMessage}</p>
                        )}
                        {log.providerMessageId && (
                          <p className="text-[10px] text-slate-400 mt-1" dir="ltr">
                            #{log.providerMessageId}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {log.relatedBooking ? (
                          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                            {log.relatedBooking.roomName}
                          </span>
                        ) : log.relatedTicket ? (
                          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                            <HeadphonesIcon className="w-3.5 h-3.5 text-slate-400" />
                            {log.relatedTicket.subject}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
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