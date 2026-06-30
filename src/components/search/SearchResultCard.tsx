// مسیر مقصد این فایل (فایل جدید): src/components/search/SearchResultCard.tsx
//
// ⚠️ نکته مهم: قیمت‌های این آیتم (basePrice, afterDiscount) از قبل در سمت
// سرور (applySearchMargin.ts) با ۵٪ بالکن محاسبه شده‌اند. اینجا فقط با
// formatPrice فرمت می‌شوند — برخلاف PropertyCard.tsx که برای کارت‌های
// Mock صفحه اصلی، rawPrice خام را خودش ضربدر ۱.۰۵ می‌کند. این دو کامپوننت
// را با هم اشتباه نگیرید، وگرنه ۵٪ دوبار اعمال می‌شود.
//
// لینک هر کارت به /rooms/[id] اشاره دارد که هنوز ساخته نشده (فاز ۴ - PDP).
// تا قبل از فاز ۴، کلیک روی کارت‌ها صفحه ۴۰۴ نشان می‌دهد — طبیعی است.

import Image from "next/image";
import Link from "next/link";
import { Star, MapPin } from "lucide-react";
import { formatPrice } from "@/utils/priceCalculator";
import type { BalkunSearchItem } from "@/lib/otaghak/types";

export default function SearchResultCard({ item }: { item: BalkunSearchItem }) {
  return (
    <Link
      href={`/rooms/${item.roomId}`}
      className="group flex flex-col gap-3 bg-white rounded-3xl p-3 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-200">
        <Image
          src={item.coverImageUrl}
          alt={item.roomName}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-full shadow-sm">
          <MapPin className="w-3 h-3 text-balkun-navy" />
          <span className="text-[10px] font-bold text-slate-700">{item.cityName}</span>
        </div>
      </div>

      <div className="flex flex-col px-1 pt-1">
        <h3 className="font-bold text-sm text-balkun-navy line-clamp-1 mb-1.5">{item.roomName}</h3>

        {item.topAttributes.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2.5 overflow-hidden">
            {item.topAttributes.slice(0, 2).map((attr) => (
              <span
                key={attr}
                className="text-[10px] font-bold text-balkun-cyan bg-balkun-cyan/10 px-2 py-1 rounded-full whitespace-nowrap"
              >
                {attr}
              </span>
            ))}
          </div>
        )}

        {item.rating !== null && (
          <div className="flex items-center gap-1 mb-3">
            <Star className="w-4 h-4 fill-balkun-yellow stroke-balkun-yellow" />
            <span className="text-xs font-bold text-slate-700 pt-0.5">{item.rating}</span>
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-slate-100">
          <p className="text-slate-500 text-xs font-medium flex items-center justify-between">
            <span>شروع از</span>
            <span className="text-base font-black text-balkun-navy">
              {formatPrice(item.afterDiscount)}{" "}
              <span className="text-[10px] font-normal text-slate-400">تومان</span>
            </span>
          </p>
        </div>
      </div>
    </Link>
  );
}
