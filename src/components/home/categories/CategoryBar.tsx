// مسیر: src/components/home/categories/CategoryBar.tsx

import Image from "next/image";
import { CATEGORIES } from "@/constants/categories";

export default function CategoryBar() {
  return (
    <div className="container mx-auto px-4 mb-12 max-w-5xl">
      {/* تغییر از grid به flex-wrap و justify-center برای چینش متقارن هر تعداد آیتم */}
      <div className="flex flex-wrap justify-center gap-y-6 gap-x-4 md:gap-x-8">
        {CATEGORIES.map((category) => {
          const isSpecial = category.isSpecial;
          const isExclusive = category.id === "exclusive"; // برجسته‌تر کردن دسته اختصاصی

          return (
            <button
              key={category.id}
              className={`flex flex-col items-center justify-center gap-2 transition-all group w-[72px] md:w-24 ${
                isSpecial ? "text-balkun-orange" : isExclusive ? "text-balkun-cyan" : "text-slate-600 hover:text-balkun-navy"
              }`}
            >
              <div 
                className={`relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-2xl transition-all duration-300 ${
                  isSpecial 
                    ? "bg-balkun-orange/10 border border-balkun-orange/20 group-hover:bg-balkun-orange/20 group-hover:scale-105" 
                  : isExclusive
                    ? "bg-balkun-cyan/10 border border-balkun-cyan/30 group-hover:bg-balkun-cyan/20 group-hover:shadow-md group-hover:shadow-balkun-cyan/20 group-hover:-translate-y-1"
                    : "bg-slate-50 border border-slate-100 group-hover:bg-balkun-cyan/10 group-hover:border-balkun-cyan/30 group-hover:shadow-sm group-hover:-translate-y-1"
                }`}
              >
                <Image 
                  src={category.image} 
                  alt={category.label} 
                  fill
                  className="object-contain p-2 md:p-3 drop-shadow-sm transition-transform duration-300 group-hover:scale-110"
                  sizes="(max-width: 768px) 64px, 80px"
                />
              </div>
              <span className={`text-[11px] md:text-sm whitespace-nowrap ${isSpecial || isExclusive ? "font-black" : "font-semibold"}`}>
                {category.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}