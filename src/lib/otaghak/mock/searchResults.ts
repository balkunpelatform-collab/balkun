// مسیر مقصد این فایل: src/lib/otaghak/mock/searchResults.ts
//
// 🆕 رفع باگ (بخش ۱۱ گزارش‌شده توسط کارفرما):
// قبلاً این فایل شامل ۳ آیتم ساختگیِ ثابت (RM-1001, RM-1002, RM-1003) بود که
// هیچ ربطی به محصولات واقعیِ هر دسته‌بندی نداشتند و در نتیجه با کلیک روی
// خیلی از دسته‌بندی‌ها یا چیز اشتباهی نشان داده می‌شد یا هیچ نتیجه‌ای پیدا نمی‌شد.
//
// از الان، نتایج جستجوی Mock مستقیماً از src/constants/mockProperties.ts
// ساخته می‌شوند — همان فایلی که آیتم دقیق و صحیح هر دسته‌بندی در آن است.
// یعنی این فایل و صفحه‌ی اصلی (PropertyList.tsx) از یک منبع واحد می‌خوانند
// و همیشه با هم هماهنگ می‌مانند.
//
// قیمت‌های این فایل «خام» هستند (پیش از اعمال ۵٪ بالکن) — اعمال ۵٪ وظیفه‌ی
// searchService است (از طریق applySearchMargin).
//
// 🆕 وقتی API واقعی اتاقک وصل شود (OTAGHAK_USE_MOCK=false)، این فایل اصلاً
// استفاده نمی‌شود — searchService مستقیم از اتاقک واقعی جواب می‌گیرد.

import { MOCK_PROPERTIES } from "@/constants/mockProperties";
import { CATEGORIES } from "@/constants/categories";
import type { OtaghakRawSearchItem } from "../types";

// جدا کردن «استان، شهر» از روی فیلد location — دقیقاً همان الگویی که
// searchService.ts برای اقامتگاه‌های واقعی بالکن (mapAccommodationToSearchItem) استفاده می‌کند.
function splitLocation(location: string): { stateName: string; cityName: string } {
  const parts = location.split("،").map((part) => part.trim());
  return {
    stateName: parts[0] || location,
    cityName: parts[1] || location,
  };
}

export const MOCK_SEARCH_ITEMS: OtaghakRawSearchItem[] = MOCK_PROPERTIES.map((property) => {
  const { stateName, cityName } = splitLocation(property.location);

  // roomType با برچسب فارسی دسته‌بندی پر می‌شود — دقیقاً همان چیزی که
  // فیلتر دسته‌بندی در searchService.ts با آن مقایسه می‌کند، پس فیلتر
  // همیشه به‌درستی همان یک محصول مرتبط با هر دسته‌بندی را برمی‌گرداند.
  const categoryLabel = CATEGORIES.find((c) => c.id === property.category)?.label ?? property.category;

  return {
    roomId: property.id,
    roomName: property.title,
    roomType: categoryLabel,
    cityName,
    stateName,
    basePrice: property.rawPrice,
    afterDiscount: property.rawPrice, // این محصولات تخفیف جداگانه‌ای ندارند
    rating: property.rating,
    coverImageUrl: property.imageUrl,
    topAttributes: property.features,
  };
});