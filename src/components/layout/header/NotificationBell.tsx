// مسیر: src/components/layout/header/NotificationBell.tsx
//
// تسک ۱۵ چک‌لیست کارفرما («زنگوله بالای هدر کاربردی ندارد»): قبل از این تغییر،
// آیکون زنگوله در Header.tsx نه onClick داشت و نه به هیچ داده‌ای وصل بود؛ نقطه‌ی
// نارنجیِ رویش هم همیشه هاردکد نمایش داده می‌شد (حتی وقتی هیچ اعلانی وجود نداشت).
//
// این کامپوننت جایگزین همان دکمه‌ی ثابت شده و به جدول واقعی notifications
// (از طریق src/app/api/user/notifications) وصل است:
// - نقطه‌ی نارنجی فقط وقتی نمایش داده می‌شود که واقعاً اعلان خوانده‌نشده وجود داشته باشد.
// - با کلیک، پنلی باز می‌شود که آخرین اعلان‌ها را نشان می‌دهد.
// - کلیک روی هر اعلان، آن را خوانده‌شده علامت می‌زند و در صورت وجود linkUrl، کاربر را
//   به همان مقصد (مثلاً ووچر رزرو یا تیکت پشتیبانی) هدایت می‌کند.
// - هر ۴۵ ثانیه یک‌بار به‌صورت خودکار تعداد اعلان‌های خوانده‌نشده را دوباره می‌خواند
//   (Polling ساده — بدون نیاز به وب‌سوکت) تا اگر ادمین در همین حین برای کاربر
//   اعلانی ثبت کرد، بدون رفرش صفحه هم با کمی تاخیر روی زنگوله دیده شود.
// - برای کاربر مهمان (لاگین‌نکرده)، زنگوله همچنان نمایش داده می‌شود ولی کلیک روی آن
//   به‌جای باز کردن پنل، کاربر را به صفحه‌ی ورود می‌برد (چون اعلان درون‌برنامه‌ای
//   بدون حساب کاربری معنا ندارد).

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import type { UserNotification } from "@/types/database";

const POLL_INTERVAL_MS = 45_000;

function timeAgoFa(dateInput: string | Date): string {
  const date = new Date(dateInput);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);

  if (diffMin < 1) return "همین الان";
  if (diffMin < 60) return `${diffMin} دقیقه پیش`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} ساعت پیش`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} روز پیش`;

  return date.toLocaleDateString("fa-IR");
}

export default function NotificationBell() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPanelLoading, setIsPanelLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/user/notifications");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {
      // خطای شبکه بی‌صدا نادیده گرفته می‌شود؛ زنگوله فقط بدون شمارنده‌ی به‌روز باقی می‌ماند
    }
  }, []);

  // دریافت اولیه + بروزرسانی دوره‌ای شمارنده‌ی خوانده‌نشده‌ها
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  // بستن پنل با کلیک بیرون از آن
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsPanelLoading(true);
        fetchNotifications().finally(() => setIsPanelLoading(false));
      }
      return next;
    });
  };

  const handleNotificationClick = async (notification: UserNotification) => {
    setOpen(false);

    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await fetch(`/api/user/notifications/${notification.id}`, { method: "PATCH" });
      } catch {
        // غیرحیاتی — در فچ دوره‌ای بعدی، وضعیت واقعی دیتابیس جایگزین می‌شود
      }
    }

    if (notification.linkUrl) {
      router.push(notification.linkUrl);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/user/notifications", { method: "PATCH" });
    } catch {
      // غیرحیاتی — در فچ دوره‌ای بعدی، وضعیت واقعی دیتابیس جایگزین می‌شود
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 text-slate-700 hover:text-balkun-cyan transition-colors"
        aria-label="اعلان‌ها"
      >
        <Bell className="w-6 h-6" />
        {isAuthenticated && unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-balkun-orange rounded-full border-2 border-white"></span>
        )}
      </button>

      {open && isAuthenticated && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-80 max-w-[90vw] bg-white border border-slate-100 rounded-2xl shadow-xl shadow-black/5 overflow-hidden text-right z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-black text-sm text-balkun-navy">اعلان‌ها</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                className="flex items-center gap-1 text-xs font-bold text-balkun-cyan hover:text-balkun-cyan-dark disabled:opacity-50 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                همه را خوانده‌شده کن
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isPanelLoading ? (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-center text-sm text-slate-400 font-medium py-8 px-4">
                فعلاً اعلانی برای شما ثبت نشده است.
              </p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-right flex flex-col gap-1 px-4 py-3 border-b border-slate-50 last:border-0 transition-colors hover:bg-slate-50 ${
                    notification.isRead ? "" : "bg-balkun-cyan/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-slate-800">{notification.title}</span>
                    {!notification.isRead && (
                      <span className="w-2 h-2 rounded-full bg-balkun-orange shrink-0 mt-1.5"></span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 leading-relaxed">{notification.message}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{timeAgoFa(notification.createdAt)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}