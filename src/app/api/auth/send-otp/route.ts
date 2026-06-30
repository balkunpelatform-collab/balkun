// مسیر: src/app/api/auth/send-otp/route.ts

import { NextResponse } from "next/server";
import { createOtp } from "@/lib/otp/otpService";
import { sendOtpSms } from "@/lib/sms/smsService";

export async function POST(request: Request) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber || phoneNumber.length !== 11) {
      return NextResponse.json({ success: false, error: "شماره موبایل نامعتبر است" }, { status: 400 });
    }

    const result = await createOtp(phoneNumber);

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