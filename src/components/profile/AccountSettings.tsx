// مسیر: src/components/profile/AccountSettings.tsx
// کامپوننت تنظیمات حساب کاربری و ویرایش اطلاعات

"use client";

import { useState } from "react";
import { User, Mail, Phone, Save, Briefcase } from "lucide-react";
import type { User as UserType } from "@/types/database";

interface AccountSettingsProps {
  user: UserType;
  onUpdate: (updatedUser: Partial<UserType>) => void;
}

export default function AccountSettings({ user, onUpdate }: AccountSettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email || ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError("نام و نام خانوادگی الزامی است");
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer balkun-token-${user.id}`
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim() || null
        })
      });

      const data = await res.json();

      if (data.success) {
        setSuccess("اطلاعات با موفقیت به‌روزرسانی شد");
        setIsEditing(false);
        onUpdate(data.user);
      } else {
        setError(data.error || "خطا در به‌روزرسانی اطلاعات");
      }
    } catch (err) {
      setError("خطا در ارتباط با سرور");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <h2 className="text-xl font-black text-balkun-navy">تنظیمات حساب کاربری</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm font-bold text-balkun-cyan hover:text-balkun-cyan-dark transition-colors"
          >
            ویرایش اطلاعات
          </button>
        )}
      </div>

      {/* نمایش نوع حساب */}
      {user.userType === "ORGANIZATIONAL" && (
        <div className="mb-6 bg-balkun-orange/5 border border-balkun-orange/20 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-balkun-orange/10 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5 text-balkun-orange" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black text-balkun-orange uppercase tracking-wider mb-1">حساب سازمانی</span>
            <span className="text-base font-black text-slate-800">{user.organizationName}</span>
            <span className="text-xs font-medium text-slate-500 mt-1">
              شما به عنوان کاربر سازمانی از امکانات ویژه بالکن بهره‌مند می‌شوید.
            </span>
          </div>
        </div>
      )}

      {/* پیام‌های خطا و موفقیت */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm font-bold">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-100 text-green-600 p-4 rounded-xl text-sm font-bold">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* نام */}
        <div className="flex flex-col gap-2">
          <label htmlFor="firstName" className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <User className="w-4 h-4 text-balkun-cyan" />
            نام
          </label>
          <input
            id="firstName"
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            disabled={!isEditing}
            className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-colors ${
              isEditing ? "focus:border-balkun-cyan focus:ring-2 focus:ring-balkun-cyan/20" : "cursor-not-allowed opacity-60"
            }`}
            placeholder="نام خود را وارد کنید"
          />
        </div>

        {/* نام خانوادگی */}
        <div className="flex flex-col gap-2">
          <label htmlFor="lastName" className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <User className="w-4 h-4 text-balkun-cyan" />
            نام خانوادگی
          </label>
          <input
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            disabled={!isEditing}
            className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-colors ${
              isEditing ? "focus:border-balkun-cyan focus:ring-2 focus:ring-balkun-cyan/20" : "cursor-not-allowed opacity-60"
            }`}
            placeholder="نام خانوادگی خود را وارد کنید"
          />
        </div>

        {/* شماره موبایل (غیرقابل تغییر) */}
        <div className="flex flex-col gap-2">
          <label htmlFor="phoneNumber" className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-400" />
            شماره موبایل (غیرقابل تغییر)
          </label>
          <input
            id="phoneNumber"
            type="text"
            value={user.phoneNumber}
            disabled
            dir="ltr"
            className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 cursor-not-allowed"
          />
          <span className="text-xs text-slate-400 font-medium">
            شماره موبایل شما به عنوان شناسه اصلی حساب کاربری است و قابل تغییر نیست.
          </span>
        </div>

        {/* ایمیل (اختیاری) */}
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Mail className="w-4 h-4 text-balkun-cyan" />
            ایمیل (اختیاری)
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            disabled={!isEditing}
            dir="ltr"
            className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-colors ${
              isEditing ? "focus:border-balkun-cyan focus:ring-2 focus:ring-balkun-cyan/20" : "cursor-not-allowed opacity-60"
            }`}
            placeholder="example@email.com"
          />
        </div>

        {/* دکمه‌های اکشن */}
        {isEditing && (
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-balkun-cyan text-white px-6 py-3 rounded-xl font-bold hover:bg-balkun-cyan-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-balkun-cyan/20"
            >
              {isSaving ? (
                <span className="animate-pulse">در حال ذخیره...</span>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  ذخیره تغییرات
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email || ""
                });
                setError("");
                setSuccess("");
              }}
              disabled={isSaving}
              className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              انصراف
            </button>
          </div>
        )}
      </form>

      {/* اطلاعات اضافی */}
      <div className="mt-8 pt-6 border-t border-slate-100">
        <h3 className="text-sm font-black text-slate-700 mb-3">اطلاعات حساب</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <span className="text-xs font-bold text-slate-400 block mb-1">تاریخ عضویت</span>
            <span className="text-sm font-bold text-slate-700">
              {new Date(user.joinedAt).toLocaleDateString("fa-IR")}
            </span>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <span className="text-xs font-bold text-slate-400 block mb-1">آخرین ورود</span>
            <span className="text-sm font-bold text-slate-700">
              {new Date(user.lastLoginAt).toLocaleDateString("fa-IR")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
