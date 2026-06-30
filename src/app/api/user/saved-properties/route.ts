// مسیر: src/app/api/user/saved-properties/route.ts
// API برای مدیریت علاقه‌مندی‌های کاربر (Saved Properties)

import { NextRequest, NextResponse } from "next/server";

// Mock Database
const MOCK_SAVED_PROPERTIES = new Map<string, any[]>();

// Helper: استخراج userId از توکن
function getUserIdFromToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer balkun-token-")) {
    return null;
  }
  return authHeader.replace("Bearer balkun-token-", "");
}

// GET: دریافت لیست اقامتگاه‌های ذخیره شده
export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req.headers.get("authorization"));

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "احراز هویت ناموفق" },
        { status: 401 }
      );
    }

    // TODO: در فاز صفر با Supabase
    // const { data, error } = await supabase
    //   .from('saved_properties')
    //   .select('*')
    //   .eq('user_id', userId)
    //   .order('saved_at', { ascending: false });

    // Mock Data
    const savedProperties = MOCK_SAVED_PROPERTIES.get(userId) || [
      {
        id: "saved-1",
        roomId: "otaghak-123",
        roomName: "ویلا لوکس شمال",
        cityName: "رامسر",
        stateName: "مازندران",
        pricePerNight: 3500000,
        imageUrl: "/hero1.webp",
        rating: 4.8,
        savedAt: new Date().toISOString()
      },
      {
        id: "saved-2",
        roomId: "otaghak-456",
        roomName: "آپارتمان ساحلی",
        cityName: "چالوس",
        stateName: "مازندران",
        pricePerNight: 2800000,
        imageUrl: "/hero2.webp",
        rating: 4.5,
        savedAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];

    return NextResponse.json({
      success: true,
      properties: savedProperties
    });
  } catch (error) {
    console.error("Error fetching saved properties:", error);
    return NextResponse.json(
      { success: false, error: "خطا در دریافت اطلاعات" },
      { status: 500 }
    );
  }
}

// POST: افزودن اقامتگاه به علاقه‌مندی‌ها
export async function POST(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req.headers.get("authorization"));

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "احراز هویت ناموفق" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { roomId, roomName, cityName, stateName, pricePerNight, imageUrl, rating } = body;

    if (!roomId || !roomName) {
      return NextResponse.json(
        { success: false, error: "اطلاعات ناقص است" },
        { status: 400 }
      );
    }

    // TODO: با Supabase
    // const { data, error } = await supabase
    //   .from('saved_properties')
    //   .insert([{
    //     user_id: userId,
    //     room_id: roomId,
    //     room_name: roomName,
    //     ...
    //   }]);

    // Mock
    const newProperty = {
      id: `saved-${Date.now()}`,
      roomId,
      roomName,
      cityName,
      stateName,
      pricePerNight,
      imageUrl,
      rating,
      savedAt: new Date().toISOString()
    };

    const userProperties = MOCK_SAVED_PROPERTIES.get(userId) || [];
    userProperties.unshift(newProperty);
    MOCK_SAVED_PROPERTIES.set(userId, userProperties);

    return NextResponse.json({
      success: true,
      property: newProperty,
      message: "اقامتگاه به علاقه‌مندی‌ها اضافه شد"
    });
  } catch (error) {
    console.error("Error saving property:", error);
    return NextResponse.json(
      { success: false, error: "خطا در ذخیره اقامتگاه" },
      { status: 500 }
    );
  }
}

// DELETE: حذف اقامتگاه از علاقه‌مندی‌ها
export async function DELETE(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req.headers.get("authorization"));

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "احراز هویت ناموفق" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { propertyId } = body;

    if (!propertyId) {
      return NextResponse.json(
        { success: false, error: "شناسه اقامتگاه الزامی است" },
        { status: 400 }
      );
    }

    // TODO: با Supabase
    // const { error } = await supabase
    //   .from('saved_properties')
    //   .delete()
    //   .eq('id', propertyId)
    //   .eq('user_id', userId);

    // Mock
    const userProperties = MOCK_SAVED_PROPERTIES.get(userId) || [];
    const filtered = userProperties.filter(p => p.id !== propertyId);
    MOCK_SAVED_PROPERTIES.set(userId, filtered);

    return NextResponse.json({
      success: true,
      message: "اقامتگاه از علاقه‌مندی‌ها حذف شد"
    });
  } catch (error) {
    console.error("Error removing property:", error);
    return NextResponse.json(
      { success: false, error: "خطا در حذف اقامتگاه" },
      { status: 500 }
    );
  }
}
