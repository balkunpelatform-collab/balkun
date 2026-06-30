import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isOtpValid, consumeOtp } from "@/lib/otp/otpService";

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

    // TODO: در گام بعدی زیرساخت امنیتی، اینجا کوکی HttpOnly جایگزین mockToken می‌شود
    const mockToken = `balkun-token-${user.id}`;

    return NextResponse.json({
      success: true,
      isNewUser: false,
      user,
      token: mockToken,
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return NextResponse.json({ success: false, error: "خطای سرور" }, { status: 500 });
  }
}