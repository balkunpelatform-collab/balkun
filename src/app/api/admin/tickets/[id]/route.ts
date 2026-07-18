
// مسیر: src/app/api/admin/tickets/[id]/route.ts
// جزئیات یک تیکت برای ادمین + پاسخ‌دهی + بستن تیکت.
// برخلاف api/support/tickets/[id]/route.ts (نسخه کاربر)، اینجا مالکیت تیکت چک نمی‌شود
// چون ادمین باید به تیکت تمام کاربران دسترسی داشته باشد.
// 🆕 فاز ۱۱ / بخش ۳: هر سه تابع حالا از طریق requireAdminTabAccess با کلید "tickets"
// کنترل می‌شوند؛ SUPER_ADMIN بدون قیدوشرط و SUPPORT_AGENT فقط با داشتن این دسترسی وارد می‌شود.
// 🆕 تسک ۲ چک‌لیست کارفرما (نمایش لاگ فعالیت‌های پشتیبانی/مالی/مدیر ارشد): پاسخ‌دهی
// (POST) و بستن تیکت (PATCH) حالا به‌صورت اجباری در admin_audit_logs ثبت می‌شوند
// (actionType های TICKET_REPLY و TICKET_STATUS_CHANGE) تا در صفحه‌ی جدید
// «لاگ فعالیت‌ها» (`/admin/activity-log`) هر پشتیبان بتواند تاریخچه‌ی کار خودش را ببیند
// و مدیر ارشد بتواند فعالیت همه‌ی تیم را رصد کند.
// 🆕 تسک ۹ چک‌لیست کارفرما: بلافاصله بعد از ثبت موفق پاسخ ادمین (POST)، برای کاربر
// صاحب تیکت پیامک اطلاع‌رسانی ارسال می‌شود (sendTicketReplySms). این ارسال دقیقاً مثل
// بقیه‌ی پیامک‌های غیر-OTP در پروژه (تایید رزرو، لغو رزرو و ...) غیرحیاتی است: اگر شماره
// موبایل کاربر در دسترس نباشد یا ارسال با خطا مواجه شود، پاسخ‌دهی به تیکت (که خودش
// موفق بوده) هرگز شکست نمی‌خورد و فقط خطا در کنسول سرور لاگ می‌شود.
// 🆕 تسک ۱۵ چک‌لیست کارفرما (نمایش زنگوله‌ی هدر واقعی): در همان try/catch، یک اعلان
// درون‌برنامه‌ای هم برای کاربر ثبت می‌شود تا با کلیک روی آن مستقیم به همین تیکت برود.
// 🆕 تسک ۸ چک‌لیست کارفرما (امکان حذف برای مدیران ارشد): متد DELETE به همین روت
// اضافه شد — فقط و فقط SUPER_ADMIN (عمداً با requireAdminRole، نه تب‌های تفویضی،
// تا پشتیبان حتی با داشتن دسترسی تب تیکتینگ هم نتواند تیکتی را حذف کند). به لطف
// قید ON DELETE CASCADE روی ticket_messages.ticketId، تمام پیام‌های تیکت هم
// خودکار حذف می‌شوند. هر حذف موفق با actionType جدید TICKET_DELETE در
// admin_audit_logs ثبت می‌شود (بند ۲۳ سند DATABASE_SQL_LOG.md).

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole, requireAdminTabAccess, logAdminAction } from "@/lib/auth/adminAuth";
import { sendTicketReplySms } from "@/lib/sms/smsService";
import { createNotification } from "@/lib/notifications/notificationService";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET: دریافت جزئیات تیکت + تاریخچه پیام‌ها + اطلاعات مهمان
export async function GET(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminTabAccess(request, "tickets");
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id: ticketId } = await params;

  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from("tickets")
    .select("*")
    .eq("id", ticketId)
    .maybeSingle();

  if (ticketError) {
    console.error("Admin Ticket Fetch Error:", ticketError);
    return NextResponse.json({ success: false, error: "خطا در دریافت تیکت" }, { status: 500 });
  }
  if (!ticket) {
    return NextResponse.json({ success: false, error: "تیکت یافت نشد" }, { status: 404 });
  }

  const [{ data: messages, error: messagesError }, { data: user }] = await Promise.all([
    supabaseAdmin.from("ticket_messages").select("*").eq("ticketId", ticketId).order("sentAt", { ascending: true }),
    supabaseAdmin.from("users").select("id, firstName, lastName, phoneNumber").eq("id", ticket.userId).maybeSingle(),
  ]);

  if (messagesError) {
    console.error("Admin Ticket Messages Fetch Error:", messagesError);
    return NextResponse.json({ success: false, error: "خطا در دریافت پیام‌ها" }, { status: 500 });
  }

  return NextResponse.json({ success: true, ticket, messages: messages ?? [], user: user || null });
}

