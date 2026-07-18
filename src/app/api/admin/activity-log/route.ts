
// مسیر: src/app/api/admin/activity-log/route.ts
//
// 🆕 تسک ۲ چک‌لیست کارفرما (نمایش لاگ فعالیت‌های پشتیبانی، مالی و مدیر ارشد):
// این روت، لیست کامل و صفحه‌بندی‌شده‌ی جدول admin_audit_logs را برمی‌گرداند —
// همان جدولی که از فاز ۹ برای ثبت اجباری اقدامات حساس ادمین (تغییر نقش، شارژ/کسر
// کیف پول، تغییر/حذف رزرو، تغییر دسترسی، تغییرات بلاگ/سازمانی و — با این تسک —
// پاسخ‌دهی/بستن تیکت) استفاده می‌شود. کار این تسک صرفاً «نمایش» بود؛ ثبت لاگ‌ها
// از قبل به‌صورت اجباری در تمام Route Handler های حساس انجام می‌شد.
//
// دسترسی و حریم خصوصی:
// - SUPER_ADMIN: می‌تواند فعالیت تمام کارمندان (پشتیبانی، مالی، مدیر ارشد) را ببیند
//   و با پارامتر staffId فیلتر کند.
// - SUPPORT_AGENT و FINANCE_MANAGER: فقط تاریخچه‌ی اقدامات خودشان را می‌بینند
//   (adminId همیشه برابر شناسه‌ی خودشان اجباری می‌شود، حتی اگر staffId دیگری
//   در URL ارسال شود) — تا هیچ پشتیبانی نتواند فعالیت همکار دیگری را رصد کند.
//
// این یک عملیات حساس/نظارتی است، پس مثل wallet-history از سیستم تب‌های تفویضی
// (requireAdminTabAccess) استفاده نمی‌کند و مستقیماً با requireAdminRole کنترل می‌شود.
//
// 🆕 تسک ۸ چک‌لیست کارفرما (امکان حذف برای مدیران ارشد): متد DELETE به همین روت
// اضافه شد تا مدیر ارشد بتواند تک‌تک ردیف‌های لاگ را حذف کند (فقط SUPER_ADMIN).
// همچنین لیست VALID_ACTION_TYPES با انواعی که در تسک‌های ۷، ۱۳ و ۱۸ به دیتابیس
// اضافه شده بودند (ORGANIZATION_CHANGE، BANNER_CHANGE، SITE_CONTENT_CHANGE) و دو
// نوع جدید این تسک (USER_DELETE، TICKET_DELETE) همگام‌سازی شد تا فیلتر «نوع اقدام»
// در صفحه برای همه‌ی انواع موجود کار کند.
// نکته‌ی طراحی: حذف یک ردیف لاگ، خودش در همین جدول ثبت نمی‌شود — چون هدف تسک
// «پاک‌سازی لاگ‌ها» است و ثبتِ لاگِ «حذف لاگ» آن را بی‌معنا می‌کرد.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole } from "@/lib/auth/adminAuth";
import type { AdminActionType } from "@/types/database";

// 🆕 تسک ۸: این لیست با تایپ AdminActionType در src/types/database.ts همگام شد
// (انواع ORGANIZATION_CHANGE / BANNER_CHANGE / SITE_CONTENT_CHANGE که در تسک‌های
// قبلی به دیتابیس اضافه شده بودند اما اینجا جا مانده بودند + دو نوع جدید این تسک).
const VALID_ACTION_TYPES: AdminActionType[] = [
  "ROLE_CHANGE",
  "WALLET_ADJUST",
  "USER_STATUS_CHANGE",
  "BOOKING_STATUS_CHANGE",
  "BOOKING_DELETE",
  "PERMISSIONS_CHANGE",
  "BLOG_POST_CHANGE",
  "CORPORATE_LEAD_UPDATE",
  "CORPORATE_NUMBER_CHANGE",
  "TICKET_REPLY",
  "TICKET_STATUS_CHANGE",
  "ORGANIZATION_CHANGE",
  "BANNER_CHANGE",
  "SITE_CONTENT_CHANGE",
  "USER_DELETE",
  "TICKET_DELETE",
  "CACHE_CLEAR",
  "OTHER",
];

