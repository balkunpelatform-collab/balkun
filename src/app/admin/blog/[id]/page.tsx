// مسیر: src/app/admin/blog/[id]/page.tsx
// فرم ایجاد/ویرایش پست بلاگ (دقیقاً هم‌الگو با admin/accommodations/[id]/page.tsx):
// وقتی id برابر رشته‌ی "new" باشد، فرم در حالت «ایجاد» است.
// 🆕 این صفحه اولین مصرف‌کننده‌ی واقعی روت آپلود تصویر (api/admin/upload) در کل پروژه است.

"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowRight, Save, Loader2, FileText, Image as ImageIcon,
  Search as SearchIcon, UploadCloud, X
} from "lucide-react";
import { BLOG_CATEGORIES } from "@/constants/blogCategories";
import { generateSlugFromTitle } from "@/utils/generateSlug";

export default function AdminBlogFormPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const isNew = id === "new";

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const [formData, setFormData] = useState({
    title: "", slug: "", excerpt: "", content: "",
    coverImage: "", category: BLOG_CATEGORIES[0]?.id || "", tags: "",
    status: "DRAFT", metaTitle: "", metaDescription: "",
  });

  useEffect(() => {
    if (!isNew) fetchPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/admin/blog/${id}`);
      const data = await res.json();
      if (data.success) {
        const post = data.post;
        setFormData({
          title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content,
          coverImage: post.coverImage || "", category: post.category,
          tags: post.tags?.join("، ") || "", status: post.status,
          metaTitle: post.metaTitle || "", metaDescription: post.metaDescription || "",
        });
        setSlugTouched(true);
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError("خطا در بارگذاری اطلاعات");
    } finally {
      setIsLoading(false);
    }
  };

  // تولید خودکار اسلاگ از روی عنوان، فقط تا زمانی که کاربر خودش دستی اسلاگ را ویرایش نکرده باشد
  const handleTitleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      title: value,
      slug: slugTouched ? prev.slug : generateSlugFromTitle(value),
    }));
  };

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    setError("");
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("bucket", "blog");
      const res = await fetch("/api/admin/upload", { method: "POST", body: uploadForm });
      const data = await res.json();
      if (data.success) {
        setFormData((prev) => ({ ...prev, coverImage: data.url }));
      } else {
        setError(data.error || "خطا در آپلود تصویر");
      }
    } catch {
      setError("خطای شبکه هنگام آپلود تصویر");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    const payload = {
      ...formData,
      slug: generateSlugFromTitle(formData.slug),
      tags: formData.tags.split("،").map((t) => t.trim()).filter(Boolean),
    };

    try {
      const url = isNew ? "/api/admin/blog" : `/api/admin/blog/${id}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        router.push("/admin/blog");
      } else {
        setError(data.error);
      }
    } catch {
      setError("خطای شبکه");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-balkun-cyan" /></div>;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <button onClick={() => router.back()} className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50">
          <ArrowRight className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-xl font-black text-balkun-navy">
          {isNew ? "نوشتن پست جدید" : "ویرایش پست بلاگ"}
        </h1>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* اطلاعات اصلی */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <h2 className="font-black text-slate-700 flex items-center gap-2 border-b border-slate-50 pb-2">
            <FileText className="w-5 h-5 text-balkun-cyan" /> اطلاعات اصلی پست
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">عنوان پست *</label>
              <input required type="text" value={formData.title} onChange={e => handleTitleChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-balkun-cyan outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">دسته‌بندی *</label>
              <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-balkun-cyan outline-none">
                {BLOG_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">
              اسلاگ (آدرس اینترنتی پست) *
              <span className="text-slate-400 font-medium"> — تا وقتی دستی ویرایش نکنید، خودکار از روی عنوان ساخته می‌شود</span>
            </label>
            <input
              required dir="ltr" type="text" value={formData.slug}
              onChange={e => { setSlugTouched(true); setFormData({...formData, slug: e.target.value}); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-balkun-cyan outline-none text-left"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">خلاصه (نمایش در لیست پست‌ها) *</label>
            <textarea required rows={2} value={formData.excerpt} onChange={e => setFormData({...formData, excerpt: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-balkun-cyan outline-none resize-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">متن کامل پست *</label>
            <textarea required rows={14} value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="هر پاراگراف را با یک خط خالی از پاراگراف بعدی جدا کنید." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-balkun-cyan outline-none resize-none leading-loose" />
          </div>
        </div>

        {/* تصویر کاور و برچسب‌ها */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <h2 className="font-black text-slate-700 flex items-center gap-2 border-b border-slate-50 pb-2">
            <ImageIcon className="w-5 h-5 text-balkun-orange" /> تصویر کاور و برچسب‌ها
          </h2>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">تصویر کاور پست</label>
            {formData.coverImage && (
              <div className="relative w-full max-w-sm h-44 rounded-xl overflow-hidden border border-slate-200 mb-3">
                <Image src={formData.coverImage} alt="تصویر کاور" fill className="object-cover" sizes="384px" />
                <button
                  type="button"
                  onClick={() => setFormData({...formData, coverImage: ""})}
                  className="absolute top-2 left-2 p-1.5 bg-black/60 text-white rounded-lg hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <label className="flex items-center gap-2 w-full max-w-sm justify-center bg-slate-50 border border-dashed border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 cursor-pointer hover:border-balkun-cyan hover:text-balkun-cyan transition-colors">
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              {isUploading ? "در حال آپلود..." : "انتخاب و آپلود تصویر (حداکثر ۲ مگابایت)"}
              <input
                type="file" accept="image/png, image/jpeg, image/webp, image/gif" className="hidden"
                disabled={isUploading}
                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); e.target.value = ""; }}
              />
            </label>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">برچسب‌ها (با ویرگول فارسی «،» جدا کنید)</label>
            <input type="text" placeholder="سفر، رزرو، ویلا" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">وضعیت انتشار</label>
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full md:w-64 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none">
              <option value="DRAFT">پیش‌نویس (فقط در پنل قابل مشاهده)</option>
              <option value="PUBLISHED">منتشر شده (نمایش عمومی در سایت)</option>
            </select>
          </div>
        </div>

        {/* سئو */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <h2 className="font-black text-slate-700 flex items-center gap-2 border-b border-slate-50 pb-2">
            <SearchIcon className="w-5 h-5 text-balkun-yellow" /> بهینه‌سازی برای موتورهای جستجو (سئو)
          </h2>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">عنوان متا (Meta Title)</label>
            <input type="text" placeholder="در صورت خالی بودن، از عنوان پست استفاده می‌شود" value={formData.metaTitle} onChange={e => setFormData({...formData, metaTitle: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">توضیحات متا (Meta Description)</label>
            <textarea rows={2} placeholder="در صورت خالی بودن، از خلاصه پست استفاده می‌شود" value={formData.metaDescription} onChange={e => setFormData({...formData, metaDescription: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none" />
          </div>
        </div>

        <button disabled={isSaving || isUploading} type="submit" className="w-full md:w-auto md:mr-auto bg-balkun-cyan text-white px-8 py-3.5 rounded-xl font-black text-base hover:bg-balkun-cyan-dark transition-colors shadow-lg shadow-balkun-cyan/20 disabled:opacity-50 flex items-center justify-center gap-2">
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isNew ? "ایجاد پست" : "ذخیره تغییرات"}
        </button>
      </form>
    </div>
  );
}