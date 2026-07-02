// مسیر: src/app/api/support/tickets/route.ts
// API لیست و ایجاد تیکت‌های پشتیبانی کاربر — متصل به جداول واقعی tickets/ticket_messages.
// شناسه کاربر از هدر امن x-balkun-user-id (تزریق‌شده توسط middleware) خوانده می‌شود.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { TICKET_CATEGORY_VALUES, getCategoryLabel } from "@/constants/support";

// GET: دریافت لیست تیکت‌های کاربر (جدیدترین‌ها بالا)
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-balkun-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "احراز هویت ناموفق" }, { status: 401 });
    }

    const { data: tickets, error } = await supabaseAdmin
      .from("tickets")
      .select("*")
      .eq("userId", userId)
      .order("updatedAt", { ascending: false });

    if (error) {
      console.error("Tickets Fetch Error:", error);
      throw new Error("خطا در ارتباط با پایگاه داده");
    }

    return NextResponse.json({ success: true, tickets: tickets ?? [] });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت لیست تیکت‌ها" }, { status: 500 });
  }
}

// POST: ثبت تیکت جدید همراه با پیام اول کاربر
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-balkun-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "احراز هویت ناموفق" }, { status: 401 });
    }

    const body = await req.json();
    const { category, message } = body;

    if (!category || !TICKET_CATEGORY_VALUES.includes(category)) {
      return NextResponse.json({ success: false, error: "دسته‌بندی تیکت نامعتبر است" }, { status: 400 });
    }

    if (!message || typeof message !== "string" || message.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: "متن پیام باید حداقل ۵ کاراکتر باشد" },
        { status: 400 }
      );
    }

    // ۱. ساخت تیکت با موضوع مشتق‌شده از دسته‌بندی
    const { data: newTicket, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .insert([{ userId, subject: getCategoryLabel(category), category, status: "NEW" }])
      .select()
      .single();

    if (ticketError) {
      console.error("Ticket Insert Error:", ticketError);
      throw new Error("خطا در ثبت تیکت");
    }

    // ۲. ثبت پیام اول کاربر داخل تیکت
    const { data: newMessage, error: messageError } = await supabaseAdmin
      .from("ticket_messages")
      .insert([{ ticketId: newTicket.id, senderType: "USER", messageText: message.trim() }])
      .select()
      .single();

    if (messageError) {
      console.error("Ticket Message Insert Error:", messageError);
      throw new Error("خطا در ثبت پیام تیکت");
    }

    return NextResponse.json({
      success: true,
      ticket: newTicket,
      message: newMessage,
      info: "تیکت شما با موفقیت ثبت شد. پشتیبانی به‌زودی پاسخ می‌دهد.",
    });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json({ success: false, error: "خطا در ثبت تیکت" }, { status: 500 });
  }
}