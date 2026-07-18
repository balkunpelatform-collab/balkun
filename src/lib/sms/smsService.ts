// مسیر: src/lib/sms/smsService.ts
//
// تنها نقطه‌ی ارسال پیامک در کل پروژه. تمام بخش‌های دیگر (OTP، خوش‌آمدگویی،
// و اطلاع‌رسانی چرخه‌ی رزرو) باید فقط از همین فایل استفاده کنند تا اتصال
// به پنل پیامکی واقعی در یک‌جا متمرکز و قابل تعویض باشد.
//
// 🆕 مورد ۲۶ چک‌لیست کارفرما (عدم نمایش پنل کاوه‌نگار / وضعیت ارسال پیامک):
// از این پس هر بار این فایل پیامکی ارسال می‌کند (چه در حالت Mock، چه با تلاش
// واقعی از طریق کاوه‌نگار)، نتیجه‌ی دقیق آن با logSmsAttempt در جدول جدید
// sms_logs ثبت می‌شود تا در پنل ادمین (/admin/sms-logs) توسط مدیر ارشد، پشتیبانی
// و مدیر مالی قابل مشاهده باشد. تا وقتی SMS_API_KEY واقعی تنظیم نشده (یعنی
// useMock === true)، رفتار قبلی سیستم دقیقاً حفظ شده (فقط چاپ در کنسول سرور)؛
// فقط یک خط logSmsAttempt اضافه شده تا همان رویداد Mock هم در پنل قابل مشاهده باشد.
// وقتی useMock === false شود، به‌جای throw/warn ساکت قبلی، حالا واقعاً از طریق
// src/lib/sms/kavenegarClient.ts تلاش برای ارسال انجام می‌شود و نتیجه‌ی واقعی
// (موفق/ناموفق + پیام خطا) هم لاگ و هم (برای OTP) در صورت خطا throw می‌شود —
// دقیقاً با همان سطح «حیاتی/غیرحیاتی» که هر تابع قبلاً داشت.
//
// 🆕 هر تابع یک پارامتر اختیاری آخر relatedIds گرفته تا در صورت تمایل بتوان
// شناسه‌ی کاربر/رزرو/تیکت مرتبط را هم برای نمایش بهتر در پنل ثبت کرد. این
// پارامتر کاملاً اختیاری است، پس هیچ‌کدام از نقاط فراخوانی فعلی در پروژه نیاز
// به تغییر ندارند (Backward-Compatible).

import { SMS_CONFIG } from "./smsConfig";
import { sendKavenegarSms } from "./kavenegarClient";
import { logSmsAttempt, type SmsRelatedIds } from "./smsLogService";

/**
 * ارسال کد تایید (OTP) به شماره موبایل کاربر.
 * در حالت Mock، کد فقط در کنسول سرور چاپ می‌شود.
 * این تابع عمداً در حالت غیر Mock هم اگر ارسال واقعی ناموفق باشد خطا می‌دهد،
 * چون OTP برای جریان اصلی حیاتی است و نباید بی‌صدا نادیده گرفته شود.
 */
export async function sendOtpSms(phoneNumber: string, code: string, relatedIds?: SmsRelatedIds): Promise<void> {
  const message = `کد تایید بالکن شما: ${code}`;

  if (SMS_CONFIG.useMock) {
    console.log(`[Balkun MOCK SMS] کد تایید برای شماره ${phoneNumber} : ${code}`);
    await logSmsAttempt({
      messageType: "OTP",
      recipientPhone: phoneNumber,
      messageText: message,
      status: "MOCK",
      ...relatedIds,
    });
    return;
  }

  const result = await sendKavenegarSms(phoneNumber, message);
  await logSmsAttempt({
    messageType: "OTP",
    recipientPhone: phoneNumber,
    messageText: message,
    status: result.success ? "SENT" : "FAILED",
    providerMessageId: result.messageId,
    errorMessage: result.errorMessage,
    ...relatedIds,
  });

  if (!result.success) {
    throw new Error(`ارسال پیامک کد تایید ناموفق بود: ${result.errorMessage || "خطای نامشخص از سرویس پیامکی"}`);
  }
}

/**
 * ارسال پیامک خوش‌آمدگویی پس از ثبت‌نام موفق (متن متفاوت برای کاربر عادی/سازمانی).
 */
