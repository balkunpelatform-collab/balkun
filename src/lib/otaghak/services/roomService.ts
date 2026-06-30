import { OTAGHAK_CONFIG } from "../config";
import { OTAGHAK_ENDPOINTS } from "../endpoints";
import { otaghakRequest } from "../httpClient";
import { applyBalkunMargin } from "@/utils/priceCalculator";
import { MOCK_ROOM_DETAILS } from "../mock/roomDetails";
import type { OtaghakRawRoomDetails, BalkunRoomDetails } from "../types";

/**
 * دریافت اطلاعات اقامتگاه و اعمال قانون تجاری ۵ درصد افزایش قیمت
 * این تابع کاملاً در لایه سرور اجرا می‌شود و امنیت مالی را تضمین می‌کند.
 */
export async function getRoomById(roomId: string): Promise<BalkunRoomDetails | null> {
  let rawData: OtaghakRawRoomDetails;

  if (OTAGHAK_CONFIG.useMock) {
    // شبیه‌سازی دریافت اطلاعات از API اتاقک
    const mockData = MOCK_ROOM_DETAILS[roomId] || MOCK_ROOM_DETAILS["RM-1001"]; // پیش‌فرض برای تست
    rawData = mockData;
  } else {
    // ارتباط واقعی با API اتاقک
    try {
      rawData = await otaghakRequest<OtaghakRawRoomDetails>({
        url: `${OTAGHAK_ENDPOINTS.getRoomDetail}?roomId=${roomId}`,
        method: "GET",
      });
    } catch (error) {
      console.error(`Error fetching room details for ${roomId}:`, error);
      return null;
    }
  }

  // اعمال قانون طلایی ۵٪ روی تمامی جریان‌های مالی اقامتگاه
  return {
    ...rawData,
    basePrice: applyBalkunMargin(rawData.basePrice),
    extraPersonPrice: applyBalkunMargin(rawData.extraPersonPrice),
    afterDiscount: applyBalkunMargin(rawData.afterDiscount),
  };
}