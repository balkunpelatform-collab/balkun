// مسیر: src/app/admin/site-content/about/page.tsx
//
// تسک ۱۳ چک‌لیست کارفرما (امکان ویرایش متن «درباره ما» توسط مدیر ارشد).
// فرم ویرایش متن صفحه‌ی عمومی /about — دقیقاً هم‌الگو با فرم بنر
// (src/app/admin/banners/[id]/page.tsx): بخش‌های سفید جداگانه با هدر آیکون‌دار،
// پیام خطا در بالای فرم، و دکمه‌ی ذخیره با اسپینر. برخلاف بنر، اینجا لیستی در کار
// نیست — این صفحه مستقیماً «تک محتوای» درباره‌ما را ویرایش می‌کند.
//
// دسترسی واقعی در سطح API (src/app/api/admin/site-content/about/route.ts) با
// requireAdminRole(["SUPER_ADMIN"]) کنترل می‌شود؛ در سایدبار هم فقط برای
// SUPER_ADMIN نمایش داده می‌شود (src/components/admin/AdminSidebar.tsx). پس حتی
// با تایپ مستقیم آدرس هم، ادمینی غیر از مدیر ارشد چیزی جز خطای ۴۰۳ نمی‌بیند.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Save, Loader2, Heading1, AlignRight, Sparkles, RotateCcw } from "lucide-react";

interface AboutValueForm {
  title: string;
  description: string;
}

interface AboutContentForm {
  heroTitle: string;
  heroDescription: string;
  valuesSectionTitle: string;
  values: AboutValueForm[];
}

const EMPTY_FORM: AboutContentForm = {
  heroTitle: "",
  heroDescription: "",
  valuesSectionTitle: "",
  values: [
    { title: "", description: "" },
    { title: "", description: "" },
    { title: "", description: "" },
  ],
};

export default function AdminAboutContentPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState<AboutContentForm>(EMPTY_FORM);

  useEffect(() => {
    fetchContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchContent = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/site-content/about");
      const data = await res.json();
      if (data.success) {
        setFormData(data.content);
      } else {
        setError(data.error || "خطا در بارگذاری متن صفحه");
      }
    } catch {
      setError("خطای شبکه هنگام بارگذاری متن صفحه");
    } finally {
      setIsLoading(false);
    }
  };

  const handleValueChange = (index: number, field: keyof AboutValueForm, value: string) => {
    setFormData((prev) => {
      const values = [...prev.values];
      values[index] = { ...values[index], [field]: value };
      return { ...prev, values };
    });
  };

  const handleResetToDefault = async () => {
    setIsResetting(true);
    setError("");
    setSuccessMessage("");
    try {
      const res = await fetch("/api/admin/site-content/about", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setFormData(data.content);
      } else {
        setError(data.error || "خطا در بازگردانی متن پیش‌فرض");
      }
    } catch {
      setError("خطای شبکه هنگام بازگردانی متن پیش‌فرض");
    } finally {
      setIsResetting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSaving(true);

    try {
      const res = await fetch("/api/admin/site-content/about", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setFormData(data.content);
        setSuccessMessage("متن صفحه‌ی درباره ما با موفقیت ذخیره شد و همین الان روی سایت فعال است.");
      } else {
        setError(data.error || "خطا در ذخیره‌سازی");
      }
    } catch {
      setError("خطای شبکه هنگام ذخیره‌سازی");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading)
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-balkun-cyan" />
      </div>
    );

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <button onClick={() => router.back()} className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50">
          <ArrowRight className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-black text-balkun-navy">ویرایش متن صفحه «درباره ما»</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            تغییرات بلافاصله و بدون نیاز به دیپلوی جدید، روی صفحه‌ی عمومی /about فعال می‌شود.
          </p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold text-sm">{error}</div>}
      {successMessage && (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl font-bold text-sm">{successMessage}</div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* بنر بالای صفحه */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <h2 className="font-black text-slate-700 flex items-center gap-2 border-b border-slate-50 pb-2">
            <Heading1 className="w-5 h-5 text-balkun-cyan" /> بنر بالای صفحه
          </h2>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">عنوان اصلی *</label>
            <input
              type="text"
              value={formData.heroTitle}
              onChange={(e) => setFormData({ ...formData, heroTitle: e.target.value })}
              placeholder="درباره‌ی بالکن"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-balkun-cyan outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">توضیح زیر عنوان اصلی *</label>
            <textarea
              value={formData.heroDescription}
              onChange={(e) => setFormData({ ...formData, heroDescription: e.target.value })}
              rows={3}
              placeholder="توضیح کوتاهی درباره‌ی بالکن..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-balkun-cyan outline-none resize-none"
            />
          </div>
        </div>

        {/* بخش چرا بالکن؟ */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <h2 className="font-black text-slate-700 flex items-center gap-2 border-b border-slate-50 pb-2">
            <Sparkles className="w-5 h-5 text-balkun-orange" /> بخش «چرا بالکن؟»
          </h2>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">عنوان این بخش *</label>
            <input
              type="text"
              value={formData.valuesSectionTitle}
              onChange={(e) => setFormData({ ...formData, valuesSectionTitle: e.target.value })}
              placeholder="چرا بالکن؟"
              className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-balkun-cyan outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {formData.values.map((value, index) => (
              <div key={index} className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
                <span className="text-[11px] font-black text-balkun-cyan uppercase tracking-widest">
                  کارت ویژگی {index + 1}
                </span>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">عنوان *</label>
                  <input
                    type="text"
                    value={value.title}
                    onChange={(e) => handleValueChange(index, "title", e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-balkun-cyan outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">توضیح *</label>
                  <textarea
                    value={value.description}
                    onChange={(e) => handleValueChange(index, "description", e.target.value)}
                    rows={3}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:border-balkun-cyan outline-none resize-none"
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <AlignRight className="w-3.5 h-3.5 shrink-0" />
            آیکون هر کارت ثابت است و فقط عنوان و توضیح آن قابل ویرایش است.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3 md:justify-end">
          <button
            type="button"
            disabled={isSaving || isResetting}
            onClick={handleResetToDefault}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            بازگردانی متن پیش‌فرض
          </button>
          <button
            disabled={isSaving || isResetting}
            type="submit"
            className="w-full md:w-auto bg-balkun-cyan text-white px-8 py-3.5 rounded-xl font-black text-base hover:bg-balkun-cyan-dark transition-colors shadow-lg shadow-balkun-cyan/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            ذخیره تغییرات
          </button>
        </div>
      </form>
    </div>
  );
}