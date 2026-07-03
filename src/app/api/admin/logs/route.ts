// مسیر: src/app/api/admin/logs/route.ts
// سیستم لاگ داخلی و یادداشت انتقال شیفت پشتیبانی طبق بخش ۴ سند فاز ۹.
// دسترسی: SUPER_ADMIN و SUPPORT_AGENT هر دو مجازند (ثبت و مشاهده لاگ‌های شیفت).

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole } from "@/lib/auth/adminAuth";
import type { LogCategory } from "@/types/database";

const VALID_CATEGORIES: LogCategory[] = [
  "PHONE_CALL_RECORD",
  "TEAM_INTERNAL_TICKET",
  "SYSTEM_ERROR",
  "SMS_REPORT",
];

// GET: لیست لاگ‌های داخلی، جدیدترین‌ها بالا (فیلتر اختیاری بر اساس دسته‌بندی یا کاربر هدف)
export async function GET(request: NextRequest) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN", "SUPPORT_AGENT"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const targetUserId = searchParams.get("targetUserId");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from("internal_logs")
    .select("*", { count: "exact" })
    .order("loggedAt", { ascending: false })
    .range(from, to);

  if (category && VALID_CATEGORIES.includes(category as LogCategory)) {
    query = query.eq("logCategory", category);
  }
  if (targetUserId) {
    query = query.eq("targetUserId", targetUserId);
  }

  const { data: logs, error, count } = await query;

  if (error) {
    console.error("Internal Logs Fetch Error:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت لاگ‌ها" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    logs: logs ?? [],
    pagination: { page, pageSize, total: count || 0 },
  });
}

// POST: ثبت لاگ داخلی جدید (تماس تلفنی، خطای سیستمی، یادداشت انتقال شیفت و ...)
export async function POST(request: NextRequest) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN", "SUPPORT_AGENT"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const body = await request.json();
  const { logCategory, targetUserId, subject, details, actionTaken, nextActionRequired } = body;

  if (!logCategory || !VALID_CATEGORIES.includes(logCategory)) {
    return NextResponse.json({ success: false, error: "دسته‌بندی لاگ نامعتبر است" }, { status: 400 });
  }
  if (!subject || typeof subject !== "string" || subject.trim().length < 2) {
    return NextResponse.json({ success: false, error: "موضوع لاگ الزامی است" }, { status: 400 });
  }
  if (!details || typeof details !== "string" || details.trim().length < 2) {
    return NextResponse.json({ success: false, error: "شرح ماجرا الزامی است" }, { status: 400 });
  }
  if (!actionTaken || typeof actionTaken !== "string" || actionTaken.trim().length < 2) {
    return NextResponse.json({ success: false, error: "اقدام انجام‌شده الزامی است" }, { status: 400 });
  }

  const { data: newLog, error } = await supabaseAdmin
    .from("internal_logs")
    .insert([
      {
        logCategory,
        creatorId: admin.userId,
        targetUserId: targetUserId || null,
        subject: subject.trim(),
        details: details.trim(),
        actionTaken: actionTaken.trim(),
        nextActionRequired: nextActionRequired?.trim() || null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Internal Log Insert Error:", error);
    return NextResponse.json({ success: false, error: "خطا در ثبت لاگ" }, { status: 500 });
  }

  return NextResponse.json({ success: true, log: newLog });
}