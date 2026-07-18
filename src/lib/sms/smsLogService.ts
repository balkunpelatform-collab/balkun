// مسیر: src/lib/sms/smsLogService.ts
//
// 🆕 مورد ۲۶ چک‌لیست کارفرما (عدم نمایش پنل کاوه‌نگار / وضعیت ارسال پیامک):
// تنها نقطه‌ی ثبت لاگ پیامک در کل پروژه — دقیقاً هم‌الگو با تجمیع ساخت اعلان
// درون‌برنامه‌ای در src/lib/notifications/notificationService.ts. هر بار
// src/lib/sms/smsService.ts پیامکی ارسال می‌کند (چه موفق، چه ناموفق، چه در
// حالت Mock)، یک ردیف اینجا در جدول sms_logs ثبت می‌شود تا در پنل ادمین جدید
// (/admin/sms-logs) قابل مشاهده باشد.
//
// برخلاف notificationService.ts که عمداً خطا را throw می‌کند، این تابع هرگز
// throw نمی‌کند: ثبت لاگ یک عملیات کاملاً غیرحیاتی و جانبی است و نباید هیچ‌وقت
// جریان اصلی ارسال پیامک (که خودش می‌تواند برای OTP حیاتی باشد) را مختل کند؛
// در صورت بروز خطا، فقط در کنسول سرور هشدار داده می‌شود.

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { SmsMessageType, SmsLogStatus } from "@/types/database";

export interface SmsRelatedIds {
  relatedUserId?: string | null;
  relatedBookingId?: string | null;
  relatedTicketId?: string | null;
}

export async function logSmsAttempt(
  params: {
    messageType: SmsMessageType;
    recipientPhone: string;
    messageText: string;
    status: SmsLogStatus;
    providerMessageId?: string | null;
    errorMessage?: string | null;
  } & SmsRelatedIds
): Promise<void> {
  const { error } = await supabaseAdmin.from("sms_logs").insert([
    {
      messageType: params.messageType,
      recipientPhone: params.recipientPhone,
      messageText: params.messageText,
      status: params.status,
      providerMessageId: params.providerMessageId ?? null,
      errorMessage: params.errorMessage ?? null,
      relatedUserId: params.relatedUserId ?? null,
      relatedBookingId: params.relatedBookingId ?? null,
      relatedTicketId: params.relatedTicketId ?? null,
    },
  ]);

  if (error) {
    console.error("⚠️ ثبت لاگ پیامک در جدول sms_logs ناموفق بود (غیرحیاتی):", error.message);
  }
}