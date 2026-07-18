// مسیر: src/app/api/admin/logs/route.ts
// سیستم لاگ داخلی و یادداشت انتقال شیفت پشتیبانی طبق بخش ۴ سند فاز ۹.
// 🆕 فاز ۱۱ / بخش ۳: هر دو تابع حالا از طریق requireAdminTabAccess با کلید "logs"
// کنترل می‌شوند؛ SUPER_ADMIN بدون قیدوشرط و SUPPORT_AGENT فقط با داشتن این دسترسی وارد می‌شود.
//
// 🆕 تسک ۱۱ چک‌لیست کارفرما (افزودن نقش مدیر مالی به سیستم): نقش FINANCE_MANAGER
// هم اکنون بدون هیچ تفویضی به هر دو تابع (GET و POST) دسترسی دارد — این تصمیم در
// خودِ requireAdminTabAccess با ثابت FINANCE_MANAGER_FIXED_TABS اعمال شده
// (src/lib/auth/adminAuth.ts)، نه در این فایل. مدیر مالی هم می‌تواند لاگ‌ها را
// ببیند و هم یادداشت داخلی جدید ثبت کند (مثلاً گزارش یک تماس تلفنی مالی)، چون این
// یک ابزار عملیاتی/گزارشی مشترک است، نه یک عملیات مالی حساس.
//
// 🆕 تسک ۲۵ چک‌لیست کارفرما (عدم نمایش کامل ثبت‌کننده لاگ سیستم): قبلاً GET فقط
// ستون‌های خام جدول internal_logs را برمی‌گرداند (creatorId فقط یک UUID خام بود) و
// صفحه‌ی نمایش هیچ راهی برای نشان دادن «چه کسی» این لاگ را ثبت کرده نداشت. حالا،
// دقیقاً با همان الگوی src/app/api/admin/activity-log/route.ts، بعد از دریافت
// لاگ‌ها، اطلاعات کاربرِ creatorId (و در صورت وجود targetUserId) به‌صورت دسته‌ای
// (یک کوئری batch با .in) از جدول users خوانده و به هر ردیف به شکل creator/targetUser
// چسبانده می‌شود. توجه: ستون creatorId در جدول internal_logs از ابتدا وجود داشت
// (نگاه کنید به بخش ۷ فایل DATABASE_SQL_LOG.md) و همیشه هم در POST پر می‌شد؛ فقط در
// GET هیچ‌وقت به اطلاعات کاربر «join» نمی‌شد. پس هیچ ستون یا جدول جدیدی لازم نبود.

// 🆕 تسک ۱۰ چک‌لیست کارفرما (مشکل نمایش لاگ‌های سیستم): از سه بخش این مورد، دو بخش
// («کامل باز نمی‌شوند» و «مفهوم و جزئیاتشان مشخص نیست») در تسک ۲۵ حل شده بودند.
// بخش سوم و باقی‌مانده — «امکان پاسخ‌گویی ندارند» — با جدول جدید internal_log_replies
// (بند ۲۴ فایل DATABASE_SQL_LOG.md) و روت جدید src/app/api/admin/logs/[id]/replies/route.ts
// حل شد. در همین فایل فقط GET تغییر کرد: تعداد پاسخ‌های هر لاگ به‌صورت دسته‌ای
// (یک کوئری با .in روی همان logId های همین صفحه، نه یک کوئری به ازای هر ردیف)
// محاسبه و به هر ردیف چسبانده می‌شود (replyCount) تا در جدول لیست یک نشان «X پاسخ»
// نمایش داده شود؛ خودِ متن پاسخ‌ها فقط در روت جدید (هنگام باز شدن مودال) خوانده می‌شود.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole, requireAdminTabAccess } from "@/lib/auth/adminAuth";
import type { LogCategory } from "@/types/database";

const VALID_CATEGORIES: LogCategory[] = [
  "PHONE_CALL_RECORD",
  "TEAM_INTERNAL_TICKET",
  "SYSTEM_ERROR",
  "SMS_REPORT",
];

