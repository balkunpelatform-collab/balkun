// مسیر مقصد این فایل (فایل جدید): src/app/search/page.tsx
//
// این صفحه به‌صورت Server Component مستقیماً از searchService استفاده می‌کند
// (نه از طریق fetch به روت API) تا یک رفت‌و‌برگشت شبکه اضافه حذف شود و
// رندر اول صفحه کاملاً سمت سرور (SSR) باشد — هم برای سرعت، هم برای سئو.
//
// روت /api/otaghak/search همچنان برای استفاده‌های آینده سمت کلاینت
// (مثلاً فیلتر کردن بدون رفرش کامل صفحه) باقی می‌ماند.

import { searchRooms } from "@/lib/otaghak/services/searchService";
import SearchSummaryHeader from "@/components/search/SearchSummaryHeader";
import SearchResultsList from "@/components/search/SearchResultsList";

interface SearchPageProps {
  searchParams: Promise<{
    city?: string;
    checkin?: string;
    checkout?: string;
    person?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  const city = params.city ?? "";
  const checkin = params.checkin ?? "";
  const checkout = params.checkout ?? "";
  const person = params.person ? Number(params.person) : 1;

  const result = await searchRooms({
    checkin,
    checkout,
    person,
    cities: city ? [city] : undefined,
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <SearchSummaryHeader
        city={city}
        checkin={checkin}
        checkout={checkout}
        person={person}
        totalCount={result.totalCount}
      />
      <SearchResultsList items={result.items} />
    </div>
  );
}
