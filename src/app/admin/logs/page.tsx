// مسیر: src/app/admin/logs/page.tsx
//
// 🆕 تسک ۸ چک‌لیست کارفرما (امکان حذف برای مدیران ارشد): مدیر ارشد حالا در کنار
// دکمه‌ی «مشاهده کامل» هر لاگ، یک دکمه‌ی حذف هم می‌بیند (DELETE /api/admin/logs?id=...
// که آن هم فقط SUPER_ADMIN را می‌پذیرد). این دکمه برای پشتیبان و مدیر مالی — که
// خواندن/ثبت لاگ برایشان باز است — اصلاً رندر نمی‌شود.
//
// 🆕 تسک ۱۰ چک‌لیست کارفرما (مشکل نمایش لاگ‌های سیستم): بخش باقی‌مانده‌ی این تسک —
// «امکان پاسخ‌گویی ندارند» — با یک بخش جدید «پاسخ‌ها و پیگیری» داخل همان مودال
// «جزئیات کامل لاگ» حل شد (روت جدید src/app/api/admin/logs/[id]/replies/route.ts).
// در جدول اصلی لیست، کنار موضوع هر لاگ که پاسخی دارد، یک نشان «X پاسخ» هم نمایش
// داده می‌شود.

"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, ScrollText, X, Save, KeyRound, Copy, Check, User, Eye, Trash2, MessageSquare, Send } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const LOG_CATEGORIES: Record<string, string> = {
  PHONE_CALL_RECORD: "ثبت تماس تلفنی",
  TEAM_INTERNAL_TICKET: "ارجاع درون‌تیمی",
  SYSTEM_ERROR: "گزارش خطای سیستمی",
  SMS_REPORT: "گزارش پیامک/ارتباطات",
};

// 🆕 تسک ۲۵ چک‌لیست کارفرما: برای نمایش نقش ثبت‌کننده لاگ کنار نامش
// (همان الگوی src/app/admin/activity-log/page.tsx).
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "مدیر ارشد",
  FINANCE_MANAGER: "مدیر مالی",
  SUPPORT_AGENT: "پشتیبان",
  USER: "کاربر",
};

// 🆕 تسک ۲۵ چک‌لیست کارفرما: اطلاعات ثبت‌کننده/کاربر هدف که حالا API به هر لاگ می‌چسباند
interface LogPersonInfo {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: string;
}

interface InternalLogRow {
  id: string;
  logCategory: string;
  creatorId: string;
  targetUserId: string | null;
  subject: string;
  details: string;
  actionTaken: string;
  nextActionRequired: string | null;
  loggedAt: string;
  creator: LogPersonInfo | null;
  targetUser: LogPersonInfo | null;
  // 🆕 تسک ۱۰ چک‌لیست کارفرما: تعداد پاسخ‌های ثبت‌شده روی این لاگ (برای نشان «X پاسخ» در جدول)
  replyCount: number;
}

// 🆕 تسک ۱۰ چک‌لیست کارفرما: یک پاسخ/پیگیری ثبت‌شده روی یک لاگ داخلی
interface LogReplyRow {
  id: string;
  logId: string;
  creatorId: string;
  message: string;
  createdAt: string;
  creator: { firstName: string; lastName: string; role: string } | null;
}

// 🆕 ردیف نمایش کد ورود اخیر (فقط برای مدیر ارشد)
interface OtpCodeRow {
  id: string;
  phoneNumber: string;
  fullName: string | null;
  code: string;
  createdAt: string;
  expiresAt: string;
  isUsed: boolean;
  isExpired: boolean;
}

