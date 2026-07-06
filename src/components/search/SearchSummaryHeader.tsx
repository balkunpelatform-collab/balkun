// مسیر مقصد این فایل: src/components/search/SearchSummaryHeader.tsx
//
// 🆕 رفع باگ: تاریخ‌های checkin و checkout که از URL می‌آیند به فرمت میلادی
// استاندارد (YYYY-MM-DD) هستند. قبلاً همین رشته‌ی خام میلادی مستقیم نمایش
// داده می‌شد. اکنون قبل از نمایش، با toLocaleDateString("fa-IR") — همان روشی
// که در بقیه‌ی پروژه (کارت رزرو، ووچر و ...) استفاده شده — به تاریخ شمسی
// تبدیل می‌شود.
//
// فاز ۱۱ بخش ۲ (رفع باگ): categoryLabel اضافه شد تا وقتی کاربر از طریق
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

// تبدیل تاریخ میلادی (YYYY-MM-DD) به رشته‌ی نمایشی شمسی
function toJalaliDisplay(isoDate: string): string {
  if (!isoDate) return "";
  const parsed = new Date(isoDate);
  if (isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString("fa-IR");
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

  const checkinDisplay = toJalaliDisplay(checkin);
  const checkoutDisplay = toJalaliDisplay(checkout);

  return (
    <div className="mb-6">
      <h1 className="text-xl md:text-2xl font-black text-balkun-navy mb-2">
        {title}
      </h1>
      <p className="text-sm text-slate-500 font-medium">
        {checkinDisplay && checkoutDisplay && (
          <>
            {checkinDisplay} تا {checkoutDisplay} ·{" "}
          </>
        )}
        {person} نفر · {totalCount} اقامتگاه پیدا شد
      </p>
    </div>
  );
}