// 🆕 تسک ۸ چک‌لیست کارفرما (امکان حذف برای مدیران ارشد): متد DELETE به همین روت
// اضافه شد تا مدیر ارشد بتواند هر یادداشت داخلی/لاگ سیستمی را حذف کند. برخلاف
// GET/POST که با تب تفویضی "logs" برای پشتیبان و مدیر مالی هم باز هستند، حذف
// عمداً فقط با requireAdminRole(["SUPER_ADMIN"]) کنترل می‌شود — چون پاک‌کردن
// سوابق داخلی تیم یک اختیار حساس و غیرقابل‌بازگشت است. مثل حذف لاگ فعالیت‌ها،
// این عمل خودش در admin_audit_logs ثبت نمی‌شود (هدف تسک، پاک‌سازی واقعی است).

// GET: لیست لاگ‌های داخلی، جدیدترین‌ها بالا (فیلتر اختیاری بر اساس دسته‌بندی یا کاربر هدف)
export async function GET(request: NextRequest) {
  const admin = await requireAdminTabAccess(request, "logs");
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

  // 🆕 تسک ۲۵: پیوست اطلاعات ثبت‌کننده (creator) و کاربر هدف (targetUser) به هر ردیف —
  // دقیقاً همان الگوی batch-fetch که در src/app/api/admin/activity-log/route.ts استفاده شده.
  const creatorIds = Array.from(new Set((logs || []).map((l) => l.creatorId).filter(Boolean)));
  const targetUserIds = Array.from(
    new Set((logs || []).map((l) => l.targetUserId).filter(Boolean))
  );
  const allUserIds = Array.from(new Set([...creatorIds, ...targetUserIds]));

  let usersMap: Record<
    string,
    { firstName: string; lastName: string; phoneNumber: string; role: string }
  > = {};
  if (allUserIds.length > 0) {
    const { data: users } = await supabaseAdmin
      .from("users")
      .select("id, firstName, lastName, phoneNumber, role")
      .in("id", allUserIds);
    usersMap = (users || []).reduce((acc, u) => {
      acc[u.id] = { firstName: u.firstName, lastName: u.lastName, phoneNumber: u.phoneNumber, role: u.role };
      return acc;
    }, {} as typeof usersMap);
  }

  // 🆕 تسک ۱۰ چک‌لیست کارفرما (امکان پاسخ‌گویی به لاگ‌ها): تعداد پاسخ‌های ثبت‌شده
  // روی هر لاگ هم به‌صورت دسته‌ای (یک کوئری با .in روی همان logId های همین صفحه)
  // محاسبه و به هر ردیف چسبانده می‌شود.
  const logIds = (logs || []).map((l) => l.id);
  let replyCountMap: Record<string, number> = {};
  if (logIds.length > 0) {
    const { data: replyRows } = await supabaseAdmin
      .from("internal_log_replies")
      .select("logId")
      .in("logId", logIds);
    replyCountMap = (replyRows || []).reduce((acc, r) => {
      acc[r.logId] = (acc[r.logId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  const finalLogs = (logs || []).map((log) => ({
    ...log,
    creator: usersMap[log.creatorId] || null,
    targetUser: log.targetUserId ? usersMap[log.targetUserId] || null : null,
    replyCount: replyCountMap[log.id] || 0,
  }));

  return NextResponse.json({
    success: true,
    logs: finalLogs,
    pagination: { page, pageSize, total: count || 0 },
  });
}

// POST: ثبت لاگ داخلی جدید (تماس تلفنی، خطای سیستمی، یادداشت انتقال شیفت و ...)
export async function POST(request: NextRequest) {
  const admin = await requireAdminTabAccess(request, "logs");
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

// 🆕 تسک ۸ چک‌لیست کارفرما — DELETE: حذف یک لاگ داخلی/یادداشت شیفت (فقط مدیر ارشد).
// شناسه‌ی لاگ به‌صورت پارامتر ?id= ارسال می‌شود.
export async function DELETE(request: NextRequest) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const logId = searchParams.get("id");

  if (!logId) {
    return NextResponse.json({ success: false, error: "شناسه‌ی لاگ ارسال نشده است" }, { status: 400 });
  }

  const { data: deleted, error } = await supabaseAdmin
    .from("internal_logs")
    .delete()
    .eq("id", logId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Internal Log Delete Error:", error);
    return NextResponse.json({ success: false, error: "خطا در حذف لاگ" }, { status: 500 });
  }
  if (!deleted) {
    return NextResponse.json({ success: false, error: "لاگ مورد نظر یافت نشد" }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "لاگ با موفقیت حذف شد" });
}