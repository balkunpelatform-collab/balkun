// مسیر مقصد این فایل: src/lib/otaghak/services/searchService.ts
//
// نکته حیاتی (الزام فاز ۳ و ۴): ضرب ۱.۰۵ همیشه همین‌جا، در سمت سرور،
// روی پاسخ خام اتاقک اعمال می‌شود — نه در فرانت‌اند، نه در روت API
// (تا منطق مالی در یک‌جا متمرکز و غیرقابل دستکاری بماند).
//
// 🆕 بروزرسانی: علاوه بر نتایج اتاقک (که فعلاً Mock است)، اقامتگاه‌های
// اختصاصی بالکن (جدول accommodations در Supabase) هم همیشه واکشی و با
// نتایج ترکیب می‌شوند — دقیقاً همان الگویی که PropertyList.tsx برای
// صفحه‌ی اصلی استفاده می‌کند. این کار مستقل از آماده‌شدن API اتاقک است.
//
// 🆕 فاز ۱۱ بخش ۲ (رفع باگ): فیلتر بر اساس دسته‌بندی (category) اضافه شد.
// - برای اقامتگاه‌های واقعی بالکن: مستقیماً روی ستون category جدول accommodations فیلتر می‌شود.
// - برای نتایج اتاقک (فعلاً Mock): چون آیتم‌های اتاقک فیلد category ندارند،
//   بر اساس roomType که با برچسب (label) همان دسته‌بندی در src/constants/categories.ts
//   یکی است فیلتر می‌شوند. وقتی API واقعی اتاقک متصل شد، این بخش باید بازبینی شود
//   (چون معلوم نیست roomType واقعی دقیقاً با label های ما یکی باشد یا نه).
//
// 🆕 فاز ۱۱ بخش ۲ (تصمیم محصولی نهایی شد): اگر حداقل یک اقامتگاه واقعی بالکن
// برای این جستجو پیدا شود، نتایج موک اتاقک اصلاً واکشی یا نمایش داده نمی‌شوند.
//
// نکته درباره‌ی لینک‌ها: چون هر آیتم بالکنی با roomId = آیدی واقعی
// (UUID) خودش برچسب می‌خورد، و roomService.ts از قبل برای UUID ها
// مستقیماً از دیتابیس بالکن می‌خواند، صفحه‌ی جزئیات /rooms/[id] برای
// این آیتم‌ها بدون هیچ تغییر اضافه‌ای کار می‌کند.

import { OTAGHAK_CONFIG } from "../config";
import { OTAGHAK_ENDPOINTS } from "../endpoints";
import { otaghakRequest } from "../httpClient";
import { applySearchMargin } from "@/utils/applySearchMargin";
import { MOCK_SEARCH_ITEMS } from "../mock/searchResults";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CATEGORIES } from "@/constants/categories";
import type { OtaghakSearchParams, OtaghakSearchResponse, BalkunSearchResponse, OtaghakRawSearchItem } from "../types";

// تبدیل یک ردیف اقامتگاه واقعی بالکن (از Supabase) به همان ساختار خامی
// که برای آیتم‌های جستجوی اتاقک استفاده می‌شود، تا با همان کارت
// (SearchResultCard) و همان منطق قیمت‌گذاری قابل نمایش باشد.
function mapAccommodationToSearchItem(acc: any): OtaghakRawSearchItem {
  const locationParts = (acc.location || "").split("،").map((part: string) => part.trim());
  const stateName = locationParts[0] || acc.location || "";
  const cityName = locationParts[1] || acc.location || "";

  return {
    roomId: acc.id,
    roomName: acc.title,
    roomType: "اختصاصی بالکن",
    cityName,
    stateName,
    basePrice: acc.pricePerNight,
    afterDiscount: acc.pricePerNight, // اقامتگاه‌های اختصاصی بالکن فعلاً تخفیف جداگانه ندارند
    rating: acc.rating || null,
    coverImageUrl: acc.images && acc.images.length > 0 ? acc.images[0] : "/hero1.webp",
    topAttributes: acc.amenities ? acc.amenities.slice(0, 3) : [],
  };
}

// واکشی اقامتگاه‌های فعال بالکن از دیتابیس (مستقل از اتاقک)
async function getRealAccommodations(cities?: string[], category?: string): Promise<OtaghakRawSearchItem[]> {
  try {
    let query = supabaseAdmin
      .from("accommodations")
      .select("*")
      .eq("status", "ACTIVE");

    // 🆕 فیلتر دسته‌بندی مستقیماً روی کوئری دیتابیس اعمال می‌شود
    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query.order("createdAt", { ascending: false });

    if (error || !data) {
      if (error) console.error("Error fetching real accommodations for search:", error);
      return [];
    }

    let items = data.map(mapAccommodationToSearchItem);

    if (cities?.length) {
      items = items.filter((item) =>
        cities.some((c) => item.cityName.includes(c) || c.includes(item.cityName))
      );
    }

    return items;
  } catch (err) {
    console.error("Error fetching real accommodations for search:", err);
    return [];
  }
}

export async function searchRooms(params: OtaghakSearchParams): Promise<BalkunSearchResponse> {
  // ۱. اقامتگاه‌های واقعی بالکن — همیشه واکشی می‌شوند، صرف‌نظر از وضعیت اتاقک
  const realItems = await getRealAccommodations(params.cities, params.category);

  // 🆕 فاز ۱۱ / بخش ۲ (تصمیم محصولی نهایی شد):
  // اگر حداقل یک اقامتگاه واقعی بالکن برای این جستجو پیدا شود،
  // نتایج موک اتاقک اصلاً واکشی یا نمایش داده نمی‌شوند.
  if (realItems.length > 0) {
    return {
      items: applySearchMargin(realItems),
      totalCount: realItems.length,
    };
  }

  // ۲. نتایج اتاقک (فعلاً Mock، بعد از اتصال API واقعی همین بخش جایگزین می‌شود)
  // این بخش فقط وقتی اجرا می‌شود که هیچ اقامتگاه واقعی‌ای برای این جستجو پیدا نشده باشد.
  let otaghakItems: OtaghakRawSearchItem[];
  let otaghakTotalCount: number;

  if (OTAGHAK_CONFIG.useMock) {
    // فیلتر ساده‌ی Mock فقط برای شبیه‌سازی رفتار واقعی (در صورت ارسال شهر)
    let filtered = params.cities?.length
      ? MOCK_SEARCH_ITEMS.filter((item) =>
          params.cities!.some((c) => item.cityName.includes(c) || c.includes(item.cityName))
        )
      : MOCK_SEARCH_ITEMS;

    // فیلتر دسته‌بندی روی نتایج Mock اتاقک: چون این آیتم‌ها فیلد category ندارند،
    // بر اساس تطبیق roomType با برچسب (label) دسته‌بندی انتخاب‌شده فیلتر می‌شوند.
    if (params.category) {
      const categoryLabel = CATEGORIES.find((c) => c.id === params.category)?.label;
      filtered = categoryLabel ? filtered.filter((item) => item.roomType === categoryLabel) : [];
    }

    otaghakItems = filtered;
    otaghakTotalCount = filtered.length;
  } else {
    // ⚠️ این بخش بعد از رسیدن API واقعی تست می‌شود.
    const res = await otaghakRequest<OtaghakSearchResponse>({
      url: OTAGHAK_ENDPOINTS.searchRooms,
      method: "POST",
      data: params,
    });
    otaghakItems = res.items;
    otaghakTotalCount = res.totalCount;
  }

  return {
    items: applySearchMargin(otaghakItems),
    totalCount: otaghakTotalCount,
  };
}