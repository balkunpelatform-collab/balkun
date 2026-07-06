// مسیر مقصد این فایل: src/components/search/SearchSummaryHeader.tsx
//
// 🆕 فاز ۱۱ بخش ۲ (رفع باگ): categoryLabel اضافه شد تا وقتی کاربر از طریق
// دکمه‌ی «مشاهده همه» یک دسته‌بندی خاص (مثلاً ویلا) را انتخاب کرده،
// عنوان صفحه‌ی نتایج هم آن را نشان دهد.

interface SearchSummaryHeaderProps {
  city: string;
  checkin: string;
  checkout: string;
  person: number;
  totalCount: number;
  categoryLabel?: string; // 🆕
}

export default function SearchSummaryHeader({
  city,
  checkin,
  checkout,
  person,
  totalCount,
  categoryLabel,
}: SearchSummaryHeaderProps) {
  const title = categoryLabel
    ? city
      ? `${categoryLabel} در ${city}`
      : categoryLabel
    : city
      ? `اقامتگاه‌های ${city}`
      : "نتایج جستجو";

  return (
    <div className="mb-6">
      <h1 className="text-xl md:text-2xl font-black text-balkun-navy mb-2">
        {title}
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