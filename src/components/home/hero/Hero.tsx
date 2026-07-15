"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { HERO_CONTENT } from "@/constants/home";
import type { HomepageBanner } from "@/types/database";

// 🆕 تسک ۱۸ چک‌لیست کارفرما (امکان تغییر بنر اصلی صفحه اول): این کامپوننت دیگر
// بنرها را از یک آرایه‌ی هاردکدشده نمی‌خواند؛ بنرها را به‌عنوان prop از
// src/app/page.tsx (که خودش آن‌ها را از دیتابیس، از طریق
// src/lib/banners/bannerService.ts، می‌خواند) دریافت می‌کند. هر بنر می‌تواند
// عنوان/زیرعنوان/برچسب‌کمپین/لینک اختصاصی خودش را داشته باشد؛ اگر عنوان یا
// زیرعنوان برای یک بنر خالی باشد، از متن پیش‌فرض سراسری (HERO_CONTENT) استفاده
// می‌شود تا هیچ‌وقت متن روی بنر خالی نماند.
//
// حالت محافظتی: اگر به هر دلیلی (مثلاً همه‌ی بنرها در پنل غیرفعال/حذف شده باشند،
// یا دیتابیس در دسترس نباشد) آرایه‌ی banners خالی برسد، یک بنر پیش‌فرض محلی (همان
// hero1.webp قدیمی) نمایش داده می‌شود تا صفحه‌ی اصلی هیچ‌وقت بدون بنر یا خراب دیده
// نشود — دقیقاً همان فلسفه‌ی دفاعی که در رفع باگ زنگوله‌ی نوتیف هم استفاده شد.

interface HeroProps {
  banners: HomepageBanner[];
}

const FALLBACK_BANNER: HomepageBanner = {
  id: "fallback",
  imageUrl: "/hero1.webp",
  title: HERO_CONTENT.title,
  subtitle: HERO_CONTENT.subtitle,
  badgeText: null,
  linkUrl: null,
  displayOrder: 0,
  isActive: true,
  createdAt: "",
  updatedAt: "",
};

export default function Hero({ banners }: HeroProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = banners && banners.length > 0 ? banners : [FALLBACK_BANNER];

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // اگر تعداد بنرها کم شود (مثلاً از پنل یکی حذف/غیرفعال شود) و اسلاید فعلی از
  // بازه‌ی موجود خارج بماند، به اولین اسلاید برمی‌گردیم تا صفحه سفید یا خراب نشود.
  useEffect(() => {
    if (currentSlide > slides.length - 1) setCurrentSlide(0);
  }, [slides.length, currentSlide]);

  const activeSlide = slides[currentSlide] ?? slides[0];

  const overlayContent = (
    <>
      {activeSlide.badgeText && (
        <span className="inline-block mb-4 px-4 py-1.5 rounded-full bg-balkun-orange text-white text-xs md:text-sm font-black shadow-lg shadow-balkun-orange/30">
          {activeSlide.badgeText}
        </span>
      )}
      <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight md:leading-tight drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]">
        {activeSlide.title?.trim() || HERO_CONTENT.title}
      </h1>
      <p className="text-base md:text-xl text-slate-50 font-bold drop-shadow-[0_4px_6px_rgba(0,0,0,0.9)] max-w-2xl mx-auto leading-relaxed">
        {activeSlide.subtitle?.trim() || HERO_CONTENT.subtitle}
      </p>
    </>
  );

  return (
    <section className="relative w-full h-[65vh] min-h-[480px] flex flex-col">
      <div className="absolute inset-0 z-0 overflow-hidden rounded-b-[2.5rem] md:rounded-b-[4rem] shadow-sm bg-balkun-navy">

        {slides.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={banner.imageUrl}
              alt={banner.title?.trim() || `بنر بالکن ${index + 1}`}
              fill
              className="object-cover"
              priority={index === 0}
            />
          </div>
        ))}

        {/* گرادیانت ترکیبی جدید: بالا تاریک برای هدر، پایین تاریک برای خوانایی متن */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-balkun-navy/60 via-black/20 to-balkun-navy/95"></div>
      </div>

      {/* Content */}
      <div className="relative z-20 text-center px-4 max-w-4xl mx-auto mt-24 md:mt-32">
        {activeSlide.linkUrl?.trim() ? (
          <Link href={activeSlide.linkUrl} className="block">
            {overlayContent}
          </Link>
        ) : (
          overlayContent
        )}
      </div>

      <div className="absolute bottom-10 left-0 right-0 z-20 flex justify-center gap-2">
        {slides.map((banner, index) => (
          <button
            key={banner.id}
            onClick={() => setCurrentSlide(index)}
            aria-label={`تغییر به اسلاید ${index + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? "w-8 bg-balkun-orange shadow-[0_0_10px_rgba(243,112,33,0.8)]"
                : "w-2 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
