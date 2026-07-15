import Hero from "@/components/home/hero/Hero";
import FloatingSearchBox from "@/components/home/search/FloatingSearchBox";
import CategoryBar from "@/components/home/categories/CategoryBar";
import PropertyList from "@/components/home/properties/PropertyList";
import { getActiveBanners } from "@/lib/banners/bannerService";

// 🆕 تسک ۱۸ چک‌لیست کارفرما (امکان تغییر بنر اصلی صفحه اول): صفحه‌ی اصلی از این
// پس صراحتاً force-dynamic است تا وقتی ادمین از پنل بنر را تغییر می‌دهد، بدون نیاز
// به دیپلوی یا ری‌بیلد جدید، بلافاصله در سایت دیده شود — دقیقاً همان الگوی رفع
// مشکل کش که قبلاً برای صفحات عمومی بلاگ اعمال شده بود (src/app/blog/page.tsx).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const banners = await getActiveBanners();

  return (
    <div className="flex flex-col w-full">
      {/* بخش بنر اصلی */}
      <Hero banners={banners} />
      
      {/* باکس جستجوی شناور */}
      <FloatingSearchBox />
      
      {/* نوار دسته‌بندی‌ها با اسکرول افقی */}
      <CategoryBar />

      {/* لیست اقامتگاه‌ها */}
      <PropertyList />
    </div>
  );
}
