import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import PropertyCard from "./PropertyCard";
import type { MockProperty } from "@/constants/mockProperties";

interface CategorySectionProps {
  title: string;
  image: string;
  properties: MockProperty[];
  viewAllHref: string;
  tinted?: boolean;
}

export default function CategorySection({ title, image, properties, viewAllHref, tinted = false }: CategorySectionProps) {
  if (properties.length === 0) return null;

  return (
    <section className={`w-full py-6 ${tinted ? "bg-slate-50" : "bg-white"}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-2xl bg-balkun-cyan/10 flex items-center justify-center shrink-0">
              <Image src={image} alt={title} fill className="object-contain p-1.5 drop-shadow-sm" sizes="40px" />
            </div>
            <h2 className="text-base md:text-xl font-black text-balkun-navy leading-tight">{title}</h2>
          </div>

          <Link
            href={viewAllHref}
            className="hidden sm:flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-balkun-cyan transition-colors shrink-0"
          >
            مشاهده همه
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="w-full overflow-x-auto pb-2 pt-1 px-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-4 md:gap-6 w-max mx-auto md:mx-0">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              id={property.id}
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

      <div className="flex justify-center mt-3 sm:hidden">
        <Link href={viewAllHref} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-balkun-cyan transition-colors">
          مشاهده همه
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}