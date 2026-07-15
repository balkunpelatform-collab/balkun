// مسیر مقصد این فایل: src/app/search/page.tsx
//
// این صفحه به‌صورت Server Component مستقیماً از searchService استفاده می‌کند
// (نه از طریق fetch به روت API) تا یک رفت‌و‌برگشت شبکه اضافه حذف شود و
// رندر اول صفحه کاملاً سمت سرور (SSR) باشد — هم برای سئو، هم برای سرعت.
//
// روت /api/otaghak/search همچنان برای استفاده‌های آینده سمت کلاینت
// (مثلاً فیلتر کردن بدون رفرش کامل صفحه) باقی می‌ماند.
//
// 🆕 فاز ۱۱ بخش ۲ (رفع باگ): پارامتر category از URL خوانده و به searchRooms
// پاس داده می‌شود (قبلاً این پارامتر اصلاً خوانده نمی‌شد، با اینکه دکمه‌ی
// «مشاهده همه» در صفحه‌ی اصلی به /search?category=... لینک می‌داد).
//
// 🆕 تسک ۱۲ چک‌لیست کارفرما (نمایش جستجوی بالای صفحات دسته‌بندی اقامتگاه):
// این صفحه همان صفحه‌ای است که با انتخاب هر دسته‌بندی (کلبه، اقامتگاه اختصاصی،
// ویلا-سوئیت و ...) از CategoryBar باز می‌شود (نگاه کنید به
// src/components/home/categories/CategoryBar.tsx: هر دسته به آدرس
// /search?category=... لینک می‌دهد). طبق درخواست، همان باکس جستجوی صفحه‌ی اول
// (FloatingSearchBox) حالا بالای همین صفحه هم نمایش داده می‌شود — با
// variant="inline" (بدون حاشیه‌ی منفی مخصوص روی-بنر بودن) و از قبل پر شده با
// همان فیلترهایی که کاربر همین الان با آن‌ها به این صفحه رسیده (مقصد، تاریخ،
// تعداد نفرات)، تا کاربر بتواند بدون بازگشت به صفحه‌ی اول، جست‌وجوی خود را از
// همین‌جا هم اصلاح/تکرار کند.

import { searchRooms } from "@/lib/otaghak/services/searchService";
import { CATEGORIES } from "@/constants/categories";
import FloatingSearchBox from "@/components/home/search/FloatingSearchBox";
import SearchSummaryHeader from "@/components/search/SearchSummaryHeader";
import SearchResultsList from "@/components/search/SearchResultsList";

interface SearchPageProps {
  searchParams: Promise<{
    city?: string;
    checkin?: string;
    checkout?: string;
    person?: string;
    category?: string; // 🆕
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  const city = params.city ?? "";
  const checkin = params.checkin ?? "";
  const checkout = params.checkout ?? "";
  const person = params.person ? Number(params.person) : 1;
  const category = params.category ?? "";

  // برچسب فارسی دسته‌بندی برای نمایش در عنوان صفحه‌ی نتایج
  const categoryLabel = category ? CATEGORIES.find((c) => c.id === category)?.label ?? "" : "";

  const result = await searchRooms({
    checkin,
    checkout,
    person,
    cities: city ? [city] : undefined,
    category: category || undefined,
  });

  return (
    <div className="flex flex-col w-full">
      {/* 🆕 تسک ۱۲: باکس جستجوی صفحه‌ی اول، حالا بالای همین صفحه (نتایج/دسته‌بندی) هم
          نمایش داده می‌شود؛ از قبل با همان فیلترهای فعلی کاربر پر شده و در صورت
          جست‌وجوی دوباره، اگر یک دسته‌بندی خاص فعال بود، همان دسته‌بندی حفظ می‌شود. */}
      <FloatingSearchBox
        variant="inline"
        initialCity={city}
        initialCheckin={checkin}
        initialCheckout={checkout}
        initialPerson={person || 2}
        category={category}
      />

      <div className="container mx-auto px-4 pb-8 max-w-6xl">
        <SearchSummaryHeader
          city={city}
          checkin={checkin}
          checkout={checkout}
          person={person}
          totalCount={result.totalCount}
          categoryLabel={categoryLabel}
        />
        <SearchResultsList items={result.items} />
      </div>
    </div>
  );
}