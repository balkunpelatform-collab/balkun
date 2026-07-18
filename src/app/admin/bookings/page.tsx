// مسیر: src/app/admin/bookings/page.tsx
// این فایل را به‌طور کامل جایگزین فایل فعلی کنید.
//
// 🆕 قابلیت جدید: ستون «عملیات» اضافه شد تا ادمین بتواند:
//   ۱) رزرو را با ثبت اجباری «دلیل لغو» لغو کند (اگر رزرو قطعی/پرداخت‌شده بود، مبلغ به‌صورت
//      خودکار به کیف پول مسافر بازمی‌گردد — دقیقاً مثل جریان لغو خود کاربر).
//   ۲) رزروهای تستی/اشتباهی را کامل و برای همیشه از سیستم حذف کند (نیازمند تایپ کردن «حذف»
//      برای جلوگیری از حذف تصادفی، چون این عملیات غیرقابل بازگشت است).
// هر دو عملیات فقط برای SUPER_ADMIN فعال است؛ SUPPORT_AGENT همچنان فقط می‌تواند لیست را ببیند
// (طبق سطح دسترسی تعریف‌شده در سند فاز ۹).
//
// 🆕 اصلاح مورد ۱ (۲۰۲۶/۰۷/۱۱): وضعیت "EXPIRED" (منقضی‌شده به دلیل عدم پرداخت در مهلت)
// به STATUS_MAP و به لیست وضعیت‌های «غیرقابل لغو» اضافه شد.
//
// 🆕 تسک ۱۱ چک‌لیست کارفرما (افزودن نقش مدیر مالی به سیستم): نقش FINANCE_MANAGER هم
// حالا می‌تواند این صفحه را ببیند (فقط لیست رزروها، بدون امکان لغو/حذف — دقیقاً مثل
// SUPPORT_AGENT). پیام هشدار زیر عنوان صفحه از حالت هاردکدشده‌ی مخصوص SUPPORT_AGENT
// در آمد و حالا برای هر دو نقش غیر-SUPER_ADMIN پیام درست و متناسب با نقش خودشان را نشان می‌دهد.
//
// 🆕 تسک 22 چک‌لیست کارفرما (امکان مشاهده جزئیات ووچر برای پشتیبانی) - 2026/07/16:
// قبلا در جدول فقط تاریخ ورود/خروج، نام و شماره مسافر نمایش داده می‌شد. حالا یک دکمه
// چشم به ستون عملیات اضافه شد که برای همه نقش‌هایی که اصلا اجازه دیدن این صفحه را
// دارند فعال است (SUPPORT_AGENT دارای تیک تب bookings، FINANCE_MANAGER و SUPER_ADMIN) -
// نه فقط SUPER_ADMIN، چون خواسته کارفرما دقیقا این بود که پشتیبانی هم بتواند جزئیات
// کامل ووچر را ببیند. با کلیک، مودالی باز می‌شود و اطلاعات کامل رزرو را نشان می‌دهد:
// تعداد دقیق نفرات (مبنا + اضافه)، کد ملی ثبت‌شده (در صورت وجود روی رزروهای قدیمی‌تر)،
// کد اقامتگاه و شناسه رزرو در اتاقک، شناسه داخلی و کد پیگیری رزرو، و جزئیات کامل
// وضعیت/دلیل لغو/تاریخ ثبت. تمام این فیلدها از قبل توسط GET /api/admin/bookings برگردانده
// می‌شدند (select("*") + پیوست guest)، فقط در جدول رندر نمی‌شدند؛ پس هیچ فراخوانی API
// جدید یا ستون/جدول دیتابیس جدیدی برای این تسک لازم نبود. صفحه عمومی ووچر
// (src/app/voucher/[id]/page.tsx) عمدا اینجا reuse نشد، چون آن صفحه فقط برای صاحب رزرو
// (userId === currentUserId) باز می‌شود و ادمین/پشتیبان را رد می‌کند؛ به همین دلیل یک
// مودال مستقل با همان ساختار اطلاعاتی، داخل خود پنل ادمین ساخته شد.

