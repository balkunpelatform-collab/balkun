// مسیر: src/app/api/admin/sms-logs/route.ts
//
// 🆕 مورد ۲۶ چک‌لیست کارفرما (عدم نمایش پنل کاوه‌نگار / وضعیت ارسال پیامک):
// GET: لیست کامل و صفحه‌بندی‌شده‌ی تمام پیامک‌های ارسالی سیستم (چه در حالت Mock
// فعلی، چه بعداً از طریق کاوه‌نگار واقعی)، همراه با وضعیت دقیق هر پیامک
// (Mock / ارسال موفق / ارسال ناموفق)، متن کامل پیامک، خطای دریافتی از
// سرویس‌دهنده (در صورت وجود) و رکورد مرتبط (کاربر/رزرو/تیکت — در صورتی که هنگام
// ارسال ثبت شده باشد).
//
// دسترسی: SUPER_ADMIN، SUPPORT_AGENT و FINANCE_MANAGER — دقیقاً هم‌الگو با
// «لاگ فعالیت‌ها» (activity-log)، چون طبق متن خودِ مورد ۲۶ («مدیران و پشتیبانی
// وضعیت ارسال پیام را نمی‌بینند») هر سه گروه باید بتوانند این پنل را ببینند.
// این یک عملیات کاملاً فقط-خواندنی است، پس (مثل wallet-history و activity-log)
// عمداً از سیستم تب‌های تفویضی SUPPORT_AGENT (requireAdminTabAccess) استفاده
// نمی‌کند و مستقیماً با requireAdminRole کنترل می‌شود.
//
// همچنین مقدار mockMode (بر اساس SMS_CONFIG.useMock) در پاسخ برگردانده می‌شود
// تا صفحه‌ی پنل (src/app/admin/sms-logs/page.tsx) بتواند یک بنر راهنما نمایش
// دهد مبنی بر اینکه سیستم هنوز در حالت آزمایشی است و به کاوه‌نگار واقعی وصل نشده.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole } from "@/lib/auth/adminAuth";
import { SMS_CONFIG } from "@/lib/sms/smsConfig";
import type { SmsLogStatus, SmsMessageType } from "@/types/database";

const VALID_STATUSES: SmsLogStatus[] = ["MOCK", "SENT", "FAILED"];
const VALID_TYPES: SmsMessageType[] = [
  "OTP",
  "WELCOME",
  "BOOKING_CONFIRMED",
  "VOUCHER_ISSUED",
  "BOOKING_CANCELLED",
  "REFUND",
  "TICKET_REPLY",
];

export async function GET(request: NextRequest) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN", "SUPPORT_AGENT", "FINANCE_MANAGER"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || ""; // شماره موبایل گیرنده
  const status = searchParams.get("status") as SmsLogStatus | null;
  const messageType = searchParams.get("messageType") as SmsMessageType | null;
  const dateFrom = searchParams.get("dateFrom"); // YYYY-MM-DD
  const dateTo = searchParams.get("dateTo"); // YYYY-MM-DD
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from("sms_logs")
    .select("*", { count: "exact" })
    .order("createdAt", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.ilike("recipientPhone", `%${search}%`);
  }
  if (status && VALID_STATUSES.includes(status)) {
    query = query.eq("status", status);
  }
  if (messageType && VALID_TYPES.includes(messageType)) {
    query = query.eq("messageType", messageType);
  }
  if (dateFrom) {
    query = query.gte("createdAt", new Date(dateFrom).toISOString());
  }
  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    query = query.lte("createdAt", toDate.toISOString());
  }

  const { data: logs, error, count } = await query;

  if (error) {
    console.error("Admin SMS Logs Fetch Error:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت لاگ پیامک‌ها" }, { status: 500 });
  }

  // پیوست اطلاعات کاربر/رزرو/تیکت مرتبط (در صورتی که هنگام ارسال ثبت شده باشد)
  const userIds = Array.from(new Set((logs || []).map((l) => l.relatedUserId).filter(Boolean))) as string[];
  const bookingIds = Array.from(new Set((logs || []).map((l) => l.relatedBookingId).filter(Boolean))) as string[];
  const ticketIds = Array.from(new Set((logs || []).map((l) => l.relatedTicketId).filter(Boolean))) as string[];

  const [usersRes, bookingsRes, ticketsRes] = await Promise.all([
    userIds.length > 0
      ? supabaseAdmin.from("users").select("id, firstName, lastName, phoneNumber").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; firstName: string; lastName: string; phoneNumber: string }[] }),
    bookingIds.length > 0
      ? supabaseAdmin.from("bookings").select("id, roomName").in("id", bookingIds)
      : Promise.resolve({ data: [] as { id: string; roomName: string }[] }),
    ticketIds.length > 0
      ? supabaseAdmin.from("tickets").select("id, subject").in("id", ticketIds)
      : Promise.resolve({ data: [] as { id: string; subject: string }[] }),
  ]);

  const usersMap = Object.fromEntries((usersRes.data || []).map((u) => [u.id, u]));
  const bookingsMap = Object.fromEntries((bookingsRes.data || []).map((b) => [b.id, b]));
  const ticketsMap = Object.fromEntries((ticketsRes.data || []).map((t) => [t.id, t]));

  const enrichedLogs = (logs || []).map((log) => ({
    ...log,
    relatedUser: log.relatedUserId ? usersMap[log.relatedUserId] || null : null,
    relatedBooking: log.relatedBookingId ? bookingsMap[log.relatedBookingId] || null : null,
    relatedTicket: log.relatedTicketId ? ticketsMap[log.relatedTicketId] || null : null,
  }));

  return NextResponse.json({
    success: true,
    logs: enrichedLogs,
    mockMode: SMS_CONFIG.useMock,
    pagination: { page, pageSize, total: count || 0 },
  });
}