// مسیر: src/app/admin/corporate/page.tsx
// 🆕 تب کامل «سازمانی» پنل ادمین. چهار بخش:
//   ۱) درخواست‌های سازمانی (لیدهای ورودی از فرم عمومی /corporate) — مشاهده، تغییر وضعیت پیگیری، ثبت یادداشت داخلی.
//   ۲) کاربران سازمانی فعال — لیست کاربرانی که هم‌اکنون userType=ORGANIZATIONAL هستند (لینک مستقیم به صفحه مدیریت هرکدام برای کیف پول/نقش).
//   ۳) لیست سفید شماره‌های سازمانی — همان جدولی که ثبت‌نام از روی آن، به‌صورت خودکار userType کاربر را سازمانی تشخیص می‌دهد.
//      🆕 تسک ۶ چک‌لیست: علاوه بر افزودن تکی، حالا افزودن گروهی این شماره‌ها از طریق فایل CSV/Excel هم اضافه شد
//      (پارس فایل در همین صفحه در مرورگر انجام می‌شود، سپس ردیف‌ها به‌صورت یک‌جا به
//      /api/admin/corporate/numbers/bulk ارسال می‌شوند).
//   ۴) 🆕 تسک ۷ چک‌لیست کارفرما (تفکیک کیف پول سازمانی + شارژ خودکار + غیرفعال‌سازی سازمان):
//      کیف پول‌های سازمانی — مدیریت متمرکز استخر مشترک کیف پول هر سازمان: مشاهده موجودی،
//      شارژ/کسر دستی، فعال/غیرفعال‌سازی سازمان (که بلافاصله جلوی استفاده‌ی پرسنل از کیف
//      پول سازمانی را می‌گیرد)، و تنظیم/اجرای شارژ خودکار دوره‌ای.
// قبل از این فایل، هیچ‌کدام از این چهار بخش در پنل ادمین قابل مشاهده یا مدیریت نبودند.
//
// 🆕 تسک ۱۱ چک‌لیست کارفرما (افزودن نقش مدیر مالی به سیستم): نقش FINANCE_MANAGER هم
// حالا وارد این صفحه می‌شود، اما به‌طور خودکار و همیشگی فقط بخش (۴) «کیف پول‌های
// سازمانی» را می‌بیند (فقط-خواندنی — دقیقاً مثل نمای SUPPORT_AGENT غیرمدیرارشد در
// همان بخش) — نه بخش‌های (۱)، (۲) و (۳) که عملیاتی/فروش هستند، نه مالی. تب‌های
// انتخاب بخش هم برای این نقش اصلاً رندر نمی‌شوند تا رابط کاربری‌اش ساده و متمرکز
// روی همان چیزی بماند که در چک‌لیست خواسته شده («سازمان‌ها»).

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import {
  Building2, Loader2, Search, Phone, Save, X, Trash2, Plus,
  AlertTriangle, ExternalLink, ClipboardList, Users2, ListChecks,
  Upload, Download, FileSpreadsheet, CheckCircle2, XCircle,
  Wallet, Power, PowerOff, Zap, Settings2, Users, RefreshCw,
} from "lucide-react";

// ---------- انواع داده ----------
type OrgLeadStatus = "UNREAD" | "CONTACTED" | "CONTRACT_SIGNED" | "REJECTED";

interface OrgLead {
  id: string;
  companyName: string;
  contactPerson: string;
  phoneNumber: string;
  personnelCount: number;
  description: string;
  adminStatus: OrgLeadStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OrgUser {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  organizationName: string | null;
  joinedAt: string;
  isActive: boolean;
}

interface OrgNumber {
  id: string;
  phoneNumber: string;
  organizationName: string;
  createdAt: string;
}

// 🆕 تسک ۶: ساختار هر ردیفِ پارس‌شده از فایل، قبل از ارسال به سرور
interface ParsedRow {
  row: number;
  phoneNumber: string;
  organizationName: string;
  valid: boolean;
  reason?: string;
}

// 🆕 تسک ۶: ساختار نتیجه‌ی هر ردیف پس از پردازش در سرور
interface BulkRowResult {
  row: number;
  phoneNumber: string;
  organizationName: string;
  status: "inserted" | "duplicate" | "invalid";
  reason?: string;
}

// 🆕 تسک ۷: ساختار یک سازمان (کیف پول مشترک)
interface Organization {
  id: string;
  name: string;
  isActive: boolean;
  walletBalance: number;
  autoChargeEnabled: boolean;
  autoChargeAmount: number;
  autoChargeIntervalDays: number;
  lastAutoChargeAt: string | null;
  memberCount: number;
}

const STATUS_LABELS: Record<OrgLeadStatus, string> = {
  UNREAD: "خوانده‌نشده",
  CONTACTED: "تماس گرفته شد",
  CONTRACT_SIGNED: "قرارداد بسته شد",
  REJECTED: "رد شد",
};

const STATUS_STYLES: Record<OrgLeadStatus, string> = {
  UNREAD: "bg-balkun-orange/10 text-balkun-orange",
  CONTACTED: "bg-blue-50 text-blue-600",
  CONTRACT_SIGNED: "bg-green-50 text-green-600",
  REJECTED: "bg-red-50 text-red-500",
};

const DELETE_CONFIRM_WORD = "حذف";

// 🆕 تسک ۶: رجکس تایید شماره موبایل ایران، دقیقاً همان رجکسی که سمت سرور هم استفاده می‌شود
const PHONE_REGEX = /^09[0-9]{9}$/;

function formatToman(n: number): string {
  return new Intl.NumberFormat("fa-IR").format(n);
}

type Section = "leads" | "orgUsers" | "numbers" | "wallets";

export default function AdminCorporatePage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  // 🆕 تسک ۱۱ چک‌لیست کارفرما (افزودن نقش مدیر مالی به سیستم): مدیر مالی هم به این
  // صفحه راه پیدا می‌کند، اما فقط به بخش «کیف پول‌های سازمانی» — یعنی همان چیزی که
  // در متن تسک «سازمان‌ها» نامیده شده و ماهیتاً مالی/گزارشی است. سه بخش دیگر
  // (درخواست‌های سازمانی، کاربران سازمانی فعال، لیست سفید شماره‌ها) عملیاتی/فروش
  // هستند و از قبل هم در بک‌اند (src/lib/auth/adminAuth.ts → requireAdminTabAccess)
  // برای این نقش مسدودند؛ پس این‌جا صرفاً هدایت پیش‌فرض و پنهان‌کردن تب‌های غیرقابل
  // دسترسی است، نه خودِ خط دفاعی امنیتی (که همچنان سمت سرور است).
  const isFinanceManager = user?.role === "FINANCE_MANAGER";
  const [section, setSection] = useState<Section>(isFinanceManager ? "wallets" : "leads");

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-black text-balkun-navy flex items-center gap-2">
          <Building2 className="w-6 h-6 text-balkun-orange" />
          مرکز مدیریت سازمانی
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          {isFinanceManager
            ? "کیف‌پول‌های مشترک سازمانی بالکن، فقط‌خواندنی."
            : "تمام درخواست‌ها، کاربران، شماره‌ها و کیف‌پول‌های سازمانی بالکن، یکجا و متمرکز."}
        </p>
      </div>

