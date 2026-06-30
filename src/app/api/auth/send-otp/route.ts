import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber || phoneNumber.length !== 11) {
      return NextResponse.json({ success: false, error: "شماره موبایل نامعتبر است" }, { status: 400 });
    }

    // TODO: در فاز ۷ (نوتیفیکیشن‌ها)، اینجا به پنل پیامکی ایران متصل می‌شویم
    // فعلاً برای محیط توسعه، کد را به صورت تستی در کنسول سرور چاپ می‌کنیم
    console.log(`[Balkun MOCK SMS] کد تایید برای شماره ${phoneNumber} : 1234`);

    return NextResponse.json({ 
      success: true, 
      message: "کد تایید ارسال شد" 
    });

  } catch (error) {
    console.error("Send OTP Error:", error);
    return NextResponse.json({ success: false, error: "خطا در پردازش درخواست" }, { status: 500 });
  }
}