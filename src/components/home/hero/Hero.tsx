"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { HERO_CONTENT } from "@/constants/home";

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const banners = [
    "/hero1.webp",
    "/hero2.webp"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <section className="relative w-full h-[65vh] min-h-[480px] flex flex-col">
      <div className="absolute inset-0 z-0 overflow-hidden rounded-b-[2.5rem] md:rounded-b-[4rem] shadow-sm bg-balkun-navy">
        
        {banners.map((src, index) => (
          <div 
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image 
              src={src}
              alt={`بنر بالکن ${index + 1}`}
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
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight md:leading-tight drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]">
          {HERO_CONTENT.title}
        </h1>
        <p className="text-base md:text-xl text-slate-50 font-bold drop-shadow-[0_4px_6px_rgba(0,0,0,0.9)] max-w-2xl mx-auto leading-relaxed">
          {HERO_CONTENT.subtitle}
        </p>
      </div>

      <div className="absolute bottom-10 left-0 right-0 z-20 flex justify-center gap-2">
        {banners.map((_, index) => (
          <button 
            key={index}
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