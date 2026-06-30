// مسیر مقصد این فایل (فایل جدید): src/app/corporate/page.tsx

"use client";

import { useState } from "react";
import { Building2, Wallet, FileText, Users, CheckCircle2, Phone, User } from "lucide-react";

const FEATURES = [
  {
    icon: Wallet,
    title: "کیف پول سازمانی",
    description: "اعتبار اختصاصی برای سازمان شما که توسط تمام پرسنل برای رزرو قابل استفاده است.",
  },
  {
    icon: FileText,
    title: "فاکتور رسمی",
    description: "صدور فاکتور دقیق برای هر رزرو، آماده برای ارائه به واحد حسابداری سازمان شما.",
  },
  {
    icon: Users,
    title: "رزرو دسته‌جمعی پرسنل",
    description: "مدیریت متمرکز سفر و اقامت کارمندان، بدون نیاز به هماهنگی جداگانه برای هر نفر.",
  },
];

export default function CorporatePage() {
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [personnelCount, setPersonnelCount] = useState("");
  const [description, setDescription] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const phoneRegex = /^09[0-9]{9}$/;
    if (!companyName.trim() || !contactPerson.trim()) {
      setError("لطفا نام سازمان و نام رابط را وارد کنید");
      return;
    }
    if (!phoneRegex.test(phoneNumber)) {
      setError("لطفا یک شماره موبایل معتبر وارد کنید (مثال: 09123456789)");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/corporate/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, contactPerson, phoneNumber, personnelCount, description }),
      });
      const data = await res.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        setError(data.error || "خطا در ثبت درخواست");
      }
    } catch (err) {
      setError("خطا در برقراری ارتباط با سرور");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative w-full bg-balkun-navy overflow-hidden rounded-b-[2.5rem] md:rounded-b-[4rem]">
        <div className="absolute -top-16 -left-16 w-72 h-72 bg-balkun-cyan/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-balkun-orange/10 rounded-full blur-[110px] pointer-events-none"></div>

        <div className="relative z-10 container mx-auto px-4 py-16 md:py-24 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-balkun-orange/15 border border-balkun-orange/30 flex items-center justify-center mb-6">
            <Building2 className="w-8 h-8 text-balkun-orange" />
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-white mb-4 leading-tight max-w-2xl">
            خدمات سازمانی بالکن
          </h1>
          <p className="text-sm md:text-lg text-slate-300 font-medium max-w-xl leading-relaxed">
            سفر و اقامت پرسنل شرکت شما، با کیف پول اختصاصی، فاکتور رسمی و یک پنل ساده برای مدیریت همه‌چیز.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 -mt-10 md:-mt-12 relative z-10 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-lg shadow-slate-900/5 flex flex-col items-start"
              >
                <div className="w-12 h-12 rounded-2xl bg-balkun-cyan/10 flex items-center justify-center text-balkun-cyan mb-4">
                  <Icon className="w-6 h-6" strokeWidth={2} />
                </div>
                <h3 className="font-black text-balkun-navy mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Lead Form Section */}
      <section className="container mx-auto px-4 mb-24 md:mb-20">
        <div className="max-w-xl mx-auto bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-10">
          {isSuccess ? (
            <div className="flex flex-col items-center text-center py-8">
              <div className="w-16 h-16 rounded-full bg-balkun-cyan/10 flex items-center justify-center mb-5">
                <CheckCircle2 className="w-9 h-9 text-balkun-cyan" />
              </div>
              <h2 className="text-xl font-black text-balkun-navy mb-2">درخواست شما ثبت شد</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-sm">
                کارشناسان بخش سازمانی بالکن به‌زودی با شماره {phoneNumber} تماس می‌گیرند تا جزئیات همکاری را با شما هماهنگ کنند.
              </p>
            </div>
          ) : (
            <>
              <div className="text-right mb-8">
                <h2 className="text-xl font-black text-balkun-navy mb-2">ثبت درخواست همکاری</h2>
                <p className="text-sm font-medium text-slate-500">
                  اطلاعات سازمان خود را وارد کنید تا کارشناسان بالکن در سریع‌ترین زمان با شما تماس بگیرند.
                </p>
              </div>

              {error && (
                <div className="w-full bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold mb-6 text-right">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <Building2 className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="نام شرکت یا سازمان"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-4 pr-12 pl-4 text-right font-bold focus:outline-none focus:ring-2 focus:ring-balkun-cyan/50 focus:border-balkun-cyan transition-all"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="نام و نام خانوادگی رابط"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-4 pr-12 pl-4 text-right font-bold focus:outline-none focus:ring-2 focus:ring-balkun-cyan/50 focus:border-balkun-cyan transition-all"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <Phone className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    dir="ltr"
                    placeholder="09123456789"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
                    maxLength={11}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-4 pr-12 pl-4 text-left font-bold focus:outline-none focus:ring-2 focus:ring-balkun-cyan/50 focus:border-balkun-cyan transition-all"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <Users className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    type="number"
                    min="1"
                    placeholder="تعداد تخمینی پرسنل"
                    value={personnelCount}
                    onChange={(e) => setPersonnelCount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-4 pr-12 pl-4 text-right font-bold focus:outline-none focus:ring-2 focus:ring-balkun-cyan/50 focus:border-balkun-cyan transition-all"
                  />
                </div>

                <textarea
                  placeholder="توضیحات و نیازمندی‌های سازمان (اختیاری)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-4 px-4 text-right font-medium text-sm focus:outline-none focus:ring-2 focus:ring-balkun-cyan/50 focus:border-balkun-cyan transition-all resize-none"
                />

                <button
                  disabled={isLoading}
                  type="submit"
                  className="w-full bg-balkun-orange hover:bg-balkun-orange-dark text-white rounded-2xl py-4 font-bold text-lg transition-all duration-300 shadow-lg shadow-balkun-orange/30 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {isLoading ? <span className="animate-pulse">در حال ثبت...</span> : "ثبت درخواست همکاری"}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}