import { ArrowLeft } from "lucide-react";
import { MOCK_PROPERTIES } from "@/constants/mockProperties";
import PropertyCard from "./PropertyCard";

export default function PropertyList() {
  return (
    <div className="flex flex-col gap-12 mb-24 md:mb-16">
      
      {/* Section 1: Suggested Properties */}
      <section className="w-full">
        <div className="container mx-auto px-4 flex items-center justify-center gap-2 mb-6">
          <span className="w-12 h-[1px] bg-slate-200"></span>
          <h2 className="text-lg md:text-xl font-black text-balkun-navy">اقامتگاه‌های پیشنهادی</h2>
          <span className="w-12 h-[1px] bg-slate-200"></span>
        </div>

        {/* Horizontal Scrollable List */}
        <div className="w-full overflow-x-auto pb-6 pt-2 px-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
          <div className="flex gap-4 md:gap-6 w-max mx-auto md:mx-0">
            {MOCK_PROPERTIES.map((property) => (
              <PropertyCard
                key={property.id}
                title={property.title}
                location={property.location}
                imageUrl={property.imageUrl}
                rating={property.rating}
                rawPrice={property.rawPrice}
                features={property.features}
              />
            ))}
            {/* تکرار داده‌ها فقط برای اینکه تو فاز تستی صفحه پر و شلوغ به نظر برسه */}
            {MOCK_PROPERTIES.map((property) => (
              <PropertyCard
                key={`${property.id}-dup`}
                title={property.title}
                location={property.location}
                imageUrl={property.imageUrl}
                rating={property.rating}
                rawPrice={property.rawPrice}
                features={property.features}
              />
            ))}
          </div>
        </div>

        {/* View All Button */}
        <div className="flex justify-center mt-2">
          <button className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-balkun-cyan transition-colors">
            مشاهده همه
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Section 2: Special Offers (شلوغ‌سازی صفحه با یه سکشن رنگی) */}
      <section className="w-full bg-balkun-cyan/5 py-10">
        <div className="container mx-auto px-4 flex items-center justify-between mb-6">
          <h2 className="text-lg md:text-xl font-black text-balkun-navy">ویلاهای استخردار لوکس</h2>
          <button className="flex items-center gap-1 text-xs font-bold text-balkun-cyan hover:text-balkun-navy transition-colors">
            مشاهده همه
            <ArrowLeft className="w-3 h-3" />
          </button>
        </div>

        <div className="w-full overflow-x-auto pb-4 px-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
          <div className="flex gap-4 md:gap-6 w-max mx-auto md:mx-0">
            {/* لیست رو معکوس دادم که ظاهرش متفاوت باشه */}
            {[...MOCK_PROPERTIES].reverse().map((property) => (
              <PropertyCard
                key={`pool-${property.id}`}
                title={property.title}
                location={property.location}
                imageUrl={property.imageUrl}
                rating={property.rating}
                rawPrice={property.rawPrice}
                features={property.features}
              />
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}