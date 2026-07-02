// مسیر: src/app/api/support/tickets/[id]/route.ts
// API جزئیات یک تیکت (پیام‌ها) + افزودن پیام جدید + بستن تیکت توسط کاربر.
// نکته امنیتی: در تمام عملیات، علاوه بر id تیکت، مالکیت آن (userId) هم چک می‌شود
// تا کاربر نتواند با حدس زدن شناسه به تیکت کاربر دیگری دسترسی پیدا کند.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET: دریافت جزئیات تیکت به همراه تاریخچه کامل پیام‌ها
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const userId = req.headers.get("x-balkun-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "احراز هویت ناموفق" }, { status: 401 });
    }

    const { id: ticketId } = await params;

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .select("*")
      .eq("id", ticketId)
      .eq("userId", userId)
      .maybeSingle();

    if (ticketError) {
      console.error("Ticket Fetch Error:", ticketError);
      throw new Error("خطا در ارتباط با پایگاه داده");
    }

    if (!ticket) {
      return NextResponse.json({ success: false, error: "تیکت یافت نشد" }, { status: 404 });
    }

    const { data: messages, error: messagesError } = await supabaseAdmin
      .from("ticket_messages")
      .select("*")
      .eq("ticketId", ticketId)
      .order("sentAt", { ascending: true });

    if (messagesError) {
      console.error("Ticket Messages Fetch Error:", messagesError);
      throw new Error("خطا در ارتباط با پایگاه داده");
    }

    return NextResponse.json({ success: true, ticket, messages: messages ?? [] });
  } catch (error) {
    console.error("Error fetching ticket detail:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت اطلاعات تیکت" }, { status: 500 });
  }
}

// POST: افزودن پیام جدید کاربر به یک تیکت موجود
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const userId = req.headers.get("x-balkun-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "احراز هویت ناموفق" }, { status: 401 });
    }

    const { id: ticketId } = await params;
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== "string" || message.trim().length < 1) {
      return NextResponse.json({ success: false, error: "متن پیام نمی‌تواند خالی باشد" }, { status: 400 });
    }

    // چک مالکیت تیکت
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .select("id, status")
      .eq("id", ticketId)
      .eq("userId", userId)
      .maybeSingle();

    if (ticketError) {
      console.error("Ticket Ownership Check Error:", ticketError);
      throw new Error("خطا در ارتباط با پایگاه داده");
    }

    if (!ticket) {
      return NextResponse.json({ success: false, error: "تیکت یافت نشد" }, { status: 404 });
    }

    const { data: newMessage, error: messageError } = await supabaseAdmin
      .from("ticket_messages")
      .insert([{ ticketId, senderType: "USER", messageText: message.trim() }])
      .select()
      .single();

    if (messageError) {
      console.error("Ticket Message Insert Error:", messageError);
      throw new Error("خطا در ثبت پیام");
    }

    // اگر تیکت قبلاً پاسخ داده شده یا بسته شده بود، با پیام جدید کاربر دوباره «در حال بررسی» می‌شود
    const nextStatus = ticket.status === "ANSWERED" || ticket.status === "CLOSED" ? "IN_PROGRESS" : ticket.status;

    const { data: updatedTicket, error: updateError } = await supabaseAdmin
      .from("tickets")
      .update({ status: nextStatus, updatedAt: new Date().toISOString() })
      .eq("id", ticketId)
      .select()
      .single();

    if (updateError) {
      console.error("Ticket Status Update Error:", updateError);
      throw new Error("خطا در به‌روزرسانی وضعیت تیکت");
    }

    return NextResponse.json({ success: true, message: newMessage, ticket: updatedTicket });
  } catch (error) {
    console.error("Error adding ticket message:", error);
    return NextResponse.json({ success: false, error: "خطا در ارسال پیام" }, { status: 500 });
  }
}

// PATCH: بستن تیکت توسط خود کاربر (مثلاً وقتی مشکل حل شده)
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const userId = req.headers.get("x-balkun-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "احراز هویت ناموفق" }, { status: 401 });
    }

    const { id: ticketId } = await params;

    const { data: updatedTicket, error } = await supabaseAdmin
      .from("tickets")
      .update({ status: "CLOSED", updatedAt: new Date().toISOString() })
      .eq("id", ticketId)
      .eq("userId", userId)
      .select()
      .single();

    if (error) {
      console.error("Ticket Close Error:", error);
      throw new Error("خطا در بستن تیکت");
    }

    if (!updatedTicket) {
      return NextResponse.json({ success: false, error: "تیکت یافت نشد" }, { status: 404 });
    }

    return NextResponse.json({ success: true, ticket: updatedTicket });
  } catch (error) {
    console.error("Error closing ticket:", error);
    return NextResponse.json({ success: false, error: "خطا در بستن تیکت" }, { status: 500 });
  }
}