export async function sendWelcomeSms(
  phoneNumber: string,
  firstName: string,
  userType: "NORMAL" | "ORGANIZATIONAL",
  relatedIds?: SmsRelatedIds
): Promise<void> {
  const message =
    userType === "ORGANIZATIONAL"
      ? `${firstName} عزیز، به حساب سازمانی بالکن خوش آمدید! از این پس می‌توانید با اعتبار سازمان خود رزرو کنید.`
      : `${firstName} عزیز، به بالکن خوش آمدید! سفر شما از همین‌جا شروع می‌شود.`;

  if (SMS_CONFIG.useMock) {
    console.log(`[Balkun MOCK SMS - Welcome] به ${phoneNumber}: ${message}`);
    await logSmsAttempt({
      messageType: "WELCOME",
      recipientPhone: phoneNumber,
      messageText: message,
      status: "MOCK",
      ...relatedIds,
    });
    return;
  }

  // غیرحیاتی است — اگر ارسال واقعی ناموفق باشد، ثبت‌نام را متوقف نمی‌کنیم؛ فقط لاگ می‌کنیم
  const result = await sendKavenegarSms(phoneNumber, message);
  await logSmsAttempt({
    messageType: "WELCOME",
    recipientPhone: phoneNumber,
    messageText: message,
    status: result.success ? "SENT" : "FAILED",
    providerMessageId: result.messageId,
    errorMessage: result.errorMessage,
    ...relatedIds,
  });

  if (!result.success) {
    console.warn(`⚠️ ارسال پیامک خوش‌آمدگویی ناموفق بود: ${result.errorMessage}`);
  }
}

/**
 * ارسال پیامک تایید قطعی رزرو، بلافاصله پس از موفقیت پرداخت
 * (تغییر وضعیت رزرو به PAID_CONFIRMED در api/payment/verify).
 */
export async function sendBookingConfirmedSms(
  phoneNumber: string,
  firstName: string,
  roomName: string,
  trackingCode: string,
  relatedIds?: SmsRelatedIds
): Promise<void> {
  const message = `${firstName} عزیز، رزرو شما برای «${roomName}» با موفقیت تایید و پرداخت شد. کد پیگیری: ${trackingCode}`;

  if (SMS_CONFIG.useMock) {
    console.log(`[Balkun MOCK SMS - Booking Confirmed] به ${phoneNumber}: ${message}`);
    await logSmsAttempt({
      messageType: "BOOKING_CONFIRMED",
      recipientPhone: phoneNumber,
      messageText: message,
      status: "MOCK",
      ...relatedIds,
    });
    return;
  }

  // غیرحیاتی است — عدم ارسال این پیامک نباید جریان مالی پرداخت را مختل کند؛ فقط لاگ می‌کنیم
  const result = await sendKavenegarSms(phoneNumber, message);
  await logSmsAttempt({
    messageType: "BOOKING_CONFIRMED",
    recipientPhone: phoneNumber,
    messageText: message,
    status: result.success ? "SENT" : "FAILED",
    providerMessageId: result.messageId,
    errorMessage: result.errorMessage,
    ...relatedIds,
  });

  if (!result.success) {
    console.warn(`⚠️ ارسال پیامک تایید رزرو ناموفق بود: ${result.errorMessage}`);
  }
}

/**
 * ارسال پیامک صدور ووچر رزرو.
 * فعلاً هم‌زمان با تایید پرداخت فراخوانی می‌شود (چون صدور ووچر واقعی از اتاقک
 * هنوز به API متصل نیست و صفحه‌ی /voucher/[id] به‌صورت خودسرویس در دسترس است).
 * به‌عنوان یک تابع مجزا نگه داشته شده تا وقتی اتصال واقعی اتاقک برقرار شد،
 * بتوان آن را دقیقاً در لحظه‌ی صدور واقعی ووچر (نه لحظه‌ی پرداخت) فراخوانی کرد.
 */
export async function sendVoucherIssuedSms(
  phoneNumber: string,
  firstName: string,
  bookingId: string,
  relatedIds?: Omit<SmsRelatedIds, "relatedBookingId">
): Promise<void> {
  const message = `${firstName} عزیز، ووچر رزرو شما آماده شد. از بخش «رزروهای من» در پروفایل بالکن قابل مشاهده است. کد رزرو: ${bookingId.split("-")[0]}`;

  if (SMS_CONFIG.useMock) {
    console.log(`[Balkun MOCK SMS - Voucher Issued] به ${phoneNumber}: ${message}`);
    await logSmsAttempt({
      messageType: "VOUCHER_ISSUED",
      recipientPhone: phoneNumber,
      messageText: message,
      status: "MOCK",
      relatedBookingId: bookingId,
      ...relatedIds,
    });
    return;
  }

  const result = await sendKavenegarSms(phoneNumber, message);
  await logSmsAttempt({
    messageType: "VOUCHER_ISSUED",
    recipientPhone: phoneNumber,
    messageText: message,
    status: result.success ? "SENT" : "FAILED",
    providerMessageId: result.messageId,
    errorMessage: result.errorMessage,
    relatedBookingId: bookingId,
    ...relatedIds,
  });

  if (!result.success) {
    console.warn(`⚠️ ارسال پیامک صدور ووچر ناموفق بود: ${result.errorMessage}`);
  }
}

/**
 * ارسال پیامک لغو رزرو (لغو توسط مسافر یا میزبان).
 */
