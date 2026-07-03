// مسیر: src/app/api/auth/send-otp/route.ts

import { NextResponse } from "next/server";
import { createOtp } from "@/lib/otp/otpService";
import { sendOtpSms } from "@/lib/sms/smsService";

// 🔒 استخراج آی‌پی واقعی کاربر از هدرهای پروکسی (Vercel/Nginx) برای سیستم ضد اسپم فاز ۱۰
function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

export async function POST(request: Request) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber || phoneNumber.length !== 11) {
      return NextResponse.json({ success: false, error: "شماره موبایل نامعتبر است" }, { status: 400 });
    }

    const ipAddress = getClientIp(request);
    const result = await createOtp(phoneNumber, ipAddress);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 429 });
    }

    await sendOtpSms(phoneNumber, result.code);

    return NextResponse.json({
      success: true,
      message: "کد تایید ارسال شد",
    });
  } catch (error) {
    console.error("Send OTP Error:", error);
    return NextResponse.json({ success: false, error: "خطا در پردازش درخواست" }, { status: 500 });
  }
}