// مسیر: src/constants/mockProperties.ts
//
// این فایل «تنها منبع» محصولات نمایشی (Mock) پروژه است.
// همین یک آیتم دقیق و صحیح، هم روی صفحه‌ی اصلی (PropertyList.tsx)
// و هم داخل نتایج جستجو (کلیک روی هر دسته‌بندی) نمایش داده می‌شود —
// این دو دیگر از هم جدا نیستند تا دیگر هیچ‌وقت با هم ناهماهنگ نشوند.
//
// 🆕 وقتی API واقعی اتاقک وصل شود (OTAGHAK_USE_MOCK=false در .env.local)،
// این فایل به‌طور کامل کنار گذاشته می‌شود و فقط محصولات واقعی از اتاقک
// (یا اقامتگاه‌های واقعی بالکن در Supabase) نمایش داده خواهند شد.
// برای اطلاعات بیشتر src/lib/otaghak/config.ts را ببینید.

export interface MockProperty {
  id: string;
  title: string;
  location: string; // فرمت: "استان، شهر" — دقیقاً مثل فیلد location جدول accommodations
  imageUrl: string;
  rating: number;
  rawPrice: number; // قیمت پایه هر شب، پیش از اعمال ۵٪ بالکن
  features: string[]; // ۲-۳ ویژگی کوتاه برای کارت (صفحه اصلی / نتایج جستجو)
  category: string; // باید دقیقاً با یکی از id های src/constants/categories.ts یکی باشد

  // 🆕 فیلدهای زیر فقط برای صفحه‌ی جزئیات (/rooms/[id]) استفاده می‌شوند.
  // همه اختیاری هستند؛ اگر پر نشوند مقدار پیش‌فرض منطقی جایگزین می‌شود.
  personCapacity?: number;
  extraPersonCapacity?: number;
  extraPersonRawPrice?: number; // قیمت خام هر نفر اضافه، پیش از اعمال ۵٪
  hostName?: string;
  hostAvatar?: string;
  gallery?: string[]; // تصاویر گالری صفحه جزئیات؛ اگر ندهید فقط imageUrl نمایش داده می‌شود
  allFeatures?: string[]; // لیست کامل امکانات؛ اگر ندهید همان features استفاده می‌شود
  roomRules?: string[];
  authenticationDocuments?: string[];
  cancelRuleTypeTitle?: string;
  cancelRuleTypeDescription?: string;
}