export async function GET(request: NextRequest) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN", "SUPPORT_AGENT", "FINANCE_MANAGER"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const isSuperAdmin = admin.role === "SUPER_ADMIN";

  const { searchParams } = new URL(request.url);
  const staffIdParam = searchParams.get("staffId");
  const actionType = searchParams.get("actionType") as AdminActionType | null;
  const dateFrom = searchParams.get("dateFrom"); // YYYY-MM-DD
  const dateTo = searchParams.get("dateTo"); // YYYY-MM-DD
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // 🔒 نکته‌ی امنیتی مهم: پشتیبانی و مدیر مالی فقط اجازه دارند فعالیت خودشان را
  // ببینند، حتی اگر staffId دیگری در URL بفرستند. فقط SUPER_ADMIN می‌تواند
  // با staffId فعالیت هر کارمندی را فیلتر کند (یا آن را خالی بگذارد و همه را ببیند).
  const effectiveStaffId = isSuperAdmin ? staffIdParam || null : admin.userId;

  let query = supabaseAdmin
    .from("admin_audit_logs")
    .select("*", { count: "exact" })
    .order("createdAt", { ascending: false })
    .range(from, to);

  if (effectiveStaffId) {
    query = query.eq("adminId", effectiveStaffId);
  }
  if (actionType && VALID_ACTION_TYPES.includes(actionType)) {
    query = query.eq("actionType", actionType);
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
    console.error("Admin Activity Log Fetch Error:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت لاگ فعالیت‌ها" }, { status: 500 });
  }

  // پیوست اطلاعات کارمند (ادمین/پشتیبان/مالی) و کاربر هدف به هر ردیف لاگ
  const adminIds = Array.from(new Set((logs || []).map((l) => l.adminId).filter(Boolean)));
  const targetUserIds = Array.from(new Set((logs || []).map((l) => l.targetUserId).filter(Boolean)));
  const allUserIds = Array.from(new Set([...adminIds, ...targetUserIds]));

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

  const finalLogs = (logs || []).map((log) => ({
    ...log,
    admin: usersMap[log.adminId] || null,
    targetUser: log.targetUserId ? usersMap[log.targetUserId] || null : null,
  }));

  // فقط برای SUPER_ADMIN: فهرست کارمندانی که تاکنون حداقل یک لاگ ثبت کرده‌اند،
  // برای ساخت منوی فیلتر «فعالیت کدام کارمند» در صفحه‌ی نمایش.
  let staffOptions: { id: string; firstName: string; lastName: string; role: string }[] = [];
  if (isSuperAdmin) {
    const { data: staffUsers } = await supabaseAdmin
      .from("users")
      .select("id, firstName, lastName, role")
      .in("role", ["SUPER_ADMIN", "SUPPORT_AGENT", "FINANCE_MANAGER"])
      .order("firstName", { ascending: true });
    staffOptions = staffUsers || [];
  }

  return NextResponse.json({
    success: true,
    logs: finalLogs,
    staffOptions,
    viewerRole: admin.role,
    pagination: { page, pageSize, total: count || 0 },
  });
}

// 🆕 تسک ۸ چک‌لیست کارفرما — DELETE: حذف یک ردیف لاگ فعالیت (فقط مدیر ارشد).
// شناسه‌ی لاگ به‌صورت پارامتر ?id= ارسال می‌شود. این عملیات فقط برای SUPER_ADMIN
// باز است؛ پشتیبان و مدیر مالی (که اصلاً فقط لاگ‌های خودشان را می‌بینند) حق حذف
// هیچ ردیفی را ندارند — حتی ردیف‌های خودشان.
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
    .from("admin_audit_logs")
    .delete()
    .eq("id", logId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Admin Activity Log Delete Error:", error);
    return NextResponse.json({ success: false, error: "خطا در حذف لاگ" }, { status: 500 });
  }
  if (!deleted) {
    return NextResponse.json({ success: false, error: "لاگ مورد نظر یافت نشد" }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "لاگ با موفقیت حذف شد" });
}
