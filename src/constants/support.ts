// مسیر: src/constants/support.ts
// دسته‌بندی‌های تیکت پشتیبانی و برچسب/رنگ وضعیت‌ها — منبع مشترک فرانت‌اند و بک‌اند
// تا هر دو سمت از یک لیست واحد مقادیر مجاز استفاده کنند.

export const TICKET_CATEGORIES = [
  { value: "PRE_BOOKING_QUESTION", label: "سوال قبل از رزرو" },
  { value: "FINANCIAL_ISSUE", label: "مشکل مالی" },
  { value: "CANCELLATION_FOLLOWUP", label: "پیگیری لغو" },
  { value: "OTHER", label: "سایر" },
] as const;

export type TicketCategoryValue = (typeof TICKET_CATEGORIES)[number]["value"];

export const TICKET_CATEGORY_VALUES: string[] = TICKET_CATEGORIES.map((c) => c.value);

export function getCategoryLabel(value: string): string {
  return TICKET_CATEGORIES.find((c) => c.value === value)?.label || "سایر";
}

export const TICKET_STATUS_LABELS: Record<string, string> = {
  NEW: "جدید",
  IN_PROGRESS: "در حال بررسی",
  ANSWERED: "پاسخ داده شده",
  CLOSED: "بسته شده",
};

export const TICKET_STATUS_STYLES: Record<string, string> = {
  NEW: "bg-balkun-cyan/10 text-balkun-cyan",
  IN_PROGRESS: "bg-balkun-orange/10 text-balkun-orange",
  ANSWERED: "bg-emerald-50 text-emerald-600",
  CLOSED: "bg-slate-100 text-slate-500",
};