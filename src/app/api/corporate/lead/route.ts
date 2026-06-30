// مسیر مقصد این فایل (فایل جدید): src/app/api/corporate/lead/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const { companyName, contactPerson, phoneNumber, personnelCount, description } = await request.json();

    if (!companyName || !contactPerson || !phoneNumber) {
      return NextResponse.json({ success: false, error: "لطفا فیلدهای الزامی را تکمیل کنید" }, { status: 400 });
    }

    const phoneRegex = /^09[0-9]{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json({ success: false, error: "شماره موبایل وارد شده معتبر نیست" }, { status: 400 });
    }

    // ثبت درخواست در جدول لیدهای سازمانی
    // adminStatus به‌صورت پیش‌فرض UNREAD است (طبق تعریف فاز صفر) تا در پنل ادمین پیگیری شود
    const { error } = await supabaseAdmin.from("organization_leads").insert([
      {
        companyName,
        contactPerson,
        phoneNumber,
        personnelCount: personnelCount ? Number(personnelCount) : 0,
        description: description || "",
      },
    ]);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "درخواست شما با موفقیت ثبت شد" });
  } catch (error) {
    console.error("Corporate Lead Error:", error);
    return NextResponse.json({ success: false, error: "خطا در ثبت درخواست. لطفا مجددا تلاش کنید." }, { status: 500 });
  }
}