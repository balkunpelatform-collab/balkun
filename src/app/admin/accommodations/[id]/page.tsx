// مسیر: src/app/admin/accommodations/[id]/page.tsx
//
// 🐛 رفع باگ (۲۰۲۶/۰۷/۱۰): به عنوان یک لایه‌ی دفاعی اضافه (سرور هم این مقادیر را
// اعتبارسنجی می‌کند)، به فیلدهای عددی `min` اضافه شد تا مرورگر جلوی وارد کردن
// مقادیر منفی/صفر برای قیمت، ظرفیت و متراژ را بگیرد، و پیش از ارسال فرم هم یک
// چک سریع سمت کلاینت اضافه شد تا کاربر پیام خطای فوری ببیند (نه بعد از رفت‌وبرگشت به سرور).

"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Save, Loader2, Home, MapPin, DollarSign, ListChecks } from "lucide-react";
import { CATEGORIES } from "@/constants/categories";

export default function AdminAccommodationFormPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const isNew = id === "new";

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: "", description: "", location: "", address: "", category: "villa",
    pricePerNight: "", maxGuests: "1", bedrooms: "0", bathrooms: "0", area: "0",
    status: "PENDING_REVIEW", contactPhone: "", checkInTime: "14:00", checkOutTime: "12:00",
    amenities: "", images: "", houseRules: ""
  });

  useEffect(() => {
    if (!isNew) fetchAccommodation();
  }, [id]);

  const fetchAccommodation = async () => {
    try {
      const res = await fetch(`/api/admin/accommodations/${id}`);
      const data = await res.json();
      if (data.success) {
        const acc = data.accommodation;
        setFormData({
          title: acc.title, description: acc.description, location: acc.location,
          address: acc.address, category: acc.category, pricePerNight: acc.pricePerNight.toString(),
          maxGuests: acc.maxGuests.toString(), bedrooms: acc.bedrooms.toString(),
          bathrooms: acc.bathrooms.toString(), area: acc.area.toString(), status: acc.status,
          contactPhone: acc.contactPhone || "", checkInTime: acc.checkInTime || "14:00",
          checkOutTime: acc.checkOutTime || "12:00", amenities: acc.amenities?.join("، ") || "",
          images: acc.images?.join("\n") || "", houseRules: acc.houseRules || ""
        });
      }
    } catch (e) {
      setError("خطا در بارگذاری اطلاعات");
    } finally {
      setIsLoading(false);
    }
  };

  // اعتبارسنجی سریع سمت کلاینت — سرور هم این‌ها را دوباره چک می‌کند، این فقط
  // برای نمایش فوری پیام خطا به کاربر است، نه تنها خط دفاعی.
  const validateForm = (): string | null => {
    if (Number(formData.pricePerNight) < 1) return "قیمت شبی باید عددی مثبت باشد";
    if (Number(formData.maxGuests) < 1) return "ظرفیت مسافر باید حداقل ۱ نفر باشد";
    if (Number(formData.bedrooms) < 0) return "تعداد اتاق نمی‌تواند منفی باشد";
    if (Number(formData.bathrooms) < 0) return "تعداد سرویس بهداشتی نمی‌تواند منفی باشد";
    if (Number(formData.area) < 1) return "متراژ باید عددی مثبت باشد";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);

    const payload = {
      ...formData,
      pricePerNight: Number(formData.pricePerNight),
      maxGuests: Number(formData.maxGuests),
      bedrooms: Number(formData.bedrooms),
      bathrooms: Number(formData.bathrooms),
      area: Number(formData.area),
      amenities: formData.amenities.split("،").map(a => a.trim()).filter(Boolean),
      images: formData.images.split("\n").map(i => i.trim()).filter(Boolean),
    };

    try {
      const url = isNew ? "/api/admin/accommodations" : `/api/admin/accommodations/${id}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        router.push("/admin/accommodations");
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
          {isNew ? "ثبت اقامتگاه جدید" : "ویرایش اقامتگاه"}
        </h1>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* بخش اطلاعات پایه */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <h2 className="font-black text-slate-700 flex items-center gap-2 border-b border-slate-50 pb-2">
            <Home className="w-5 h-5 text-balkun-cyan" /> اطلاعات پایه
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">عنوان اقامتگاه *</label>
              <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-balkun-cyan outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">دسته‌بندی *</label>
              <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-balkun-cyan outline-none">
                {CATEGORIES.filter(c => !c.isSpecial).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">توضیحات (معرفی) *</label>
            <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-balkun-cyan outline-none resize-none" />
          </div>
        </div>

        {/* بخش موقعیت */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <h2 className="font-black text-slate-700 flex items-center gap-2 border-b border-slate-50 pb-2">
            <MapPin className="w-5 h-5 text-balkun-orange" /> موقعیت مکانی
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">شهر و استان *</label>
              <input required type="text" placeholder="مثال: گیلان، رشت" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">آدرس دقیق *</label>
              <input required type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" />
            </div>
          </div>
        </div>

        {/* بخش ظرفیت و قیمت */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <h2 className="font-black text-slate-700 flex items-center gap-2 border-b border-slate-50 pb-2">
            <DollarSign className="w-5 h-5 text-green-500" /> قیمت و ظرفیت
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">قیمت شبی (تومان) *</label>
              <input required type="number" min={1} step={1} value={formData.pricePerNight} onChange={e => setFormData({...formData, pricePerNight: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none dir-ltr" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">ظرفیت مسافر *</label>
              <input required type="number" min={1} step={1} value={formData.maxGuests} onChange={e => setFormData({...formData, maxGuests: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">تعداد اتاق</label>
              <input type="number" min={0} step={1} value={formData.bedrooms} onChange={e => setFormData({...formData, bedrooms: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">متراژ (متر)</label>
              <input type="number" min={1} step={1} value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" />
            </div>
          </div>
        </div>

        {/* بخش امکانات و رسانه */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <h2 className="font-black text-slate-700 flex items-center gap-2 border-b border-slate-50 pb-2">
            <ListChecks className="w-5 h-5 text-balkun-yellow" /> امکانات و تصاویر
          </h2>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">امکانات (با ویرگول فارسی «،» جدا کنید)</label>
            <input type="text" placeholder="استخر، وایفای، پارکینگ" value={formData.amenities} onChange={e => setFormData({...formData, amenities: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">لینک تصاویر (هر لینک در یک خط جدید)</label>
            <textarea rows={4} dir="ltr" placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg" value={formData.images} onChange={e => setFormData({...formData, images: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">وضعیت نمایش در سایت</label>
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full md:w-64 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none">
              <option value="ACTIVE">فعال (نمایش در سایت)</option>
              <option value="INACTIVE">غیرفعال (مخفی)</option>
              <option value="PENDING_REVIEW">در انتظار بررسی</option>
            </select>
          </div>
        </div>

        <button disabled={isSaving} type="submit" className="w-full md:w-auto md:mr-auto bg-balkun-cyan text-white px-8 py-3.5 rounded-xl font-black text-base hover:bg-balkun-cyan-dark transition-colors shadow-lg shadow-balkun-cyan/20 disabled:opacity-50 flex items-center justify-center gap-2">
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isNew ? "ایجاد اقامتگاه" : "ذخیره تغییرات"}
        </button>
      </form>
    </div>
  );
}