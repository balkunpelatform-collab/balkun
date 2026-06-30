import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const { phoneNumber, otp } = await request.json();

    // برای تست، کد ثابت 1234 رو در نظر می‌گیریم (تا وقتی پنل پیامکی وصل بشه)
    if (otp !== "1234") {
      return NextResponse.json({ success: false, error: "کد تایید اشتباه است" }, { status: 400 });
    }

    // بررسی اینکه آیا کاربر از قبل در دیتابیس وجود دارد یا نه
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("phoneNumber", phoneNumber)
      .single();

    // اگر کاربر پیدا نشد (یعنی جدید است)، به فرانت‌اند می‌گیم که باید ثبت‌نام کنه
    if (!user) {
      return NextResponse.json({ success: true, isNewUser: true });
    }

    // اگر کاربر قدیمی بود، آپدیت تاریخ آخرین ورود
    await supabaseAdmin
      .from("users")
      .update({ lastLoginAt: new Date().toISOString() })
      .eq("id", user.id);

    // TODO: در فاز امنیت، اینجا کوکی HttpOnly تنظیم می‌شود
    const mockToken = `balkun-token-${user.id}`;

    return NextResponse.json({ 
      success: true, 
      isNewUser: false, 
      user, 
      token: mockToken 
    });

  } catch (error) {
    console.error("Verify OTP Error:", error);
    return NextResponse.json({ success: false, error: "خطای سرور" }, { status: 500 });
  }
}