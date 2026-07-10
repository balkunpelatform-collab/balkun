// مسیر: src/app/admin/corporate/page.tsx
// 🆕 تب کامل «سازمانی» پنل ادمین. سه بخش:
//   ۱) درخواست‌های سازمانی (لیدهای ورودی از فرم عمومی /corporate) — مشاهده، تغییر وضعیت پیگیری، ثبت یادداشت داخلی.
//   ۲) کاربران سازمانی فعال — لیست کاربرانی که هم‌اکنون userType=ORGANIZATIONAL هستند (لینک مستقیم به صفحه مدیریت هرکدام برای کیف پول/نقش).
//   ۳) لیست سفید شماره‌های سازمانی — همان جدولی که ثبت‌نام از روی آن، به‌صورت خودکار userType کاربر را سازمانی تشخیص می‌دهد.
// قبل از این فایل، هیچ‌کدام از این سه بخش در پنل ادمین قابل مشاهده یا مدیریت نبودند.

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import {
  Building2, Loader2, Search, Phone, Save, X, Trash2, Plus,
  AlertTriangle, ExternalLink, ClipboardList, Users2, ListChecks,
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

type Section = "leads" | "orgUsers" | "numbers";

export default function AdminCorporatePage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [section, setSection] = useState<Section>("leads");

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-black text-balkun-navy flex items-center gap-2">
          <Building2 className="w-6 h-6 text-balkun-orange" />
          مرکز مدیریت سازمانی
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          تمام درخواست‌ها، کاربران و شماره‌های سازمانی بالکن، یکجا و متمرکز.
        </p>
      </div>

      {/* تب‌های داخلی */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm w-fit overflow-x-auto">
        <SectionTab active={section === "leads"} onClick={() => setSection("leads")} icon={ClipboardList} label="درخواست‌های سازمانی" />
        <SectionTab active={section === "orgUsers"} onClick={() => setSection("orgUsers")} icon={Users2} label="کاربران سازمانی فعال" />
        <SectionTab active={section === "numbers"} onClick={() => setSection("numbers")} icon={ListChecks} label="لیست سفید شماره‌ها" />
      </div>

      {section === "leads" && <LeadsSection />}
      {section === "orgUsers" && <OrgUsersSection isSuperAdmin={isSuperAdmin} />}
      {section === "numbers" && <NumbersSection />}
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
        setTotal(data.pagination.total || 0);
      }
    } catch (error) {
      console.error("Error fetching corporate leads:", error);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search, page]);

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
function OrgUsersSection({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!isSuperAdmin) { setIsLoading(false); setAccessDenied(true); return; }
    setIsLoading(true);
    try {
      const query = new URLSearchParams({ page: page.toString(), userType: "ORGANIZATIONAL", ...(search && { search }) });
      const res = await fetch(`/api/admin/users?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
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
  }, [search, page, isSuperAdmin]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  if (accessDenied) {
    return (
      <div className="p-6 rounded-2xl bg-orange-50 text-orange-700 font-bold text-sm flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        مشاهده‌ی لیست کاربران سازمانی (که شامل اطلاعات نقش کاربران هم می‌شود) فقط برای مدیر ارشد (SUPER_ADMIN) فعال است.
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