      {/* تب‌های داخلی — برای مدیر مالی فقط «کیف پول‌های سازمانی» نمایش داده می‌شود */}
      {!isFinanceManager && (
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm w-fit overflow-x-auto">
          <SectionTab active={section === "leads"} onClick={() => setSection("leads")} icon={ClipboardList} label="درخواست‌های سازمانی" />
          <SectionTab active={section === "orgUsers"} onClick={() => setSection("orgUsers")} icon={Users2} label="کاربران سازمانی فعال" />
          <SectionTab active={section === "numbers"} onClick={() => setSection("numbers")} icon={ListChecks} label="لیست سفید شماره‌ها" />
          <SectionTab active={section === "wallets"} onClick={() => setSection("wallets")} icon={Wallet} label="کیف پول‌های سازمانی" />
        </div>
      )}

      {section === "leads" && <LeadsSection />}
      {section === "orgUsers" && <OrgUsersSection />}
      {section === "numbers" && <NumbersSection />}
      {section === "wallets" && <WalletsSection isSuperAdmin={isSuperAdmin} />}
    </div>
  );
}

function SectionTab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${
        active ? "bg-balkun-navy text-white" : "text-slate-500 hover:bg-slate-50"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function Toast({ message }: { message: { text: string; type: string } }) {
  if (!message.text) return null;
  return (
    <div className={`p-4 rounded-xl font-bold text-sm ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
      {message.text}
    </div>
  );
}

// ============================================================
// بخش ۱: درخواست‌های سازمانی (لیدها)
// ============================================================
function LeadsSection() {
  const [leads, setLeads] = useState<OrgLead[]>([]);
  const [counts, setCounts] = useState<Record<OrgLeadStatus, number>>({ UNREAD: 0, CONTACTED: 0, CONTRACT_SIGNED: 0, REJECTED: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [activeLead, setActiveLead] = useState<OrgLead | null>(null);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        ...(status && { status }),
        ...(search && { search }),
      });
      const res = await fetch(`/api/admin/corporate/leads?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads || []);
        setCounts(data.counts);
        setTotal(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, search]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  const handleSaved = (updated: OrgLead) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setActiveLead(null);
    showMessage("درخواست سازمانی با موفقیت بروزرسانی شد", "success");
    fetchLeads(); // برای بروزرسانی شمارش‌های بالای صفحه
  };

  return (
    <div className="flex flex-col gap-6">
      <Toast message={message} />

      {/* کارت‌های شمارش وضعیت */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.keys(STATUS_LABELS) as OrgLeadStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(status === s ? "" : s); setPage(1); }}
            className={`text-right p-4 rounded-2xl border transition-all ${
              status === s ? "border-balkun-cyan bg-balkun-cyan/5" : "border-slate-100 bg-white hover:border-slate-200"
            }`}
          >
            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold mb-2 ${STATUS_STYLES[s]}`}>{STATUS_LABELS[s]}</span>
            <span className="block text-2xl font-black text-slate-800">{counts[s]}</span>
          </button>
        ))}
      </div>

      <div className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative w-full md:col-span-2">
          <input
            type="text"
            placeholder="جستجو بر اساس نام شرکت، نام رابط یا شماره موبایل..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm font-medium focus:outline-none focus:border-balkun-cyan"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:outline-none focus:border-balkun-cyan"
        >
          <option value="">همه وضعیت‌ها</option>
          {(Object.keys(STATUS_LABELS) as OrgLeadStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">شرکت / سازمان</th>
                <th className="px-6 py-4">نام رابط و تماس</th>
                <th className="px-6 py-4">تعداد پرسنل</th>
                <th className="px-6 py-4">وضعیت</th>
                <th className="px-6 py-4">تاریخ ثبت</th>
                <th className="px-6 py-4">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && leads.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 text-balkun-cyan animate-spin mx-auto mb-2" /><span className="text-slate-500 font-bold">در حال دریافت درخواست‌ها...</span></td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-bold">درخواستی یافت نشد</td></tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{lead.companyName}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{lead.contactPerson}</span>
                        <a href={`tel:${lead.phoneNumber}`} className="text-xs text-balkun-cyan flex items-center gap-1 hover:underline" dir="ltr">
                          <Phone className="w-3 h-3" />{lead.phoneNumber}
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{lead.personnelCount || "-"} نفر</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${STATUS_STYLES[lead.adminStatus]}`}>{STATUS_LABELS[lead.adminStatus]}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{new Date(lead.createdAt).toLocaleDateString("fa-IR")}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setActiveLead(lead)}
                        className="inline-flex items-center gap-1.5 bg-balkun-cyan/10 hover:bg-balkun-cyan text-balkun-cyan hover:text-white px-3 py-1.5 rounded-lg transition-colors font-bold text-xs"
                      >
                        مشاهده و مدیریت
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">صفحه {page} از {Math.ceil(total / 20) || 1}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-100">قبلی</button>
            <button disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-100">بعدی</button>
          </div>
        </div>
      </div>

      {activeLead && <LeadModal lead={activeLead} onClose={() => setActiveLead(null)} onSaved={handleSaved} />}
    </div>
  );
}

