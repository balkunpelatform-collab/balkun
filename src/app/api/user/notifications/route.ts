// مسیر: src/app/api/user/notifications/route.ts
//
// API زنگوله‌ی هدر (تسک ۱۵ چک‌لیست کارفرما). این مسیر زیر پیشوند /api/user است،
// پس طبق src/middleware.ts از قبل محافظت‌شده و شناسه‌ی کاربر از هدر امن
// x-balkun-user-id (تزریق‌شده توسط میدلور از روی کوکی نشست) خوانده می‌شود — دقیقاً
// هم‌الگو با src/app/api/support/tickets/route.ts.
//
// GET   → آخرین اعلان‌های کاربر (حداکثر ۲۰ مورد، جدیدترین بالا) + تعداد خوانده‌نشده‌ها
// PATCH → علامت‌گذاری تمام اعلان‌های خوانده‌نشده‌ی کاربر به‌عنوان خوانده‌شده
//         (وقتی کاربر روی دکمه‌ی «همه را خوانده‌شده کن» در پنل اعلان‌ها کلیک می‌کند)

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const NOTIFICATIONS_LIST_LIMIT = 20;

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-balkun-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "احراز هویت ناموفق" }, { status: 401 });
    }

    const [{ data: notifications, error: listError }, { count: unreadCount, error: countError }] =
      await Promise.all([
        supabaseAdmin
          .from("notifications")
          .select("*")
          .eq("userId", userId)
          .order("createdAt", { ascending: false })
          .limit(NOTIFICATIONS_LIST_LIMIT),
        supabaseAdmin
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("userId", userId)
          .eq("isRead", false),
      ]);

    if (listError || countError) {
      console.error("Notifications Fetch Error:", listError || countError);
      throw new Error("خطا در ارتباط با پایگاه داده");
    }

    return NextResponse.json({
      success: true,
      notifications: notifications ?? [],
      unreadCount: unreadCount ?? 0,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت اعلان‌ها" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get("x-balkun-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "احراز هویت ناموفق" }, { status: 401 });
    }

    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ isRead: true })
      .eq("userId", userId)
      .eq("isRead", false);

    if (error) {
      console.error("Mark All Notifications Read Error:", error);
      throw new Error("خطا در به‌روزرسانی اعلان‌ها");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json({ success: false, error: "خطا در پردازش درخواست" }, { status: 500 });
  }
}