// مسیر مقصد این فایل: src/lib/otaghak/mock/searchResults.ts
//
// قیمت‌های این فایل «خام» هستند (دقیقاً شبیه چیزی که فرضاً از اتاقک می‌آید)
// و هنوز ۵٪ بالکن روی آن‌ها اعمال نشده — اعمال ۵٪ وظیفه‌ی searchService است.

import type { OtaghakRawSearchItem } from "../types";

export const MOCK_SEARCH_ITEMS: OtaghakRawSearchItem[] = [
  {
    roomId: "RM-1001",
    roomName: "ویلا ساحلی آرامش - نوشهر",
    roomType: "ویلا",
    cityName: "نوشهر",
    stateName: "مازندران",
    basePrice: 4200000,
    afterDiscount: 3800000,
    rating: 4.7,
    coverImageUrl: "/hero1.webp",
    topAttributes: ["استخر دار", "نمای دریا", "پارکینگ"],
  },
  {
    roomId: "RM-1002",
    roomName: "کلبه جنگلی ماسوله",
    roomType: "کلبه",
    cityName: "ماسوله",
    stateName: "گیلان",
    basePrice: 2100000,
    afterDiscount: 1950000,
    rating: 4.9,
    coverImageUrl: "/hero2.webp",
    topAttributes: ["جنگلی", "شومینه", "ویوی کوه"],
  },
  {
    roomId: "RM-1003",
    roomName: "سوییت لوکس مرکز شهر اصفهان",
    roomType: "سوییت",
    cityName: "اصفهان",
    stateName: "اصفهان",
    basePrice: 1500000,
    afterDiscount: 1500000,
    rating: 4.5,
    coverImageUrl: "/hero1.webp",
    topAttributes: ["نزدیک میدان نقش جهان", "وای‌فای رایگان"],
  },
];
