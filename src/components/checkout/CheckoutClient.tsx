// مسیر: src/components/checkout/CheckoutClient.tsx
// 🆕 تسک ۲۱: فیلد «کد ملی مهمان اصلی» طبق درخواست کارفرما حذف شد. این کد فقط در
// دیتابیس خود بالکن ذخیره می‌شد و اصلاً به اتاقک ارسال نمی‌گردید؛ چون طبق نیاز
// فعلی پروژه دیگر لازم نیست، کل بخش ورودی/اعتبارسنجی آن از فرم ثبت رزرو برداشته شد.
//
// 🆕 تسک ۱۷ چک‌لیست کارفرما (نمایش مبلغ رزرو زیر تاریخ اقامتگاه): تا قبل از این
// تغییر، در ستون «خلاصه اقامتگاه» (سمت چپ صفحه‌ی تسویه‌حساب) فقط «تاریخ سفر» و
// «نفرات» نمایش داده می‌شد و مبلغ نهایی رزرو فقط در ستون سمت راست («جزئیات
// صورت‌حساب») دیده می‌شد. چون آن ستون در موبایل معمولاً پایین‌تر از باکس خلاصه
// قرار می‌گیرد، کاربر برای دیدن مبلغ باید اسکرول می‌کرد و اطلاعات رزرو یک‌جا و
// شفاف در دسترس نبود. برای رفع این مورد، یک ردیف جدید «مبلغ رزرو» دقیقاً زیر
// ردیف «تاریخ سفر» در همین باکس خلاصه اضافه شد (با آیکن Receipt، هم‌الگو با
// ردیف مشابه در BookingCard.tsx). این یک تغییر خالص UI است؛ مقدار از همان prop
// موجود totalAmount خوانده می‌شود و هیچ محاسبه یا فراخوانی جدیدی لازم نبود.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/store/authStore";
import { formatPrice } from "@/utils/priceCalculator";
import { CalendarDays, Users, MapPin, CheckCircle2, ShieldCheck, ArrowRight, Receipt } from "lucide-react";
import type { BalkunRoomDetails } from "@/lib/otaghak/types";

interface CheckoutClientProps {
  room: BalkunRoomDetails;
  checkinUnix: number;
  checkoutUnix: number;
  guests: number;
  nights: number;
  nightlyRate: number;
  totalAmount: number;
}