export default function AdminLogsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [logs, setLogs] = useState<InternalLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [showAddForm, setShowAddForm] = useState(false);

  // 🆕 تسک ۲۵ چک‌لیست کارفرما: لاگی که برای نمایش «جزئیات کامل» انتخاب شده (مودال)
  const [selectedLog, setSelectedLog] = useState<InternalLogRow | null>(null);

  // 🆕 تسک ۱۰ چک‌لیست کارفرما: پاسخ‌های لاگ انتخاب‌شده در مودال جزئیات
  const [replies, setReplies] = useState<LogReplyRow[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState("");

  // 🆕 کدهای ورود اخیر — تا وقتی پنل پیامکی واقعی وصل نشده (فقط مدیر ارشد می‌بیند)
  const [otpCodes, setOtpCodes] = useState<OtpCodeRow[]>([]);
  const [isLoadingOtp, setIsLoadingOtp] = useState(true);
  const [otpFeatureDisabled, setOtpFeatureDisabled] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // فرم افزودن لاگ
  const [formData, setFormData] = useState({
    logCategory: "PHONE_CALL_RECORD",
    subject: "",
    details: "",
    actionTaken: "",
    nextActionRequired: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchLogs();
  }, [category, page]);

  // 🆕 تسک ۱۰ چک‌لیست کارفرما: با باز شدن مودال جزئیات یک لاگ، پاسخ‌های همان لاگ
  // خوانده می‌شود؛ با بسته شدن مودال (selectedLog صفر می‌شود)، فرم پاسخ هم پاک می‌شود.
  useEffect(() => {
    if (selectedLog) {
      fetchReplies(selectedLog.id);
    } else {
      setReplies([]);
      setReplyText("");
      setReplyError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLog?.id]);

  // 🆕 دریافت دوره‌ای کدهای ورود اخیر (هر ۵ ثانیه) — فقط اگر کاربر فعلی مدیر ارشد باشد
  useEffect(() => {
    if (!isSuperAdmin) {
      setIsLoadingOtp(false);
      return;
    }
    fetchOtpCodes();
    const interval = setInterval(fetchOtpCodes, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  const fetchOtpCodes = async () => {
    try {
      const res = await fetch("/api/admin/otp-codes");
      const data = await res.json();
      if (data.success) {
        setOtpFeatureDisabled(!!data.disabled);
        setOtpCodes(data.codes || []);
      }
    } catch (error) {
      console.error("Error fetching OTP codes:", error);
    } finally {
      setIsLoadingOtp(false);
    }
  };

  const handleCopyCode = (row: OtpCodeRow) => {
    navigator.clipboard.writeText(row.code).then(() => {
      setCopiedId(row.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  // 🆕 تسک ۸: حذف یک لاگ داخلی/یادداشت شیفت توسط مدیر ارشد
  const handleDeleteLog = async (logId: string) => {
    if (!confirm("آیا از حذف این لاگ مطمئن هستید؟\n\nاین عمل قابل بازگشت نیست.")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/logs?id=${logId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        // اگر لاگ حذف‌شده همان لاگی است که در مودال جزئیات باز است، مودال را هم ببند
        setSelectedLog((prev) => (prev && prev.id === logId ? null : prev));
        fetchLogs();
      } else {
        alert(data.error || "خطا در حذف لاگ");
      }
    } catch (error) {
      alert("خطا در ارتباط با سرور");
    }
  };

  // 🆕 تسک ۱۰ چک‌لیست کارفرما: دریافت پاسخ‌های یک لاگ داخلی
  const fetchReplies = async (logId: string) => {
    setIsLoadingReplies(true);
    try {
      const res = await fetch(`/api/admin/logs/${logId}/replies`);
      const data = await res.json();
      if (data.success) {
        setReplies(data.replies || []);
      }
    } catch (error) {
      console.error("Error fetching replies:", error);
    } finally {
      setIsLoadingReplies(false);
    }
  };

  // 🆕 تسک ۱۰ چک‌لیست کارفرما: ثبت پاسخ/پیگیری جدید روی لاگ انتخاب‌شده
  const handleAddReply = async () => {
    if (!selectedLog) return;
    if (!replyText.trim()) {
      setReplyError("متن پاسخ نمی‌تواند خالی باشد.");
      return;
    }
    setReplyError("");
    setIsSubmittingReply(true);
    try {
      const res = await fetch(`/api/admin/logs/${selectedLog.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText }),
      });
      const data = await res.json();
      if (data.success) {
        setReplies((prev) => [...prev, data.reply]);
        setReplyText("");
        fetchLogs(); // به‌روزرسانی نشان «X پاسخ» در جدول اصلی پشت مودال
      } else {
        setReplyError(data.error || "خطا در ثبت پاسخ");
      }
    } catch (error) {
      setReplyError("خطا در ارتباط با سرور");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        ...(category && { category }),
      });
      const res = await fetch(`/api/admin/logs?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        setTotal(data.pagination.total || 0);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLog = async () => {
    if (!formData.subject || !formData.details || !formData.actionTaken) {
      setFormError("لطفاً موضوع، شرح ماجرا و اقدام انجام شده را پر کنید.");
      return;
    }
    setFormError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddForm(false);
        setFormData({ logCategory: "PHONE_CALL_RECORD", subject: "", details: "", actionTaken: "", nextActionRequired: "" });
        setPage(1);
        fetchLogs();
      } else {
        setFormError(data.error || "خطا در ثبت لاگ");
      }
    } catch (error) {
      setFormError("خطا در ارتباط با سرور");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-balkun-navy">لاگ‌های سیستمی و شیفت</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            ثبت و پیگیری اتفاقات داخلی تیم پشتیبانی (تعداد کل: {total})
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-balkun-navy text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" /> ثبت یادداشت جدید
        </button>
      </div>

      {/* 🆕 کدهای ورود اخیر — فقط مدیر ارشد می‌بیند، تا وقتی پنل پیامکی واقعی وصل نشده */}
      {isSuperAdmin && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-balkun-cyan shrink-0" />
            <div>
              <h2 className="text-sm font-black text-slate-800">کدهای ورود اخیر (فقط مدیر ارشد)</h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                تا وقتی پنل پیامکی وصل نشده، کد ورود هرکسی که تلاش کند وارد شود این‌جا می‌آید. هر ۵ ثانیه به‌روز می‌شود.
              </p>
            </div>
          </div>

          {otpFeatureDisabled ? (
            <div className="px-6 py-8 text-center text-slate-500 font-bold text-xs">
              پنل پیامکی واقعی وصل شده، پس این بخش دیگر لازم نیست و خودکار غیرفعال شد.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">شماره موبایل</th>
                    <th className="px-6 py-3">نام (در صورت وجود)</th>
                    <th className="px-6 py-3">کد</th>
                    <th className="px-6 py-3">وضعیت</th>
                    <th className="px-6 py-3">زمان درخواست</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingOtp && otpCodes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center">
                        <Loader2 className="w-5 h-5 text-balkun-cyan animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : otpCodes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-bold text-xs">
                        در ۳۰ دقیقه اخیر کد ورودی صادر نشده
                      </td>
                    </tr>
                  ) : (
                    otpCodes.map((row) => {
                      const status = row.isUsed
                        ? { label: "استفاده‌شده", className: "bg-slate-100 text-slate-500" }
                        : row.isExpired
                        ? { label: "منقضی‌شده", className: "bg-red-50 text-red-500" }
                        : { label: "فعال", className: "bg-emerald-50 text-emerald-600" };
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3 font-bold text-slate-700" dir="ltr">{row.phoneNumber}</td>
                          <td className="px-6 py-3 font-medium text-slate-600">{row.fullName || "—"}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-800 text-base tracking-widest" dir="ltr">{row.code}</span>
                              <button
                                onClick={() => handleCopyCode(row)}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors"
                                title="کپی کد"
                              >
                                {copiedId === row.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${status.className}`}>{status.label}</span>
                          </td>
                          <td className="px-6 py-3 text-xs font-bold text-slate-500" dir="ltr">
                            {new Date(row.createdAt).toLocaleTimeString("fa-IR")}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showAddForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-lg relative">
          <button onClick={() => setShowAddForm(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full">
            <X className="w-5 h-5" />
          </button>
          
          <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-balkun-cyan" /> ثبت لاگ یا یادداشت شیفت
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-600">نوع لاگ</label>
              <select value={formData.logCategory} onChange={(e) => setFormData({...formData, logCategory: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-balkun-cyan">
                {Object.entries(LOG_CATEGORIES).map(([key, val]) => (
                  <option key={key} value={key}>{val}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-600">موضوع / عنوان</label>
              <input type="text" value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} placeholder="مثال: پیگیری تماس مسافر بابت کنسلی" className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-balkun-cyan" />
            </div>
          </div>

          <div className="flex flex-col gap-1 mb-4">
            <label className="text-xs font-bold text-slate-600">شرح کامل ماجرا</label>
            <textarea value={formData.details} onChange={(e) => setFormData({...formData, details: e.target.value})} rows={3} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-balkun-cyan resize-none" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-600">اقدام انجام شده (توسط شما)</label>
              <textarea value={formData.actionTaken} onChange={(e) => setFormData({...formData, actionTaken: e.target.value})} rows={2} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-balkun-cyan resize-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-600">اقدام مورد نیاز شیفت بعد (اختیاری)</label>
              <textarea value={formData.nextActionRequired} onChange={(e) => setFormData({...formData, nextActionRequired: e.target.value})} rows={2} placeholder="اگر کاری ناتمام مانده بنویسید..." className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-balkun-cyan resize-none" />
            </div>
          </div>

          {formError && <p className="text-sm font-bold text-red-500 mb-4">{formError}</p>}

          <button onClick={handleAddLog} disabled={isSubmitting} className="bg-balkun-cyan text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-balkun-cyan-dark flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            ثبت در سیستم
          </button>
        </div>
      )}

      {/* لیست فیلتر و لاگ‌ها */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-end">
          <select value={category} onChange={(e) => {setCategory(e.target.value); setPage(1);}} className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:outline-none focus:border-balkun-cyan w-full md:w-64">
            <option value="">همه دسته‌بندی‌ها</option>
            {Object.entries(LOG_CATEGORIES).map(([key, val]) => (
              <option key={key} value={key}>{val}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">دسته‌بندی</th>
                <th className="px-6 py-4 w-1/4">موضوع</th>
                <th className="px-6 py-4 w-1/4">اقدام انجام شده</th>
                {/* 🆕 تسک ۲۵ چک‌لیست کارفرما: ستون ثبت‌کننده */}
                <th className="px-6 py-4">ثبت‌کننده</th>
                <th className="px-6 py-4">تاریخ ثبت</th>
                <th className="px-6 py-4 text-center">جزئیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 text-balkun-cyan animate-spin mx-auto mb-2" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-bold">لاگی یافت نشد</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-bold text-slate-600 text-xs">
                      {LOG_CATEGORIES[log.logCategory] || log.logCategory}
                    </td>
                    <td className="px-6 py-4 font-black text-slate-800">
                      <div className="flex items-center gap-2">
                        <span>{log.subject}</span>
                        {/* 🆕 تسک ۱۰ چک‌لیست کارفرما: نشان تعداد پاسخ‌های ثبت‌شده روی این لاگ */}
                        {log.replyCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-balkun-cyan/10 text-balkun-cyan text-[10px] font-bold shrink-0">
                            <MessageSquare className="w-3 h-3" /> {log.replyCount} پاسخ
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600 text-xs leading-relaxed">
                      {log.actionTaken}
                    </td>
                    {/* 🆕 تسک ۲۵ چک‌لیست کارفرما: نمایش نام و نقش ثبت‌کننده (به‌جای عدم نمایش کامل قبلی) */}
                    <td className="px-6 py-4">
                      {log.creator ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {log.creator.firstName} {log.creator.lastName}
                          </span>
                          <span className="text-[11px] text-balkun-cyan font-bold">
                            {ROLE_LABELS[log.creator.role] || log.creator.role}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">نامشخص</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500" dir="ltr">
                      {new Date(log.loggedAt).toLocaleString("fa-IR")}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> مشاهده کامل
                        </button>
                        {/* 🆕 تسک ۸: دکمه‌ی حذف لاگ — فقط مدیر ارشد؛ stopPropagation
                            برای جلوگیری از باز شدن مودال جزئیات هنگام کلیک روی حذف */}
                        {isSuperAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLog(log.id);
                            }}
                            className="inline-flex items-center justify-center bg-red-50 hover:bg-red-500 hover:text-white text-red-500 p-1.5 rounded-lg transition-colors"
                            title="حذف این لاگ (فقط مدیر ارشد)"
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

      {/* 🆕 تسک ۲۵ چک‌لیست کارفرما: مودال «جزئیات کامل لاگ» — قبلاً details و
          nextActionRequired اصلاً جایی نمایش داده نمی‌شدند، فقط در دیتابیس ذخیره می‌شدند. */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl relative w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <ScrollText className="w-5 h-5 text-balkun-cyan" />
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {LOG_CATEGORIES[selectedLog.logCategory] || selectedLog.logCategory}
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-800 mb-5">{selectedLog.subject}</h2>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400">ثبت‌کننده</span>
                  {selectedLog.creator ? (
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                        <User className="w-4 h-4 text-slate-400" />
                        {selectedLog.creator.firstName} {selectedLog.creator.lastName}
                      </span>
                      <span className="text-[11px] text-balkun-cyan font-bold">
                        {ROLE_LABELS[selectedLog.creator.role] || selectedLog.creator.role}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-sm">نامشخص</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400">تاریخ و ساعت ثبت</span>
                  <span className="font-bold text-slate-700 text-sm" dir="ltr">
                    {new Date(selectedLog.loggedAt).toLocaleString("fa-IR")}
                  </span>
                </div>
              </div>

              {selectedLog.targetUser && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400">کاربر مرتبط</span>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-700 text-sm">
                      {selectedLog.targetUser.firstName} {selectedLog.targetUser.lastName}
                    </span>
                    {selectedLog.targetUser.phoneNumber && (
                      <span className="text-xs text-slate-400" dir="ltr">
                        {selectedLog.targetUser.phoneNumber}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400">شرح کامل ماجرا</span>
                <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-3 whitespace-pre-wrap">
                  {selectedLog.details}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400">اقدام انجام شده</span>
                <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-3 whitespace-pre-wrap">
                  {selectedLog.actionTaken}
                </p>
              </div>

              {selectedLog.nextActionRequired && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400">اقدام مورد نیاز شیفت بعد</span>
                  <p className="text-sm font-medium text-amber-700 leading-relaxed bg-amber-50 rounded-xl p-3 whitespace-pre-wrap">
                    {selectedLog.nextActionRequired}
                  </p>
                </div>
              )}

              {/* 🆕 تسک ۱۰ چک‌لیست کارفرما: بخش پاسخ‌ها و پیگیری — همان بخش «امکان
                  پاسخ‌گویی ندارند» که در تسک ۲۵ حل نشده بود. */}
              <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> پاسخ‌ها و پیگیری ({replies.length})
                </span>

                {isLoadingReplies ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 text-balkun-cyan animate-spin" />
                  </div>
                ) : replies.length === 0 ? (
                  <p className="text-xs text-slate-400 font-medium text-center py-2">هنوز پاسخی ثبت نشده</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                    {replies.map((reply) => (
                      <div key={reply.id} className="bg-slate-50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            {reply.creator ? `${reply.creator.firstName} ${reply.creator.lastName}` : "نامشخص"}
                            {reply.creator && (
                              <span className="text-[10px] text-balkun-cyan font-bold">
                                ({ROLE_LABELS[reply.creator.role] || reply.creator.role})
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold shrink-0" dir="ltr">
                            {new Date(reply.createdAt).toLocaleString("fa-IR")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={2}
                    placeholder="پاسخ یا پیگیری خود را بنویسید..."
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-balkun-cyan resize-none"
                  />
                  {replyError && <p className="text-xs font-bold text-red-500">{replyError}</p>}
                  <button
                    onClick={handleAddReply}
                    disabled={isSubmittingReply}
                    className="self-start bg-balkun-cyan text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-balkun-cyan-dark flex items-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    {isSubmittingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    ثبت پاسخ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}