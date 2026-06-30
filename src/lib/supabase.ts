import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database"; // در آینده تایپ‌های جنریت شده سوپابیس رو هم میشه اینجا اضافه کرد

// آدرس و کلید عمومی سوپابیس که باید در فایل env.local قرار بگیرند
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ متغیرهای محیطی Supabase تنظیم نشده‌اند. لطفا فایل .env.local را بررسی کنید.");
}

// ساخت نمونه کلاینت سوپابیس برای استفاده در تمام بخش‌های کلاینت و فرانت‌اند
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});