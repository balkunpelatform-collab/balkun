// مسیر: src/app/api/admin/bookings/route.ts
// GET: لیست کامل رزروها برای پنل ادمین (Booking CRM طبق بخش ۳ سند فاز ۹).
// برخلاف api/user/bookings، اینجا قانون مخفی‌سازی ۱۵ دقیقه‌ای اعمال نمی‌شود —
// ادمین‌ها باید مادام‌العمر به تمام رزروهای لغوشده (با دلیل) دسترسی داشته باشند.
// دسترسی: SUPER_ADMIN و SUPPORT_AGENT هر دو مجازند (طبق بخش ۵ سند فاز ۹).

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole } from "@/lib/auth/adminAuth";
import type { BookingStatus } from "@/types/database";

const VALID_STATUSES: BookingStatus[] = [
  "WAITING_FOR_HOST",
  "WAITING_FOR_PAYMENT",
  "PAID_CONFIRMED",
  "CANCELLED_BY_HOST",
  "CANCELLED_BY_GUEST",
];

export async function GET(request: NextRequest) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN", "SUPPORT_AGENT"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim() || "";
  const phone = searchParams.get("phone")?.trim() || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from("bookings")
    .select("*", { count: "exact" })
    .order("createdAt", { ascending: false })
    .range(from, to);

  if (status && VALID_STATUSES.includes(status as BookingStatus)) {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(`roomName.ilike.%${search}%,otaghakBookingId.ilike.%${search}%`);
  }

  // فیلتر بر اساس شماره موبایل مهمان: ابتدا شناسه کاربر پیدا می‌شود
  if (phone) {
    const { data: matchedUsers } = await supabaseAdmin
      .from("users")
      .select("id")
      .ilike("phoneNumber", `%${phone}%`);

    const userIds = (matchedUsers || []).map((u) => u.id);
    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        bookings: [],
        pagination: { page, pageSize, total: 0 },
      });
    }
    query = query.in("userId", userIds);
  }

  const { data: bookings, error, count } = await query;

  if (error) {
    console.error("Admin Bookings Fetch Error:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت لیست رزروها" }, { status: 500 });
  }

  // پیوست خلاصه اطلاعات مهمان (نام و شماره تماس) به هر رزرو
  const userIds = Array.from(new Set((bookings || []).map((b) => b.userId)));
  let usersMap: Record<string, { firstName: string; lastName: string; phoneNumber: string }> = {};

  if (userIds.length > 0) {
    const { data: guestUsers } = await supabaseAdmin
      .from("users")
      .select("id, firstName, lastName, phoneNumber")
      .in("id", userIds);

    usersMap = (guestUsers || []).reduce((acc, u) => {
      acc[u.id] = { firstName: u.firstName, lastName: u.lastName, phoneNumber: u.phoneNumber };
      return acc;
    }, {} as typeof usersMap);
  }

  const enrichedBookings = (bookings || []).map((b) => ({
    ...b,
    guest: usersMap[b.userId] || null,
  }));

  return NextResponse.json({
    success: true,
    bookings: enrichedBookings,
    pagination: { page, pageSize, total: count || 0 },
  });
}