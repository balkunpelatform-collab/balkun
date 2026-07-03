// مسیر: src/app/admin/accommodations/page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Loader2, Home, Plus, Edit, Trash2 } from "lucide-react";
import { formatPrice } from "@/utils/priceCalculator";
import { useAuthStore } from "@/store/authStore";
import { CATEGORIES } from "@/constants/categories";

export default function AdminAccommodationsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [accommodations, setAccommodations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const delayDebounce = setTimeout(() => { fetchAccommodations(); }, 500);
    return () => clearTimeout(delayDebounce);
  }, [search, page]);

  const fetchAccommodations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/accommodations?search=${search}&page=${page}`);
      const data = await res.json();
      if (data.success) {
        setAccommodations(data.accommodations);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`آیا از حذف اقامتگاه «${title}» مطمئن هستید؟`)) return;
    try {
      const res = await fetch(`/api/admin/accommodations/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchAccommodations();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("خطا در ارتباط با سرور");
    }
  };

  const getCatLabel = (id: string) => CATEGORIES.find(c => c.id === id)?.label || id;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-balkun-navy">اقامتگاه‌های اختصاصی بالکن</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">مدیریت موجودی ملک‌های ثبت شده در سیستم (تعداد: {total})</p>
        </div>
        {isSuperAdmin && (
          <Link
            href="/admin/accommodations/new"
            className="flex items-center gap-2 bg-balkun-orange text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-balkun-orange-dark transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" /> ثبت اقامتگاه جدید
          </Link>
        )}
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center">
          <div className="relative w-full md:w-96">
            <input
              type="text"
              placeholder="جستجو در عنوان یا شهر..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm font-medium focus:outline-none focus:border-balkun-cyan"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">عنوان اقامتگاه</th>
                <th className="px-6 py-4">دسته‌بندی</th>
                <th className="px-6 py-4">قیمت پایه (تومان)</th>
                <th className="px-6 py-4">وضعیت</th>
                <th className="px-6 py-4">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="w-6 h-6 text-balkun-cyan animate-spin mx-auto" /></td></tr>
              ) : accommodations.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-slate-500 font-bold">موردی یافت نشد</td></tr>
              ) : (
                accommodations.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-balkun-navy">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-slate-400" />
                        {acc.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{getCatLabel(acc.category)}</td>
                    <td className="px-6 py-4 font-black">{formatPrice(acc.pricePerNight)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${acc.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {acc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <Link href={`/admin/accommodations/${acc.id}`} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:text-balkun-cyan">
                        <Edit className="w-4 h-4" />
                      </Link>
                      {isSuperAdmin && (
                        <button onClick={() => handleDelete(acc.id, acc.title)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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