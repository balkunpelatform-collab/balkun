
// مسیر: src/app/admin/tickets/page.tsx
//
// 🆕 تسک ۸ چک‌لیست کارفرما (امکان حذف برای مدیران ارشد): در ستون «عملیات»، برای
// مدیر ارشد یک دکمه‌ی حذف تیکت (در کنار «مشاهده و پاسخ») اضافه شد. این دکمه برای
// نقش‌های دیگر اصلاً رندر نمی‌شود و سرور هم حذف را فقط برای SUPER_ADMIN می‌پذیرد
// (DELETE /api/admin/tickets/[id]) — با حذف تیکت، تمام پیام‌هایش هم حذف می‌شوند.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, HeadphonesIcon, MessageSquare, Trash2 } from "lucide-react";
import { TICKET_STATUS_LABELS, TICKET_STATUS_STYLES, getCategoryLabel } from "@/constants/support";
import { useAuthStore } from "@/store/authStore";

export default function AdminTicketsPage() {
  // 🆕 تسک ۸: نقش کاربر واردشده برای نمایش/پنهان‌کردن دکمه‌ی حذف (فقط مدیر ارشد)
  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchTickets();
  }, [status, page]);

  // 🆕 تسک ۸: حذف کامل تیکت (به‌همراه تمام پیام‌هایش) توسط مدیر ارشد
  const handleDeleteTicket = async (ticketId: string, subject: string) => {
    if (
      !confirm(
        `⚠️ آیا از حذف کامل تیکت «${subject}» مطمئن هستید؟\n\nتمام پیام‌های ردوبدل‌شده در این تیکت هم برای همیشه حذف می‌شوند و قابل بازگشت نیستند.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchTickets();
      } else {
        alert(data.error || "خطا در حذف تیکت");
      }
    } catch (error) {
      alert("خطا در ارتباط با سرور");
    }
  };

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        ...(status && { status }),
      });
      const res = await fetch(`/api/admin/tickets?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets || []);
        setTotal(data.pagination.total || 0);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-balkun-navy">مرکز تیکتینگ مسافران</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            مشاهده و پاسخ‌دهی به سوالات و مشکلات کاربران (تعداد کل: {total})
          </p>
        </div>
        <div className="w-full md:w-64">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:outline-none focus:border-balkun-cyan"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="NEW">جدید</option>
            <option value="IN_PROGRESS">در حال بررسی</option>
            <option value="ANSWERED">پاسخ داده شده</option>
            <option value="CLOSED">بسته شده</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">شماره تیکت</th>
                <th className="px-6 py-4">کاربر</th>
                <th className="px-6 py-4">موضوع و دسته‌بندی</th>
                <th className="px-6 py-4">وضعیت</th>
                <th className="px-6 py-4">آخرین بروزرسانی</th>
                <th className="px-6 py-4">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 text-balkun-cyan animate-spin mx-auto mb-2" />
                    <span className="text-slate-500 font-bold">در حال دریافت تیکت‌ها...</span>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-bold">
                    تیکتی یافت نشد
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {t.id.split("-")[0]}
                    </td>
                    <td className="px-6 py-4">
                      {t.user ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{t.user.firstName} {t.user.lastName}</span>
                          <span className="text-xs text-slate-500" dir="ltr">{t.user.phoneNumber}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">ناشناس</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-slate-800 line-clamp-1">{t.subject}</span>
                        <span className="text-[10px] font-bold text-slate-400">{getCategoryLabel(t.category)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${TICKET_STATUS_STYLES[t.status]}`}>
                        {TICKET_STATUS_LABELS[t.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">
                      {new Date(t.updatedAt).toLocaleDateString("fa-IR")} - {new Date(t.updatedAt).toLocaleTimeString("fa-IR", {hour: "2-digit", minute: "2-digit"})}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/tickets/${t.id}`}
                          className="inline-flex items-center gap-1.5 bg-balkun-cyan/10 hover:bg-balkun-cyan text-balkun-cyan hover:text-white px-3 py-1.5 rounded-lg transition-colors font-bold text-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          مشاهده و پاسخ
                        </Link>
                        {/* 🆕 تسک ۸: دکمه‌ی حذف تیکت — فقط مدیر ارشد */}
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDeleteTicket(t.id, t.subject)}
                            className="inline-flex items-center justify-center bg-red-50 hover:bg-red-500 hover:text-white text-red-500 p-2 rounded-lg transition-colors"
                            title="حذف کامل تیکت (فقط مدیر ارشد)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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

