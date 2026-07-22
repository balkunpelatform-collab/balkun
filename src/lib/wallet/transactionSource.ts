// مسیر: src/lib/wallet/transactionSource.ts
//
// 🆕 تسک ۱ (تاریخچه کیف پول برای مالی و مدیر ارشد):
// جدول transactions فقط دو مقدار برای "type" دارد (DEPOSIT / WITHDRAWAL)، اما کارفرما در
// درخواستش ۴ دسته‌ی معنایی متفاوت خواسته: «واریزها»، «برداشت‌ها»، «شارژها» و «برگشت‌ها».
// به‌جای تغییر ساختار دیتابیس (که ریسک migration و ناسازگاری با داده‌های قبلی دارد)،
// این تابع مشترک، دسته‌ی دقیق هر تراکنش را از روی دو فیلد موجود (type + پیشوند trackingCode)
// که از قبل در کل پروژه با الگوی ثابتی تولید می‌شوند، استخراج می‌کند:
//
//   BLK-...           → واریز از طریق درگاه پرداخت خودِ کاربر         (src/app/api/payment/verify/route.ts)
//   REFUND-...        → برگشت وجه به کیف پول با لغو توسط خودِ کاربر    (src/app/api/user/bookings/[id]/cancel/route.ts)
//   ADMIN-REFUND-...  → برگشت وجه به کیف پول با لغو توسط ادمین/پشتیبانی (src/app/api/admin/bookings/[id]/route.ts)
//   ADMIN-MANUAL-...  → شارژ/کسر دستی توسط ادمین یا پشتیبانی           (src/app/api/admin/users/[id]/wallet-adjust/route.ts)
//   WALLET-...        → برداشت بابت پرداخت مستقیم رزرو از کیف پول      (src/app/api/user/bookings/[id]/pay-with-wallet/route.ts)
//   WALLET-PARTIAL-...→ برداشت بابت پیش‌پرداخت ترکیبی رزرو از کیف پول   (src/app/api/user/bookings/[id]/pay-partial-wallet/route.ts)
//
// 🆕 بند ۲۷ (بازگشت کیف پول سازمانی به موجودی مستقل هر کارمند):
// از این پس هیچ «استخر مشترک سازمانی» وجود ندارد؛ هر تراکنش سازمانی همیشه روی
// کیف پول مستقل خودِ یک کارمند مشخص انجام می‌شود. پیشوندهای زیر همگی همین
// معنا را دارند، فقط منبع/محرک تراکنش را از هم تفکیک می‌کنند:
//
//   EMP-BULKCHARGE-...→ شارژ فردیِ یک کارمند، در جریان «شارژ گروهی از لیست شماره‌ها» (bulk-charge-members/route.ts)
//   EMP-CHARGE-REG-...→ اعمال خودکار شارژ معلق، درست لحظه‌ی ثبت‌نام همان کارمند در بالکن (auth/register/route.ts)
//   ORG-MEMBERCHARGE-.→ شارژ دستی مبلغ مساوی به تک‌تک پرسنل فعلی سازمان، توسط مدیر ارشد (organizations/[id]/charge/route.ts)
//   ORG-AUTOCHARGE-...→ شارژ خودکار دوره‌ای همان مبلغ مساوی به تک‌تک پرسنل فعلی سازمان     (organizations/auto-charge/route.ts)
//
// (پیشوندهای قدیمی ORG-CHARGE-/ORG-WITHDRAW- که به یک استخر مشترک اشاره داشتند
// دیگر تولید نمی‌شوند؛ فقط برای سازگاری با تراکنش‌های تاریخی قبل از بند ۲۷ اینجا نگه داشته شده‌اند.)
//
// این فایل هم در روت جدید api/admin/wallet-history و هم در تاریخچه‌ی کیف پول خودِ کاربر
// استفاده می‌شود تا منطق دسته‌بندی همیشه یک‌جا و هماهنگ بماند.

export type TransactionSourceCategory =
  | "GATEWAY_DEPOSIT"
  | "MANUAL_CHARGE"
  | "REFUND"
  | "BOOKING_PAYMENT"
  | "MANUAL_WITHDRAWAL"
  | "EMP_CHARGE"
  | "ORG_MANUAL_CHARGE"
  | "ORG_MANUAL_WITHDRAWAL"
  | "ORG_AUTO_CHARGE"
  | "OTHER_DEPOSIT"
  | "OTHER_WITHDRAWAL";

export interface TransactionSourceInfo {
  category: TransactionSourceCategory;
  // برچسب کوتاه برای نمایش در ستون جدول
  label: string;
  // متن کامل برای نمایش شفاف به کاربر/ادمین (طبق مثال‌های خواسته‌شده در مورد ۲۰ چک‌لیست)
  description: string;
  // آیا از نگاه ادمین این تراکنش «ورود پول» است یا «خروج پول»
  direction: "IN" | "OUT";
}

interface MinimalTransaction {
  type: "DEPOSIT" | "WITHDRAWAL";
  trackingCode: string | null;
}

