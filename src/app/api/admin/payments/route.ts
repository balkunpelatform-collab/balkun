// مسیر: src/app/api/admin/payments/route.ts
//
// 🆕 تسک ۴ چک‌لیست کارفرما (مشاهده کامل پرداخت‌ها توسط مدیر مالی و مدیر ارشد):
// GET: لیست کامل و صفحه‌بندی‌شده‌ی تمام «پرداخت‌های مرتبط با رزرو» در کل سیستم:
//   - پرداخت‌های درگاه (واریز موفق/ناموفق/در انتظار با کد پیگیری BLK-...)
//   - پرداخت‌های کیف پول (برداشت مستقیم بابت رزرو با کد پیگیری WALLET-...)
//   - برگشت وجه‌های مرتبط با لغو رزرو (REFUND-... / ADMIN-REFUND-...)
// به همراه وضعیت پرداخت (gatewayStatus)، مبلغ، و اطلاعات کامل رزرو + مهمان مرتبط.
//
// تفاوت این روت با api/admin/wallet-history (تسک ۱): آن روت «کل» تراکنش‌های
// کیف پول سیستم را نشان می‌دهد (شارژ دستی، کسر دستی، شارژ مستقیم کیف پول و غیره)،
// اما این روت فقط تراکنش‌هایی را برمی‌گرداند که به یک رزرو مشخص (bookingId) متصل‌اند —
// یعنی دقیقاً همان «پرداخت‌ها»یی که مورد ۴ کارفرما خواسته. چون هر تراکنش مرتبط با یک
// رزرو (چه موفق، چه ناموفق، چه برگشتی) با bookingId ثبت می‌شود، نمایش همه‌ی این ردیف‌ها
// (بدون گروه‌بندی) خودش همان «تاریخچه کامل تراکنش‌ها»ی خواسته‌شده در متن تسک است.
//
// دسترسی: فقط SUPER_ADMIN و FINANCE_MANAGER — درست مثل تسک ۱ و برخلاف
// api/admin/bookings (که با requireAdminTabAccess و برای SUPPORT_AGENT هم قابل تفویض
// است)، چون این یک گزارش مالی حساس است، عمداً به سیستم تب‌های تفویضی SUPPORT_AGENT
// وصل نشده و مستقیماً با requireAdminRole کنترل می‌شود.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole } from "@/lib/auth/adminAuth";
import { classifyTransactionSource } from "@/lib/wallet/transactionSource";

const VALID_GATEWAY_STATUSES = ["SUCCESS", "PENDING", "FAILED"];

