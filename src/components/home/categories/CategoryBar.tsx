import { CATEGORIES } from "@/constants/categories";

export default function CategoryBar() {
  return (
    <div className="container mx-auto px-4 mb-12 max-w-5xl">
      {/* 2x4 Grid System as requested by mockup */}
      <div className="grid grid-cols-4 gap-y-6 gap-x-2 md:gap-6">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isSpecial = category.isSpecial;

          return (
            <button
              key={category.id}
              className={`flex flex-col items-center justify-center gap-2 transition-all group ${
                isSpecial ? "text-balkun-orange" : "text-slate-600 hover:text-balkun-navy"
              }`}
            >
              <div 
                className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-2xl transition-all duration-300 ${
                  isSpecial 
                    ? "bg-balkun-orange/10 border border-balkun-orange/20 group-hover:bg-balkun-orange/20 group-hover:scale-105" 
                    : "bg-slate-50 border border-slate-100 group-hover:bg-balkun-cyan/10 group-hover:border-balkun-cyan/30 group-hover:shadow-sm group-hover:-translate-y-1"
                }`}
              >
                <Icon className={`w-7 h-7 md:w-8 md:h-8 ${isSpecial ? "stroke-balkun-orange" : "stroke-current"}`} strokeWidth={1.5} />
              </div>
              <span className={`text-[11px] md:text-sm whitespace-nowrap ${isSpecial ? "font-bold" : "font-semibold"}`}>
                {category.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}