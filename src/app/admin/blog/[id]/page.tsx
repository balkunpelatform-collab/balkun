// مسیر: src/app/admin/blog/[id]/page.tsx
// فرم ایجاد/ویرایش پست بلاگ (دقیقاً هم‌الگو با admin/accommodations/[id]/page.tsx):
// وقتی id برابر رشته‌ی "new" باشد، فرم در حالت «ایجاد» است.
//
// 🆕 رفع باگ ۴۰۴ اسلاگ فارسی — با تصمیم جدید: اسلاگ فقط انگلیسی مجاز است.
// قبلاً اسلاگ خودکار از روی عنوان (حتی وقتی فارسی بود) ساخته می‌شد که در عمل باعث
// ۴۰۴ می‌شد. الان:
// ۱) اسلاگ دیگر خودکار از روی عنوان ساخته نمی‌شود؛ ادمین باید خودش اسلاگ انگلیسی
//    را تایپ کند.
// ۲) هنگام ذخیره، اگر اسلاگ خالی باشد یا شامل کاراکتر غیرانگلیسی (مثلاً فارسی) باشد،
//    ذخیره متوقف می‌شود، صفحه به‌صورت نرم به فیلد اسلاگ اسکرول می‌شود، همان فیلد
//    فوکوس می‌گیرد و پیام خطای «فقط اسلاگ انگلیسی مجاز است» نمایش داده می‌شود.
// ۳) کنار فیلد اسلاگ یک نکته اضافه شده: وقتی از هوش مصنوعی برای تولید محتوای پست
//    کمک گرفته می‌شود، در پرامپت باید صراحتاً خواسته شود که اسلاگ/لینک پست به
//    صورت انگلیسی و برگرفته از عنوان باشد.

"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowRight, Save, Loader2, FileText, Image as ImageIcon,
  Search as SearchIcon, UploadCloud, X, Link as LinkIcon, AlertTriangle, Info
} from "lucide-react";
import { BLOG_CATEGORIES } from "@/constants/blogCategories";
import { isEnglishSlug, normalizeEnglishSlug } from "@/utils/generateSlug";