// POST: ثبت پاسخ ادمین به تیکت — وضعیت تیکت به ANSWERED تغییر می‌کند
export async function POST(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminTabAccess(request, "tickets");
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id: ticketId } = await params;
  const body = await request.json();
  const { message } = body;

  if (!message || typeof message !== "string" || message.trim().length < 1) {
    return NextResponse.json({ success: false, error: "متن پاسخ نمی‌تواند خالی باشد" }, { status: 400 });
  }

  const { data: existingTicket, error: fetchError } = await supabaseAdmin
    .from("tickets")
    .select("id, userId, subject, status")
    .eq("id", ticketId)
    .maybeSingle();

  if (fetchError || !existingTicket) {
    return NextResponse.json({ success: false, error: "تیکت یافت نشد" }, { status: 404 });
  }

  const { data: newMessage, error: messageError } = await supabaseAdmin
    .from("ticket_messages")
    .insert([{ ticketId, senderType: "ADMIN", messageText: message.trim() }])
    .select()
    .single();

  if (messageError) {
    console.error("Admin Ticket Reply Insert Error:", messageError);
    return NextResponse.json({ success: false, error: "خطا در ثبت پاسخ" }, { status: 500 });
  }

  const { data: updatedTicket, error: updateError } = await supabaseAdmin
    .from("tickets")
    .update({ status: "ANSWERED", updatedAt: new Date().toISOString() })
    .eq("id", ticketId)
    .select()
    .single();

  if (updateError) {
    console.error("Admin Ticket Status Update Error:", updateError);
    return NextResponse.json({ success: false, error: "خطا در به‌روزرسانی وضعیت تیکت" }, { status: 500 });
  }

  // 🆕 ثبت اجباری در لاگ ممیزی (تسک ۲ چک‌لیست کارفرما) — مشخص می‌کند چه کسی،
  // به کدام تیکت (و کدام کاربر) پاسخ داده و نتیجه (تغییر وضعیت به ANSWERED) چه بوده.
  await logAdminAction({
    adminId: admin.userId,
    actionType: "TICKET_REPLY",
    targetUserId: existingTicket.userId,
    description: `پاسخ به تیکت «${existingTicket.subject}» (شناسه تیکت: ${ticketId}) توسط ادمین.`,
    previousValue: existingTicket.status,
    newValue: "ANSWERED",
  });

  // 🆕 تسک ۹ چک‌لیست کارفرما: ارسال پیامک اطلاع‌رسانی به کاربر صاحب تیکت.
  // عمداً بعد از پاسخ موفق قرار گرفته و در try/catch جدا پیچیده شده تا در هیچ
  // شرایطی (شماره موبایل نامعتبر، خطای پنل پیامکی و ...) پاسخ ثبت‌شده‌ی ادمین
  // را بی‌اثر نکند یا باعث خطای ۵۰۰ به کاربر پنل ادمین نشود.
  try {
    const { data: ticketOwner } = await supabaseAdmin
      .from("users")
      .select("firstName, phoneNumber")
      .eq("id", existingTicket.userId)
      .maybeSingle();

    if (ticketOwner?.phoneNumber) {
      await sendTicketReplySms(ticketOwner.phoneNumber, ticketOwner.firstName ?? "", existingTicket.subject);
    }

    // 🆕 تسک ۱۵ چک‌لیست کارفرما — ثبت اعلان درون‌برنامه‌ای پاسخ پشتیبانی (زنگوله‌ی هدر).
    // linkUrl مستقیماً کاربر را به همین تیکت در صفحه‌ی پشتیبانی (که مقدار را از
    // پارامتر ?ticket= می‌خواند — نگاه کن به src/components/support/SupportClient.tsx) می‌برد.
    await createNotification({
      userId: existingTicket.userId,
      type: "TICKET_REPLIED",
      title: "پاسخ جدید از پشتیبانی بالکن",
      message: `پشتیبانی به تیکت «${existingTicket.subject}» شما پاسخ داد.`,
      linkUrl: `/support?ticket=${ticketId}`,
    });
  } catch (smsError) {
    console.error("Ticket Reply SMS Error:", smsError);
  }

  return NextResponse.json({ success: true, message: newMessage, ticket: updatedTicket });
}

