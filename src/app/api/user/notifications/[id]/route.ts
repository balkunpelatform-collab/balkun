// مسیر: src/app/api/user/notifications/[id]/route.ts
//
// علامت‌گذاری یک اعلان مشخص به‌عنوان «خوانده‌شده» — وقتی کاربر روی یک ردیف در پنل
// اعلان‌های زنگوله کلیک می‌کند. مالکیت اعلان با eq("userId", userId) بررسی می‌شود
// تا کاربری نتواند صرفاً با حدس‌زدن شناسه، اعلان کاربر دیگری را تغییر دهد.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get("x-balkun-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "احراز هویت ناموفق" }, { status: 401 });
    }

    const { id: notificationId } = await params;

    const { data: updated, error } = await supabaseAdmin
      .from("notifications")
      .update({ isRead: true })
      .eq("id", notificationId)
      .eq("userId", userId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Mark Notification Read Error:", error);
      return NextResponse.json({ success: false, error: "خطا در به‌روزرسانی اعلان" }, { status: 500 });
    }
    if (!updated) {
      return NextResponse.json({ success: false, error: "اعلان یافت نشد" }, { status: 404 });
    }

    return NextResponse.json({ success: true, notification: updated });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json({ success: false, error: "خطا در پردازش درخواست" }, { status: 500 });
  }
}