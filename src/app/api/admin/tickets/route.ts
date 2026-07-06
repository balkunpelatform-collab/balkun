// مسیر: src/app/api/admin/tickets/route.ts
// GET: لیست تمام تیکت‌های پشتیبانی (همه کاربران) برای مرکز تیکتینگ ادمین طبق بخش ۴ سند فاز ۹.
// 🆕 فاز ۱۱ / بخش ۳: دسترسی حالا از طریق requireAdminTabAccess با کلید "tickets"
// کنترل می‌شود؛ SUPER_ADMIN بدون قیدوشرط و SUPPORT_AGENT فقط با داشتن این دسترسی وارد می‌شود.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminTabAccess } from "@/lib/auth/adminAuth";
import type { TicketStatus } from "@/types/database";

const VALID_STATUSES: TicketStatus[] = ["NEW", "IN_PROGRESS", "ANSWERED", "CLOSED"];

export async function GET(request: NextRequest) {
  const admin = await requireAdminTabAccess(request, "tickets");
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from("tickets")
    .select("*", { count: "exact" })
    .order("updatedAt", { ascending: false })
    .range(from, to);

  if (status && VALID_STATUSES.includes(status as TicketStatus)) {
    query = query.eq("status", status);
  }

  const { data: tickets, error, count } = await query;

  if (error) {
    console.error("Admin Tickets Fetch Error:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت لیست تیکت‌ها" }, { status: 500 });
  }

  const userIds = Array.from(new Set((tickets || []).map((t) => t.userId)));
  let usersMap: Record<string, { firstName: string; lastName: string; phoneNumber: string }> = {};

  if (userIds.length > 0) {
    const { data: ticketUsers } = await supabaseAdmin
      .from("users")
      .select("id, firstName, lastName, phoneNumber")
      .in("id", userIds);

    usersMap = (ticketUsers || []).reduce((acc, u) => {
      acc[u.id] = { firstName: u.firstName, lastName: u.lastName, phoneNumber: u.phoneNumber };
      return acc;
    }, {} as typeof usersMap);
  }

  const enrichedTickets = (tickets || []).map((t) => ({
    ...t,
    user: usersMap[t.userId] || null,
  }));

  return NextResponse.json({
    success: true,
    tickets: enrichedTickets,
    pagination: { page, pageSize, total: count || 0 },
  });
}