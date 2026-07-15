// مسیر: src/app/admin/activity-log/page.tsx
//
// 🆕 تسک ۲ چک‌لیست کارفرما (نمایش لاگ فعالیت‌های پشتیبانی، مالی و مدیر ارشد):
// این صفحه برای هر سه نقش SUPER_ADMIN، SUPPORT_AGENT و FINANCE_MANAGER در سایدبار
// نمایش داده می‌شود (src/components/admin/AdminSidebar.tsx). دسترسی واقعی هم در
// سطح API (src/app/api/admin/activity-log/route.ts) با requireAdminRole کنترل
// می‌شود؛ آن روت هم مسئول است که پشتیبانی/مالی فقط فعالیت خودشان را ببینند.
//
// نمایش می‌دهد: هر کارمند چه کاری انجام داده، روی کدام کاربر/رزرو/تیکت/کیف پول،
// در چه زمانی، و با چه نتیجه‌ای (وضعیت قبل → بعد) — دقیقاً طبق مورد ۲ فایل
// درخواست‌های کارفرما.

"use client";

import { useEffect, useState } from "react";
import { Loader2, History, Filter, User, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

type AdminActionType =
  | "ROLE_CHANGE"
  | "WALLET_ADJUST"
  | "USER_STATUS_CHANGE"
  | "BOOKING_STATUS_CHANGE"
  | "BOOKING_DELETE"
  | "PERMISSIONS_CHANGE"
  | "BLOG_POST_CHANGE"
  | "CORPORATE_LEAD_UPDATE"
  | "CORPORATE_NUMBER_CHANGE"
  | "TICKET_REPLY"
  | "TICKET_STATUS_CHANGE"
  | "OTHER";

const ACTION_LABELS: Record<AdminActionType, string> = {
  ROLE_CHANGE: "تغییر نقش کاربر",
  WALLET_ADJUST: "شارژ/کسر دستی کیف پول",
  USER_STATUS_CHANGE: "تغییر وضعیت کاربر",
  BOOKING_STATUS_CHANGE: "تغییر وضعیت رزرو",
  BOOKING_DELETE: "حذف رزرو",
  PERMISSIONS_CHANGE: "تغییر دسترسی‌ها",
  BLOG_POST_CHANGE: "تغییر در بلاگ",
  CORPORATE_LEAD_UPDATE: "به‌روزرسانی لید سازمانی",
  CORPORATE_NUMBER_CHANGE: "تغییر شماره سازمانی",
  TICKET_REPLY: "پاسخ به تیکت",
  TICKET_STATUS_CHANGE: "تغییر وضعیت تیکت",
  OTHER: "سایر موارد",
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "مدیر ارشد",
  FINANCE_MANAGER: "مدیر مالی",
  SUPPORT_AGENT: "پشتیبان",
  USER: "کاربر",
};

interface PersonInfo {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: string;
}

interface ActivityLogRow {
  id: string;
  adminId: string;
  actionType: AdminActionType;
  targetUserId: string | null;
  description: string;
  previousValue: string | null;
  newValue: string | null;
  createdAt: string;
  admin: PersonInfo | null;
  targetUser: PersonInfo | null;
}

interface StaffOption {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function AdminActivityLogPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [staffId, setStaffId] = useState("");
  const [actionType, setActionType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, actionType, dateFrom, dateTo, page]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        ...(staffId && { staffId }),
        ...(actionType && { actionType }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });
      const res = await fetch(`/api/admin/activity-log?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        setStaffOptions(data.staffOptions || []);
        setTotal(data.pagination.total || 0);
      }
    } catch (error) {
      console.error("Error fetching activity log:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetFilters = () => {
    setStaffId("");
    setActionType("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-balkun-navy flex items-center gap-2">
            <History className="w-6 h-6 text-balkun-cyan" />
            لاگ فعالیت‌ها
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            {isSuperAdmin
              ? `تاریخچه کامل اقدامات تمام تیم پشتیبانی، مالی و مدیریت (تعداد کل: ${total})`
              : `تاریخچه اقدامات ثبت‌شده توسط شما در پنل مدیریت (تعداد کل: ${total})`}
          </p>
        </div>
      </div>

      {/* فیلترها */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-slate-500 font-bold text-xs">
          <Filter className="w-4 h-4" />
          فیلترها
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {isSuperAdmin && (
            <select
              value={staffId}
              onChange={(e) => {
                setStaffId(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:border-balkun-cyan outline-none"
            >
              <option value="">فعالیت همه کارمندان</option>
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({ROLE_LABELS[s.role] || s.role})
                </option>
              ))}
            </select>
          )}

          <select
            value={actionType}
            onChange={(e) => {
              setActionType(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:border-balkun-cyan outline-none"
          >
            <option value="">همه‌ی نوع اقدامات</option>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
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
        {(staffId || actionType || dateFrom || dateTo) && (
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
                {isSuperAdmin && <th className="px-6 py-4">کارمند</th>}
                <th className="px-6 py-4">نوع اقدام</th>
                <th className="px-6 py-4 w-1/3">شرح اقدام</th>
                <th className="px-6 py-4">روی کاربر</th>
                <th className="px-6 py-4">نتیجه (قبل ← بعد)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 text-balkun-cyan animate-spin mx-auto mb-2" />
                    <span className="text-slate-500 font-bold">در حال بارگذاری...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} className="px-6 py-12 text-center text-slate-500 font-bold">
                    هنوز فعالیتی ثبت نشده است
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors align-top">
                    <td className="px-6 py-4 text-xs font-medium text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("fa-IR")}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4">
                        {log.admin ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {log.admin.firstName} {log.admin.lastName}
                            </span>
                            <span className="text-[11px] text-balkun-cyan font-bold">
                              {ROLE_LABELS[log.admin.role] || log.admin.role}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">نامشخص</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-700 whitespace-nowrap">
                        {ACTION_LABELS[log.actionType] || log.actionType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600 text-xs leading-relaxed">
                      {log.description}
                    </td>
                    <td className="px-6 py-4">
                      {log.targetUser ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 text-xs">
                            {log.targetUser.firstName} {log.targetUser.lastName}
                          </span>
                          {log.targetUser.phoneNumber && (
                            <span className="text-[11px] text-slate-400" dir="ltr">
                              {log.targetUser.phoneNumber}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {log.previousValue || log.newValue ? (
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <span className="truncate max-w-[110px]" title={log.previousValue || ""}>
                            {log.previousValue || "—"}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[110px] font-bold text-slate-800" title={log.newValue || ""}>
                            {log.newValue || "—"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
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