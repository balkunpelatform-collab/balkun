import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { CATEGORIES } from "@/constants/categories";
import { MOCK_PROPERTIES } from "@/constants/mockProperties";
import type { MockProperty } from "@/constants/mockProperties";
import { OTAGHAK_CONFIG } from "@/lib/otaghak/config";
import CategorySection from "./CategorySection";
import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function PropertyList() {
  // دسته سازمانی اقامتگاه نیست، پس از لیست ردیف‌های کارت‌دار کنار گذاشته می‌شود
  const propertyCategories = CATEGORIES.filter((category) => !category.isSpecial);

  let realProperties: MockProperty[] = [];
  try {
    // گرفتن اقامتگاه‌های فعال از دیتابیس بالکن
    const { data } = await supabaseAdmin
      .from("accommodations")
      .select("*")
      .eq("status", "ACTIVE")
      .order("createdAt", { ascending: false });

    if (data) {
      realProperties = data.map((acc) => ({
        id: acc.id,
        title: acc.title,
        location: acc.location,
        imageUrl: acc.images && acc.images.length > 0 ? acc.images[0] : "/hero1.webp",
        rating: acc.rating || 5.0,
        rawPrice: acc.pricePerNight,
        features: acc.amenities || [],
        category: acc.category,
      }));
    }
  } catch (error) {
    console.error("Error fetching real accommodations:", error);
  }

  return (
    <div className="flex flex-col gap-2 mb-24 md:mb-16">
      {propertyCategories.map((category, index) => {
        // 🆕 فاز ۱۱ / بخش ۵ (تصمیم محصولی نهایی شد):
        // اگر حداقل یک اقامتگاه واقعی در این دسته‌بندی وجود داشته باشد،
        // آیتم‌های موک/تستی برای همان دسته‌بندی اصلاً نمایش داده نمی‌شوند.
        const realForCategory = realProperties.filter((property) => property.category === category.id);

        // 🆕 رفع باگ: آیتم‌های Mock فقط تا زمانی نمایش داده می‌شوند که
        // API واقعی اتاقک هنوز وصل نشده باشد (OTAGHAK_CONFIG.useMock === true).
        // به محض این‌که آدرس واقعی اتاقک در .env.local تنظیم شود و
        // OTAGHAK_USE_MOCK=false گردد، این فایل Mock به‌طور خودکار کنار
        // گذاشته می‌شود و دیگر هیچ‌جا نمایش داده نخواهد شد.
        const mockForCategory = OTAGHAK_CONFIG.useMock
          ? MOCK_PROPERTIES.filter((property) => property.category === category.id)
          : [];

        const properties = realForCategory.length > 0 ? realForCategory : mockForCategory;

        return (
          <div key={category.id}>
            <CategorySection
              title={category.label}
              image={category.image}
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