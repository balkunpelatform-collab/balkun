// مسیر: src/app/api/admin/logs/[id]/replies/route.ts
// 🆕 تسک ۱۰ چک‌لیست کارفرما (مشکل نمایش لاگ‌های سیستم): بخش «امکان پاسخ‌گویی
// ندارند» این تسک تا امروز پیاده‌سازی نشده بود (بخش‌های «کامل باز نمی‌شوند» و
// «مفهوم و جزئیاتشان مشخص نیست» قبلاً در تسک ۲۵ حل شده بودند — مودال جزئیات کامل
// و ستون ثبت‌کننده). این روت جدید امکان می‌دهد روی هر لاگ داخلی/یادداشت شیفت
// (جدول internal_logs) یک یا چند پاسخ/پیگیری ثبت و مشاهده شود — مثلاً وقتی شیفت
// بعد می‌خواهد بنویسد که «اقدام مورد نیاز شیفت بعد» را انجام داد.
//
// دسترسی دقیقاً همان الگوی خودِ src/app/api/admin/logs/route.ts است:
// از طریق requireAdminTabAccess با کلید "logs" — یعنی SUPER_ADMIN بدون قیدوشرط،
// و SUPPORT_AGENT/FINANCE_MANAGER فقط با داشتن این دسترسی. عمداً نه یک تابع
// جداگانه‌ی سخت‌گیرانه‌تر (مثل requireAdminRole فقط SUPER_ADMIN)، چون ثبت لاگ و
// پاسخ به آن یک ابزار عملیاتی/گزارشی مشترک بین تیم پشتیبانی/مالی است، نه یک
// عملیات حساس مثل حذف.
//
// نیاز به جدول جدید internal_log_replies داشت — نگاه کنید به بند ۲۴ فایل
// DATABASE_SQL_LOG.md برای دستور SQL کامل ساخت این جدول.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminTabAccess } from "@/lib/auth/adminAuth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET: دریافت تمام پاسخ‌های ثبت‌شده روی یک لاگ داخلی، قدیمی‌ترین بالا (ترتیب گفتگو)
export async function GET(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminTabAccess(request, "logs");
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id: logId } = await params;

  const { data: replies, error } = await supabaseAdmin
    .from("internal_log_replies")
    .select("*")
    .eq("logId", logId)
    .order("createdAt", { ascending: true });

  if (error) {
    console.error("Internal Log Replies Fetch Error:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت پاسخ‌ها" }, { status: 500 });
  }

  // پیوست اطلاعات ثبت‌کننده‌ی هر پاسخ — همان الگوی batch-fetch خودِ روت اصلی لاگ‌ها
  // (src/app/api/admin/logs/route.ts) تا برای هر پاسخ یک کوئری جدا زده نشود.
  const creatorIds = Array.from(new Set((replies || []).map((r) => r.creatorId).filter(Boolean)));
  let usersMap: Record<string, { firstName: string; lastName: string; role: string }> = {};
  if (creatorIds.length > 0) {
    const { data: users } = await supabaseAdmin
      .from("users")
      .select("id, firstName, lastName, role")
      .in("id", creatorIds);
    usersMap = (users || []).reduce((acc, u) => {
      acc[u.id] = { firstName: u.firstName, lastName: u.lastName, role: u.role };
      return acc;
    }, {} as typeof usersMap);
  }

  const finalReplies = (replies || []).map((r) => ({
    ...r,
    creator: usersMap[r.creatorId] || null,
  }));

  return NextResponse.json({ success: true, replies: finalReplies });
}

// POST: ثبت پاسخ/پیگیری جدید روی یک لاگ داخلی
export async function POST(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminTabAccess(request, "logs");
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id: logId } = await params;
  const body = await request.json();
  const { message } = body;

  if (!message || typeof message !== "string" || message.trim().length < 1) {
    return NextResponse.json({ success: false, error: "متن پاسخ نمی‌تواند خالی باشد" }, { status: 400 });
  }

  // بررسی وجود لاگ مقصد، تا پاسخی برای یک لاگ حذف‌شده/نامعتبر ثبت نشود
  const { data: existingLog, error: fetchError } = await supabaseAdmin
    .from("internal_logs")
    .select("id")
    .eq("id", logId)
    .maybeSingle();

  if (fetchError || !existingLog) {
    return NextResponse.json({ success: false, error: "لاگ مورد نظر یافت نشد" }, { status: 404 });
  }

  const { data: newReply, error } = await supabaseAdmin
    .from("internal_log_replies")
    .insert([{ logId, creatorId: admin.userId, message: message.trim() }])
    .select()
    .single();

  if (error) {
    console.error("Internal Log Reply Insert Error:", error);
    return NextResponse.json({ success: false, error: "خطا در ثبت پاسخ" }, { status: 500 });
  }

  // پیوست اطلاعات ثبت‌کننده به همان پاسخِ تازه ثبت‌شده، تا پنل بتواند بدون رفرش
  // یا کوئری اضافه، بلافاصله نام و نقش نویسنده را نشان دهد.
  const { data: creatorUser } = await supabaseAdmin
    .from("users")
    .select("firstName, lastName, role")
    .eq("id", admin.userId)
    .maybeSingle();

  return NextResponse.json({
    success: true,
    reply: { ...newReply, creator: creatorUser || null },
  });
}