export function classifyTransactionSource(tx: MinimalTransaction): TransactionSourceInfo {
  const code = tx.trackingCode || "";

  if (tx.type === "DEPOSIT") {
    if (code.startsWith("BLK-")) {
      return {
        category: "GATEWAY_DEPOSIT",
        label: "واریز (درگاه)",
        description: "این مبلغ از طریق درگاه پرداخت به کیف پول اضافه شد.",
        direction: "IN",
      };
    }
    if (code.startsWith("REFUND-") || code.startsWith("ADMIN-REFUND-")) {
      return {
        category: "REFUND",
        label: "برگشت وجه",
        description: code.startsWith("ADMIN-REFUND-")
          ? "این مبلغ بابت لغو رزرو توسط پشتیبانی/ادمین، به کیف پول برگردانده شد."
          : "این مبلغ بابت لغو یا بازگشت رزرو، به کیف پول برگردانده شد.",
        direction: "IN",
      };
    }
    if (code.startsWith("EMP-BULKCHARGE-")) {
      return {
        category: "EMP_CHARGE",
        label: "شارژ گروهی (لیست کارمندان)",
        description: "این مبلغ توسط مدیر ارشد بالکن، در جریان شارژ گروهی سازمان از روی لیست شماره‌ها، مستقیماً به کیف پول سازمانی همین شما اضافه شد.",
        direction: "IN",
      };
    }
    if (code.startsWith("EMP-CHARGE-REG-")) {
      return {
        category: "EMP_CHARGE",
        label: "شارژ سازمانی (زمان ثبت‌نام)",
        description: "سازمان شما پیش از ثبت‌نام‌تان برایتان شارژی در نظر گرفته بود؛ همان لحظه‌ی ثبت‌نام، این مبلغ به کیف پول سازمانی‌تان اضافه شد.",
        direction: "IN",
      };
    }
    if (code.startsWith("ORG-AUTOCHARGE-")) {
      return {
        category: "ORG_AUTO_CHARGE",
        label: "شارژ خودکار سازمان",
        description: "این مبلغ به‌صورت خودکار و دوره‌ای به کیف پول سازمانی مستقل شما اضافه شد.",
        direction: "IN",
      };
    }
    if (code.startsWith("ORG-MEMBERCHARGE-") || code.startsWith("ORG-CHARGE-")) {
      return {
        category: "ORG_MANUAL_CHARGE",
        label: "شارژ دستی سازمان",
        description: "این مبلغ توسط مدیر ارشد بالکن به کیف پول سازمانی مستقل شما اضافه شد.",
        direction: "IN",
      };
    }
    if (code.startsWith("ADMIN-MANUAL-")) {
      return {
        category: "MANUAL_CHARGE",
        label: "شارژ دستی",
        description: "این مبلغ توسط پشتیبانی/ادمین بالکن به کیف پول اضافه شد.",
        direction: "IN",
      };
    }
    return {
      category: "OTHER_DEPOSIT",
      label: "واریز",
      description: "این مبلغ به کیف پول اضافه شد.",
      direction: "IN",
    };
  }

  // type === "WITHDRAWAL"
  if (code.startsWith("WALLET-PARTIAL-")) {
    return {
      category: "BOOKING_PAYMENT",
      label: "برداشت (پیش‌پرداخت رزرو)",
      description: "این مبلغ بابت پیش‌پرداخت ترکیبی یک رزرو (کیف پول + درگاه) از کیف پول کسر شد.",
      direction: "OUT",
    };
  }
  if (code.startsWith("WALLET-")) {
    return {
      category: "BOOKING_PAYMENT",
      label: "برداشت (پرداخت رزرو)",
      description: "این مبلغ بابت پرداخت مستقیم یک رزرو از کیف پول کسر شد.",
      direction: "OUT",
    };
  }
  if (code.startsWith("ORG-MEMBERCHARGE-") || code.startsWith("ORG-WITHDRAW-")) {
    return {
      category: "ORG_MANUAL_WITHDRAWAL",
      label: "کسر دستی سازمان",
      description: "این مبلغ توسط مدیر ارشد بالکن از کیف پول سازمانی مستقل شما کسر شد.",
      direction: "OUT",
    };
  }
  if (code.startsWith("ADMIN-MANUAL-")) {
    return {
      category: "MANUAL_WITHDRAWAL",
      label: "کسر دستی",
      description: "این مبلغ توسط پشتیبانی/ادمین بالکن از کیف پول کسر شد.",
      direction: "OUT",
    };
  }
  return {
    category: "OTHER_WITHDRAWAL",
    label: "برداشت",
    description: "این مبلغ از کیف پول کسر شد.",
    direction: "OUT",
  };
}

// برای فیلتر کردن در UI پنل ادمین
export const TRANSACTION_SOURCE_CATEGORIES: { value: TransactionSourceCategory; label: string }[] = [
  { value: "GATEWAY_DEPOSIT", label: "واریز از درگاه" },
  { value: "MANUAL_CHARGE", label: "شارژ دستی (پشتیبانی)" },
  { value: "REFUND", label: "برگشت وجه" },
  { value: "BOOKING_PAYMENT", label: "برداشت بابت رزرو" },
  { value: "MANUAL_WITHDRAWAL", label: "کسر دستی (پشتیبانی)" },
  { value: "EMP_CHARGE", label: "شارژ به کارمند (سازمانی)" },
  { value: "ORG_MANUAL_CHARGE", label: "شارژ دستی سازمان" },
  { value: "ORG_AUTO_CHARGE", label: "شارژ خودکار سازمان" },
  { value: "ORG_MANUAL_WITHDRAWAL", label: "کسر دستی سازمان" },
  { value: "OTHER_DEPOSIT", label: "سایر واریزها" },
  { value: "OTHER_WITHDRAWAL", label: "سایر برداشت‌ها" },
];
