// مسیر: src/app/api/user/profile/route.ts
// API دریافت و ویرایش اطلاعات پروفایل کاربری — متصل به Supabase واقعی.
// شناسه کاربر دیگر از بدنه درخواست یا هدر Authorization خوانده نمی‌شود؛ این مقدار توسط
// src/middleware.ts پس از اعتبارسنجی امن کوکی نشست، در هدر داخلی x-balkun-user-id تزریق می‌شود.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET: دریافت اطلاعات پروفایل
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-balkun-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "احراز هویت ناموفق" }, { status: 401 });
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Profile Fetch Error:", error);
      throw new Error("خطا در ارتباط با پایگاه داده");
    }

    if (!user) {
      return NextResponse.json({ success: false, error: "کاربر یافت نشد" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت اطلاعات پروفایل" }, { status: 500 });
  }
}

// PUT: ویرایش اطلاعات پروفایل
export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get("x-balkun-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "احراز هویت ناموفق" }, { status: 401 });
    }

    const body = await req.json();
    const { firstName, lastName, email } = body;

    if (!firstName || !lastName) {
      return NextResponse.json({ success: false, error: "نام و نام خانوادگی الزامی است" }, { status: 400 });
    }

    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "نام و نام خانوادگی باید حداقل ۲ کاراکتر باشند" },
        { status: 400 }
      );
    }

    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json({ success: false, error: "فرمت ایمیل نامعتبر است" }, { status: 400 });
      }
    }

    const { data: updatedUser, error } = await supabaseAdmin
      .from("users")
      .update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email?.trim() || null,
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("Profile Update Error:", error);
      throw new Error("خطا در به‌روزرسانی پایگاه داده");
    }

    return NextResponse.json({ success: true, user: updatedUser, message: "اطلاعات با موفقیت به‌روزرسانی شد" });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ success: false, error: "خطا در به‌روزرسانی اطلاعات" }, { status: 500 });
  }
}