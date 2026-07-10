// مسیر: src/app/api/admin/dashboard/route.ts
// GET: شاخص‌های کلیدی داشبورد ادمین (KPIs) طبق بخش ۱ سند فاز ۹.
// چون شامل ارقام مالی حساس (درآمد حاصل از حاشیه سود ۵٪) است، فقط SUPER_ADMIN مجاز است
// (طبق بخش ۵ سند فاز ۹: SUPPORT_AGENT فقط به تیکت‌ها و لیست رزروها دسترسی دارد، نه گزارش مالی).
// 🆕 KPI «درخواست‌های سازمانی خوانده‌نشده» اضافه شد تا مدیر ارشد بلافاصله بعد از
// ورود به داشبورد، از درخواست‌های جدید صفحه‌ی /corporate مطلع شود.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole } from "@/lib/auth/adminAuth";

export async function GET(request: NextRequest) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [todayBookingsRes, openTicketsRes, newUsersRes, monthlyBookingsRes, trendBookingsRes, unreadLeadsRes] =
    await Promise.all([
      supabaseAdmin
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .gte("createdAt", todayStart),
      supabaseAdmin
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .in("status", ["NEW", "IN_PROGRESS"]),
      supabaseAdmin
        .from("users")
        .select("id", { count: "exact", head: true })
        .gte("joinedAt", monthStart),
      supabaseAdmin
        .from("bookings")
        .select("totalPaidAmount")
        .eq("status", "PAID_CONFIRMED")
        .gte("createdAt", monthStart),
      supabaseAdmin.from("bookings").select("createdAt").gte("createdAt", thirtyDaysAgo),
      supabaseAdmin
        .from("organization_leads")
        .select("id", { count: "exact", head: true })
        .eq("adminStatus", "UNREAD"),
    ]);

  if (
    todayBookingsRes.error ||
    openTicketsRes.error ||
    newUsersRes.error ||
    monthlyBookingsRes.error ||
    trendBookingsRes.error ||
    unreadLeadsRes.error
  ) {
    console.error("Dashboard KPI Fetch Error", {
      todayBookingsRes: todayBookingsRes.error,
      openTicketsRes: openTicketsRes.error,
      newUsersRes: newUsersRes.error,
      monthlyBookingsRes: monthlyBookingsRes.error,
      trendBookingsRes: trendBookingsRes.error,
      unreadLeadsRes: unreadLeadsRes.error,
    });
    return NextResponse.json({ success: false, error: "خطا در دریافت اطلاعات داشبورد" }, { status: 500 });
  }

  // درآمد بالکن = مجموع مابه‌التفاوت ۵٪ روی رزروهای قطعی این ماه
  const monthlyRevenue = (monthlyBookingsRes.data || []).reduce((sum, b) => {
    const raw = b.totalPaidAmount / 1.05;
    return sum + Math.round(b.totalPaidAmount - raw);
  }, 0);

  // ساخت روند ۳۰ روز گذشته برای نمودار خطی
  const dayBuckets: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dayBuckets[d.toISOString().slice(0, 10)] = 0;
  }
  (trendBookingsRes.data || []).forEach((b) => {
    const key = new Date(b.createdAt).toISOString().slice(0, 10);
    if (key in dayBuckets) dayBuckets[key] += 1;
  });
  const bookingsTrend = Object.entries(dayBuckets).map(([date, count]) => ({ date, count }));

  return NextResponse.json({
    success: true,
    kpis: {
      todayBookingsCount: todayBookingsRes.count || 0,
      openTicketsCount: openTicketsRes.count || 0,
      newUsersThisMonth: newUsersRes.count || 0,
      monthlyRevenue,
      unreadCorporateLeadsCount: unreadLeadsRes.count || 0,
    },
    bookingsTrend,
  });
}