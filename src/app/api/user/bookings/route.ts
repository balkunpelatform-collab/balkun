// مسیر: src/app/api/user/bookings/route.ts
// این API رزروهای کاربر رو از دیتابیس می‌خونه و قانون مخفی‌سازی ۱۵ دقیقه‌ای رو روش اعمال می‌کنه.
// شناسه کاربر از هدر امن x-balkun-user-id (تزریق‌شده توسط middleware) خوانده می‌شود.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Booking } from "@/types/database";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-balkun-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "احراز هویت ناموفق" }, { status: 401 });
    }

    const { data: bookings, error } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("userId", userId)
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("Supabase Error:", error);
      throw new Error("خطا در ارتباط با پایگاه داده");
    }

    // اعمال قانون تجاری فاز ۸: مخفی‌سازی رزروهای لغوشده توسط میزبان پس از ۱۵ دقیقه
    const now = new Date().getTime();
    const filteredBookings = (bookings as Booking[]).filter((booking) => {
      if (booking.isVisibleForUser === false) return false;

      if (booking.status === "CANCELLED_BY_HOST") {
        const cancelTime = new Date(booking.createdAt).getTime();
        const diffMinutes = (now - cancelTime) / (1000 * 60);
        if (diffMinutes > 15) return false;
      }
      return true;
    });

    return NextResponse.json({ success: true, bookings: filteredBookings });
  } catch (error) {
    console.error("Fetch Bookings Error:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت لیست رزروها" }, { status: 500 });
  }
}