export const MOCK_PROPERTIES: MockProperty[] = [
  // ۱. ویلا (villa)
  {
    id: "1",
    title: "ویلا استخردار رویال",
    location: "تهران، لواسان",
    imageUrl: "/images/mock/villa.webp",
    rating: 4.9,
    rawPrice: 4500000,
    features: ["استخر آب‌گرم", "میز بیلیارد", "ویو ابدی"],
    category: "villa",

    personCapacity: 6,
    extraPersonCapacity: 2,
    extraPersonRawPrice: 400000,
    hostName: "علی رضایی",
    hostAvatar: "/logo.png",
    gallery: ["/images/mock/villa.webp", "/hero1.webp", "/hero2.webp"],
    allFeatures: [
      "استخر آب‌گرم", "میز بیلیارد", "ویو ابدی", "پارکینگ اختصاصی",
      "وای‌فای پرسرعت", "باربیکیو", "سیستم گرمایش از کف", "آشپزخانه مجهز",
    ],
    roomRules: [
      "استعمال دخانیات در فضای بسته ممنوع است.",
      "برگزاری مهمانی بیش از ظرفیت مجاز نیست.",
      "رعایت سکوت پس از ساعت ۱۲ شب الزامی است.",
    ],
    authenticationDocuments: ["ارائه کارت ملی معتبر الزامی است."],
    cancelRuleTypeTitle: "متعادل",
    cancelRuleTypeDescription: "در صورت لغو تا ۷۲ ساعت قبل از ورود، مبلغ (با کسر کارمزد) عودت داده می‌شود.",
  },

  // ۲. کلبه (cabin)
  {
    id: "2",
    title: "کلبه سوئیسی رویایی",
    location: "مازندران، رامسر",
    imageUrl: "/images/mock/cabin.webp",
    rating: 4.8,
    rawPrice: 2200000,
    features: ["شومینه هیزمی", "جکوزی", "در دل جنگل"],
    category: "cabin",

    personCapacity: 4,
    extraPersonCapacity: 2,
    extraPersonRawPrice: 250000,
    hostName: "مریم احمدی",
    hostAvatar: "/logo.png",
    gallery: ["/images/mock/cabin.webp", "/hero1.webp"],
    allFeatures: [
      "شومینه هیزمی", "جکوزی", "در دل جنگل", "پارکینگ اختصاصی",
      "صبحانه رایگان", "وای‌فای رایگان",
    ],
    roomRules: [
      "ورود حیوان خانگی فقط با هماهنگی قبلی امکان‌پذیر است.",
      "استعمال دخانیات فقط در فضای باز مجاز است.",
    ],
    authenticationDocuments: ["ارائه کارت ملی معتبر الزامی است."],
    cancelRuleTypeTitle: "سخت‌گیرانه",
    cancelRuleTypeDescription: "لغو رزرو تا ۷ روز قبل از ورود امکان‌پذیر است؛ پس از آن مبلغی عودت داده نمی‌شود.",
  },

  // ۳. سوییت (suite)
  {
    id: "3",
    title: "سوییت وی‌آی‌پی پنت‌هاوس",
    location: "تهران، زعفرانیه",
    imageUrl: "/images/mock/suite.webp",
    rating: 4.7,
    rawPrice: 3800000,
    features: ["ویو ۳۶۰ درجه", "روف گاردن", "هوشمند"],
    category: "suite",

    personCapacity: 2,
    extraPersonCapacity: 2,
    extraPersonRawPrice: 600000,
    hostName: "امیر حسینی",
    hostAvatar: "/logo.png",
    gallery: ["/images/mock/suite.webp", "/hero2.webp"],
    allFeatures: [
      "ویو ۳۶۰ درجه", "روف گاردن", "هوشمند", "پارکینگ",
      "استخر مشترک ساختمان", "سالن بدنسازی",
    ],
    roomRules: [
      "ورود مهمان اضافه باید از پیش هماهنگ شود.",
      "حیوان خانگی پذیرفته نمی‌شود.",
    ],
    authenticationDocuments: ["ارائه کارت ملی معتبر الزامی است."],
    cancelRuleTypeTitle: "متعادل",
    cancelRuleTypeDescription: "لغو تا ۴۸ ساعت قبل از ورود، بازگشت کامل وجه (با کسر کارمزد) را در پی دارد.",
  },

  // ۴. بوم‌گردی (eco)
  {
    id: "4",
    title: "عمارت سنتی شاه‌نشین",
    location: "اصفهان، کاشان",
    imageUrl: "/images/mock/eco.webp",
    rating: 4.9,
    rawPrice: 1200000,
    features: ["حیاط مرکزی", "صبحانه سلف", "معماری قاجاری"],
    category: "eco",

    personCapacity: 8,
    extraPersonCapacity: 4,
    extraPersonRawPrice: 150000,
    hostName: "زهرا کاشانی",
    hostAvatar: "/logo.png",
    gallery: ["/images/mock/eco.webp", "/hero1.webp"],
    allFeatures: [
      "حیاط مرکزی", "صبحانه سلف", "معماری قاجاری", "اتاق‌های سنتی",
      "باغچه اختصاصی",
    ],
    roomRules: [
      "حفظ نظافت فضای سنتی الزامی است.",
      "پخش موسیقی بلند در حیاط ممنوع است.",
    ],
    authenticationDocuments: ["ارائه کارت ملی معتبر الزامی است."],
    cancelRuleTypeTitle: "منعطف",
    cancelRuleTypeDescription: "لغو تا ۲۴ ساعت قبل از ورود، بازگشت کامل وجه را در پی دارد.",
  },

  // ۵. خارج کشور (abroad)
  {
    id: "5",
    title: "ریزورت ساحلی لاکچری",
    location: "ترکیه، آنتالیا",
    imageUrl: "/images/mock/abroad.webp",
    rating: 5.0,
    rawPrice: 8500000,
    features: ["ساحل اختصاصی", "آل اینکلوسیو", "پارک آبی"],
    category: "abroad",

    personCapacity: 4,
    extraPersonCapacity: 2,
    extraPersonRawPrice: 1200000,
    hostName: "Mehmet Yilmaz",
    hostAvatar: "/logo.png",
    gallery: ["/images/mock/abroad.webp", "/hero2.webp"],
    allFeatures: [
      "ساحل اختصاصی", "آل اینکلوسیو", "پارک آبی", "اسپا و سونا",
      "چند رستوران",
    ],
    roomRules: [
      "پوشش مناسب در فضاهای عمومی الزامی است.",
      "رزرو تخت ساحلی از طریق پذیرش هتل انجام می‌شود.",
    ],
    authenticationDocuments: ["ارائه پاسپورت معتبر الزامی است."],
    cancelRuleTypeTitle: "سخت‌گیرانه",
    cancelRuleTypeDescription: "لغو رزرو تا ۱۴ روز قبل از ورود امکان‌پذیر است.",
  },

  // ۶. جنگلی (forest)
  {
    id: "6",
    title: "اقامتگاه شیشه‌ای درختی",
    location: "گیلان، ماسال",
    imageUrl: "/images/mock/forest.webp",
    rating: 4.9,
    rawPrice: 2800000,
    features: ["سقف شیشه‌ای", "تراس معلق", "سکوت مطلق"],
    category: "forest",

    personCapacity: 2,
    extraPersonCapacity: 1,
    extraPersonRawPrice: 300000,
    hostName: "رضا نوری",
    hostAvatar: "/logo.png",
    gallery: ["/images/mock/forest.webp", "/hero1.webp"],
    allFeatures: [
      "سقف شیشه‌ای", "تراس معلق", "سکوت مطلق", "صبحانه محلی",
      "مسیر پیاده‌روی در جنگل",
    ],
    roomRules: [
      "دورریز زباله در طبیعت اکیداً ممنوع است.",
      "روشن کردن آتش فقط در محل مشخص‌شده مجاز است.",
    ],
    authenticationDocuments: ["ارائه کارت ملی معتبر الزامی است."],
    cancelRuleTypeTitle: "متعادل",
    cancelRuleTypeDescription: "لغو تا ۷۲ ساعت قبل از ورود، بازگشت کامل وجه (با کسر کارمزد) را در پی دارد.",
  },

  // ۷. ساحلی (beach)
  {
    id: "7",
    title: "ویلای ساحلی با موج‌شکن",
    location: "هرمزگان، کیش",
    imageUrl: "/images/mock/beach.webp",
    rating: 4.8,
    rawPrice: 6200000,
    features: ["پلاک صفر دریا", "استخر رو به موج", "قایق اختصاصی"],
    category: "beach",

    personCapacity: 6,
    extraPersonCapacity: 3,
    extraPersonRawPrice: 500000,
    hostName: "سارا محمدی",
    hostAvatar: "/logo.png",
    gallery: ["/images/mock/beach.webp", "/hero2.webp"],
    allFeatures: [
      "پلاک صفر دریا", "استخر رو به موج", "قایق اختصاصی",
      "باربیکیو ساحلی", "پارکینگ اختصاصی",
    ],
    roomRules: [
      "استفاده از قایق نیازمند هماهنگی قبلی است.",
      "برگزاری مهمانی بدون هماهنگی ممنوع است.",
    ],
    authenticationDocuments: ["ارائه کارت ملی معتبر الزامی است."],
    cancelRuleTypeTitle: "منعطف",
    cancelRuleTypeDescription: "لغو تا ۲۴ ساعت قبل از ورود، بازگشت کامل وجه را در پی دارد.",
  },
];