export async function sendBookingCancelledSms(
  phoneNumber: string,
  firstName: string,
  roomName: string,
  cancelledBy: "GUEST" | "HOST",
  relatedIds?: SmsRelatedIds
): Promise<void> {
  const message =
    cancelledBy === "GUEST"
      ? `${firstName} عزیز، رزرو شما برای «${roomName}» طبق درخواست خودتان لغو شد.`
      : `${firstName} عزیز، متاسفانه رزرو شما برای «${roomName}» توسط میزبان لغو شد. مبلغ پرداختی به کیف پول بالکن شما بازگردانده شد.`;

  if (SMS_CONFIG.useMock) {
    console.log(`[Balkun MOCK SMS - Booking Cancelled] به ${phoneNumber}: ${message}`);
    await logSmsAttempt({
      messageType: "BOOKING_CANCELLED",
      recipientPhone: phoneNumber,
      messageText: message,
      status: "MOCK",
      ...relatedIds,
    });
    return;
  }

  const result = await sendKavenegarSms(phoneNumber, message);
  await logSmsAttempt({
    messageType: "BOOKING_CANCELLED",
    recipientPhone: phoneNumber,
    messageText: message,
    status: result.success ? "SENT" : "FAILED",
    providerMessageId: result.messageId,
    errorMessage: result.errorMessage,
    ...relatedIds,
  });

  if (!result.success) {
    console.warn(`⚠️ ارسال پیامک لغو رزرو ناموفق بود: ${result.errorMessage}`);
  }
}

/**
 * ارسال پیامک تایید عودت وجه به کیف پول بالکن (پس از لغو رزرو قطعی‌شده).
 */
export async function sendRefundSms(
  phoneNumber: string,
  firstName: string,
  formattedAmount: string,
  relatedIds?: SmsRelatedIds
): Promise<void> {
  const message = `${firstName} عزیز، مبلغ ${formattedAmount} تومان بابت رزرو لغوشده به کیف پول بالکن شما بازگشت داده شد.`;

  if (SMS_CONFIG.useMock) {
    console.log(`[Balkun MOCK SMS - Refund] به ${phoneNumber}: ${message}`);
    await logSmsAttempt({
      messageType: "REFUND",
      recipientPhone: phoneNumber,
      messageText: message,
      status: "MOCK",
      ...relatedIds,
    });
    return;
  }

  const result = await sendKavenegarSms(phoneNumber, message);
  await logSmsAttempt({
    messageType: "REFUND",
    recipientPhone: phoneNumber,
    messageText: message,
    status: result.success ? "SENT" : "FAILED",
    providerMessageId: result.messageId,
    errorMessage: result.errorMessage,
    ...relatedIds,
  });

  if (!result.success) {
    console.warn(`⚠️ ارسال پیامک عودت وجه ناموفق بود: ${result.errorMessage}`);
  }
}

/**
 * 🆕 تسک ۹ چک‌لیست کارفرما: ارسال پیامک اطلاع‌رسانی به کاربر، وقتی ادمین/پشتیبان
 * به تیکت پشتیبانی او پاسخ می‌دهد (یعنی وضعیت تیکت به ANSWERED تغییر می‌کند).
 * دقیقاً از src/app/api/admin/tickets/[id]/route.ts (POST) فراخوانی می‌شود،
 * بلافاصله بعد از ثبت موفق پیام پاسخ و بعد از ثبت لاگ ممیزی.
 * مثل بقیه‌ی پیامک‌های غیر-OTP، در حالت غیر Mock هم غیرحیاتی است و نباید
 * جریان اصلی پاسخ‌دهی به تیکت را مختل کند.
 */
export async function sendTicketReplySms(
  phoneNumber: string,
  firstName: string,
  ticketSubject: string,
  relatedIds?: SmsRelatedIds
): Promise<void> {
  const message = `${firstName} عزیز، تیکت پشتیبانی شما با موضوع «${ticketSubject}» پاسخ داده شد. برای مشاهده‌ی پاسخ به بخش «پشتیبانی» در پروفایل بالکن مراجعه کنید.`;

  if (SMS_CONFIG.useMock) {
    console.log(`[Balkun MOCK SMS - Ticket Reply] به ${phoneNumber}: ${message}`);
    await logSmsAttempt({
      messageType: "TICKET_REPLY",
      recipientPhone: phoneNumber,
      messageText: message,
      status: "MOCK",
      ...relatedIds,
    });
    return;
  }

  const result = await sendKavenegarSms(phoneNumber, message);
  await logSmsAttempt({
    messageType: "TICKET_REPLY",
    recipientPhone: phoneNumber,
    messageText: message,
    status: result.success ? "SENT" : "FAILED",
    providerMessageId: result.messageId,
    errorMessage: result.errorMessage,
    ...relatedIds,
  });

  if (!result.success) {
    console.warn(`⚠️ ارسال پیامک پاسخ تیکت ناموفق بود: ${result.errorMessage}`);
  }
}