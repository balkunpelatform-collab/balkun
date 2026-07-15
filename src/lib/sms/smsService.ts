// مسیر: src/lib/sms/smsService.ts
//
// تنها نقطه‌ی ارسال پیامک در کل پروژه. تمام بخش‌های دیگر (OTP، خوش‌آمدگویی،
// و اطلاع‌رسانی چرخه‌ی رزرو) باید فقط از همین فایل استفاده کنند تا اتصال
// به پنل پیامکی واقعی در یک‌جا متمرکز و قابل تعویض باشد.

import { SMS_CONFIG } from "./smsConfig";

/**
 * ارسال کد تایید (OTP) به شماره موبایل کاربر.
 * در حالت Mock، کد فقط در کنسول سرور چاپ می‌شود.
 * این تابع عمداً در حالت غیر Mock خطا می‌دهد چون OTP برای جریان اصلی حیاتی است
 * و نباید بی‌صدا نادیده گرفته شود.
 */
export async function sendOtpSms(phoneNumber: string, code: string): Promise<void> {
  if (SMS_CONFIG.useMock) {
    console.log(`[Balkun MOCK SMS] کد تایید برای شماره ${phoneNumber} : ${code}`);
    return;
  }

  // TODO فاز ۷: اتصال واقعی به پنل پیامکی ایران (به محض دریافت کلید API).
  throw new Error(
    "اتصال واقعی پنل پیامکی هنوز پیاده‌سازی نشده است (فاز ۷). لطفا SMS_USE_MOCK=true قرار دهید."
  );
}

/**
 * ارسال پیامک خوش‌آمدگویی پس از ثبت‌نام موفق (متن متفاوت برای کاربر عادی/سازمانی).
 * طبق چک‌لیست فاز ۲ که به فاز ۷ موکول شده بود.
 */
export async function sendWelcomeSms(
  phoneNumber: string,
  firstName: string,
  userType: "NORMAL" | "ORGANIZATIONAL"
): Promise<void> {
  const message =
    userType === "ORGANIZATIONAL"
      ? `${firstName} عزیز، به حساب سازمانی بالکن خوش آمدید! از این پس می‌توانید با اعتبار سازمان خود رزرو کنید.`
      : `${firstName} عزیز، به بالکن خوش آمدید! سفر شما از همین‌جا شروع می‌شود.`;

  if (SMS_CONFIG.useMock) {
    console.log(`[Balkun MOCK SMS - Welcome] به ${phoneNumber}: ${message}`);
    return;
  }

  // غیرحیاتی است — اگر پنل واقعی هنوز وصل نباشد، ثبت‌نام را متوقف نمی‌کنیم
  console.warn("⚠️ ارسال پیامک خوش‌آمدگویی نادیده گرفته شد (پنل پیامکی واقعی هنوز وصل نشده).");
}

/**
 * ارسال پیامک تایید قطعی رزرو، بلافاصله پس از موفقیت پرداخت
 * (تغییر وضعیت رزرو به PAID_CONFIRMED در api/payment/verify).
 */
export async function sendBookingConfirmedSms(
  phoneNumber: string,
  firstName: string,
  roomName: string,
  trackingCode: string
): Promise<void> {
  const message = `${firstName} عزیز، رزرو شما برای «${roomName}» با موفقیت تایید و پرداخت شد. کد پیگیری: ${trackingCode}`;

  if (SMS_CONFIG.useMock) {
    console.log(`[Balkun MOCK SMS - Booking Confirmed] به ${phoneNumber}: ${message}`);
    return;
  }

  // غیرحیاتی است — عدم ارسال این پیامک نباید جریان مالی پرداخت را مختل کند
  console.warn("⚠️ ارسال پیامک تایید رزرو نادیده گرفته شد (پنل پیامکی واقعی هنوز وصل نشده).");
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
  bookingId: string
): Promise<void> {
  const message = `${firstName} عزیز، ووچر رزرو شما آماده شد. از بخش «رزروهای من» در پروفایل بالکن قابل مشاهده است. کد رزرو: ${bookingId.split("-")[0]}`;

  if (SMS_CONFIG.useMock) {
    console.log(`[Balkun MOCK SMS - Voucher Issued] به ${phoneNumber}: ${message}`);
    return;
  }

  console.warn("⚠️ ارسال پیامک صدور ووچر نادیده گرفته شد (پنل پیامکی واقعی هنوز وصل نشده).");
}

/**
 * ارسال پیامک لغو رزرو (لغو توسط مسافر یا میزبان).
 */
export async function sendBookingCancelledSms(
  phoneNumber: string,
  firstName: string,
  roomName: string,
  cancelledBy: "GUEST" | "HOST"
): Promise<void> {
  const message =
    cancelledBy === "GUEST"
      ? `${firstName} عزیز، رزرو شما برای «${roomName}» طبق درخواست خودتان لغو شد.`
      : `${firstName} عزیز، متاسفانه رزرو شما برای «${roomName}» توسط میزبان لغو شد. مبلغ پرداختی به کیف پول بالکن شما بازگردانده شد.`;

  if (SMS_CONFIG.useMock) {
    console.log(`[Balkun MOCK SMS - Booking Cancelled] به ${phoneNumber}: ${message}`);
    return;
  }

  console.warn("⚠️ ارسال پیامک لغو رزرو نادیده گرفته شد (پنل پیامکی واقعی هنوز وصل نشده).");
}

/**
 * ارسال پیامک تایید عودت وجه به کیف پول بالکن (پس از لغو رزرو قطعی‌شده).
 */
export async function sendRefundSms(
  phoneNumber: string,
  firstName: string,
  formattedAmount: string
): Promise<void> {
  const message = `${firstName} عزیز، مبلغ ${formattedAmount} تومان بابت رزرو لغوشده به کیف پول بالکن شما بازگشت داده شد.`;

  if (SMS_CONFIG.useMock) {
    console.log(`[Balkun MOCK SMS - Refund] به ${phoneNumber}: ${message}`);
    return;
  }

  console.warn("⚠️ ارسال پیامک عودت وجه نادیده گرفته شد (پنل پیامکی واقعی هنوز وصل نشده).");
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
  ticketSubject: string
): Promise<void> {
  const message = `${firstName} عزیز، تیکت پشتیبانی شما با موضوع «${ticketSubject}» پاسخ داده شد. برای مشاهده‌ی پاسخ به بخش «پشتیبانی» در پروفایل بالکن مراجعه کنید.`;

  if (SMS_CONFIG.useMock) {
    console.log(`[Balkun MOCK SMS - Ticket Reply] به ${phoneNumber}: ${message}`);
    return;
  }

  console.warn("⚠️ ارسال پیامک پاسخ تیکت نادیده گرفته شد (پنل پیامکی واقعی هنوز وصل نشده).");
}