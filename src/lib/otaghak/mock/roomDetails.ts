import type { OtaghakRawRoomDetails } from "../types";

// قیمت‌های این فایل خام هستند. منطق ۵٪ در سرویس اعمال می‌شود.
export const MOCK_ROOM_DETAILS: Record<string, OtaghakRawRoomDetails> = {
  "RM-1001": {
    roomId: "RM-1001",
    roomName: "ویلا ساحلی آرامش با استخر آب‌گرم",
    roomType: "ویلا",
    stateName: "مازندران",
    cityName: "نوشهر",
    personCapacity: 4,
    extraPersonCapacity: 2,
    hostName: "علی رضایی",
    hostAvatar: "https://placehold.co/150x150/153e75/ffffff.png?text=Host",
    rating: 4.8,
    cancelRuleTypeTitle: "متعادل",
    cancelRuleTypeDescription: "در صورت لغو تا ۷۲ ساعت قبل از ورود، تمام مبلغ (کسر کارمزد) عودت داده می‌شود. پس از آن هزینه شب اول کسر می‌گردد.",
    roomRules: [
      "استعمال دخانیات در داخل ویلا اکیداً ممنوع است.",
      "ورود حیوانات خانگی مجاز نمی‌باشد.",
      "برگزاری مهمانی و پخش موسیقی با صدای بلند بعد از ساعت ۱۲ شب ممنوع است."
    ],
    authenticationDocuments: [
      "ارائه کارت ملی هوشمند الزامی است.",
      "همراه داشتن مدارک محرمیت معتبر الزامی است."
    ],
    topAttributes: ["استخر آب‌گرم", "ویو دریا", "بیلیارد"],
    allAttributes: [
      "استخر آب‌گرم", "ویو دریا", "میز بیلیارد", "وای‌فای رایگان",
      "پارکینگ اختصاصی (۲ خودرو)", "باربیکیو", "تلویزیون ۵۰ اینچ",
      "سیستم سرمایش و گرمایش داکت اسپلیت", "لوازم آشپزی کامل"
    ],
    roomMedia: [
      { url: "/hero1.webp", type: "IMAGE" },
      { url: "/hero2.webp", type: "IMAGE" },
      { url: "https://placehold.co/800x600/f37021/ffffff.png?text=Pool", type: "IMAGE" },
      { url: "https://placehold.co/800x600/fdb913/ffffff.png?text=Bedroom", type: "IMAGE" }
    ],
    basePrice: 4000000,
    extraPersonPrice: 500000,
    afterDiscount: 3800000,
  }
};