export default function CheckoutClient({
  room,
  checkinUnix,
  checkoutUnix,
  guests,
  nights,
  nightlyRate,
  totalAmount
}: CheckoutClientProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const checkinDate = new Date(checkinUnix * 1000).toLocaleDateString("fa-IR");
  const checkoutDate = new Date(checkoutUnix * 1000).toLocaleDateString("fa-IR");

  const handleSubmit = async () => {
    if (!user) return;
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.roomId,
          checkinUnix,
          checkoutUnix,
          guests,
          userId: user.id,
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        // رزرو ثبت شد و در انتظار پرداخت است. هدایت به داشبورد
        router.push("/profile?tab=active");
      } else {
        setError(data.error || "خطایی در ثبت رزرو رخ داد");
      }
    } catch (err) {
      setError("خطا در ارتباط با سرور");
    } finally {
      setIsLoading(false);
    }
  };

  // اگه کاربر لاگین نیست، اینترفیس قفل می‌شه
  if (!isAuthenticated || !user) {
    return (
      <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-100 shadow-sm flex flex-col items-center text-center max-w-lg mx-auto mt-10">
        <div className="w-20 h-20 bg-balkun-orange/10 rounded-full flex items-center justify-center mb-6">
          <ShieldCheck className="w-10 h-10 text-balkun-orange" />
        </div>
        <h2 className="text-xl font-black text-balkun-navy mb-3">برای ثبت رزرو وارد شوید</h2>
        <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
          برای حفظ امنیت و پیگیری آسان رزروها، لطفاً ابتدا وارد حساب کاربری خود در بالکن شوید. اطلاعات این رزرو محفوظ است.
        </p>
        <Link 
          href="/login"
          className="w-full bg-balkun-cyan hover:bg-balkun-cyan-dark text-white rounded-2xl py-4 font-bold transition-all shadow-lg shadow-balkun-cyan/30 flex justify-center items-center"
        >
          ورود یا ثبت‌نام در بالکن
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
        <button onClick={() => router.back()} className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-50">
          <ArrowRight className="w-5 h-5 text-slate-700" />
        </button>
        <h1 className="text-2xl font-black text-balkun-navy">تایید نهایی و فاکتور</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* ستون فاکتور و ثبت (سمت راست) */}
        <div className="md:col-span-7 flex flex-col gap-6">
          
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col gap-4">
            <h2 className="text-lg font-black text-slate-800">مشخصات رزروکننده</h2>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-slate-700">{user.firstName} {user.lastName}</span>
              <span className="text-sm text-slate-500">{user.phoneNumber}</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col gap-6">
            <h2 className="text-lg font-black text-slate-800">جزئیات صورت‌حساب</h2>
            
            <div className="flex flex-col gap-4 text-sm font-medium text-slate-600">
              <div className="flex justify-between">
                <span>قیمت هر شب (برای {guests} مسافر)</span>
                <span>{formatPrice(nightlyRate)} تومان</span>
              </div>
              <div className="flex justify-between">
                <span>تعداد شب‌های اقامت</span>
                <span>{nights} شب</span>
              </div>
              
              <div className="w-full h-px bg-slate-100 my-2"></div>
              
              <div className="flex justify-between items-center">
                <span className="font-black text-slate-800">مبلغ نهایی قابل پرداخت</span>
                <span className="text-xl font-black text-balkun-cyan">{formatPrice(totalAmount)} <span className="text-xs">تومان</span></span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold">
              {error}
            </div>
          )}

          <button 
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full bg-balkun-orange hover:bg-balkun-orange-dark text-white text-lg rounded-2xl py-5 font-black transition-all shadow-xl shadow-balkun-orange/30 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <span className="animate-pulse">در حال ثبت رزرو...</span> : (
              <>
                تایید و ثبت رزرو
                <CheckCircle2 className="w-6 h-6" />
              </>
            )}
          </button>
          
          <p className="text-xs text-slate-400 text-center font-medium mt-2">
            با کلیک روی ثبت رزرو، شرایط و قوانین لغو اقامتگاه را می‌پذیرید.
          </p>
        </div>

        {/* ستون خلاصه اقامتگاه (سمت چپ) */}
        <div className="md:col-span-5">
          <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 sticky top-24 flex flex-col gap-5">
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-200">
              <Image 
                src={room.roomMedia[0]?.url || "/hero1.webp"} 
                alt={room.roomName} 
                fill 
                className="object-cover" 
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {room.stateName}، {room.cityName}
              </span>
              <h3 className="font-black text-balkun-navy leading-tight">{room.roomName}</h3>
            </div>

            <div className="w-full h-px bg-slate-200/50"></div>

            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-xl border border-slate-100 shrink-0">
                  <CalendarDays className="w-5 h-5 text-balkun-cyan" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400">تاریخ سفر</span>
                  <span className="text-sm font-bold text-slate-700 mt-1">{checkinDate} تا {checkoutDate}</span>
                </div>
              </div>

              {/* 🆕 تسک ۱۷ — مبلغ رزرو دقیقاً زیر تاریخ اقامتگاه نمایش داده می‌شود */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-xl border border-slate-100 shrink-0">
                  <Receipt className="w-5 h-5 text-balkun-cyan" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400">مبلغ رزرو</span>
                  <span className="text-sm font-black text-balkun-cyan mt-1">
                    {formatPrice(totalAmount)} <span className="text-[10px] font-bold text-slate-500">تومان</span>
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-xl border border-slate-100 shrink-0">
                  <Users className="w-5 h-5 text-balkun-orange" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400">نفرات</span>
                  <span className="text-sm font-bold text-slate-700 mt-1">{guests} مسافر</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}