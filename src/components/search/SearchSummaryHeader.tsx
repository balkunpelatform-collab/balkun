// مسیر مقصد این فایل (فایل جدید): src/components/search/SearchSummaryHeader.tsx

interface SearchSummaryHeaderProps {
  city: string;
  checkin: string;
  checkout: string;
  person: number;
  totalCount: number;
}

export default function SearchSummaryHeader({
  city,
  checkin,
  checkout,
  person,
  totalCount,
}: SearchSummaryHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-xl md:text-2xl font-black text-balkun-navy mb-2">
        {city ? `اقامتگاه‌های ${city}` : "نتایج جستجو"}
      </h1>
      <p className="text-sm text-slate-500 font-medium">
        {checkin && checkout && (
          <>
            {checkin} تا {checkout} ·{" "}
          </>
        )}
        {person} نفر · {totalCount} اقامتگاه پیدا شد
      </p>
    </div>
  );
}
