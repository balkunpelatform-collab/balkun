// مسیر مقصد این فایل: src/lib/otaghak/services/searchService.ts
//
// نکته حیاتی (الزام فاز ۳ و ۴): ضرب ۱.۰۵ همیشه همین‌جا، در سمت سرور،
// روی پاسخ خام اتاقک اعمال می‌شود — نه در فرانت‌اند، نه در روت API
// (تا منطق مالی در یک‌جا متمرکز و غیرقابل دستکاری بماند).

import { OTAGHAK_CONFIG } from "../config";
import { OTAGHAK_ENDPOINTS } from "../endpoints";
import { otaghakRequest } from "../httpClient";
import { applySearchMargin } from "@/utils/applySearchMargin";
import { MOCK_SEARCH_ITEMS } from "../mock/searchResults";
import type { OtaghakSearchParams, OtaghakSearchResponse, BalkunSearchResponse } from "../types";

export async function searchRooms(params: OtaghakSearchParams): Promise<BalkunSearchResponse> {
  let rawItems;
  let totalCount;

  if (OTAGHAK_CONFIG.useMock) {
    // فیلتر ساده‌ی Mock فقط برای شبیه‌سازی رفتار واقعی (در صورت ارسال شهر)
    const filtered = params.cities?.length
      ? MOCK_SEARCH_ITEMS.filter((item) =>
          params.cities!.some((c) => item.cityName.includes(c) || c.includes(item.cityName))
        )
      : MOCK_SEARCH_ITEMS;

    rawItems = filtered;
    totalCount = filtered.length;
  } else {
    // ⚠️ این بخش بعد از رسیدن API واقعی تست می‌شود.
    const res = await otaghakRequest<OtaghakSearchResponse>({
      url: OTAGHAK_ENDPOINTS.searchRooms,
      method: "POST",
      data: params,
    });
    rawItems = res.items;
    totalCount = res.totalCount;
  }

  return {
    items: applySearchMargin(rawItems),
    totalCount,
  };
}
