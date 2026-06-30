// مسیر مقصد این فایل (فایل جدید): src/app/api/user/bookings/route.ts
// این API رزروهای کاربر رو از دیتابیس می‌خونه و قانون مخفی‌سازی ۱۵ دقیقه‌ای رو روش اعمال می‌کنه.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Booking } from "@/types/database";

export async function GET(request: Request) {
  try {
    // ۱. دریافت توکن از هدر
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "توکن نامعتبر است" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    
    // ۲. استخراج شناسه کاربر (در فاز ۷ اینجا از توکن JWT واقعی بازگشایی می‌شه)
    const userId = token.replace("balkun-token-", "");
    if (!userId) {
      return NextResponse.json({ success: false, error: "کاربر یافت نشد" }, { status: 401 });
    }

    // ۳. دریافت رزروهای کاربر از دیتابیس
    const { data: bookings, error } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("userId", userId)
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("Supabase Error:", error);
      throw new Error("خطا در ارتباط با پایگاه داده");
    }

    // ۴. اعمال قانون تجاری فاز ۸: مخفی‌سازی رزروهای لغوشده توسط میزبان پس از ۱۵ دقیقه
    const now = new Date().getTime();
    const filteredBookings = (bookings as Booking[]).filter((booking) => {
      // اگر از قبل توسط کرون‌جاب مخفی شده بود
      if (booking.isVisibleForUser === false) return false;

      // بررسی داینامیک تایمر ۱۵ دقیقه
      if (booking.status === "CANCELLED_BY_HOST") {
        const cancelTime = new Date(booking.createdAt).getTime(); // در فازهای بعد با cancelledAt جایگزین می‌شود
        const diffMinutes = (now - cancelTime) / (1000 * 60);
        if (diffMinutes > 15) {
          return false; // از دید کاربر مخفی می‌شود
        }
      }
      return true;
    });

    return NextResponse.json({ success: true, bookings: filteredBookings });
  } catch (error) {
    console.error("Fetch Bookings Error:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت لیست رزروها" }, { status: 500 });
  }
}