// مسیر مقصد این فایل: src/lib/otaghak/mock/roomDetails.ts
//
// 🆕 رفع باگ (بخش ۱۱ گزارش‌شده توسط کارفرما):
// قبلاً این فایل فقط شامل یک آیتم ساختگی ثابت با شناسه "RM-1001" بود.
// در roomService.ts هم اگر شناسه‌ی درخواست‌شده در این فایل پیدا نمی‌شد،
// به‌صورت پیش‌فرض همین آیتم ساختگی (ویلای نوشهر) نمایش داده می‌شد —
// یعنی مثلاً با کلیک روی «کلبه» یا «سوییت»، صفحه‌ی جزئیاتِ یک ویلای
// کاملاً بی‌ربط باز می‌شد.
//
// از الان، برای هر ۷ محصولِ src/constants/mockProperties.ts یک صفحه‌ی
// جزئیاتِ دقیق و مخصوص به خودش ساخته می‌شود (کلید = همان id محصول).
// این فایل و کارت‌های صفحه‌ی اصلی/جستجو از یک منبع واحد می‌خوانند.
//
// 🆕 وقتی API واقعی اتاقک وصل شود (OTAGHAK_USE_MOCK=false)، این فایل اصلاً
// استفاده نمی‌شود — roomService.ts مستقیم از اتاقک واقعی جواب می‌گیرد.
//
// قیمت‌های این فایل «خام» هستند؛ اعمال ۵٪ در roomService.ts انجام می‌شود.

import { MOCK_PROPERTIES } from "@/constants/mockProperties";
import { CATEGORIES } from "@/constants/categories";
import type { OtaghakRawRoomDetails } from "../types";

function splitLocation(location: string): { stateName: string; cityName: string } {
  const parts = location.split("،").map((part) => part.trim());
  return {
    stateName: parts[0] || location,
    cityName: parts[1] || location,
  };
}

export const MOCK_ROOM_DETAILS: Record<string, OtaghakRawRoomDetails> = Object.fromEntries(
  MOCK_PROPERTIES.map((property) => {
    const { stateName, cityName } = splitLocation(property.location);
    const categoryLabel = CATEGORIES.find((c) => c.id === property.category)?.label ?? property.category;

    const detail: OtaghakRawRoomDetails = {
      roomId: property.id,
      roomName: property.title,
      roomType: categoryLabel,
      stateName,
      cityName,
      personCapacity: property.personCapacity ?? 2,
      extraPersonCapacity: property.extraPersonCapacity ?? 0,
      hostName: property.hostName ?? "تیم میزبانی بالکن",
      hostAvatar: property.hostAvatar ?? "/logo.png",
      rating: property.rating,
      cancelRuleTypeTitle: property.cancelRuleTypeTitle ?? "متعادل",
      cancelRuleTypeDescription:
        property.cancelRuleTypeDescription ??
        "در صورت لغو تا ۷۲ ساعت قبل از ورود، مبلغ (با کسر کارمزد) عودت داده می‌شود.",
      roomRules: property.roomRules ?? ["استعمال دخانیات در فضای بسته ممنوع است."],
      authenticationDocuments: property.authenticationDocuments ?? ["ارائه کارت ملی معتبر الزامی است."],
      topAttributes: property.features,
      allAttributes: property.allFeatures ?? property.features,
      roomMedia: (property.gallery ?? [property.imageUrl]).map((url) => ({
        url,
        type: "IMAGE" as const,
      })),
      basePrice: property.rawPrice,
      extraPersonPrice: property.extraPersonRawPrice ?? 0,
      afterDiscount: property.rawPrice,
    };

    return [property.id, detail];
  })
);