// PATCH: بستن تیکت توسط ادمین
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminTabAccess(request, "tickets");
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id: ticketId } = await params;

  const { data: ticketBeforeClose } = await supabaseAdmin
    .from("tickets")
    .select("id, userId, subject, status")
    .eq("id", ticketId)
    .maybeSingle();

  const { data: updatedTicket, error } = await supabaseAdmin
    .from("tickets")
    .update({ status: "CLOSED", updatedAt: new Date().toISOString() })
    .eq("id", ticketId)
    .select()
    .single();

  if (error) {
    console.error("Admin Ticket Close Error:", error);
    return NextResponse.json({ success: false, error: "خطا در بستن تیکت" }, { status: 500 });
  }
  if (!updatedTicket) {
    return NextResponse.json({ success: false, error: "تیکت یافت نشد" }, { status: 404 });
  }

  // 🆕 ثبت اجباری در لاگ ممیزی (تسک ۲ چک‌لیست کارفرما)
  await logAdminAction({
    adminId: admin.userId,
    actionType: "TICKET_STATUS_CHANGE",
    targetUserId: ticketBeforeClose?.userId ?? null,
    description: `بستن تیکت «${ticketBeforeClose?.subject ?? ""}» (شناسه تیکت: ${ticketId}) توسط ادمین.`,
    previousValue: ticketBeforeClose?.status ?? null,
    newValue: "CLOSED",
  });

  return NextResponse.json({ success: true, ticket: updatedTicket });
}

// 🆕 تسک ۸ چک‌لیست کارفرما — DELETE: حذف کامل یک تیکت به‌همراه تمام پیام‌هایش
// (فقط مدیر ارشد). برخلاف GET/POST/PATCH که با تب تفویضی "tickets" کنترل می‌شوند،
// حذف عمداً فقط با requireAdminRole(["SUPER_ADMIN"]) است تا هیچ پشتیبانی —
// حتی با دسترسی کامل تب تیکتینگ — نتواند سابقه‌ی گفتگو با کاربر را پاک کند.
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id: ticketId } = await params;

  const { data: ticket, error: fetchError } = await supabaseAdmin
    .from("tickets")
    .select("id, userId, subject, status")
    .eq("id", ticketId)
    .maybeSingle();

  if (fetchError || !ticket) {
    return NextResponse.json({ success: false, error: "تیکت یافت نشد" }, { status: 404 });
  }

  // حذف تیکت — پیام‌هایش به لطف ON DELETE CASCADE خودکار حذف می‌شوند
  const { error: deleteError } = await supabaseAdmin.from("tickets").delete().eq("id", ticketId);

  if (deleteError) {
    console.error("Admin Ticket Delete Error:", deleteError);
    return NextResponse.json({ success: false, error: "خطا در حذف تیکت" }, { status: 500 });
  }

  // ثبت اجباری در لاگ ممیزی — مشخص می‌کند کدام مدیر ارشد، کدام تیکتِ کدام کاربر
  // را و در چه وضعیتی حذف کرده است.
  await logAdminAction({
    adminId: admin.userId,
    actionType: "TICKET_DELETE",
    targetUserId: ticket.userId,
    description: `حذف کامل تیکت «${ticket.subject}» (شناسه تیکت: ${ticketId}) به‌همراه تمام پیام‌هایش توسط مدیر ارشد.`,
    previousValue: ticket.status,
    newValue: "DELETED",
  });

  return NextResponse.json({ success: true, message: "تیکت با موفقیت حذف شد" });
}
