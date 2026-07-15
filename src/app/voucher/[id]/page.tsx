// مسیر: src/app/voucher/[id]/page.tsx
// 🔒 اصلاحیه امنیتی (بند ۱.۱ تسک تکمیل):
// قبلاً این صفحه بدون هیچ بررسی لاگین یا مالکیتی، اطلاعات رزرو (شامل نام، شماره موبایل و
// کد ملی مهمان) را فقط با داشتن آیدی رزرو در آدرس، به هر بازدیدکننده‌ای نشان می‌داد.
// از این پس: ۱) میدلور (src/middleware.ts) اجازه ورود به این صفحه را فقط به کاربر لاگین‌شده
// می‌دهد، و ۲) همین‌جا هم چک می‌شود که این رزرو واقعاً متعلق به همان کاربر لاگین‌شده باشد؛
// در غیر این صورت صفحه‌ی «یافت نشد» نمایش داده می‌شود (نه خطای دسترسی، تا اطلاعاتی درباره‌ی
// وجود/عدم‌وجود رزرو به کاربر دیگر لو نرود).
//
// 🆕 تسک ۲۱: از این پس رزروهای جدید دیگر کد ملی ندارند (این فیلد از فرم رزرو حذف شد)،
// پس نمایش «کد ملی ثبت‌شده» فقط وقتی رزرو این مقدار را داشته باشد نمایش داده می‌شود
// (رزروهای قدیمی‌تر که قبلاً کد ملی ثبت کرده‌اند، همچنان همان‌طور نمایش داده می‌شوند).

import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatPrice } from "@/utils/priceCalculator";
import { CheckCircle2, MapPin, CalendarDays, Users, ArrowRight } from "lucide-react";
import PrintVoucherButton from "@/components/voucher/PrintVoucherButton";

export default async function VoucherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: bookingId } = await params;

  // 🔒 شناسه کاربر لاگین‌شده را از هدر امن (تزریق‌شده توسط middleware) می‌خوانیم
  const headersList = await headers();
  const currentUserId = headersList.get("x-balkun-user-id");

  if (!currentUserId) {
    notFound();
  }

  // دریافت اطلاعات رزرو از دیتابیس
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("*, users(firstName, lastName, phoneNumber)")
    .eq("id", bookingId)
    .single();

  // 🔒 بررسی مالکیت: این ووچر فقط باید توسط همان کاربری دیده شود که رزرو را ثبت کرده است
  if (!booking || booking.status !== "PAID_CONFIRMED" || booking.userId !== currentUserId) {
    notFound();
  }

  const checkIn = new Date(booking.checkInDate).toLocaleDateString("fa-IR");
  const checkOut = new Date(booking.checkOutDate).toLocaleDateString("fa-IR");
  const guest = booking.users as any;

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 flex justify-center print:bg-white print:py-0">
      <div className="max-w-2xl w-full">
        
        {/* دکمه‌های کنترلی (در زمان پرینت مخفی می‌شوند) */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <Link href="/profile" className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-balkun-navy bg-white px-4 py-2 rounded-xl shadow-sm">
            <ArrowRight className="w-4 h-4" /> بازگشت به پروفایل
          </Link>
          <PrintVoucherButton />
        </div>

        {/* برگه ووچر */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden print:shadow-none print:border-none">
          
          {/* هدر ووچر */}
          <div className="bg-balkun-navy p-8 text-white flex justify-between items-center border-b-4 border-balkun-cyan print:bg-balkun-navy print:text-black">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-black">ووچر اقامتگاه (رسید قطعی)</h1>
              <p className="text-sm text-slate-300 font-medium">کد پیگیری بالکن: <span className="font-mono text-white tracking-widest">{booking.id.split('-')[0].toUpperCase()}</span></p>
            </div>
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center p-2 shadow-lg">
              <Image src="/logo.png" alt="بالکن" width={50} height={50} className="object-contain" />
            </div>
          </div>

          <div className="p-8 flex flex-col gap-8">
            {/* پیام تایید */}
            <div className="flex items-center gap-3 bg-green-50 text-green-700 p-4 rounded-xl border border-green-100">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <p className="text-sm font-bold">رزرو شما با موفقیت قطعی شده است. این برگه را هنگام ورود به میزبان ارائه دهید.</p>
            </div>

            {/* اطلاعات اقامتگاه */}
            <div>
              <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-widest">اطلاعات اقامتگاه</h2>
              <h3 className="text-xl font-black text-balkun-navy mb-2">{booking.roomName}</h3>
              <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-balkun-orange" />
                کد اقامتگاه اتاقک: {booking.roomId}
              </p>
            </div>

            <div className="w-full h-px bg-slate-100 border-t border-dashed border-slate-300"></div>

            {/* جزئیات سفر */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><CalendarDays className="w-3 h-3"/> ورود</span>
                <span className="text-sm font-black text-slate-800">{checkIn}</span>
                <span className="text-[10px] text-slate-500">از ساعت ۱۴:۰۰</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><CalendarDays className="w-3 h-3"/> خروج</span>
                <span className="text-sm font-black text-slate-800">{checkOut}</span>
                <span className="text-[10px] text-slate-500">تا ساعت ۱۲:۰۰</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><Users className="w-3 h-3"/> نفرات</span>
                <span className="text-sm font-black text-slate-800">{booking.basePersonCount + booking.extraPersonCount} مسافر</span>
              </div>
              {/* 🆕 تسک ۲۱: فقط اگر این رزرو (از قبل، پیش از حذف فیلد) کد ملی داشته باشد نمایش داده می‌شود */}
              {booking.nationalCode && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1">کد ملی ثبت‌شده</span>
                  <span className="text-sm font-black text-slate-800 tracking-wider" dir="ltr">{booking.nationalCode}</span>
                </div>
              )}
            </div>

            <div className="w-full h-px bg-slate-100 border-t border-dashed border-slate-300"></div>

            {/* مشخصات مسافر و پرداخت */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-1">مهمان اصلی (رزرو کننده)</span>
                <p className="text-base font-black text-slate-800">{guest.firstName} {guest.lastName}</p>
                <p className="text-sm font-bold text-slate-500 mt-1" dir="ltr">{guest.phoneNumber}</p>
              </div>
              <div className="md:text-left">
                <span className="text-xs font-bold text-slate-400 block mb-1">مبلغ کل پرداخت شده</span>
                <p className="text-2xl font-black text-balkun-cyan">{formatPrice(booking.totalPaidAmount)} <span className="text-xs text-slate-500">تومان</span></p>
                <span className="inline-block mt-2 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-md">پرداخت شده کامل</span>
              </div>
            </div>

          </div>
          
          <div className="bg-balkun-orange p-3 text-center text-white text-[10px] font-bold print:hidden">
            تیم پشتیبانی بالکن به‌صورت ۲۴ ساعته پاسخگوی شماست: ۰۲۱۹۱۰۹۸۵۱۱
          </div>
        </div>

      </div>
    </div>
  );
}