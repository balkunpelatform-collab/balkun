// مسیر مقصد این فایل: src/lib/otaghak/services/baseDataService.ts
//
// این لایه تنها جایی است که تصمیم می‌گیرد از داده Mock استفاده شود
// یا درخواست واقعی به اتاقک بزند. روت‌های API بالکن هیچ‌وقت مستقیم
// به httpClient یا mock دسترسی ندارند — همیشه از این سرویس استفاده می‌کنند.
// به همین خاطر، وقتی API واقعی رسید، فقط همین فایل تغییر می‌کند.

import { OTAGHAK_CONFIG } from "../config";
import { OTAGHAK_ENDPOINTS } from "../endpoints";
import { otaghakRequest } from "../httpClient";
import type { OtaghakBaseData, OtaghakState, OtaghakCity, OtaghakRoomType, OtaghakTag } from "../types";

import { MOCK_STATES } from "../mock/states";
import { MOCK_CITIES } from "../mock/cities";
import { MOCK_ROOM_TYPES } from "../mock/roomTypes";
import { MOCK_TAGS } from "../mock/tags";

export async function getBaseData(): Promise<OtaghakBaseData> {
  if (OTAGHAK_CONFIG.useMock) {
    return {
      states: MOCK_STATES,
      cities: MOCK_CITIES,
      roomTypes: MOCK_ROOM_TYPES,
      tags: MOCK_TAGS,
    };
  }

  // ⚠️ این بخش بعد از رسیدن API واقعی تست می‌شود.
  const [states, cities, roomTypes, tags] = await Promise.all([
    otaghakRequest<OtaghakState[]>({ url: OTAGHAK_ENDPOINTS.getAllStates, method: "GET" }),
    otaghakRequest<OtaghakCity[]>({ url: OTAGHAK_ENDPOINTS.getAllCities, method: "GET" }),
    otaghakRequest<OtaghakRoomType[]>({ url: OTAGHAK_ENDPOINTS.getAllRoomTypes, method: "GET" }),
    otaghakRequest<OtaghakTag[]>({ url: OTAGHAK_ENDPOINTS.getSearchTags, method: "GET" }),
  ]);

  return { states, cities, roomTypes, tags };
}
