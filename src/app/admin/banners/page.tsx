// مسیر: src/app/admin/banners/page.tsx
// لیست بنرهای صفحه اول در پنل مدیریت — تسک ۱۸ چک‌لیست کارفرما.
// دقیقاً هم‌الگو با src/app/admin/blog/page.tsx: مدیریت بنر یک عملیات مالی/حساس
// نیست، پس دکمه‌های افزودن/ویرایش/حذف برای هر ادمینی که اصلاً اجازه‌ی دیدن این
// صفحه را دارد نمایش داده می‌شود (نه فقط SUPER_ADMIN).

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Plus, Edit, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Tag } from "lucide-react";

interface AdminBannerListItem {
  id: string;
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  badgeText: string | null;
  linkUrl: string | null;
  displayOrder: number;
  isActive: boolean;
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<AdminBannerListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/banners");
      const data = await res.json();
      if (data.success) setBanners(data.banners);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`آیا از حذف بنر «${label}» مطمئن هستید؟`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchBanners();
      } else {
        alert(data.error);
      }
    } catch {
      alert("خطا در ارتباط با سرور");
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = async (banner: AdminBannerListItem) => {
    setBusyId(banner.id);
    try {
      const res = await fetch(`/api/admin/banners/${banner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !banner.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        fetchBanners();
      } else {
        alert(data.error);
      }
    } catch {
      alert("خطا در ارتباط با سرور");
    } finally {
      setBusyId(null);
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const current = banners[index];
    const target = banners[targetIndex];
    setBusyId(current.id);
    try {
      await Promise.all([
        fetch(`/api/admin/banners/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayOrder: target.displayOrder }),
        }),
        fetch(`/api/admin/banners/${target.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayOrder: current.displayOrder }),
        }),
      ]);
      fetchBanners();
    } catch {
      alert("خطا در جابه‌جایی بنر");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-balkun-navy">مدیریت بنر اصلی صفحه اول</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            تغییر عکس، متن، کمپین/جشنواره و ترتیب نمایش بنرهای اسلایدر بالای صفحه اول (تعداد: {banners.length})
          </p>
        </div>
        <Link
          href="/admin/banners/new"
          className="flex items-center gap-2 bg-balkun-orange text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-balkun-orange-dark transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" /> افزودن بنر جدید
        </Link>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">پیش‌نمایش</th>
                <th className="px-6 py-4">عنوان / کمپین</th>
                <th className="px-6 py-4">وضعیت</th>
                <th className="px-6 py-4">ترتیب</th>
                <th className="px-6 py-4">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Loader2 className="w-6 h-6 text-balkun-cyan animate-spin mx-auto" />
                  </td>
                </tr>
              ) : banners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 font-bold">
                    هنوز بنری اضافه نشده — تا افزودن اولین بنر، بنر پیش‌فرض سایت نمایش داده می‌شود
                  </td>
                </tr>
              ) : (
                banners.map((banner, index) => (
                  <tr key={banner.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="relative w-24 h-14 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                        <Image src={banner.imageUrl} alt={banner.title || "بنر"} fill className="object-cover" sizes="96px" />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-balkun-navy max-w-xs">
                      {banner.badgeText && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-balkun-orange/10 text-balkun-orange px-2 py-0.5 rounded-md mb-1">
                          <Tag className="w-3 h-3" /> {banner.badgeText}
                        </span>
                      )}
                      <p className="truncate">{banner.title || "—"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(banner)}
                        disabled={busyId === banner.id}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors disabled:opacity-50 ${
                          banner.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {banner.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {banner.isActive ? "نمایش داده می‌شود" : "غیرفعال"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMove(index, "up")}
                          disabled={index === 0 || busyId !== null}
                          className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:text-balkun-cyan disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMove(index, "down")}
                          disabled={index === banners.length - 1 || busyId !== null}
                          className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:text-balkun-cyan disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Link href={`/admin/banners/${banner.id}`} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:text-balkun-cyan">
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(banner.id, banner.badgeText || banner.title || "بدون عنوان")}
                          disabled={busyId === banner.id}
                          className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