"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, CalendarDays, ExternalLink, User, Ban, Trash2, X, AlertTriangle, Eye, Users } from "lucide-react";
import { formatPrice } from "@/utils/priceCalculator";
import { useAuthStore } from "@/store/authStore";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  WAITING_FOR_HOST: { label: "در انتظار تایید", color: "bg-balkun-yellow/10 text-balkun-yellow" },
  WAITING_FOR_PAYMENT: { label: "در انتظار پرداخت", color: "bg-balkun-orange/10 text-balkun-orange" },
  PAID_CONFIRMED: { label: "رزرو قطعی", color: "bg-green-100 text-green-700" },
  CANCELLED_BY_HOST: { label: "لغو توسط میزبان", color: "bg-red-50 text-red-600" },
  CANCELLED_BY_GUEST: { label: "لغو توسط مسافر", color: "bg-red-50 text-red-600" },
  EXPIRED: { label: "منقضی‌شده (عدم پرداخت)", color: "bg-slate-100 text-slate-500" },
};

const DELETE_CONFIRM_WORD = "حذف";

export default function AdminBookingsPage() {
  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" }>({ text: "", type: "success" });

  // --- مودال لغو رزرو ---
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // --- مودال حذف دائمی رزرو ---
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // --- مودال جزئیات کامل ووچر (تسک ۲۲ چک‌لیست کارفرما) ---
  const [detailsTarget, setDetailsTarget] = useState<any | null>(null);

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

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "success" }), 5000);
  };

  const openCancelModal = (booking: any) => {
    setCancelReasonInput("");
    setCancelTarget(booking);
  };

  const submitCancel = async () => {
    if (!cancelTarget) return;
    if (cancelReasonInput.trim().length < 5) {
      showMessage("لطفاً دلیل لغو را کامل بنویسید (حداقل ۵ کاراکتر)", "error");
      return;
    }
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/admin/bookings/${cancelTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED_BY_HOST", reason: cancelReasonInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage(data.message || "رزرو با موفقیت لغو شد", "success");
        setCancelTarget(null);
        fetchBookings();
      } else {
        showMessage(data.error || "خطا در لغو رزرو", "error");
      }
    } catch {
      showMessage("خطا در ارتباط با سرور", "error");
    } finally {
      setIsCancelling(false);
    }
  };

  const openDeleteModal = (booking: any) => {
    setDeleteConfirmInput("");
    setDeleteTarget(booking);
  };

  const submitDelete = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmInput.trim() !== DELETE_CONFIRM_WORD) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/bookings/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showMessage("رزرو برای همیشه حذف شد", "success");
        setDeleteTarget(null);
        // حذف فوری ردیف از لیست فعلی بدون نیاز به رفرش کامل
        setBookings((prev) => prev.filter((b) => b.id !== deleteTarget.id));
        setTotal((prev) => Math.max(0, prev - 1));
      } else {
        showMessage(data.error || "خطا در حذف رزرو", "error");
      }
    } catch {
      showMessage("خطا در ارتباط با سرور", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // 🆕 اصلاح مورد ۱: رزروهای EXPIRED هم قبلاً «تمام‌شده» محسوب می‌شوند، پس دکمه‌ی
  // «لغو رزرو» برایشان معنا ندارد (فقط دکمه‌ی حذف دائمی در دسترس می‌ماند).
  const isCancelled = (b: any) => ["CANCELLED_BY_GUEST", "CANCELLED_BY_HOST", "EXPIRED"].includes(b.status);

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

      {message.text && (
        <div className={`p-4 rounded-xl font-bold text-sm ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {message.text}
        </div>
      )}

      {!isSuperAdmin && (
        <div className="p-4 rounded-xl bg-orange-50 text-orange-700 font-bold text-sm">
          شما با نقش {currentUser?.role === "FINANCE_MANAGER" ? "مدیر مالی (FINANCE_MANAGER)" : "پشتیبان (SUPPORT_AGENT)"} وارد شده‌اید؛ لغو یا حذف رزرو فقط برای مدیر ارشد (SUPER_ADMIN) فعال است.
        </div>
      )}

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
                <th className="px-6 py-4">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 text-balkun-cyan animate-spin mx-auto mb-2" />
                    <span className="text-slate-500 font-bold">در حال دریافت رزروها...</span>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-bold">
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
                      {b.cancelReason && (
                        <p className="text-[11px] text-slate-400 font-medium mt-1.5 max-w-[220px]" title={b.cancelReason}>
                          دلیل: {b.cancelReason}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">
                      {new Date(b.createdAt).toLocaleDateString("fa-IR")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {/* 🆕 تسک ۲۲: دکمه‌ی مشاهده جزئیات کامل ووچر — برای همه‌ی نقش‌هایی
                            که اصلاً اجازه‌ی دیدن این صفحه را دارند فعال است، نه فقط SUPER_ADMIN */}
                        <button
                          onClick={() => setDetailsTarget(b)}
                          title="مشاهده جزئیات کامل / ووچر"
                          className="p-2 rounded-lg bg-cyan-50 text-balkun-cyan hover:bg-cyan-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isSuperAdmin && (
                          <>
                            {!isCancelled(b) && (
                              <button
                                onClick={() => openCancelModal(b)}
                                title="لغو رزرو"
                                className="p-2 rounded-lg bg-orange-50 text-balkun-orange hover:bg-orange-100 transition-colors"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => openDeleteModal(b)}
                              title="حذف دائمی رزرو"
                              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
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

      {/* --- مودال لغو رزرو --- */}
      {cancelTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50" onClick={() => !isCancelling && setCancelTarget(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-balkun-navy flex items-center gap-2">
                <Ban className="w-5 h-5 text-balkun-orange" /> لغو رزرو
              </h3>
              <button onClick={() => !isCancelling && setCancelTarget(null)} className="p-1.5 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 font-medium">
              رزرو «<span className="font-bold text-slate-800">{cancelTarget.roomName}</span>» لغو خواهد شد.
              {cancelTarget.status === "PAID_CONFIRMED" && (
                <span className="block mt-1 text-balkun-cyan font-bold">
                  چون این رزرو قطعی و پرداخت‌شده است، مبلغ {formatPrice(cancelTarget.totalPaidAmount)} تومان به‌صورت خودکار به کیف پول مسافر بازگردانده می‌شود.
                </span>
              )}
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500">دلیل لغو (در لاگ سیستم ثبت می‌شود و به مسافر پیامک می‌شود)</label>
              <textarea
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                placeholder="مثلاً: اقامتگاه تست بود / درخواست میزبان / خطای ثبت..."
                rows={3}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-balkun-cyan resize-none"
              />
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={isCancelling}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                انصراف
              </button>
              <button
                onClick={submitCancel}
                disabled={isCancelling || cancelReasonInput.trim().length < 5}
                className="flex-1 py-2.5 rounded-xl bg-balkun-orange text-white font-bold text-sm hover:bg-balkun-orange-dark disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : "تایید لغو رزرو"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- مودال حذف دائمی رزرو --- */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50" onClick={() => !isDeleting && setDeleteTarget(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> حذف دائمی رزرو
              </h3>
              <button onClick={() => !isDeleting && setDeleteTarget(null)} className="p-1.5 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-red-50 text-red-700 text-sm font-bold p-3 rounded-xl">
              این عملیات غیرقابل بازگشت است. رزرو «{deleteTarget.roomName}» کاملاً از پایگاه داده حذف می‌شود
              (نه فقط لغو). این گزینه را فقط برای رزروهای تستی یا اشتباه ثبت‌شده استفاده کنید؛ برای رزروهای واقعی از گزینه‌ی «لغو رزرو» استفاده کنید.
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500">
                برای تایید، عبارت «{DELETE_CONFIRM_WORD}» را دقیقاً در کادر زیر تایپ کنید
              </label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder={DELETE_CONFIRM_WORD}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-red-400"
              />
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                انصراف
              </button>
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

      {/* --- مودال جزئیات کامل رزرو / ووچر (تسک ۲۲ چک‌لیست کارفرما) --- */}
      {detailsTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50" onClick={() => setDetailsTarget(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="font-black text-lg text-balkun-navy flex items-center gap-2">
                <Eye className="w-5 h-5 text-balkun-cyan" /> جزئیات کامل رزرو / ووچر
              </h3>
              <button onClick={() => setDetailsTarget(null)} className="p-1.5 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              {/* کد پیگیری و وضعیت */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-400">
                  کد پیگیری: <span className="font-mono text-slate-700 tracking-widest" dir="ltr">{detailsTarget.id.split("-")[0].toUpperCase()}</span>
                </span>
                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${STATUS_MAP[detailsTarget.status]?.color || "bg-slate-100"}`}>
                  {STATUS_MAP[detailsTarget.status]?.label || detailsTarget.status}
                </span>
              </div>

              {detailsTarget.cancelReason && (
                <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl">
                  دلیل لغو: {detailsTarget.cancelReason}
                </div>
              )}

              {/* اطلاعات اقامتگاه */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">اطلاعات اقامتگاه</h4>
                <p className="text-base font-black text-slate-800">{detailsTarget.roomName}</p>
                <p className="text-xs font-bold text-slate-500 mt-1">کد اقامتگاه اتاقک: {detailsTarget.roomId}</p>
                <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> شناسه رزرو در اتاقک: {detailsTarget.otaghakBookingId || "ندارد"}
                </p>
              </div>

              <div className="w-full h-px bg-slate-100 border-t border-dashed border-slate-300" />

              {/* جزئیات سفر و مشخصات رزرو */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> ورود</span>
                  <span className="text-sm font-black text-slate-800">{new Date(detailsTarget.checkInDate).toLocaleDateString("fa-IR")}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> خروج</span>
                  <span className="text-sm font-black text-slate-800">{new Date(detailsTarget.checkOutDate).toLocaleDateString("fa-IR")}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><Users className="w-3 h-3" /> تعداد نفرات</span>
                  <span className="text-sm font-black text-slate-800">
                    {detailsTarget.basePersonCount + detailsTarget.extraPersonCount} مسافر
                    <span className="block text-[10px] font-medium text-slate-400 mt-0.5">
                      (مبنا: {detailsTarget.basePersonCount} + اضافه: {detailsTarget.extraPersonCount})
                    </span>
                  </span>
                </div>
                {detailsTarget.nationalCode && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-400">کد ملی ثبت‌شده</span>
                    <span className="text-sm font-black text-slate-800 tracking-wider" dir="ltr">{detailsTarget.nationalCode}</span>
                  </div>
                )}
              </div>

              <div className="w-full h-px bg-slate-100 border-t border-dashed border-slate-300" />

              {/* مهمان و پرداخت */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <span className="text-xs font-bold text-slate-400 block mb-1">مهمان اصلی (رزرو کننده)</span>
                  {detailsTarget.guest ? (
                    <>
                      <p className="text-sm font-black text-slate-800">{detailsTarget.guest.firstName} {detailsTarget.guest.lastName}</p>
                      <p className="text-xs font-bold text-slate-500 mt-1" dir="ltr">{detailsTarget.guest.phoneNumber}</p>
                    </>
                  ) : (
                    <p className="text-sm font-bold text-slate-400">ناشناس</p>
                  )}
                </div>
                <div className="md:text-left">
                  <span className="text-xs font-bold text-slate-400 block mb-1">مبلغ کل پرداختی</span>
                  <p className="text-lg font-black text-balkun-cyan">
                    {formatPrice(detailsTarget.totalPaidAmount)} <span className="text-xs text-slate-500">تومان</span>
                  </p>
                </div>
              </div>

              <p className="text-[11px] font-medium text-slate-400 text-center">
                تاریخ ثبت رزرو: {new Date(detailsTarget.createdAt).toLocaleDateString("fa-IR")} — شناسه داخلی رزرو:{" "}
                <span className="font-mono" dir="ltr">{detailsTarget.id}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}