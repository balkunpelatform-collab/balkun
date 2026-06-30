// مسیر: src/app/api/debug/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// این خط باعث میشه ورسل این صفحه رو کش نکنه و همیشه لحظه‌ای تست بگیره
export const dynamic = "force-dynamic"; 

export async function GET() {
  const envStatus = {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    nodeEnv: process.env.NODE_ENV,
  };

  let dbStatus = "تست نشده";
  let dbError = null;

  // اگر کلیدهای ادمین سوپابیس وجود داشت، یه تست اتصال روی همون جدولی که خطا میده می‌گیریم
  if (envStatus.hasSupabaseUrl && envStatus.hasServiceKey) {
    try {
      const { data, error } = await supabaseAdmin.from("otp_codes").select("id").limit(1);
      
      if (error) {
        dbStatus = "❌ خطا در ارتباط با دیتابیس یا پیدا نکردن جدول otp_codes";
        dbError = error;
      } else {
        dbStatus = "✅ اتصال به دیتابیس کاملاً موفق بود (کلیدها کار می‌کنند و جدول وجود دارد)";
      }
    } catch (err: any) {
      dbStatus = "❌ استثنا (Exception) رخ داد";
      dbError = err.message || err;
    }
  } else {
    dbStatus = "⚠️ تست لغو شد چون کلیدهای سوپابیس در Vercel وجود ندارند!";
  }

  return NextResponse.json({
    message: "وضعیت سیستم بالکن روی سرور",
    envStatus,
    dbStatus,
    dbError
  });
}