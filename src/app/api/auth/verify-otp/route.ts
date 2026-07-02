import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isOtpValid, consumeOtp } from "@/lib/otp/otpService";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const { phoneNumber, otp } = await request.json();

    if (!phoneNumber || !otp) {
      return NextResponse.json({ success: false, error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const valid = await isOtpValid(phoneNumber, otp);
    if (!valid) {
      return NextResponse.json({ success: false, error: "کد تایید اشتباه یا منقضی شده است" }, { status: 400 });
    }

    // بررسی اینکه آیا کاربر از قبل در دیتابیس وجود دارد یا نه
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("phoneNumber", phoneNumber)
      .maybeSingle();

    // اگر کاربر پیدا نشد (یعنی جدید است)، کد را مصرف نمی‌کنیم
    // چون مرحله بعدی (register) دوباره به همین کد نیاز دارد
    if (!user) {
      return NextResponse.json({ success: true, isNewUser: true });
    }

    // کاربر قدیمی است — ورود همین‌جا کامل می‌شود، پس کد تایید مصرف می‌شود
    await consumeOtp(phoneNumber, otp);

    await supabaseAdmin
      .from("users")
      .update({ lastLoginAt: new Date().toISOString() })
      .eq("id", user.id);

    // 🔐 صدور نشست امن: از این پس منبع واقعی احراز هویت، کوکی HttpOnly امضاشده (JWT) است.
    // نقش کاربر (role) هم در توکن حمل می‌شود تا دسترسی پنل ادمین کنترل شود.
    const sessionToken = await createSessionToken({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      userType: user.userType,
      role: user.role,
    });

    // این مقدار صرفاً برای سازگاری با UI فعلی (Zustand authStore) نگه داشته شده
    // و از این پس هیچ نقشی در احراز هویت واقعی سمت سرور ندارد.
    const legacyClientToken = `balkun-token-${user.id}`;

    const response = NextResponse.json({
      success: true,
      isNewUser: false,
      user,
      token: legacyClientToken,
    });

    response.cookies.set(SESSION_COOKIE.name, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_COOKIE.maxAge,
    });

    return response;
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return NextResponse.json({ success: false, error: "خطای سرور" }, { status: 500 });
  }
}