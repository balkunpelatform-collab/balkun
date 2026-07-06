// مسیر مقصد این فایل: src/components/home/search/FloatingSearchBox.tsx
// این فایل را به‌طور کامل جایگزین فایل فعلی کنید
//
// 🆕 رفع باگ: انتخاب‌گر تاریخ قبلاً از اینپوت استاندارد HTML (type="date") استفاده می‌کرد
// که همیشه با تقویم میلادی نمایش داده می‌شود (مرورگرها از تقویم شمسی پشتیبانی نمی‌کنند).
// اکنون از همان کتابخانه‌ی react-multi-date-picker که در BookingWidget.tsx استفاده شده،
// با تنظیمات تقویم شمسی (persian) و زبان فارسی (persian_fa) استفاده می‌شود.
//
// نکته: خروجی تاریخ همچنان به‌صورت میلادی استاندارد (YYYY-MM-DD) در URL و به سمت
// سرور/دیتابیس ارسال می‌شود (چون بک‌اند و لینک‌های صفحه‌ی جستجو بر همین اساس کار می‌کنند)
// و فقط نمایش آن به کاربر شمسی شده است.
//
// 🆕 رفع باگ دوم: باکس انتخاب تعداد مسافران قبلاً با کلیک بیرون از آن بسته نمی‌شد؛
// اکنون با کلیک در هر جای دیگر صفحه بسته می‌شود.

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, CalendarDays, User, Search, Minus, Plus } from "lucide-react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";
import { HERO_CONTENT } from "@/constants/home";
import type { OtaghakCity } from "@/lib/otaghak/types";

export default function FloatingSearchBox() {
  const router = useRouter();

  const [cities, setCities] = useState<OtaghakCity[]>([]);
  const [selectedCity, setSelectedCity] = useState("");
  // تاریخ ورود و خروج به‌صورت بازه‌ی شمسی (Persian DateObject) نگهداری می‌شود
  const [dates, setDates] = useState<DateObject[]>([]);
  const [person, setPerson] = useState(2);
  const [isPersonOpen, setIsPersonOpen] = useState(false);

  const personBoxRef = useRef<HTMLDivElement>(null);

  // لیست شهرها را یک بار، در بارگذاری اولیه، از زیرساخت فاز ۳ می‌گیریم
  useEffect(() => {
    fetch("/api/otaghak/base-data")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setCities(res.data.cities);
      })
      .catch((err) => console.error("خطا در دریافت لیست شهرها:", err));
  }, []);

  // بستن باکس تعداد مسافران با کلیک در بیرون از آن
  useEffect(() => {
    if (!isPersonOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (personBoxRef.current && !personBoxRef.current.contains(event.target as Node)) {
        setIsPersonOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPersonOpen]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedCity) params.set("city", selectedCity);

    // تبدیل تاریخ‌های انتخاب‌شده (شمسی) به فرمت میلادی استاندارد YYYY-MM-DD
    // برای سازگاری با بک‌اند و پارامترهای صفحه‌ی جستجو
    if (dates.length === 2 && dates[0] && dates[1]) {
      const checkin = dates[0].convert(gregorian, gregorian_en).format("YYYY-MM-DD");
      const checkout = dates[1].convert(gregorian, gregorian_en).format("YYYY-MM-DD");
      params.set("checkin", checkin);
      params.set("checkout", checkout);
    }

    params.set("person", String(person));

    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="relative z-20 container mx-auto px-4 -mt-24 md:-mt-20 mb-8 max-w-5xl">
      <div className="bg-white rounded-[2rem] shadow-2xl shadow-balkun-navy/10 border border-slate-100 p-4 md:p-6">

        <div className="flex flex-col md:flex-row items-center justify-between mb-4 bg-slate-50 md:bg-transparent rounded-2xl md:rounded-none p-2 md:p-0">

          {/* مقصد */}
          <div className="flex-1 w-full flex items-center gap-3 p-3 rounded-xl md:border-l border-slate-200">
            <div className="p-2 bg-balkun-cyan/10 rounded-full text-balkun-cyan shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[11px] font-bold text-slate-400 mb-0.5">مقصد</span>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-sm text-slate-900 font-bold cursor-pointer appearance-none"
              >
                <option value="">همه مقصدها</option>
                {cities.map((city) => (
                  <option key={city.cityCode} value={city.cityName}>
                    {city.cityName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-full h-[1px] md:hidden bg-slate-200 my-1"></div>

          {/* تاریخ ورود / خروج (تقویم شمسی) */}
          <div className="flex-[1.2] w-full flex items-center gap-3 p-3 rounded-xl md:border-l border-slate-200">
            <div className="p-2 bg-balkun-cyan/10 rounded-full text-balkun-cyan shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[11px] font-bold text-slate-400 mb-0.5">تاریخ ورود و خروج</span>
              <DatePicker
                range
                calendar={persian}
                locale={persian_fa}
                value={dates}
                onChange={setDates}
                minDate={new DateObject({ calendar: persian })}
                placeholder="انتخاب تاریخ سفر"
                inputClass="w-full bg-transparent border-none outline-none text-sm text-slate-900 font-bold cursor-pointer placeholder:font-medium placeholder:text-slate-400"
                containerClassName="w-full"
                calendarPosition="bottom-right"
                dateSeparator="  تا  "
                format="YYYY/MM/DD"
              />
            </div>
          </div>

          <div className="w-full h-[1px] md:hidden bg-slate-200 my-1"></div>

          {/* تعداد مسافران */}
          <div className="flex-1 w-full relative" ref={personBoxRef}>
            <button
              type="button"
              onClick={() => setIsPersonOpen((v) => !v)}
              className="w-full flex items-center gap-3 p-3 rounded-xl"
            >
              <div className="p-2 text-slate-400 shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="flex flex-col flex-1 text-right">
                <span className="text-[11px] font-bold text-slate-400 mb-0.5">تعداد مسافران</span>
                <span className="text-sm font-bold text-slate-900">{person} نفر</span>
              </div>
            </button>

            {isPersonOpen && (
              <div className="absolute z-30 top-full mt-2 left-0 right-0 md:left-auto md:w-48 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPerson((p) => Math.max(1, p - 1))}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-bold text-balkun-navy">{person} نفر</span>
                <button
                  type="button"
                  onClick={() => setPerson((p) => Math.min(20, p + 1))}
                  className="w-9 h-9 rounded-full bg-balkun-cyan/10 hover:bg-balkun-cyan/20 flex items-center justify-center text-balkun-cyan transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

        </div>

        <button
          type="button"
          onClick={handleSearch}
          className="h-[52px] w-full bg-balkun-orange hover:bg-balkun-orange-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-balkun-orange/30 hover:shadow-balkun-orange/50 hover:-translate-y-0.5"
        >
          <Search className="w-5 h-5" />
          <span className="text-lg">{HERO_CONTENT.searchButtonText}</span>
        </button>

      </div>
    </div>
  );
}