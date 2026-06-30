// مسیر مقصد این فایل: src/app/api/otaghak/search/route.ts

import { NextResponse } from "next/server";
import { searchRooms } from "@/lib/otaghak/services/searchService";
import type { OtaghakSearchParams } from "@/lib/otaghak/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<OtaghakSearchParams>;

    if (!body.checkin || !body.checkout || !body.person) {
      return NextResponse.json(
        { success: false, error: "تاریخ ورود، خروج و تعداد نفرات الزامی است" },
        { status: 400 }
      );
    }

    const result = await searchRooms({
      checkin: body.checkin,
      checkout: body.checkout,
      person: body.person,
      cities: body.cities,
      stateCodes: body.stateCodes,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Otaghak Search Error:", error);
    return NextResponse.json(
      { success: false, error: "خطا در جستجوی اقامتگاه‌ها. لطفا مجددا تلاش کنید." },
      { status: 500 }
    );
  }
}