function LeadModal({ lead, onClose, onSaved }: { lead: OrgLead; onClose: () => void; onSaved: (l: OrgLead) => void }) {
  const [adminStatus, setAdminStatus] = useState<OrgLeadStatus>(lead.adminStatus);
  const [adminNote, setAdminNote] = useState(lead.adminNote || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/corporate/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminStatus, adminNote }),
      });
      const data = await res.json();
      if (data.success) onSaved(data.lead);
      else setError(data.error || "خطا در ذخیره تغییرات");
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50" onClick={() => !isSaving && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-black text-lg text-balkun-navy">{lead.companyName}</h3>
          <button onClick={() => !isSaving && onClose()} className="p-1.5 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-400">نام رابط</span>
            <span className="font-bold text-slate-700">{lead.contactPerson}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-400">شماره تماس</span>
            <a href={`tel:${lead.phoneNumber}`} className="font-bold text-balkun-cyan hover:underline" dir="ltr">{lead.phoneNumber}</a>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-400">تعداد پرسنل</span>
            <span className="font-bold text-slate-700">{lead.personnelCount || "-"} نفر</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-400">تاریخ ثبت</span>
            <span className="font-bold text-slate-700">{new Date(lead.createdAt).toLocaleDateString("fa-IR")}</span>
          </div>
        </div>

        {lead.description && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-400">توضیحات و نیازمندی‌های ثبت‌شده توسط سازمان</span>
            <p className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600 leading-relaxed">{lead.description}</p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500">وضعیت پیگیری</label>
          <select
            value={adminStatus}
            onChange={(e) => setAdminStatus(e.target.value as OrgLeadStatus)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:outline-none focus:border-balkun-cyan"
          >
            {(Object.keys(STATUS_LABELS) as OrgLeadStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500">یادداشت داخلی تیم بالکن (فقط برای ادمین‌ها قابل مشاهده است)</label>
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            rows={3}
            placeholder="مثلاً: تماس گرفته شد، منتظر تایید بودجه از سمت مشتری..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium focus:outline-none focus:border-balkun-cyan resize-none"
          />
        </div>

        {error && <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl">{error}</div>}

        <div className="flex gap-3 mt-2">
          <button onClick={onClose} disabled={isSaving} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-50">انصراف</button>
          <button onClick={handleSave} disabled={isSaving} className="flex-1 py-2.5 rounded-xl bg-balkun-navy text-white font-bold text-sm hover:bg-balkun-navy-dark disabled:opacity-50 flex items-center justify-center gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> ذخیره تغییرات</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// بخش ۲: کاربران سازمانی فعال
// ============================================================
// 🔧 رفع تسک ۲۳ (فعال نشدن تیک سازمانی برای پشتیبان):
// قبلاً این بخش با یک شرط هاردکدشده (`if (!isSuperAdmin)`) فقط برای SUPER_ADMIN باز می‌شد؛
// یعنی حتی اگر سوپرادمین تیک «سازمانی» (تب corporate) را برای یک پشتیبان (SUPPORT_AGENT)
// فعال می‌کرد، این بخش خاص از تب سازمانی همچنان برای او قفل می‌ماند — چون این کامپوننت
// اصلاً پرس‌وجویی به سرور نمی‌فرستاد و بدون تماس با API، خودش پیام «دسترسی غیرمجاز» نشان می‌داد.
// در نتیجه هیچ تغییری در دسترسی‌های سرور هم نمی‌توانست این قفل کور سمت کلاینت را باز کند.
// راه‌حل: این قفل صرفاً UI حذف شد؛ حالا همیشه درخواست واقعی به سرور ارسال می‌شود و تصمیم نهایی
// دسترسی (که الان در src/app/api/admin/users/route.ts هم اصلاح شده تا به SUPPORT_AGENT دارای
// دسترسی تب «سازمانی» فقط برای userType=ORGANIZATIONAL اجازه بدهد) به‌درستی سمت سرور گرفته می‌شود.
function OrgUsersSection() {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({ page: page.toString(), userType: "ORGANIZATIONAL", ...(search && { search }) });
      const res = await fetch(`/api/admin/users?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAccessDenied(false);
        setUsers(data.users || []);
        setTotal(data.pagination.total || 0);
      } else {
        setAccessDenied(res.status === 403);
      }
    } catch (error) {
      console.error("Error fetching organizational users:", error);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  if (accessDenied) {
    return (
      <div className="p-6 rounded-2xl bg-orange-50 text-orange-700 font-bold text-sm flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        شما دسترسی لازم برای مشاهده‌ی لیست کاربران سازمانی را ندارید. اگر پشتیبان هستید، از مدیر ارشد بخواهید دسترسی تب «سازمانی» را برایتان فعال کند.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="جستجو بر اساس نام یا شماره موبایل..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm font-medium focus:outline-none focus:border-balkun-cyan"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">نام سازمان</th>
                <th className="px-6 py-4">نام کاربر</th>
                <th className="px-6 py-4">شماره موبایل</th>
                <th className="px-6 py-4">تاریخ عضویت</th>
                <th className="px-6 py-4">وضعیت</th>
                <th className="px-6 py-4">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && users.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 text-balkun-cyan animate-spin mx-auto mb-2" /><span className="text-slate-500 font-bold">در حال دریافت کاربران سازمانی...</span></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-bold">هیچ کاربر سازمانی‌ای یافت نشد</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-balkun-orange">{u.organizationName || "-"}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{u.firstName} {u.lastName}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium" dir="ltr">{u.phoneNumber}</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{new Date(u.joinedAt).toLocaleDateString("fa-IR")}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${u.isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                        {u.isActive ? "فعال" : "غیرفعال"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="inline-flex items-center gap-1.5 bg-balkun-cyan/10 hover:bg-balkun-cyan text-balkun-cyan hover:text-white px-3 py-1.5 rounded-lg transition-colors font-bold text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        مدیریت کیف‌پول و حساب
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">صفحه {page} از {Math.ceil(total / 20) || 1} (مجموع {total} کاربر سازمانی)</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-100">قبلی</button>
            <button disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-100">بعدی</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// بخش ۳: لیست سفید شماره‌های سازمانی
// ============================================================
function NumbersSection() {
  const [numbers, setNumbers] = useState<OrgNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [newPhone, setNewPhone] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<OrgNumber | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchNumbers = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({ page: page.toString(), ...(search && { search }) });
      const res = await fetch(`/api/admin/corporate/numbers?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setNumbers(data.numbers || []);
        setTotal(data.pagination.total || 0);
      }
    } catch (error) {
      console.error("Error fetching organizational numbers:", error);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  useEffect(() => { fetchNumbers(); }, [fetchNumbers]);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      const res = await fetch("/api/admin/corporate/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: newPhone.trim(), organizationName: newOrgName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage("شماره سازمانی با موفقیت افزوده شد", "success");
        setNewPhone("");
        setNewOrgName("");
        setPage(1);
        fetchNumbers();
      } else {
        showMessage(data.error || "خطا در افزودن شماره", "error");
      }
    } catch {
      showMessage("خطا در ارتباط با سرور", "error");
    } finally {
      setIsAdding(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteTarget || deleteConfirmInput.trim() !== DELETE_CONFIRM_WORD) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/corporate/numbers/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showMessage("شماره سازمانی حذف شد", "success");
        setNumbers((prev) => prev.filter((n) => n.id !== deleteTarget.id));
        setTotal((prev) => Math.max(0, prev - 1));
        setDeleteTarget(null);
      } else {
        showMessage(data.error || "خطا در حذف شماره", "error");
      }
    } catch {
      showMessage("خطا در ارتباط با سرور", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Toast message={message} />

      <div className="bg-white p-6 border border-slate-100 rounded-2xl shadow-sm">
        <h3 className="font-black text-balkun-navy mb-1">افزودن شماره جدید به لیست سفید سازمانی</h3>
        <p className="text-xs font-medium text-slate-500 mb-4">
          هر شماره موبایلی که اینجا اضافه شود، در لحظه‌ی ثبت‌نام در سایت، به‌طور خودکار با نوع حساب «سازمانی» و نام سازمان زیر شناسایی می‌شود.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
          <input
            type="text"
            dir="ltr"
            placeholder="09123456789"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:outline-none focus:border-balkun-cyan text-right placeholder:text-right"
          />
          <input
            type="text"
            placeholder="نام سازمان"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:outline-none focus:border-balkun-cyan"
          />
          <button
            onClick={handleAdd}
            disabled={isAdding || !newPhone.trim() || !newOrgName.trim()}
            className="bg-balkun-navy text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-balkun-navy-dark disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> افزودن</>}
          </button>
        </div>
      </div>

      {/* 🆕 تسک ۶: افزودن گروهی شماره‌های سازمانی از طریق فایل CSV/Excel */}
      <BulkImportPanel onImported={() => { setPage(1); fetchNumbers(); showMessage("لیست سفید سازمانی بروزرسانی شد", "success"); }} />

      <div className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="جستجو بر اساس شماره موبایل یا نام سازمان..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm font-medium focus:outline-none focus:border-balkun-cyan"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">شماره موبایل</th>
                <th className="px-6 py-4">نام سازمان</th>
                <th className="px-6 py-4">تاریخ افزودن</th>
                <th className="px-6 py-4">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && numbers.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 text-balkun-cyan animate-spin mx-auto mb-2" /><span className="text-slate-500 font-bold">در حال دریافت لیست...</span></td></tr>
              ) : numbers.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-bold">شماره‌ای در لیست سفید ثبت نشده</td></tr>
              ) : (
                numbers.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800" dir="ltr">{n.phoneNumber}</td>
                    <td className="px-6 py-4 font-bold text-balkun-orange">{n.organizationName}</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{new Date(n.createdAt).toLocaleDateString("fa-IR")}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => { setDeleteConfirmInput(""); setDeleteTarget(n); }}
                        className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white px-3 py-1.5 rounded-lg transition-colors font-bold text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">صفحه {page} از {Math.ceil(total / 20) || 1}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-100">قبلی</button>
            <button disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-100">بعدی</button>
          </div>
        </div>
      </div>

      {/* مودال حذف شماره سازمانی */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50" onClick={() => !isDeleting && setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> حذف شماره سازمانی
              </h3>
              <button onClick={() => !isDeleting && setDeleteTarget(null)} className="p-1.5 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-red-50 text-red-700 text-sm font-bold p-3 rounded-xl">
              شماره «{deleteTarget.phoneNumber}» ({deleteTarget.organizationName}) از لیست سفید حذف می‌شود. کاربرانی که قبلاً با این شماره ثبت‌نام کرده‌اند تغییری نمی‌کنند؛ این فقط جلوی تشخیص خودکار ثبت‌نام‌های آینده را می‌گیرد.
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500">برای تایید، عبارت «{DELETE_CONFIRM_WORD}» را دقیقاً در کادر زیر تایپ کنید</label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder={DELETE_CONFIRM_WORD}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-red-400"
              />
            </div>

            <div className="flex gap-3 mt-2">
              <button onClick={() => setDeleteTarget(null)} disabled={isDeleting} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-50">انصراف</button>
              <button
                onClick={submitDelete}
                disabled={isDeleting || deleteConfirmInput.trim() !== DELETE_CONFIRM_WORD}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "حذف برای همیشه"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 🆕 تسک ۶: پنل افزودن گروهی شماره‌های سازمانی از طریق فایل CSV/Excel
// ============================================================
// نحوه‌ی کار: فایل CSV باید دو ستون داشته باشد: phoneNumber و organizationName
// (سطر اول می‌تواند هدر باشد یا نباشد، هر دو حالت تشخیص داده می‌شود).
// فایل کاملاً در مرورگر پارس می‌شود (بدون نیاز به کتابخانه‌ی جدید)؛ سپس
// پیش‌نمایش ردیف‌های معتبر/نامعتبر به ادمین نشان داده می‌شود و فقط با تایید
// ادمین، ردیف‌های معتبر یک‌جا به سرور (/api/admin/corporate/numbers/bulk)
// ارسال و در جدول organizational_numbers درج می‌شوند.
function BulkImportPanel({ onImported }: { onImported: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultSummary, setResultSummary] = useState<{ total: number; inserted: number; duplicate: number; invalid: number } | null>(null);
  const [resultRows, setResultRows] = useState<BulkRowResult[]>([]);

  const downloadTemplate = () => {
    // BOM (\uFEFF) برای این‌که اکسل فارسی را درست (بدون کاراکترهای درهم) نمایش دهد
    const csvContent = "\uFEFFphoneNumber,organizationName\n09123456789,شرکت نمونه بالکن\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "organizational-numbers-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // یک خط CSV را با در نظر گرفتن مقادیر داخل گیومه (") به‌درستی جدا می‌کند
  const splitCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let insideQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if ((char === "," || char === ";") && !insideQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileSelect = (file: File) => {
    setParseError("");
    setResultSummary(null);
    setResultRows([]);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || "";
      // پشتیبانی از هر دو حالت جداکننده خط (\n و \r\n)
      const lines = text.split(/\r\n|\n/).map((l) => l.trim()).filter((l) => l.length > 0);

      if (lines.length === 0) {
        setParseError("فایل خالی است یا قابل خواندن نیست");
        return;
      }

      // تشخیص خودکار سطر هدر: اگر ستون اول سطر اول یک شماره موبایل معتبر نیست، همان سطر هدر است
      const firstCells = splitCsvLine(lines[0]);
      const firstLooksLikePhone = PHONE_REGEX.test((firstCells[0] || "").trim());
      const dataLines = firstLooksLikePhone ? lines : lines.slice(1);

      if (dataLines.length === 0) {
        setParseError("هیچ ردیف داده‌ای بعد از سطر هدر یافت نشد");
        return;
      }

      const rows: ParsedRow[] = dataLines.map((line, idx) => {
        const cells = splitCsvLine(line);
        const phoneNumber = (cells[0] || "").trim();
        const organizationName = (cells[1] || "").trim();
        let valid = true;
        let reason = "";
        if (!PHONE_REGEX.test(phoneNumber)) { valid = false; reason = "شماره موبایل معتبر نیست"; }
        else if (!organizationName || organizationName.length < 2) { valid = false; reason = "نام سازمان الزامی است"; }
        return { row: idx + 1, phoneNumber, organizationName, valid, reason };
      });

      setParsedRows(rows);
    };
    reader.onerror = () => setParseError("خطا در خواندن فایل");
    reader.readAsText(file, "UTF-8");
  };

  const validRows = parsedRows.filter((r) => r.valid);
  const invalidRows = parsedRows.filter((r) => !r.valid);

  const handleSubmit = async () => {
    if (validRows.length === 0) return;
    setIsSubmitting(true);
    setResultSummary(null);
    setResultRows([]);
    try {
      const res = await fetch("/api/admin/corporate/numbers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: validRows.map((r) => ({ phoneNumber: r.phoneNumber, organizationName: r.organizationName })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResultSummary(data.summary);
        setResultRows(data.results || []);
        setParsedRows([]);
        setFileName("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        onImported();
      } else {
        setParseError(data.error || "خطا در ارسال فایل به سرور");
      }
    } catch {
      setParseError("خطا در ارتباط با سرور");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setParsedRows([]);
    setFileName("");
    setParseError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="bg-white p-6 border border-slate-100 rounded-2xl shadow-sm flex flex-col gap-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-black text-balkun-navy mb-1 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-balkun-orange" />
            افزودن گروهی از طریق فایل (CSV / اکسل)
          </h3>
          <p className="text-xs font-medium text-slate-500">
            فایل باید دو ستون داشته باشد: شماره موبایل و نام سازمان. اگر با اکسل کار می‌کنید، فایل را با فرمت CSV ذخیره کنید (Save As → CSV).
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-bold text-xs shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          دانلود فایل نمونه CSV
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
          className="hidden"
          id="bulk-org-numbers-file"
        />
        <label
          htmlFor="bulk-org-numbers-file"
          className="inline-flex items-center gap-2 bg-balkun-navy text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-balkun-navy-dark cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          انتخاب فایل CSV
        </label>
        {fileName && <span className="text-xs font-bold text-slate-500">{fileName}</span>}
      </div>

      {parseError && (
        <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" /> {parseError}
        </div>
      )}

      {parsedRows.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4 flex-wrap text-xs font-bold">
            <span className="text-slate-600">مجموع ردیف‌های خوانده‌شده: {parsedRows.length}</span>
            <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> معتبر: {validRows.length}</span>
            {invalidRows.length > 0 && (
              <span className="text-red-500 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> نامعتبر: {invalidRows.length}</span>
            )}
          </div>

          <div className="border border-slate-100 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0">
                <tr>
                  <th className="px-4 py-2">ردیف</th>
                  <th className="px-4 py-2">شماره موبایل</th>
                  <th className="px-4 py-2">نام سازمان</th>
                  <th className="px-4 py-2">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedRows.map((r) => (
                  <tr key={r.row} className={r.valid ? "" : "bg-red-50/50"}>
                    <td className="px-4 py-2 font-bold text-slate-500">{r.row}</td>
                    <td className="px-4 py-2 font-bold" dir="ltr">{r.phoneNumber || "-"}</td>
                    <td className="px-4 py-2 font-bold text-balkun-orange">{r.organizationName || "-"}</td>
                    <td className="px-4 py-2">
                      {r.valid ? (
                        <span className="text-green-600 font-bold">معتبر</span>
                      ) : (
                        <span className="text-red-500 font-bold">{r.reason}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              انصراف
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || validRows.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-balkun-navy text-white font-bold text-sm hover:bg-balkun-navy-dark disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `افزودن ${validRows.length} شماره معتبر`}
            </button>
          </div>
        </div>
      )}

      {resultSummary && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex flex-col gap-2">
          <p className="text-sm font-black text-green-700">
            نتیجه‌ی آپلود: از مجموع {resultSummary.total} ردیف، {resultSummary.inserted} شماره با موفقیت افزوده شد.
          </p>
          {(resultSummary.duplicate > 0 || resultSummary.invalid > 0) && (
            <p className="text-xs font-bold text-slate-600">
              {resultSummary.duplicate > 0 && <>«{resultSummary.duplicate}» ردیف تکراری بود (قبلاً در لیست بود). </>}
              {resultSummary.invalid > 0 && <>«{resultSummary.invalid}» ردیف نامعتبر رد شد.</>}
            </p>
          )}
          {resultRows.some((r) => r.status !== "inserted") && (
            <details className="text-xs font-medium text-slate-500">
              <summary className="cursor-pointer font-bold text-slate-600">مشاهده جزئیات ردیف‌های رد‌شده</summary>
              <ul className="mt-2 flex flex-col gap-1">
                {resultRows.filter((r) => r.status !== "inserted").map((r) => (
                  <li key={r.row} dir="ltr" className="text-right">
                    ردیف {r.row} — {r.phoneNumber}: {r.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 🆕 تسک ۷ چک‌لیست کارفرما: بخش ۴ — کیف پول‌های سازمانی
// ============================================================
// این بخش برای هر سازمان: موجودی مشترک، تعداد پرسنل، وضعیت فعال/غیرفعال و تنظیمات
// شارژ خودکار را نشان می‌دهد. عملیات نوشتنی (شارژ/کسر دستی، فعال/غیرفعال‌سازی، ذخیره‌ی
// تنظیمات شارژ خودکار) فقط برای مدیر ارشد (SUPER_ADMIN) فعال است؛ مدیر مالی (اگر به این
// صفحه دسترسی داشته باشد) فقط می‌تواند مشاهده کند.
function WalletsSection({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isRunningAutoCharge, setIsRunningAutoCharge] = useState(false);

  const [chargeTarget, setChargeTarget] = useState<Organization | null>(null);
  const [settingsTarget, setSettingsTarget] = useState<Organization | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Organization | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const fetchOrganizations = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({ ...(search && { search }) });
      const res = await fetch(`/api/admin/corporate/organizations?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setOrganizations(data.organizations || []);
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => { fetchOrganizations(); }, [fetchOrganizations]);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  const handleToggleActive = async () => {
    if (!toggleTarget) return;
    setIsToggling(true);
    try {
      const res = await fetch(`/api/admin/corporate/organizations/${toggleTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !toggleTarget.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage(!toggleTarget.isActive ? "سازمان فعال شد" : "سازمان غیرفعال شد؛ پرسنل دیگر نمی‌توانند از کیف پول سازمانی استفاده کنند", "success");
        setToggleTarget(null);
        fetchOrganizations();
      } else {
        showMessage(data.error || "خطا در تغییر وضعیت سازمان", "error");
      }
    } catch {
      showMessage("خطا در ارتباط با سرور", "error");
    } finally {
      setIsToggling(false);
    }
  };

  const handleRunAutoCharge = async () => {
    setIsRunningAutoCharge(true);
    try {
      const res = await fetch("/api/admin/corporate/organizations/auto-charge", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showMessage(`اجرای شارژ خودکار انجام شد: ${data.chargedCount} سازمان شارژ شد`, "success");
        fetchOrganizations();
      } else {
        showMessage(data.error || "خطا در اجرای شارژ خودکار", "error");
      }
    } catch {
      showMessage("خطا در ارتباط با سرور", "error");
    } finally {
      setIsRunningAutoCharge(false);
    }
  };

  // 🆕 تسک ۱۱ چک‌لیست کارفرما: این تب برای FINANCE_MANAGER هم باز است (فقط-خواندنی)؛
  // برخلاف نسخه‌های قبلی این کامپوننت، دیگر هیچ شرط مسدودکننده‌ای بر اساس نقش در
  // همین‌جا وجود ندارد — تمام محدودیت‌ها با isSuperAdmin پایین همین تابع (که برای
  // FINANCE_MANAGER هم false است) و در سطح Route Handler اعمال می‌شوند.

  return (
    <div className="flex flex-col gap-6">
      <Toast message={message} />

      <div className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="relative w-full md:max-w-sm">
          <input
            type="text"
            placeholder="جستجو بر اساس نام سازمان..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm font-medium focus:outline-none focus:border-balkun-cyan"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
        </div>
        {isSuperAdmin && (
          <button
            onClick={handleRunAutoCharge}
            disabled={isRunningAutoCharge}
            className="inline-flex items-center justify-center gap-2 bg-balkun-cyan/10 hover:bg-balkun-cyan text-balkun-cyan hover:text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 shrink-0"
          >
            {isRunningAutoCharge ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            اجرای شارژ خودکار الان
          </button>
        )}
      </div>

      {!isSuperAdmin && (
        <div className="p-4 rounded-2xl bg-blue-50 text-blue-700 font-bold text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          شما فقط می‌توانید کیف پول‌های سازمانی را مشاهده کنید؛ شارژ/کسر دستی، فعال/غیرفعال‌سازی و تنظیم شارژ خودکار فقط برای مدیر ارشد (SUPER_ADMIN) فعال است.
        </div>
      )}

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">سازمان</th>
                <th className="px-6 py-4">تعداد پرسنل</th>
                <th className="px-6 py-4">موجودی مشترک</th>
                <th className="px-6 py-4">شارژ خودکار</th>
                <th className="px-6 py-4">وضعیت</th>
                <th className="px-6 py-4">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && organizations.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 text-balkun-cyan animate-spin mx-auto mb-2" /><span className="text-slate-500 font-bold">در حال دریافت سازمان‌ها...</span></td></tr>
              ) : organizations.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-bold">هیچ سازمانی ثبت نشده است</td></tr>
              ) : (
                organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{org.name}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" /> {org.memberCount} نفر
                    </td>
                    <td className="px-6 py-4 font-black text-balkun-navy" dir="ltr">
                      {formatToman(org.walletBalance)} <span className="text-[10px] font-normal text-slate-400">تومان</span>
                    </td>
                    <td className="px-6 py-4">
                      {org.autoChargeEnabled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md bg-balkun-cyan/10 text-balkun-cyan">
                          <Zap className="w-3 h-3" /> هر {org.autoChargeIntervalDays} روز، {formatToman(org.autoChargeAmount)} تومان
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400">غیرفعال</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${org.isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                        {org.isActive ? "فعال" : "غیرفعال"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isSuperAdmin ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => setChargeTarget(org)}
                            className="inline-flex items-center gap-1.5 bg-balkun-cyan/10 hover:bg-balkun-cyan text-balkun-cyan hover:text-white px-3 py-1.5 rounded-lg transition-colors font-bold text-xs"
                          >
                            <Wallet className="w-3.5 h-3.5" /> شارژ/کسر
                          </button>
                          <button
                            onClick={() => setSettingsTarget(org)}
                            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition-colors font-bold text-xs"
                          >
                            <Settings2 className="w-3.5 h-3.5" /> شارژ خودکار
                          </button>
                          <button
                            onClick={() => setToggleTarget(org)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-bold text-xs ${
                              org.isActive ? "bg-red-50 hover:bg-red-500 text-red-500 hover:text-white" : "bg-green-50 hover:bg-green-600 text-green-600 hover:text-white"
                            }`}
                          >
                            {org.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                            {org.isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-bold">فقط مشاهده</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {chargeTarget && (
        <OrgChargeModal
          organization={chargeTarget}
          onClose={() => setChargeTarget(null)}
          onSuccess={() => { setChargeTarget(null); fetchOrganizations(); showMessage("موجودی سازمان بروزرسانی شد", "success"); }}
        />
      )}

      {settingsTarget && (
        <OrgAutoChargeModal
          organization={settingsTarget}
          onClose={() => setSettingsTarget(null)}
          onSuccess={() => { setSettingsTarget(null); fetchOrganizations(); showMessage("تنظیمات شارژ خودکار ذخیره شد", "success"); }}
        />
      )}

      {toggleTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50" onClick={() => !isToggling && setToggleTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className={`font-black text-lg flex items-center gap-2 ${toggleTarget.isActive ? "text-red-600" : "text-green-600"}`}>
                {toggleTarget.isActive ? <PowerOff className="w-5 h-5" /> : <Power className="w-5 h-5" />}
                {toggleTarget.isActive ? "غیرفعال‌سازی سازمان" : "فعال‌سازی سازمان"}
              </h3>
              <button onClick={() => !isToggling && setToggleTarget(null)} className="p-1.5 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className={`text-sm font-bold p-3 rounded-xl ${toggleTarget.isActive ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
              {toggleTarget.isActive
                ? `با غیرفعال‌سازی «${toggleTarget.name}»، تمام ${toggleTarget.memberCount} پرسنل این سازمان فوراً دیگر نمی‌توانند از کیف پول سازمانی برای پرداخت رزرو استفاده کنند. موجودی سازمان حفظ می‌شود و با فعال‌سازی مجدد بلافاصله در دسترس خواهد بود.`
                : `با فعال‌سازی «${toggleTarget.name}»، پرسنل این سازمان دوباره می‌توانند از کیف پول مشترک سازمانی (موجودی فعلی: ${formatToman(toggleTarget.walletBalance)} تومان) برای پرداخت رزرو استفاده کنند.`}
            </div>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setToggleTarget(null)} disabled={isToggling} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-50">انصراف</button>
              <button
                onClick={handleToggleActive}
                disabled={isToggling}
                className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 ${
                  toggleTarget.isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {isToggling ? <Loader2 className="w-4 h-4 animate-spin" /> : toggleTarget.isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// مودال شارژ/کسر دستی کیف پول مشترک یک سازمان
function OrgChargeModal({ organization, onClose, onSuccess }: { organization: Organization; onClose: () => void; onSuccess: () => void }) {
  const [direction, setDirection] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!amount || Number(amount) <= 0) { setError("مبلغ باید عددی مثبت باشد"); return; }
    if (!reason.trim() || reason.trim().length < 5) { setError("درج دلیل الزامی است (حداقل ۵ کاراکتر)"); return; }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/corporate/organizations/${organization.id}/charge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, amount: Number(amount), reason: reason.trim() }),
      });
      const data = await res.json();
      if (data.success) onSuccess();
      else setError(data.error || "خطا در ثبت تراکنش");
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50" onClick={() => !isSaving && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-black text-lg text-balkun-navy flex items-center gap-2">
            <Wallet className="w-5 h-5 text-balkun-cyan" /> شارژ/کسر کیف پول سازمان «{organization.name}»
          </h3>
          <button onClick={() => !isSaving && onClose()} className="p-1.5 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <p className="text-xs font-bold text-slate-500">
          موجودی فعلی: <span className="text-balkun-navy">{formatToman(organization.walletBalance)} تومان</span> — این تغییر روی کیف پول مشترک، یعنی برای تمام {organization.memberCount} پرسنل این سازمان اعمال می‌شود.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setDirection("DEPOSIT")}
            className={`py-2.5 rounded-xl font-bold text-sm border transition-colors ${direction === "DEPOSIT" ? "bg-green-600 border-green-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            شارژ (افزایش)
          </button>
          <button
            onClick={() => setDirection("WITHDRAWAL")}
            className={`py-2.5 rounded-xl font-bold text-sm border transition-colors ${direction === "WITHDRAWAL" ? "bg-red-600 border-red-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            کسر (کاهش)
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500">مبلغ (تومان)</label>
          <input
            type="text"
            inputMode="numeric"
            dir="ltr"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            placeholder="مثال: 5000000"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-left font-black text-balkun-navy outline-none focus:border-balkun-cyan"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500">دلیل این تغییر دستی (الزامی)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="مثلاً: شارژ ماهانه طبق قرارداد، یا اصلاح خطای شارژ قبلی..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-balkun-cyan resize-none"
          />
        </div>

        {error && <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl">{error}</div>}

        <div className="flex gap-3 mt-2">
          <button onClick={onClose} disabled={isSaving} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-50">انصراف</button>
          <button onClick={handleSubmit} disabled={isSaving} className="flex-1 py-2.5 rounded-xl bg-balkun-navy text-white font-bold text-sm hover:bg-balkun-navy-dark disabled:opacity-50 flex items-center justify-center gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> ثبت تغییر</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// مودال تنظیمات شارژ خودکار یک سازمان
function OrgAutoChargeModal({ organization, onClose, onSuccess }: { organization: Organization; onClose: () => void; onSuccess: () => void }) {
  const [enabled, setEnabled] = useState(organization.autoChargeEnabled);
  const [amount, setAmount] = useState(String(organization.autoChargeAmount || ""));
  const [intervalDays, setIntervalDays] = useState(String(organization.autoChargeIntervalDays || 30));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (enabled && (!amount || Number(amount) <= 0)) { setError("برای فعال‌سازی شارژ خودکار، مبلغ باید عددی مثبت باشد"); return; }
    if (!intervalDays || Number(intervalDays) < 1) { setError("بازه‌ی زمانی باید حداقل ۱ روز باشد"); return; }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/corporate/organizations/${organization.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoChargeEnabled: enabled,
          autoChargeAmount: Number(amount) || 0,
          autoChargeIntervalDays: Number(intervalDays),
        }),
      });
      const data = await res.json();
      if (data.success) onSuccess();
      else setError(data.error || "خطا در ذخیره تنظیمات");
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50" onClick={() => !isSaving && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-black text-lg text-balkun-navy flex items-center gap-2">
            <Zap className="w-5 h-5 text-balkun-orange" /> شارژ خودکار سازمان «{organization.name}»
          </h3>
          <button onClick={() => !isSaving && onClose()} className="p-1.5 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <button
          onClick={() => setEnabled((v) => !v)}
          className={`flex items-center justify-between p-3 rounded-xl border font-bold text-sm transition-colors ${
            enabled ? "border-balkun-cyan bg-balkun-cyan/5 text-balkun-cyan" : "border-slate-200 text-slate-500"
          }`}
        >
          شارژ خودکار دوره‌ای برای این سازمان
          <span className={`w-10 h-6 rounded-full relative transition-colors ${enabled ? "bg-balkun-cyan" : "bg-slate-300"}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${enabled ? "right-0.5" : "right-4"}`} />
          </span>
        </button>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500">مبلغ هر بار شارژ (تومان)</label>
          <input
            type="text"
            inputMode="numeric"
            dir="ltr"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            placeholder="مثال: 10000000"
            disabled={!enabled}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-left font-black text-balkun-navy outline-none focus:border-balkun-cyan disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500">فاصله‌ی زمانی بین دو شارژ (روز)</label>
          <input
            type="text"
            inputMode="numeric"
            dir="ltr"
            value={intervalDays}
            onChange={(e) => setIntervalDays(e.target.value.replace(/\D/g, ""))}
            placeholder="مثال: 30"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-left font-black text-balkun-navy outline-none focus:border-balkun-cyan"
          />
        </div>

        {organization.autoChargeEnabled && (
          <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3" />
            برای اجرای واقعی شارژ خودکار (طبق این بازه)، از دکمه‌ی «اجرای شارژ خودکار الان» در بالای همین صفحه استفاده کنید، یا آن را روی یک Cron روزانه زمان‌بندی کنید.
          </p>
        )}

        {error && <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl">{error}</div>}

        <div className="flex gap-3 mt-2">
          <button onClick={onClose} disabled={isSaving} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-50">انصراف</button>
          <button onClick={handleSubmit} disabled={isSaving} className="flex-1 py-2.5 rounded-xl bg-balkun-navy text-white font-bold text-sm hover:bg-balkun-navy-dark disabled:opacity-50 flex items-center justify-center gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> ذخیره تنظیمات</>}
          </button>
        </div>
      </div>
    </div>
  );
}