"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, ScrollText, X, Save, KeyRound, Copy, Check } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const LOG_CATEGORIES: Record<string, string> = {
  PHONE_CALL_RECORD: "ثبت تماس تلفنی",
  TEAM_INTERNAL_TICKET: "ارجاع درون‌تیمی",
  SYSTEM_ERROR: "گزارش خطای سیستمی",
  SMS_REPORT: "گزارش پیامک/ارتباطات",
};

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

  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [showAddForm, setShowAddForm] = useState(false);

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
                <th className="px-6 py-4 w-1/3">اقدام انجام شده</th>
                <th className="px-6 py-4">تاریخ ثبت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 text-balkun-cyan animate-spin mx-auto mb-2" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-bold">لاگی یافت نشد</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-600 text-xs">
                      {LOG_CATEGORIES[log.logCategory] || log.logCategory}
                    </td>
                    <td className="px-6 py-4 font-black text-slate-800">
                      {log.subject}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600 text-xs leading-relaxed">
                      {log.actionTaken}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500" dir="ltr">
                      {new Date(log.loggedAt).toLocaleString("fa-IR")}
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