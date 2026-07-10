// مسیر: src/app/api/corporate/lead/route.ts
// POST: ثبت درخواست همکاری سازمانی از فرم عمومی /corporate.
//
// 🔒 اصلاحیه امنیتی: محدودیت ضد اسپم اضافه شد (دقیقاً همان الگوی سه‌لایه‌ای که در
// src/lib/otp/otpService.ts برای OTP پیاده‌سازی شده بود):
//   ۱) کول‌داون بین دو ثبت متوالی از یک شماره موبایل یکسان
//   ۲) سقف تعداد درخواست در ۲۴ ساعت برای همان شماره موبایل
//   ۳) سقف تعداد درخواست در یک بازه‌ی زمانی برای همان IP (جلوگیری از اسپم روی چند شماره مختلف)
// قبل از این تغییر، این روت کاملاً بدون محدودیت بود و هر کاربری می‌توانست به‌دفعات
// جدول organization_leads را با درخواست‌های مصنوعی پر کند.
//
// ⚠️ برای کار کردن این فایل، باید ستون "ipAddress" به جدول organization_leads اضافه شود
// (به فایل SQL همراه این تغییر مراجعه کنید).

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// 🔒 محدودیت‌های ضد اسپم (قابل تنظیم از طریق متغیرهای محیطی، مثل الگوی otpService.ts)
const LEAD_RESEND_COOLDOWN_SECONDS = Number(process.env.CORPORATE_LEAD_COOLDOWN_SECONDS || 60);
const MAX_LEADS_PER_PHONE_PER_DAY = Number(process.env.MAX_LEADS_PER_PHONE_PER_DAY || 3);
const MAX_LEADS_PER_IP_PER_WINDOW = Number(process.env.MAX_LEADS_PER_IP_PER_WINDOW || 5);
const LEAD_IP_WINDOW_MINUTES = Number(process.env.CORPORATE_LEAD_IP_WINDOW_MINUTES || 60);

// 🔒 استخراج آی‌پی واقعی کاربر از هدرهای پروکسی (Vercel/Nginx)
// همان تابعی که در src/app/api/auth/send-otp/route.ts استفاده شده است.
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
    const { companyName, contactPerson, phoneNumber, personnelCount, description } = await request.json();

    if (!companyName || !contactPerson || !phoneNumber) {
      return NextResponse.json({ success: false, error: "لطفا فیلدهای الزامی را تکمیل کنید" }, { status: 400 });
    }

    const phoneRegex = /^09[0-9]{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json({ success: false, error: "شماره موبایل وارد شده معتبر نیست" }, { status: 400 });
    }

    const ipAddress = getClientIp(request);

    // ۱. کول‌داون بین دو درخواست متوالی برای همین شماره موبایل
    const { data: lastLead } = await supabaseAdmin
      .from("organization_leads")
      .select("createdAt")
      .eq("phoneNumber", phoneNumber)
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastLead) {
      const secondsSinceLast = (Date.now() - new Date(lastLead.createdAt).getTime()) / 1000;
      if (secondsSinceLast < LEAD_RESEND_COOLDOWN_SECONDS) {
        const wait = Math.ceil(LEAD_RESEND_COOLDOWN_SECONDS - secondsSinceLast);
        return NextResponse.json(
          { success: false, error: `شما به‌تازگی یک درخواست ثبت کرده‌اید. لطفا ${wait} ثانیه دیگر مجددا تلاش کنید` },
          { status: 429 }
        );
      }
    }

    // ۲. سقف تعداد درخواست در ۲۴ ساعت برای همین شماره موبایل (ضد اسپم)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: phoneCount, error: phoneCountError } = await supabaseAdmin
      .from("organization_leads")
      .select("id", { count: "exact", head: true })
      .eq("phoneNumber", phoneNumber)
      .gte("createdAt", oneDayAgo);

    if (phoneCountError) {
      console.error("Corporate Lead phone rate-check error:", phoneCountError);
    } else if ((phoneCount || 0) >= MAX_LEADS_PER_PHONE_PER_DAY) {
      return NextResponse.json(
        {
          success: false,
          error:
            "تعداد درخواست‌های ثبت‌شده با این شماره موبایل بیش از حد مجاز است. لطفا فردا دوباره تلاش کنید یا از طریق پشتیبانی با ما در تماس باشید",
        },
        { status: 429 }
      );
    }

    // ۳. سقف تعداد درخواست در یک بازه‌ی زمانی برای همین IP (جلوگیری از اسپم روی چند شماره مختلف)
    if (ipAddress) {
      const ipWindowStart = new Date(Date.now() - LEAD_IP_WINDOW_MINUTES * 60 * 1000).toISOString();
      const { count: ipCount, error: ipCountError } = await supabaseAdmin
        .from("organization_leads")
        .select("id", { count: "exact", head: true })
        .eq("ipAddress", ipAddress)
        .gte("createdAt", ipWindowStart);

      if (ipCountError) {
        console.error("Corporate Lead IP rate-check error:", ipCountError);
      } else if ((ipCount || 0) >= MAX_LEADS_PER_IP_PER_WINDOW) {
        return NextResponse.json(
          { success: false, error: "تعداد درخواست از این دستگاه بیش از حد مجاز است. کمی بعد دوباره تلاش کنید" },
          { status: 429 }
        );
      }
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
        ipAddress: ipAddress || null,
      },
    ]);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "درخواست شما با موفقیت ثبت شد" });
  } catch (error) {
    console.error("Corporate Lead Error:", error);
    return NextResponse.json({ success: false, error: "خطا در ثبت درخواست. لطفا مجددا تلاش کنید." }, { status: 500 });
  }
}