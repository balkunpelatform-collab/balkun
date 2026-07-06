import { OTAGHAK_CONFIG } from "../config";
import { OTAGHAK_ENDPOINTS } from "../endpoints";
import { otaghakRequest } from "../httpClient";
import { applyBalkunMargin } from "@/utils/priceCalculator";
import { MOCK_ROOM_DETAILS } from "../mock/roomDetails";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { OtaghakRawRoomDetails, BalkunRoomDetails } from "../types";

export async function getRoomById(roomId: string): Promise<BalkunRoomDetails | null> {
  // ۱. بررسی فرمت شناسه (آیا یک UUID معتبر متعلق به دیتابیس بالکن است؟)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(roomId);
  
  if (isUUID) {
    try {
      const { data: dbRoom } = await supabaseAdmin
        .from("accommodations")
        .select("*")
        .eq("id", roomId)
        .single();
        
      if (dbRoom) {
        // مپ کردن داده دیتابیس بالکن به ساختار استاندارد اتاقک
        const rawData: OtaghakRawRoomDetails = {
          roomId: dbRoom.id,
          roomName: dbRoom.title,
          roomType: "اختصاصی بالکن",
          stateName: dbRoom.location.split("،")[0] || dbRoom.location,
          cityName: dbRoom.location.split("،")[1] || dbRoom.location,
          personCapacity: dbRoom.maxGuests,
          extraPersonCapacity: 0, 
          hostName: "تیم مدیریت بالکن",
          hostAvatar: "/logo.png",
          rating: dbRoom.rating,
          cancelRuleTypeTitle: "قوانین اختصاصی",
          cancelRuleTypeDescription: dbRoom.cancellationPolicy || "طبق هماهنگی",
          roomRules: dbRoom.houseRules ? dbRoom.houseRules.split("\n") : [],
          authenticationDocuments: ["ارائه کارت ملی معتبر الزامی است"],
          topAttributes: dbRoom.amenities?.slice(0, 3) || [],
          allAttributes: dbRoom.amenities || [],
          roomMedia: (dbRoom.images || []).map((img: string) => ({ url: img, type: "IMAGE" })),
          basePrice: dbRoom.pricePerNight,
          extraPersonPrice: 0,
          afterDiscount: dbRoom.pricePerNight,
        };

        // اعمال قانون ৫٪ بالکن روی محصولات دیتابیس خودمان
        return {
          ...rawData,
          basePrice: applyBalkunMargin(rawData.basePrice),
          extraPersonPrice: applyBalkunMargin(rawData.extraPersonPrice),
          afterDiscount: applyBalkunMargin(rawData.afterDiscount),
        };
      }
    } catch (error) {
      console.error("Error fetching internal room details:", error);
    }
  }

  // ۲. در غیر این صورت، مسیر همیشگی (API اتاقک یا Mock) طی می‌شود
  let rawData: OtaghakRawRoomDetails;

  if (OTAGHAK_CONFIG.useMock) {
    // 🆕 رفع باگ: قبلاً اگر شناسه در MOCK_ROOM_DETAILS پیدا نمی‌شد، به‌صورت
    // پیش‌فرض یک محصول تستیِ نامرتبط (RM-1001) نمایش داده می‌شد — یعنی با
    // کلیک روی یک محصولِ نامعتبر، اطلاعات محصول اشتباهی باز می‌شد.
    // حالا اگر شناسه معتبر نباشد، صفحه‌ی «یافت نشد» (404) نمایش داده می‌شود.
    const mockData = MOCK_ROOM_DETAILS[roomId];

    if (!mockData) {
      return null;
    }

    rawData = mockData;
  } else {
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

  return {
    ...rawData,
    basePrice: applyBalkunMargin(rawData.basePrice),
    extraPersonPrice: applyBalkunMargin(rawData.extraPersonPrice),
    afterDiscount: applyBalkunMargin(rawData.afterDiscount),
  };
}