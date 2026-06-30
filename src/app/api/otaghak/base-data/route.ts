// مسیر مقصد این فایل: src/app/api/otaghak/base-data/route.ts
//
// این روت برای پر کردن فیلترهای فرم جستجوی صفحه اصلی استفاده می‌شود
// (استان‌ها، شهرها، انواع اقامتگاه، تگ‌ها).

import { NextResponse } from "next/server";
import { getBaseData } from "@/lib/otaghak/services/baseDataService";

export async function GET() {
  try {
    const baseData = await getBaseData();
    return NextResponse.json({ success: true, data: baseData });
  } catch (error) {
    console.error("Otaghak Base Data Error:", error);
    return NextResponse.json(
      { success: false, error: "خطا در دریافت اطلاعات پایه از اتاقک" },
      { status: 500 }
    );
  }
}
