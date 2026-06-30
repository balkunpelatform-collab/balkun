// مسیر مقصد این فایل: src/app/api/auth/register/route.ts
// این فایل را به‌طور کامل جایگزین فایل فعلی کنید

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const { phoneNumber, otp, firstName, lastName } = await request.json();

    if (!phoneNumber || !firstName || !lastName) {
      return NextResponse.json({ success: false, error: "اطلاعات ناقص است" }, { status: 400 });
    }

    // ۱. اعتبارسنجی مجدد کد تایید در سمت سرور
    // این بررسی الزامی است تا کسی نتواند بدون طی کردن مرحله OTP،
    // مستقیماً درخواست ثبت‌نام ارسال کند.
    // TODO: در فاز ۷ (نوتیفیکیشن‌ها) این بخش به جدول OTP واقعی با زمان انقضا متصل می‌شود
    if (otp !== "1234") {
      return NextResponse.json({ success: false, error: "کد تایید نامعتبر یا منقضی شده است" }, { status: 400 });
    }

    // ۲. بررسی اینکه آیا این شماره از قبل در سیستم ثبت‌نام کرده یا نه
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("phoneNumber", phoneNumber)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ success: false, error: "این شماره موبایل قبلاً ثبت‌نام کرده است" }, { status: 409 });
    }

    // ۳. تشخیص خودکار کاربر سازمانی بر اساس لیست شماره‌های سازمانی بالکن
    const { data: orgRecord } = await supabaseAdmin
      .from("organizational_numbers")
      .select("organizationName")
      .eq("phoneNumber", phoneNumber)
      .maybeSingle();

    const userType = orgRecord ? "ORGANIZATIONAL" : "NORMAL";
    const organizationName = orgRecord ? orgRecord.organizationName : null;

    // ۴. ثبت کاربر جدید در دیتابیس
    const { data: newUser, error: userError } = await supabaseAdmin
      .from("users")
      .insert([{ phoneNumber, firstName, lastName, userType, organizationName }])
      .select()
      .single();

    if (userError) throw userError;

    // ۵. ساخت اتوماتیک کیف پول برای این کاربر
    const { error: walletError } = await supabaseAdmin
      .from("wallets")
      .insert([{ userId: newUser.id }]);

    if (walletError) throw walletError;

    const mockToken = `balkun-token-${newUser.id}`;

    return NextResponse.json({
      success: true,
      user: newUser,
      token: mockToken,
    });
  } catch (error) {
    console.error("Register Error:", error);
    return NextResponse.json({ success: false, error: "خطا در ثبت نام. لطفا مجددا تلاش کنید." }, { status: 500 });
  }
}