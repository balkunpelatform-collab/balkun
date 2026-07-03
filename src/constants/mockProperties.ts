// مسیر: src/constants/mockProperties.ts

export interface MockProperty {
  id: string;
  title: string;
  location: string;
  imageUrl: string;
  rating: number;
  rawPrice: number;
  features: string[];
  category: string;
}

export const MOCK_PROPERTIES: MockProperty[] = [
  // ۱. ویلا (villa)
  {
    id: "1",
    title: "ویلا استخردار رویال",
    location: "تهران، لواسان",
    imageUrl: "/images/mock/villa.webp", // عکس را در این مسیر قرار دهید
    rating: 4.9,
    rawPrice: 4500000,
    features: ["استخر آب‌گرم", "میز بیلیارد", "ویو ابدی"],
    category: "villa",
  },

  // ۲. کلبه (cabin)
  {
    id: "2",
    title: "کلبه سوئیسی رویایی",
    location: "مازندران، رامسر",
    imageUrl: "/images/mock/cabin.webp", // عکس را در این مسیر قرار دهید
    rating: 4.8,
    rawPrice: 2200000,
    features: ["شومینه هیزمی", "جکوزی", "در دل جنگل"],
    category: "cabin",
  },

  // ۳. سوییت (suite)
  {
    id: "3",
    title: "سوییت وی‌آی‌پی پنت‌هاوس",
    location: "تهران، زعفرانیه",
    imageUrl: "/images/mock/suite.webp", // عکس را در این مسیر قرار دهید
    rating: 4.7,
    rawPrice: 3800000,
    features: ["ویو ۳۶۰ درجه", "روف گاردن", "هوشمند"],
    category: "suite",
  },

  // ۴. بوم‌گردی (eco)
  {
    id: "4",
    title: "عمارت سنتی شاه‌نشین",
    location: "اصفهان، کاشان",
    imageUrl: "/images/mock/eco.webp", // عکس را در این مسیر قرار دهید
    rating: 4.9,
    rawPrice: 1200000,
    features: ["حیاط مرکزی", "صبحانه سلف", "معماری قاجاری"],
    category: "eco",
  },

  // ۵. خارج کشور (abroad)
  {
    id: "5",
    title: "ریزورت ساحلی لاکچری",
    location: "ترکیه، آنتالیا",
    imageUrl: "/images/mock/abroad.webp", // عکس را در این مسیر قرار دهید
    rating: 5.0,
    rawPrice: 8500000,
    features: ["ساحل اختصاصی", "آل اینکلوسیو", "پارک آبی"],
    category: "abroad",
  },

  // ۶. جنگلی (forest)
  {
    id: "6",
    title: "اقامتگاه شیشه‌ای درختی",
    location: "گیلان، ماسال",
    imageUrl: "/images/mock/forest.webp", // عکس را در این مسیر قرار دهید
    rating: 4.9,
    rawPrice: 2800000,
    features: ["سقف شیشه‌ای", "تراس معلق", "سکوت مطلق"],
    category: "forest",
  },

  // ۷. ساحلی (beach)
  {
    id: "7",
    title: "ویلای ساحلی با موج‌شکن",
    location: "هرمزگان، کیش",
    imageUrl: "/images/mock/beach.webp", // عکس را در این مسیر قرار دهید
    rating: 4.8,
    rawPrice: 6200000,
    features: ["پلاک صفر دریا", "استخر رو به موج", "قایق اختصاصی"],
    category: "beach",
  },
];