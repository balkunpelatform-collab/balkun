
// مسیر: src/app/admin/users/page.tsx
//
// 🆕 تسک ۸ چک‌لیست کارفرما (امکان حذف برای مدیران ارشد): ستون «عملیات» حالا برای
// مدیر ارشد یک دکمه‌ی حذف هم دارد (در کنار دکمه‌ی مشاهده/ویرایش). این دکمه برای
// نقش‌های دیگر اصلاً رندر نمی‌شود، برای کاربران با نقش SUPER_ADMIN و برای حسابِ
// خودِ مدیر ارشدِ واردشده هم پنهان است (سرور هم هر سه حالت را دوباره رد می‌کند).
// حذف واقعی در DELETE /api/admin/users/[id] انجام می‌شود و با حذف کاربر، تمام
// داده‌های مرتبط او (کیف پول، رزروها، تیکت‌ها و ...) هم خودکار حذف می‌شوند.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Loader2, User, ShieldCheck, Briefcase, Eye, Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

interface AdminUser {
  id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  userType: "NORMAL" | "ORGANIZATIONAL";
  role: "USER" | "SUPPORT_AGENT" | "FINANCE_MANAGER" | "SUPER_ADMIN";
  isActive: boolean;
  joinedAt: string;
}

export default function AdminUsersPage() {
  // 🆕 تسک ۸: نقش کاربر واردشده برای نمایش/پنهان‌کردن دکمه‌ی حذف (فقط مدیر ارشد)
  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // دیبانس ساده برای جلوگیری از ریکوئست‌های رگباری هنگام تایپ
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers(search, page);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, page]);

  const fetchUsers = async (searchQuery: string, pageNum: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/users?search=${searchQuery}&page=${pageNum}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
        setTotal(data.pagination.total || 0);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 🆕 تسک ۸: حذف کامل کاربر توسط مدیر ارشد — هشدار صریح درباره‌ی غیرقابل‌بازگشت
  // بودن و حذف تمام داده‌های مرتبط، قبل از ارسال درخواست به سرور نمایش داده می‌شود.
  const handleDeleteUser = async (targetId: string, fullName: string, phone: string) => {
    if (
      !confirm(
        `⚠️ هشدار جدی:\n\nآیا از حذف کامل کاربر «${fullName}» (${phone}) مطمئن هستید؟\n\nبا این کار تمام اطلاعات او — کیف پول و تراکنش‌ها، رزروها، تیکت‌ها و علاقه‌مندی‌ها — برای همیشه حذف می‌شود و قابل بازگشت نیست.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${targetId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchUsers(search, page);
      } else {
        alert(data.error || "خطا در حذف کاربر");
      }
    } catch (error) {
      alert("خطا در ارتباط با سرور");
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === "SUPER_ADMIN") return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-md text-[10px] font-bold">مدیر ارشد</span>;
    if (role === "FINANCE_MANAGER") return <span className="bg-balkun-yellow/10 text-amber-700 px-2 py-1 rounded-md text-[10px] font-bold">مدیر مالی</span>;
    if (role === "SUPPORT_AGENT") return <span className="bg-balkun-cyan/10 text-balkun-cyan px-2 py-1 rounded-md text-[10px] font-bold">پشتیبان</span>;
    return <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-md text-[10px] font-bold">کاربر عادی</span>;
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-balkun-navy">مدیریت کاربران</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            مشاهده، جستجو و ویرایش دسترسی‌های کاربران سیستم (تعداد کل: {total})
          </p>
        </div>
        
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="جستجو با شماره موبایل یا نام..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm font-medium focus:outline-none focus:border-balkun-cyan focus:ring-1 focus:ring-balkun-cyan"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">کاربر</th>
                <th className="px-6 py-4">شماره موبایل</th>
                <th className="px-6 py-4">نوع حساب</th>
                <th className="px-6 py-4">نقش سیستمی</th>
                <th className="px-6 py-4">تاریخ عضویت</th>
                <th className="px-6 py-4">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 text-balkun-cyan animate-spin mx-auto mb-2" />
                    <span className="text-slate-500 font-bold">در حال بارگذاری...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-bold">
                    کاربری با این مشخصات یافت نشد
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600" dir="ltr">
                      {u.phoneNumber}
                    </td>
                    <td className="px-6 py-4">
                      {u.userType === "ORGANIZATIONAL" ? (
                        <span className="flex items-center gap-1.5 text-balkun-orange font-bold text-xs">
                          <Briefcase className="w-3.5 h-3.5" />
                          سازمانی
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-slate-500 font-bold text-xs">
                          <User className="w-3.5 h-3.5" />
                          عادی
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(u.role)}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">
                      {new Date(u.joinedAt).toLocaleDateString("fa-IR")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="inline-flex items-center justify-center bg-slate-100 hover:bg-balkun-cyan hover:text-white text-slate-600 p-2 rounded-lg transition-colors"
                          title="مشاهده و ویرایش"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {/* 🆕 تسک ۸: دکمه‌ی حذف — فقط مدیر ارشد، نه برای مدیران ارشد
                            دیگر و نه برای حساب خودِ او (سرور هم همین‌ها را رد می‌کند) */}
                        {isSuperAdmin && u.role !== "SUPER_ADMIN" && u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id, `${u.firstName} ${u.lastName}`, u.phoneNumber)}
                            className="inline-flex items-center justify-center bg-red-50 hover:bg-red-500 hover:text-white text-red-500 p-2 rounded-lg transition-colors"
                            title="حذف کامل کاربر (فقط مدیر ارشد)"
                          >
                            <Trash2 className="w-4 h-4" />
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
        
        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            صفحه {page} از {Math.ceil(total / 20) || 1}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-100 transition-colors"
            >
              قبلی
            </button>
            <button
              disabled={page * 20 >= total}
              onClick={() => setPage(p => p + 1)}
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

