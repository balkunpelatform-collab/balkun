"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import type { OtaghakRoomMedia } from "@/lib/otaghak/types";

interface RoomGalleryProps {
  media: OtaghakRoomMedia[];
}

export default function RoomGallery({ media }: RoomGalleryProps) {
  if (!media || media.length === 0) {
    return (
      <div className="w-full h-[300px] md:h-[400px] bg-slate-100 rounded-[2rem] flex items-center justify-center">
        <ImageIcon className="w-10 h-10 text-slate-300" />
      </div>
    );
  }

  const mainImage = media[0];
  // در نسخه دسکتاپ علاوه بر عکس اصلی، حداکثر ۴ عکس دیگر نشان می‌دهیم
  const otherImages = media.slice(1, 5); 

  return (
    <div className="w-full flex flex-col gap-2">
      {/* حالت دسکتاپ (گرید مدرن Bento-style) */}
      <div className="hidden md:grid grid-cols-12 gap-2 h-[400px] lg:h-[500px] rounded-[2rem] overflow-hidden">
        
        {/* تصویر اصلی (بزرگ - سمت راست) */}
        <div className="col-span-12 md:col-span-8 relative h-full group cursor-pointer bg-slate-200">
          <Image
            src={mainImage.url}
            alt="تصویر اصلی اقامتگاه"
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            priority
            sizes="(max-width: 1024px) 66vw, 66vw"
          />
          <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-500"></div>
        </div>

        {/* ۴ تصویر کوچک‌تر (سمت چپ) */}
        <div className="col-span-12 md:col-span-4 grid grid-cols-2 grid-rows-2 gap-2 h-full">
          {otherImages.map((img, idx) => (
            <div key={idx} className="relative h-full w-full group cursor-pointer overflow-hidden bg-slate-200">
              <Image
                src={img.url}
                alt={`تصویر اقامتگاه ${idx + 2}`}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 1024px) 16vw, 16vw"
              />
              <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-500"></div>
            </div>
          ))}
          
          {/* اگر اقامتگاه کمتر از ۵ عکس داشت، فضاهای خالی را با باکس‌های خاکستری ملایم پر می‌کنیم تا ساختار گرید به هم نریزد */}
          {Array.from({ length: Math.max(0, 4 - otherImages.length) }).map((_, idx) => (
            <div key={`empty-${idx}`} className="bg-slate-100 h-full w-full flex items-center justify-center">
               <ImageIcon className="w-6 h-6 text-slate-200" />
            </div>
          ))}
        </div>
      </div>

      {/* حالت موبایل (اسکرول افقی با افکت Snap) */}
      <div className="flex md:hidden overflow-x-auto snap-x snap-mandatory gap-2 pb-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
        {media.map((img, idx) => (
          <div key={idx} className="relative w-full h-[280px] shrink-0 snap-center rounded-[1.5rem] overflow-hidden bg-slate-200">
            <Image
              src={img.url}
              alt={`تصویر اقامتگاه ${idx + 1}`}
              fill
              className="object-cover"
              priority={idx === 0}
              sizes="100vw"
            />
          </div>
        ))}
      </div>
    </div>
  );
}