// مسیر: src/app/api/admin/tickets/[id]/route.ts
// جزئیات یک تیکت برای ادمین + پاسخ‌دهی + بستن تیکت.
// برخلاف api/support/tickets/[id]/route.ts (نسخه کاربر)، اینجا مالکیت تیکت چک نمی‌شود
// چون ادمین باید به تیکت تمام کاربران دسترسی داشته باشد.
// 🆕 فاز ۱۱ / بخش ۳: هر سه تابع حالا از طریق requireAdminTabAccess با کلید "tickets"
// کنترل می‌شوند؛ SUPER_ADMIN بدون قیدوشرط و SUPPORT_AGENT فقط با داشتن این دسترسی وارد می‌شود.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminTabAccess } from "@/lib/auth/adminAuth";

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
    .select("id")
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

  return NextResponse.json({ success: true, message: newMessage, ticket: updatedTicket });
}

// PATCH: بستن تیکت توسط ادمین
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminTabAccess(request, "tickets");
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id: ticketId } = await params;

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

  return NextResponse.json({ success: true, ticket: updatedTicket });
}