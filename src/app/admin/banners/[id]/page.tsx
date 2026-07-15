// مسیر: src/app/admin/banners/[id]/page.tsx
// فرم ایجاد/ویرایش بنر صفحه اول (دقیقاً هم‌الگو با src/app/admin/blog/[id]/page.tsx):
// وقتی id برابر رشته‌ی "new" باشد، فرم در حالت «ایجاد» است.

"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowRight,
  Save,
  Loader2,
  ImageIcon,
  UploadCloud,
  X,
  Link as LinkIcon,
  Tag,
  Type,
} from "lucide-react";

export default function AdminBannerFormPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const isNew = id === "new";

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const [imageMode, setImageMode] = useState<"upload" | "link">("upload");
  const [imageLinkInput, setImageLinkInput] = useState("");

  const [formData, setFormData] = useState({
    imageUrl: "",
    title: "",
    subtitle: "",
    badgeText: "",
    linkUrl: "",
    isActive: true,
  });

  useEffect(() => {
    if (!isNew) fetchBanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchBanner = async () => {
    try {
      const res = await fetch(`/api/admin/banners/${id}`);
      const data = await res.json();
      if (data.success) {
        const banner = data.banner;
        setFormData({
          imageUrl: banner.imageUrl || "",
          title: banner.title || "",
          subtitle: banner.subtitle || "",
          badgeText: banner.badgeText || "",
          linkUrl: banner.linkUrl || "",
          isActive: banner.isActive,
        });
        setImageLinkInput(banner.imageUrl || "");
      } else {
        setError(data.error);
      }
    } catch {
      setError("خطا در بارگذاری اطلاعات");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    setError("");
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("bucket", "banners");
      const res = await fetch("/api/admin/upload", { method: "POST", body: uploadForm });
      const data = await res.json();
      if (data.success) {
        setFormData((prev) => ({ ...prev, imageUrl: data.url }));
        setImageLinkInput(data.url);
      } else {
        setError(data.error || "خطا در آپلود تصویر");
      }
    } catch {
      setError("خطای شبکه هنگام آپلود تصویر");
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplyImageLink = () => {
    const trimmed = imageLinkInput.trim();
    if (!trimmed) {
      setError("لینک تصویر را وارد کنید");
      return;
    }
    if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("/")) {
      setError("لینک تصویر باید با http:// یا https:// شروع شود");
      return;
    }
    setError("");
    setFormData((prev) => ({ ...prev, imageUrl: trimmed }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl.trim()) {
      setError("تصویر بنر الزامی است");
      return;
    }
    setIsSaving(true);
    setError("");

    try {
      const url = isNew ? "/api/admin/banners" : `/api/admin/banners/${id}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        router.push("/admin/banners");
      } else {
        setError(data.error);
      }
    } catch {
      setError("خطای شبکه");
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
        <h1 className="text-xl font-black text-balkun-navy">{isNew ? "افزودن بنر جدید" : "ویرایش بنر صفحه اول"}</h1>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* تصویر بنر */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <h2 className="font-black text-slate-700 flex items-center gap-2 border-b border-slate-50 pb-2">
            <ImageIcon className="w-5 h-5 text-balkun-orange" /> تصویر بنر
          </h2>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">تصویر بنر *</label>

            {formData.imageUrl && (
              <div className="relative w-full max-w-md h-48 rounded-xl overflow-hidden border border-slate-200 mb-3 bg-slate-50">
                <Image src={formData.imageUrl} alt="پیش‌نمایش بنر" fill className="object-cover" sizes="448px" />
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, imageUrl: "" });
                    setImageLinkInput("");
                  }}
                  className="absolute top-2 left-2 p-1.5 bg-black/60 text-white rounded-lg hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setImageMode("upload")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  imageMode === "upload" ? "bg-balkun-cyan text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" /> آپلود از دستگاه
              </button>
              <button
                type="button"
                onClick={() => setImageMode("link")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  imageMode === "link" ? "bg-balkun-cyan text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" /> استفاده از لینک تصویر
              </button>
            </div>

            {imageMode === "upload" ? (
              <label className="flex items-center gap-2 w-full max-w-md justify-center bg-slate-50 border border-dashed border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 cursor-pointer hover:border-balkun-cyan hover:text-balkun-cyan transition-colors">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                {isUploading ? "در حال آپلود..." : "انتخاب و آپلود تصویر (حداکثر ۲ مگابایت)"}
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  className="hidden"
                  disabled={isUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                    e.target.value = "";
                  }}
                />
              </label>
            ) : (
              <div className="flex items-center gap-2 w-full max-w-md">
                <input
                  type="text"
                  dir="ltr"
                  placeholder="https://example.com/image.jpg"
                  value={imageLinkInput}
                  onChange={(e) => setImageLinkInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-balkun-cyan outline-none text-left"
                />
                <button
                  type="button"
                  onClick={handleApplyImageLink}
                  className="bg-balkun-navy text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-balkun-navy/90 transition-colors shrink-0"
                >
                  اعمال لینک
                </button>
              </div>
            )}
            <p className="text-[11px] text-slate-400 font-medium mt-2">
              پیشنهاد: تصویر افقی (Landscape) با ابعاد حدود ۱۹۲۰ در ۸۰۰ پیکسل بهترین کیفیت را روی صفحه اول دارد.
            </p>
          </div>
        </div>

        {/* متن و کمپین */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <h2 className="font-black text-slate-700 flex items-center gap-2 border-b border-slate-50 pb-2">
            <Type className="w-5 h-5 text-balkun-cyan" /> متن روی بنر و کمپین/جشنواره
          </h2>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">
              برچسب کمپین/جشنواره (اختیاری)
              <span className="text-slate-400 font-medium"> — مثلاً «جشنواره تابستانه» یا «۲۰٪ تخفیف ویژه»</span>
            </label>
            <div className="relative max-w-md">
              <input
                type="text"
                value={formData.badgeText}
                onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                placeholder="مثلاً: جشنواره نوروزی بالکن"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm font-bold focus:border-balkun-cyan outline-none"
              />
              <Tag className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                عنوان (اختیاری)
                <span className="text-slate-400 font-medium"> — خالی بماند تا متن پیش‌فرض سایت نمایش داده شود</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="سفری مطمئن و راحت"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-balkun-cyan outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">زیرعنوان (اختیاری)</label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="بهترین اقامتگاه‌ها در زیباترین مقاصد ایران و جهان"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-balkun-cyan outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">
              لینک مقصد کلیک (اختیاری)
              <span className="text-slate-400 font-medium"> — کاربر با کلیک روی بنر به این آدرس می‌رود</span>
            </label>
            <input
              type="text"
              dir="ltr"
              value={formData.linkUrl}
              onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
              placeholder="/search?category=beach یا https://..."
              className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-balkun-cyan outline-none text-left"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 accent-balkun-cyan"
            />
            <span className="text-sm font-bold text-slate-700">این بنر در سایت نمایش داده شود (فعال)</span>
          </label>
        </div>

        <button
          disabled={isSaving || isUploading}
          type="submit"
          className="w-full md:w-auto md:mr-auto bg-balkun-cyan text-white px-8 py-3.5 rounded-xl font-black text-base hover:bg-balkun-cyan-dark transition-colors shadow-lg shadow-balkun-cyan/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isNew ? "افزودن بنر" : "ذخیره تغییرات"}
        </button>
      </form>
    </div>
  );
}
