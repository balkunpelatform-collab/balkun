// مسیر: src/app/api/user/profile/route.ts
// API برای دریافت و ویرایش اطلاعات پروفایل کاربری

import { NextRequest, NextResponse } from "next/server";

// Mock Database (در فاز صفر با Supabase جایگزین می‌شود)
const MOCK_USERS = new Map();

// Helper: استخراج userId از توکن
function getUserIdFromToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer balkun-token-")) {
    return null;
  }
  return authHeader.replace("Bearer balkun-token-", "");
}

// GET: دریافت اطلاعات پروفایل
export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req.headers.get("authorization"));

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "احراز هویت ناموفق" },
        { status: 401 }
      );
    }

    // در حالت Mock، کاربر را از Map یا از Store بازگردانی می‌کنیم
    const mockUser = {
      id: userId,
      phoneNumber: "09123456789",
      firstName: "کاربر",
      lastName: "تستی",
      email: null,
      userType: "NORMAL" as const,
      organizationName: null,
      joinedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isActive: true
    };

    return NextResponse.json({
      success: true,
      user: MOCK_USERS.get(userId) || mockUser
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { success: false, error: "خطا در دریافت اطلاعات پروفایل" },
      { status: 500 }
    );
  }
}

// PUT: ویرایش اطلاعات پروفایل
export async function PUT(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req.headers.get("authorization"));

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "احراز هویت ناموفق" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { firstName, lastName, email } = body;

    // اعتبارسنجی
    if (!firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: "نام و نام خانوادگی الزامی است" },
        { status: 400 }
      );
    }

    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "نام و نام خانوادگی باید حداقل ۲ کاراکتر باشند" },
        { status: 400 }
      );
    }

    // اعتبارسنجی ایمیل (اختیاری)
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: "فرمت ایمیل نامعتبر است" },
          { status: 400 }
        );
      }
    }

    // TODO: در فاز صفر، اینجا با Supabase کار می‌کنیم
    // const { data, error } = await supabase
    //   .from('users')
    //   .update({
    //     first_name: firstName.trim(),
    //     last_name: lastName.trim(),
    //     email: email?.trim() || null
    //   })
    //   .eq('id', userId)
    //   .select()
    //   .single();

    // فعلاً Mock
    const currentUser = MOCK_USERS.get(userId) || {
      id: userId,
      phoneNumber: "09123456789",
      userType: "NORMAL",
      organizationName: null,
      joinedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isActive: true
    };

    const updatedUser = {
      ...currentUser,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email?.trim() || null
    };

    MOCK_USERS.set(userId, updatedUser);

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: "اطلاعات با موفقیت به‌روزرسانی شد"
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { success: false, error: "خطا در به‌روزرسانی اطلاعات" },
      { status: 500 }
    );
  }
}