export default function AdminBlogFormPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const isNew = id === "new";

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [slugError, setSlugError] = useState("");

  // 🆕 برای اسکرول/فوکوس خودکار روی فیلد اسلاگ وقتی نامعتبر است
  const slugInputRef = useRef<HTMLInputElement>(null);

  // نحوه‌ی تامین تصویر کاور — آپلود فایل یا چسباندن لینک
  const [imageMode, setImageMode] = useState<"upload" | "link">("upload");
  const [imageLinkInput, setImageLinkInput] = useState("");

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
        setImageLinkInput(post.coverImage || "");
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError("خطا در بارگذاری اطلاعات");
    } finally {
      setIsLoading(false);
    }
  };

  // 🆕 اسلاگ دیگر به‌صورت خودکار از روی عنوان ساخته نمی‌شود (چون عنوان معمولاً
  // فارسی است و اسلاگ فارسی ذخیره نمی‌شود) — فقط خود عنوان به‌روزرسانی می‌شود.
  const handleTitleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, title: value }));
  };

  const focusSlugField = () => {
    slugInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    slugInputRef.current?.focus();
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
    if (!/^https?:\/\//i.test(trimmed)) {
      setError("لینک تصویر باید با http:// یا https:// شروع شود");
      return;
    }
    setError("");
    setFormData((prev) => ({ ...prev, coverImage: trimmed }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSlugError("");

    // 🆕 اعتبارسنجی اسلاگ پیش از هر چیز: فقط انگلیسی مجاز است
    const normalizedSlug = normalizeEnglishSlug(formData.slug);
    if (!normalizedSlug || !isEnglishSlug(normalizedSlug)) {
      const message = "فقط اسلاگ انگلیسی مجاز است. لطفاً اسلاگ را با حروف انگلیسی کوچک، عدد و خط‌تیره وارد کنید (مثال: my-post-title).";
      setSlugError(message);
      setError(message);
      focusSlugField();
      return;
    }

    setIsSaving(true);

    const payload = {
      ...formData,
      slug: normalizedSlug,
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
              <span className="text-slate-400 font-medium"> — فقط انگلیسی؛ به‌صورت خودکار از روی عنوان ساخته نمی‌شود، خودتان وارد کنید</span>
            </label>
            <input
              ref={slugInputRef}
              required dir="ltr" type="text" value={formData.slug}
              placeholder="my-post-title"
              onChange={e => { setFormData({...formData, slug: e.target.value}); if (slugError) setSlugError(""); }}
              className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm font-bold outline-none text-left ${slugError ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-balkun-cyan"}`}
            />
            {slugError && (
              <div className="text-red-600 text-xs font-bold mt-1.5">{slugError}</div>
            )}
            {/* 🆕 نکته برای استفاده از هوش مصنوعی جهت تولید محتوا */}
            <div className="flex items-start gap-2 mt-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl px-3 py-2.5 text-xs font-bold leading-relaxed">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                نکته: اگر برای نوشتن پست از هوش مصنوعی کمک می‌گیرید، حتماً در پرامپت
                بنویسید که «اسلاگ (لینک) پست باید فقط به صورت انگلیسی و برگرفته از
                عنوان باشد»؛ اسلاگ فارسی ذخیره نمی‌شود.
              </span>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">خلاصه (نمایش در لیست پست‌ها) *</label>
            <textarea required rows={2} value={formData.excerpt} onChange={e => setFormData({...formData, excerpt: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-balkun-cyan outline-none resize-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">
              متن کامل پست *
              <span className="text-slate-400 font-medium"> — برای شروع پاراگراف جدید، کافی است Enter بزنید</span>
            </label>
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
              <div className="relative w-full max-w-sm h-44 rounded-xl overflow-hidden border border-slate-200 mb-3 bg-slate-50">
                <Image src={formData.coverImage} alt="تصویر کاور" fill className="object-cover" sizes="384px" />
                <button
                  type="button"
                  onClick={() => { setFormData({...formData, coverImage: ""}); setImageLinkInput(""); }}
                  className="absolute top-2 left-2 p-1.5 bg-black/60 text-white rounded-lg hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* انتخاب بین «آپلود فایل» و «لینک تصویر» */}
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setImageMode("upload")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${imageMode === "upload" ? "bg-balkun-cyan text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
              >
                <UploadCloud className="w-3.5 h-3.5" /> آپلود از دستگاه
              </button>
              <button
                type="button"
                onClick={() => setImageMode("link")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${imageMode === "link" ? "bg-balkun-cyan text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
              >
                <LinkIcon className="w-3.5 h-3.5" /> استفاده از لینک تصویر
              </button>
            </div>

            {imageMode === "upload" ? (
              <label className="flex items-center gap-2 w-full max-w-sm justify-center bg-slate-50 border border-dashed border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 cursor-pointer hover:border-balkun-cyan hover:text-balkun-cyan transition-colors">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                {isUploading ? "در حال آپلود..." : "انتخاب و آپلود تصویر (حداکثر ۲ مگابایت)"}
                <input
                  type="file" accept="image/png, image/jpeg, image/webp, image/gif" className="hidden"
                  disabled={isUploading}
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); e.target.value = ""; }}
                />
              </label>
            ) : (
              <div className="flex items-center gap-2 w-full max-w-sm">
                <input
                  type="text" dir="ltr" placeholder="https://example.com/image.jpg"
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
            {/* تذکر واضح درباره‌ی رفتار پیش‌نویس، برای جلوگیری از گیج‌شدن با خطای ۴۰۴ */}
            {formData.status === "DRAFT" && (
              <div className="flex items-start gap-2 mt-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl px-3 py-2.5 text-xs font-bold leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  این پست هنوز «پیش‌نویس» است و روی سایت نمایش داده نمی‌شود؛ اگر همین حالا آدرس آن
                  را باز کنید، صفحه «یافت نشد (۴۰۴)» می‌دهد. برای نمایش عمومی، وضعیت را به
                  «منتشر شده» تغییر دهید و ذخیره کنید.
                </span>
              </div>
            )}
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