export async function GET(request: NextRequest) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN", "FINANCE_MANAGER"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || ""; // نام/موبایل مهمان یا نام اقامتگاه
  const method = searchParams.get("method"); // GATEWAY | WALLET | REFUND
  const gatewayStatus = searchParams.get("status"); // SUCCESS | PENDING | FAILED
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // اگر جستجو شد، ابتدا رزروهایی که با نام اتاق یا با مهمان منطبق‌اند پیدا می‌کنیم
  let matchedBookingIds: string[] | null = null;
  if (search) {
    const { data: matchedUsers } = await supabaseAdmin
      .from("users")
      .select("id")
      .or(`firstName.ilike.%${search}%,lastName.ilike.%${search}%,phoneNumber.ilike.%${search}%`);
    const matchedUserIds = (matchedUsers || []).map((u) => u.id);

    let bookingQuery = supabaseAdmin.from("bookings").select("id");
    if (matchedUserIds.length > 0) {
      bookingQuery = bookingQuery.or(
        `roomName.ilike.%${search}%,userId.in.(${matchedUserIds.join(",")})`
      );
    } else {
      bookingQuery = bookingQuery.ilike("roomName", `%${search}%`);
    }

    const { data: matchedBookings } = await bookingQuery;
    matchedBookingIds = (matchedBookings || []).map((b) => b.id);

    if (matchedBookingIds.length === 0) {
      return NextResponse.json({
        success: true,
        payments: [],
        pagination: { page, pageSize, total: 0 },
      });
    }
  }

  let query = supabaseAdmin
    .from("transactions")
    .select("*", { count: "exact" })
    .not("bookingId", "is", null)
    .order("createdAt", { ascending: false })
    .range(from, to);

  if (gatewayStatus && VALID_GATEWAY_STATUSES.includes(gatewayStatus)) {
    query = query.eq("gatewayStatus", gatewayStatus);
  }
  if (dateFrom) {
    query = query.gte("createdAt", new Date(dateFrom).toISOString());
  }
  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    query = query.lte("createdAt", toDate.toISOString());
  }
  if (matchedBookingIds) {
    query = query.in("bookingId", matchedBookingIds);
  }

  const { data: transactions, error, count } = await query;

  if (error) {
    console.error("Admin Payments Fetch Error:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت لیست پرداخت‌ها" }, { status: 500 });
  }

  // پیوست دسته‌بندی معنایی (درگاه / کیف پول / برگشت وجه) به هر تراکنش
  let enriched = (transactions || []).map((tx) => ({
    ...tx,
    source: classifyTransactionSource({ type: tx.type, trackingCode: tx.trackingCode }),
  }));

  // 🆕 فیلتر بر اساس روش پرداخت (بعد از دسته‌بندی، چون در دیتابیس ذخیره نشده است)
  if (method === "GATEWAY") {
    enriched = enriched.filter((tx) => tx.source.category === "GATEWAY_DEPOSIT");
  } else if (method === "WALLET") {
    enriched = enriched.filter((tx) => tx.source.category === "BOOKING_PAYMENT");
  } else if (method === "REFUND") {
    enriched = enriched.filter((tx) => tx.source.category === "REFUND");
  }

  // پیوست اطلاعات رزرو + مهمان مرتبط با هر پرداخت
  const bookingIds = Array.from(new Set(enriched.map((tx) => tx.bookingId).filter(Boolean))) as string[];
  let bookingsMap: Record<
    string,
    { roomName: string; checkInDate: string; checkOutDate: string; status: string; userId: string }
  > = {};
  if (bookingIds.length > 0) {
    const { data: bookings } = await supabaseAdmin
      .from("bookings")
      .select("id, roomName, checkInDate, checkOutDate, status, userId")
      .in("id", bookingIds);
    bookingsMap = (bookings || []).reduce((acc, b) => {
      acc[b.id] = {
        roomName: b.roomName,
        checkInDate: b.checkInDate,
        checkOutDate: b.checkOutDate,
        status: b.status,
        userId: b.userId,
      };
      return acc;
    }, {} as typeof bookingsMap);
  }

  const userIds = Array.from(new Set(Object.values(bookingsMap).map((b) => b.userId)));
  let usersMap: Record<string, { firstName: string; lastName: string; phoneNumber: string }> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabaseAdmin
      .from("users")
      .select("id, firstName, lastName, phoneNumber")
      .in("id", userIds);
    usersMap = (users || []).reduce((acc, u) => {
      acc[u.id] = { firstName: u.firstName, lastName: u.lastName, phoneNumber: u.phoneNumber };
      return acc;
    }, {} as typeof usersMap);
  }

  const finalPayments = enriched.map((tx) => {
    const booking = tx.bookingId ? bookingsMap[tx.bookingId] : null;
    const guest = booking ? usersMap[booking.userId] || null : null;
    return {
      ...tx,
      booking: booking
        ? {
            roomName: booking.roomName,
            checkInDate: booking.checkInDate,
            checkOutDate: booking.checkOutDate,
            status: booking.status,
          }
        : null,
      guest,
    };
  });

  return NextResponse.json({
    success: true,
    payments: finalPayments,
    // 🆕 نکته: چون فیلتر «method» بعد از دریافت از دیتابیس اعمال می‌شود (مثل «category» در
    // api/admin/wallet-history)، در صورت فعال بودن این فیلتر، «total» فقط برابر تعداد
    // رکوردهای همین صفحه خواهد بود، نه کل دیتابیس.
    pagination: {
      page,
      pageSize,
      total: method ? finalPayments.length + from : count || 0,
    },
  });
}