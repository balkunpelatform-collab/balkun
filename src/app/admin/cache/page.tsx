// مسیر: src/app/admin/cache/page.tsx
// این فایل جدید است — آن را دقیقاً در همین مسیر در پروژه ایجاد کنید.
//
// صفحه‌ی «پاک‌سازی کش سایت» در پنل مدیر. فقط یک دکمه‌ی بزرگ دارد که
// POST /api/admin/cache را صدا می‌زند (فقط SUPER_ADMIN اجازه‌ی ورود واقعی به
// API را دارد؛ اما چون این صفحه هم مثل «متن صفحه درباره ما» فقط باید برای
// SUPER_ADMIN در سایدبار دیده شود، اینجا هم یک بررسی نمایشی ساده روی نقش کاربر
// انجام می‌شود تا کاربر غیرمجاز اصلاً وارد این صفحه نشود).

"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

interface RevalidateResult {
  path: string;
  ok: boolean;
  error?: string;
}

export default function AdminCachePage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RevalidateResult[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!user || user.role !== "SUPER_ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
        <ShieldAlert className="w-10 h-10" />
        <p className="font-bold">این بخش فقط برای مدیر ارشد در دسترس است.</p>
      </div>
    );
  }

  async function handleClearCache() {
    setLoading(true);
    setErrorMsg(null);
    setResults(null);
    try {
      const res = await fetch("/api/admin/cache", { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || "خطا در پاک‌سازی کش");
        return;
      }
      setResults(data.results);
    } catch {
      setErrorMsg("ارتباط با سرور برقرار نشد");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-black text-balkun-navy mb-2">پاک‌سازی کش سایت</h1>
      <p className="text-slate-500 font-medium mb-6 leading-7">
        این دکمه کش صفحات عمومی سایت (خانه، بنرها، بلاگ، اقامتگاه‌ها و...) را
        در نکست‌جی‌اس پاک می‌کند تا محتوای تازه‌ی دیتابیس بلافاصله نمایش داده
        شود. توجه: چون بیشتر صفحات این سایت از قبل بدون کش تنظیم شده‌اند، این
        دکمه برای هر مشکلی معجزه نمی‌کند — اگر بعد از پاک‌سازی هم مشکلی مثل عدم
        نمایش عکس یا بلاگ ادامه داشت، یعنی ریشه‌ی آن جای دیگری (مثلاً خود داده یا
        وضعیت رکورد) است، نه کش.
      </p>

      <button
        onClick={handleClearCache}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white bg-balkun-cyan hover:bg-balkun-cyan/90 disabled:opacity-60 transition-all"
      >
        <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "در حال پاک‌سازی..." : "پاک‌سازی کامل کش سایت"}
      </button>

      {errorMsg && (
        <div className="mt-6 flex items-center gap-2 text-red-600 font-bold">
          <XCircle className="w-5 h-5" />
          {errorMsg}
        </div>
      )}

      {results && (
        <div className="mt-6 bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
          <p className="font-bold text-balkun-navy mb-1">نتیجه:</p>
          {results.map((r) => (
            <div key={r.path} className="flex items-center gap-2 text-sm font-medium" dir="ltr">
              {r.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
              )}
              {r.path}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}