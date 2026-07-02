// مسیر: src/app/api/user/saved-properties/route.ts
// API مدیریت علاقه‌مندی‌های کاربر — متصل به جدول واقعی saved_properties.
// شناسه کاربر از هدر امن x-balkun-user-id (تزریق‌شده توسط middleware) خوانده می‌شود.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET: دریافت لیست اقامتگاه‌های ذخیره‌شده
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-balkun-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "احراز هویت ناموفق" }, { status: 401 });
    }

    const { data: properties, error } = await supabaseAdmin
      .from("saved_properties")
      .select("*")
      .eq("userId", userId)
      .order("savedAt", { ascending: false });

    if (error) {
      console.error("Saved Properties Fetch Error:", error);
      throw new Error("خطا در ارتباط با پایگاه داده");
    }

    return NextResponse.json({ success: true, properties: properties ?? [] });
  } catch (error) {
    console.error("Error fetching saved properties:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت اطلاعات" }, { status: 500 });
  }
}

// POST: افزودن اقامتگاه به علاقه‌مندی‌ها
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-balkun-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "احراز هویت ناموفق" }, { status: 401 });
    }

    const body = await req.json();
    const { roomId, roomName, cityName, stateName, pricePerNight, imageUrl, rating } = body;

    if (!roomId || !roomName) {
      return NextResponse.json({ success: false, error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const { data: newProperty, error } = await supabaseAdmin
      .from("saved_properties")
      .insert([{ userId, roomId, roomName, cityName, stateName, pricePerNight, imageUrl, rating }])
      .select()
      .single();

    if (error) {
      // خطای Unique Constraint یعنی این اقامتگاه از قبل ذخیره شده است
      if (error.code === "23505") {
        return NextResponse.json({ success: false, error: "این اقامتگاه قبلاً ذخیره شده است" }, { status: 409 });
      }
      console.error("Saved Property Insert Error:", error);
      throw new Error("خطا در ذخیره‌سازی");
    }

    return NextResponse.json({ success: true, property: newProperty, message: "اقامتگاه به علاقه‌مندی‌ها اضافه شد" });
  } catch (error) {
    console.error("Error saving property:", error);
    return NextResponse.json({ success: false, error: "خطا در ذخیره اقامتگاه" }, { status: 500 });
  }
}

// DELETE: حذف اقامتگاه از علاقه‌مندی‌ها
export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get("x-balkun-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "احراز هویت ناموفق" }, { status: 401 });
    }

    const body = await req.json();
    const { propertyId } = body;

    if (!propertyId) {
      return NextResponse.json({ success: false, error: "شناسه اقامتگاه الزامی است" }, { status: 400 });
    }

    // نکته امنیتی: علاوه بر propertyId، تعلق رکورد به همین userId هم چک می‌شود
    // تا کاربر نتواند علاقه‌مندی کاربر دیگری را با حدس زدن id حذف کند.
    const { error } = await supabaseAdmin
      .from("saved_properties")
      .delete()
      .eq("id", propertyId)
      .eq("userId", userId);

    if (error) {
      console.error("Saved Property Delete Error:", error);
      throw new Error("خطا در حذف");
    }

    return NextResponse.json({ success: true, message: "اقامتگاه از علاقه‌مندی‌ها حذف شد" });
  } catch (error) {
    console.error("Error removing property:", error);
    return NextResponse.json({ success: false, error: "خطا در حذف اقامتگاه" }, { status: 500 });
  }
}