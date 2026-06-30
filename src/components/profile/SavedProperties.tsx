// مسیر: src/components/profile/SavedProperties.tsx
// کامپوننت نمایش اقامتگاه‌های ذخیره شده (علاقه‌مندی‌ها)

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Star, Loader2 } from "lucide-react";
import { formatPrice } from "@/utils/priceCalculator";

interface SavedProperty {
  id: string;
  roomId: string;
  roomName: string;
  cityName: string;
  stateName: string;
  pricePerNight: number;
  imageUrl: string;
  rating: number;
  savedAt: string;
}

interface SavedPropertiesProps {
  userId: string;
}

export default function SavedProperties({ userId }: SavedPropertiesProps) {
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSavedProperties();
  }, [userId]);

  const fetchSavedProperties = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/user/saved-properties`, {
        headers: {
          Authorization: `Bearer balkun-token-${userId}`
        }
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSavedProperties(data.properties || []);
      } else {
        setError(data.error || "خطا در دریافت اطلاعات");
      }
    } catch (err) {
      setError("خطا در ارتباط با سرور");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (propertyId: string) => {
    try {
      const res = await fetch(`/api/user/saved-properties`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer balkun-token-${userId}`
        },
        body: JSON.stringify({ propertyId })
      });

      const data = await res.json();
      
      if (data.success) {
        setSavedProperties(prev => prev.filter(p => p.id !== propertyId));
      }
    } catch (err) {
      console.error("Error removing property:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-balkun-cyan animate-spin mb-4" />
        <span className="font-bold text-slate-500">در حال بارگذاری...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-[2rem] border border-red-100 p-6 text-center">
        <p className="text-sm font-bold text-red-600">{error}</p>
      </div>
    );
  }

  if (savedProperties.length === 0) {
    return (
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <Heart className="w-10 h-10 text-slate-300" />
        </div>
        <h3 className="text-lg font-black text-slate-700 mb-2">لیست علاقه‌مندی‌ها خالی است</h3>
        <p className="text-sm font-medium text-slate-500 max-w-md leading-relaxed mb-6">
          اقامتگاه‌هایی که دوست دارید را با زدن آیکون قلب ذخیره کنید تا بعداً راحت‌تر به آن‌ها دسترسی داشته باشید.
        </p>
        <Link 
          href="/search"
          className="bg-balkun-cyan text-white px-6 py-3 rounded-xl font-bold hover:bg-balkun-cyan-dark transition-colors shadow-lg shadow-balkun-cyan/20"
        >
          جستجوی اقامتگاه
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 md:p-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <h2 className="text-xl font-black text-balkun-navy">اقامتگاه‌های ذخیره شده</h2>
        <span className="text-sm font-bold text-slate-400">{savedProperties.length} مورد</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {savedProperties.map((property) => (
          <div 
            key={property.id}
            className="border border-slate-100 rounded-2xl overflow-hidden hover:border-balkun-cyan/30 transition-all hover:shadow-md group"
          >
            <div className="relative aspect-video w-full bg-slate-100">
              <Image
                src={property.imageUrl || "/hero1.webp"}
                alt={property.roomName}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <button
                onClick={() => handleRemove(property.id)}
                className="absolute top-3 right-3 w-9 h-9 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-red-50 transition-colors group/btn"
              >
                <Heart className="w-5 h-5 text-red-500 fill-red-500 group-hover/btn:scale-110 transition-transform" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/rooms/${property.roomId}`} className="hover:text-balkun-cyan transition-colors">
                  <h3 className="font-black text-balkun-navy leading-tight line-clamp-1">
                    {property.roomName}
                  </h3>
                </Link>
                <div className="flex items-center gap-1 bg-balkun-yellow/10 px-2 py-1 rounded-lg shrink-0">
                  <Star className="w-3.5 h-3.5 text-balkun-yellow fill-balkun-yellow" />
                  <span className="text-xs font-black text-slate-700">{property.rating.toFixed(1)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-slate-500">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="text-sm font-bold">{property.cityName}، {property.stateName}</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400">قیمت هر شب از</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black text-balkun-cyan">{formatPrice(property.pricePerNight)}</span>
                    <span className="text-[10px] font-bold text-slate-400">تومان</span>
                  </div>
                </div>
                <Link
                  href={`/rooms/${property.roomId}`}
                  className="bg-balkun-orange text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-balkun-orange-dark transition-colors shadow-md shadow-balkun-orange/20"
                >
                  مشاهده و رزرو
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
