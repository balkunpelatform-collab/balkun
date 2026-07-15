// مسیر: src/lib/notifications/notificationService.ts
//
// تنها نقطه‌ی ساخت اعلان درون‌برنامه‌ای (In-app Notification) در کل پروژه — دقیقاً
// هم‌الگو با src/lib/sms/smsService.ts که تنها نقطه‌ی ارسال پیامک است. هدف تسک ۱۵
// چک‌لیست کارفرما این بود که زنگوله‌ی بالای هدر (که قبلاً کاملاً تزئینی بود و به
// هیچ داده‌ای وصل نبود) به یک سیستم اعلان واقعی وصل شود.
//
// این تابع عمداً خطا را قورت نمی‌دهد (throw می‌کند)، چون هر نقطه‌ای که آن را صدا
// می‌زند باید داخل try/catch جدای خودش قرار بگیرد — دقیقاً مثل الگوی ارسال پیامک
// در کل پروژه: ساخت اعلان یک عملیات غیرحیاتی است و نباید جریان اصلی (تایید
// پرداخت، لغو رزرو، پاسخ به تیکت و ...) را در صورت بروز خطا مختل کند، اما در عین
// حال باید در کنسول سرور لاگ شود تا قابل پیگیری باشد.

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { NotificationType } from "@/types/database";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string | null;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("notifications").insert([
    {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      linkUrl: params.linkUrl ?? null,
    },
  ]);

  if (error) {
    throw new Error(`خطا در ثبت اعلان درون‌برنامه‌ای: ${error.message}`);
  }
}