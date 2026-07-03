"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, Heart, MapPin } from "lucide-react";
import { applyBalkunMargin, formatPrice } from "@/utils/priceCalculator";

interface PropertyCardProps {
  id: string;
  title: string;
  location: string;
  imageUrl: string;
  rating: number;
  rawPrice: number;
  features: string[];
}

export default function PropertyCard({ id, title, location, imageUrl, rating, rawPrice, features }: PropertyCardProps) {
  const finalPrice = applyBalkunMargin(rawPrice);

  return (
    <Link 
      href={`/rooms/${id}`}
      className="group cursor-pointer flex flex-col gap-3 min-w-[260px] md:min-w-[280px] snap-start bg-white rounded-3xl p-3 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-200">
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        
        <div 
          onClick={(e) => {
            e.preventDefault(); // کلیک روی قلب باعث ورود به صفحه نشود
          }}
          className="absolute top-3 left-3 p-2 rounded-full bg-black/20 backdrop-blur-md hover:bg-white/90 transition-colors group/btn z-10"
        >
          <Heart className="w-5 h-5 text-white group-hover/btn:text-balkun-orange group-hover/btn:fill-balkun-orange transition-colors" />
        </div>
        
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-full shadow-sm z-10">
          <MapPin className="w-3 h-3 text-balkun-navy" />
          <span className="text-[10px] font-bold text-slate-700">{location}</span>
        </div>
      </div>

      <div className="flex flex-col px-1 pt-1">
        <div className="flex justify-between items-start gap-2 mb-1.5">
          <h3 className="font-bold text-sm text-balkun-navy line-clamp-1">{title}</h3>
        </div>

        {features.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2.5 overflow-hidden">
            {features.slice(0, 2).map((feature) => (
              <span
                key={feature}
                className="text-[10px] font-bold text-balkun-cyan bg-balkun-cyan/10 px-2 py-1 rounded-full whitespace-nowrap"
              >
                {feature}
              </span>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-balkun-yellow stroke-balkun-yellow" />
            <span className="text-xs font-bold text-slate-700 pt-0.5">{rating} <span className="text-slate-400 font-normal">(۱۲ نظر)</span></span>
          </div>
        </div>

        <div className="mt-auto pt-3 border-t border-slate-100">
          <p className="text-slate-500 text-xs font-medium flex items-center justify-between">
            <span>شروع از</span>
            <span className="text-base font-black text-balkun-navy">{formatPrice(finalPrice)} <span className="text-[10px] font-normal text-slate-400">تومان</span></span>
          </p>
        </div>
      </div>
    </Link>
  );
}