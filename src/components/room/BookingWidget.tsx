"use client";

import { useState } from "react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { CalendarDays, Users, Minus, Plus } from "lucide-react";
import { formatPrice } from "@/utils/priceCalculator";

interface BookingWidgetProps {
  pricePerNight: number;
  baseCapacity: number;
  maxExtraCapacity: number;
}

export default function BookingWidget({ pricePerNight, baseCapacity, maxExtraCapacity }: BookingWidgetProps) {
  // مدیریت وضعیت تاریخ‌ها (بازه زمانی ورود و خروج)
  const [dates, setDates] = useState<DateObject[]>([]);
  // مدیریت تعداد مسافران
  const [guests, setGuests] = useState<number>(baseCapacity);

  const maxTotalCapacity = baseCapacity + maxExtraCapacity;

  // محاسبه تعداد شب‌های اقامت
  // اگر کاربر هر دو تاریخ ورود و خروج را انتخاب کرده باشد، اختلاف روزها را محاسبه می‌کنیم
  const nightsCount =
    dates.length === 2 && dates[0] && dates[1]
      ? Math.max(1, Math.round((dates[1].toUnix() - dates[0].toUnix()) / 86400))
      : 0;

  // محاسبه قیمت نهایی (تعداد شب * قیمت هر شب)
  // نکته: در فازهای بعدی که API تقویم قیمتی وصل شود، قیمت هر روزِ متمایز محاسبه می‌شود.
  const totalPrice = nightsCount * pricePerNight;

  const handleBooking = () => {
    if (dates.length !== 2) {
      alert("لطفاً تاریخ ورود و خروج را مشخص کنید.");
      return;
    }
    // در فاز ۵ (Booking) این بخش به صفحه پیش‌فاکتور و درگاه هدایت می‌شود
    console.log("انتقال به مرحله پرداخت...", {
      checkin: dates[0].format("YYYY/MM/DD"),
      checkout: dates[1].format("YYYY/MM/DD"),
      guests,
      totalPrice
    });
  };

  return (
    <>
      {/* 
        حالت دسکتاپ: باکس چسبان (Sticky)
        این باکس در مانیتورهای بزرگ همیشه همراه کاربر اسکرول می‌شود 
      */}
      <div className="sticky top-24 bg-white border border-slate-100 rounded-[2.5rem] p-6 lg:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)] flex-col gap-6 hidden md:flex">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <span className="text-sm font-bold text-slate-500">شروع قیمت از</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-balkun-orange">
              {formatPrice(pricePerNight)}
            </span>
            <span className="text-xs font-bold text-slate-400">تومان / شب</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* بخش انتخاب تاریخ (تقویم شمسی) */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-500 mb-2">تاریخ سفر</label>
            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl flex items-center px-4 py-3 cursor-pointer hover:border-balkun-cyan transition-colors focus-within:border-balkun-cyan focus-within:ring-2 focus-within:ring-balkun-cyan/20">
              <CalendarDays className="w-5 h-5 text-slate-400 shrink-0 ml-3" />
              <DatePicker
                range
                calendar={persian}
                locale={persian_fa}
                value={dates}
                onChange={setDates}
                minDate={new DateObject({ calendar: persian })}
                placeholder="تاریخ ورود - تاریخ خروج"
                inputClass="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-700 cursor-pointer placeholder:font-medium placeholder:text-slate-400"
                containerClassName="w-full"
                calendarPosition="bottom-right"
                dateSeparator="  تا  "
                format="YYYY/MM/DD"
              />
            </div>
          </div>

          {/* بخش انتخاب تعداد مسافر */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">تعداد مسافران</label>
            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-slate-400 shrink-0" />
                <span className="text-sm font-bold text-slate-700">{guests} مسافر</span>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setGuests((p) => Math.max(1, p - 1))}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-balkun-cyan hover:text-balkun-cyan transition-colors disabled:opacity-30"
                  disabled={guests <= 1}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setGuests((p) => Math.min(maxTotalCapacity, p + 1))}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-balkun-cyan hover:text-balkun-cyan transition-colors disabled:opacity-30"
                  disabled={guests >= maxTotalCapacity}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            {guests > baseCapacity && (
              <p className="text-[10px] font-bold text-balkun-orange mt-2">
                {guests - baseCapacity} نفر اضافه محاسبه می‌شود.
              </p>
            )}
          </div>
        </div>

        {/* فاکتور و محاسبه قیمت نهایی */}
        {nightsCount > 0 && (
          <div className="bg-balkun-cyan/5 rounded-2xl p-4 flex flex-col gap-2 mt-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-slate-600">
                {formatPrice(pricePerNight)} × {nightsCount} شب
              </span>
              <span className="font-bold text-slate-700">{formatPrice(totalPrice)} تومان</span>
            </div>
            <div className="w-full h-px bg-slate-200/50 my-1"></div>
            <div className="flex justify-between items-center">
              <span className="font-black text-slate-700">مجموع کل</span>
              <span className="font-black text-balkun-cyan text-lg">{formatPrice(totalPrice)} <span className="text-xs font-medium">تومان</span></span>
            </div>
          </div>
        )}

        <button 
          onClick={handleBooking}
          className="w-full bg-balkun-orange hover:bg-balkun-orange-dark text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-balkun-orange/30 transition-all duration-300 transform hover:-translate-y-1 mt-2"
        >
          {dates.length === 2 ? "درخواست رزرو" : "انتخاب تاریخ"}
        </button>
      </div>

      {/* 
        حالت موبایل: نوار ثابت پایین صفحه (Bottom Action Bar)
        تجربه کاربری دقیقاً شبیه به اپلیکیشن‌های رزرو استاندارد
      */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 p-4 pb-safe flex justify-between items-center md:hidden shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400">قیمت هر شب از</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-balkun-navy">
              {formatPrice(pricePerNight)}
            </span>
            <span className="text-[10px] font-bold text-slate-400">تومان</span>
          </div>
        </div>
        
        {/* کلیک روی این دکمه کاربر را وادار به اسکرول به تقویم یا باز کردن مدال در فاز ۵ می‌کند */}
        <button 
          className="bg-balkun-orange text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-balkun-orange/30"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          رزرو اقامتگاه
        </button>
      </div>

      {/* اینپوت تقویم برای موبایل (در بدنه صفحه نمایش داده می‌شود تا کاربر اسکرول کند و انتخاب کند) */}
      <div className="md:hidden mt-8 mb-24 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
        <h3 className="font-black text-slate-700">انتخاب تاریخ و مسافران</h3>
        
        <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
          <DatePicker
            range
            calendar={persian}
            locale={persian_fa}
            value={dates}
            onChange={setDates}
            minDate={new DateObject({ calendar: persian })}
            placeholder="تاریخ ورود - تاریخ خروج را انتخاب کنید"
            inputClass="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-700 cursor-pointer placeholder:font-medium placeholder:text-slate-400 text-center"
            containerClassName="w-full flex justify-center"
            dateSeparator="  تا  "
            format="YYYY/MM/DD"
          />
        </div>

        <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-700">{guests} مسافر</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setGuests((p) => Math.max(1, p - 1))} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30" disabled={guests <= 1}><Minus className="w-4 h-4" /></button>
            <button onClick={() => setGuests((p) => Math.min(maxTotalCapacity, p + 1))} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30" disabled={guests >= maxTotalCapacity}><Plus className="w-4 h-4" /></button>
          </div>
        </div>

        {nightsCount > 0 && (
          <div className="bg-balkun-cyan/10 rounded-xl p-3 text-center mt-2">
            <span className="font-black text-balkun-navy">مجموع: {formatPrice(totalPrice)} تومان</span>
          </div>
        )}
      </div>
    </>
  );
}