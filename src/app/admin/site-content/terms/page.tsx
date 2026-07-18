// مسیر: src/app/admin/site-content/terms/page.tsx
//
// تسک ۱۴ چک‌لیست کارفرما (امکان ویرایش متن «قوانین و مقررات» توسط مدیر ارشد).
// دقیقاً هم‌الگو با src/app/admin/site-content/about/page.tsx (تسک ۱۳): بخش‌های
// سفید جداگانه با هدر آیکون‌دار، پیام خطا/موفقیت در بالای فرم، دکمه‌ی «بازگردانی
// متن پیش‌فرض» و دکمه‌ی «ذخیره» با اسپینر.
//
// تفاوت اصلی با فرم درباره‌ما: چون بندهای قوانین یک آرایه‌ی پویا هستند (نه ۳ کارت
// ثابت)، این فرم برای هر بند دکمه‌ی «حذف» و دکمه‌های «جابه‌جایی به بالا/پایین»
// دارد، به‌علاوه یک دکمه‌ی «افزودن بند جدید» در پایین لیست — تا مدیر ارشد بتواند
// در آینده بدون دخالت دولوپر، بند تازه (مثلاً درباره‌ی یک قانون جدید) اضافه یا یک
// بند قدیمی را کامل حذف کند.
//
// دسترسی واقعی در سطح API (src/app/api/admin/site-content/terms/route.ts) با
// requireAdminRole(["SUPER_ADMIN"]) کنترل می‌شود؛ در سایدبار هم فقط برای
// SUPER_ADMIN نمایش داده می‌شود (src/components/admin/AdminSidebar.tsx). پس حتی
// با تایپ مستقیم آدرس هم، ادمینی غیر از مدیر ارشد چیزی جز خطای ۴۰۳ نمی‌بیند.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Save,
  Loader2,
  Heading1,
  ScrollText,
  RotateCcw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from "lucide-react";

interface TermsSectionForm {
  title: string;
  body: string;
}

interface TermsContentForm {
  heroTitle: string;
  heroDescription: string;
  sections: TermsSectionForm[];
}

const EMPTY_FORM: TermsContentForm = {
  heroTitle: "",
  heroDescription: "",
  sections: [],
};

export default function AdminTermsContentPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState<TermsContentForm>(EMPTY_FORM);

  useEffect(() => {
    fetchContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchContent = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/site-content/terms");
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

  const handleSectionChange = (index: number, field: keyof TermsSectionForm, value: string) => {
    setFormData((prev) => {
      const sections = [...prev.sections];
      sections[index] = { ...sections[index], [field]: value };
      return { ...prev, sections };
    });
  };

  const handleAddSection = () => {
    setFormData((prev) => ({
      ...prev,
      sections: [...prev.sections, { title: `${prev.sections.length + 1}. بند جدید`, body: "" }],
    }));
  };

  const handleRemoveSection = (index: number) => {
    if (!window.confirm("این بند برای همیشه از متن قوانین و مقررات حذف شود؟")) return;
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  };

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    setFormData((prev) => {
      const sections = [...prev.sections];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= sections.length) return prev;
      [sections[index], sections[targetIndex]] = [sections[targetIndex], sections[index]];
      return { ...prev, sections };
    });
  };

  const handleResetToDefault = async () => {
    if (!window.confirm("فرم با متن پیش‌فرض قوانین و مقررات پر می‌شود (هنوز ذخیره نشده). ادامه می‌دهید؟")) return;
    setIsResetting(true);
    setError("");
    setSuccessMessage("");
    try {
      const res = await fetch("/api/admin/site-content/terms", { method: "POST" });
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
      const res = await fetch("/api/admin/site-content/terms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setFormData(data.content);
        setSuccessMessage("متن صفحه‌ی قوانین و مقررات با موفقیت ذخیره شد و همین الان روی سایت فعال است.");
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
          <h1 className="text-xl font-black text-balkun-navy">ویرایش متن صفحه «قوانین و مقررات»</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            تغییرات بلافاصله و بدون نیاز به دیپلوی جدید، روی صفحه‌ی عمومی /terms فعال می‌شود.
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
              placeholder="قوانین و مقررات"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-balkun-cyan outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">توضیح زیر عنوان اصلی *</label>
            <textarea
              value={formData.heroDescription}
              onChange={(e) => setFormData({ ...formData, heroDescription: e.target.value })}
              rows={2}
              placeholder="لطفاً پیش از رزرو، قوانین زیر را با دقت مطالعه کنید."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-balkun-cyan outline-none resize-none"
            />
          </div>
        </div>

        {/* بندهای قوانین */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2 flex-wrap gap-2">
            <h2 className="font-black text-slate-700 flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-balkun-orange" /> بندهای قوانین ({formData.sections.length} بند)
            </h2>
            <button
              type="button"
              onClick={handleAddSection}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-balkun-cyan/10 text-balkun-cyan text-xs font-bold hover:bg-balkun-cyan/20 transition-colors"
            >
              <Plus className="w-4 h-4" /> افزودن بند جدید
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {formData.sections.map((section, index) => (
              <div key={index} className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black text-balkun-cyan uppercase tracking-widest flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5 text-slate-300" /> بند {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveSection(index, "up")}
                      title="جابه‌جایی به بالا"
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-balkun-cyan hover:border-balkun-cyan disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === formData.sections.length - 1}
                      onClick={() => handleMoveSection(index, "down")}
                      title="جابه‌جایی به پایین"
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-balkun-cyan hover:border-balkun-cyan disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(index)}
                      title="حذف این بند"
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">عنوان بند *</label>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => handleSectionChange(index, "title", e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-balkun-cyan outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">متن بند *</label>
                  <textarea
                    value={section.body}
                    onChange={(e) => handleSectionChange(index, "body", e.target.value)}
                    rows={4}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:border-balkun-cyan outline-none resize-none"
                  />
                </div>
              </div>
            ))}

            {formData.sections.length === 0 && (
              <div className="text-center py-8 text-sm font-bold text-slate-400">
                هنوز هیچ بندی اضافه نشده. با دکمه‌ی «افزودن بند جدید» شروع کنید.
              </div>
            )}
          </div>
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