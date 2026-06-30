// مسیر مقصد این فایل: src/components/home/properties/PropertyList.tsx
// این فایل را به‌طور کامل جایگزین فایل فعلی کنید
//
// تغییر اصلی: به‌جای یک لیست عمومی و تکراری، اکنون هر دسته‌بندی (ویلا، کلبه، سوییت و...)
// ردیف اختصاصی خودش را روی صفحه اصلی دارد. دسته «سازمانی» چون اقامتگاه نیست،
// به‌جای ردیف کارت، یک بنر تبلیغاتی اختصاصی می‌گیرد.

import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { CATEGORIES } from "@/constants/categories";
import { MOCK_PROPERTIES } from "@/constants/mockProperties";
import CategorySection from "./CategorySection";

export default function PropertyList() {
  // دسته سازمانی اقامتگاه نیست، پس از لیست ردیف‌های کارت‌دار کنار گذاشته می‌شود
  const propertyCategories = CATEGORIES.filter((category) => !category.isSpecial);

  return (
    <div className="flex flex-col gap-2 mb-24 md:mb-16">
      {propertyCategories.map((category, index) => {
        const properties = MOCK_PROPERTIES.filter((property) => property.category === category.id);

        return (
          <div key={category.id}>
            <CategorySection
              title={category.label}
              icon={category.icon}
              properties={properties}
              viewAllHref={`/search?category=${category.id}`}
              tinted={index % 2 === 1}
            />

            {/* بعد از سومین دسته‌بندی، بنر معرفی خدمات سازمانی نمایش داده می‌شود */}
            {index === 2 && <CorporateBanner />}
          </div>
        );
      })}
    </div>
  );
}

function CorporateBanner() {
  return (
    <section className="container mx-auto px-4 py-6">
      <Link
        href="/corporate"
        className="group relative flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden rounded-[2rem] bg-balkun-navy px-6 py-8 md:px-10 md:py-10 shadow-lg shadow-balkun-navy/10"
      >
        {/* درخشش‌های تزئینی پس‌زمینه */}
        <div className="absolute -top-10 -left-10 w-48 h-48 bg-balkun-orange/20 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-balkun-cyan/10 rounded-full blur-[90px] pointer-events-none"></div>

        <div className="relative z-10 flex items-center gap-4 text-center md:text-right flex-col md:flex-row">
          <div className="w-14 h-14 rounded-2xl bg-balkun-orange/15 border border-balkun-orange/30 flex items-center justify-center shrink-0">
            <Building2 className="w-7 h-7 text-balkun-orange" />
          </div>
          <div>
            <h3 className="text-lg md:text-2xl font-black text-white mb-1">خدمات سازمانی بالکن</h3>
            <p className="text-sm text-slate-300 font-medium max-w-md">
              کیف پول اختصاصی، فاکتور رسمی و رزرو دسته‌جمعی برای پرسنل شرکت شما
            </p>
          </div>
        </div>

        <span className="relative z-10 flex items-center gap-2 bg-balkun-orange group-hover:bg-balkun-orange-dark text-white px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-300 shrink-0">
          ثبت درخواست
          <ArrowLeft className="w-4 h-4" />
        </span>
      </Link>
    </section>
  );
}