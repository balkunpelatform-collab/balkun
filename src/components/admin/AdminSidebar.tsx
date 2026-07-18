// مسیر: src/components/admin/AdminSidebar.tsx
// 🆕 فاز ۱۱ / بخش ۴: آیتم «مدیریت بلاگ» با tabKey="blog" اضافه شد.
// 🆕 آیتم «سازمانی» با tabKey="corporate" اضافه شد — مرکز مدیریت لیدهای
// سازمانی و لیست سفید شماره‌ها.
// 🆕 تسک ۱ (تاریخچه کیف پول برای مالی و مدیر ارشد): آیتم «تاریخچه کیف پول» اضافه شد.
// این آیتم tabKey ندارد (مثل «کاربران و مالی») چون بخش تفویض‌دسترسی SUPPORT_AGENT
// روی آن اعمال نمی‌شود؛ فقط دو نقش ثابت SUPER_ADMIN و FINANCE_MANAGER به آن دسترسی دارند.
// 🆕 تسک ۲ (نمایش لاگ فعالیت‌های پشتیبانی، مالی و مدیر ارشد): آیتم «لاگ فعالیت‌ها»
// اضافه شد. این هم مثل «تاریخچه کیف پول» tabKey ندارد، اما برخلاف آن، هر سه نقش
// (SUPER_ADMIN، SUPPORT_AGENT، FINANCE_MANAGER) به آن دسترسی دارند — چون قرار است
// هر کارمند بتواند تاریخچه‌ی اقدامات خودش را ببیند (نه فقط مدیر ارشد).
// 🆕 تسک ۳ (دسترسی داشبورد برای مدیر مالی): نقش FINANCE_MANAGER به roles آیتم‌های
// «داشبورد کلان» و «کاربران و مالی» هم اضافه شد. توجه: در صفحه‌ی جزئیات کاربر
// (admin/users/[id]/page.tsx)، تمام دکمه‌ها/فیلدهای نوشتنی (تغییر نقش، تغییر نوع
// حساب، عملیات دستی کیف پول) از قبل و مستقل از این تغییر، فقط برای isSuperAdmin
// فعال هستند؛ پس این تغییر صرفاً «مشاهده» را برای مدیر مالی باز می‌کند.
// 🆕 تسک ۴ (مشاهده کامل پرداخت‌ها توسط مدیر مالی و مدیر ارشد): آیتم «پرداخت‌ها»
// اضافه شد. این هم مثل «تاریخچه کیف پول» tabKey ندارد و فقط دو نقش ثابت
// SUPER_ADMIN و FINANCE_MANAGER به آن دسترسی دارند (نه SUPPORT_AGENT).
// 🆕 تسک ۱۸ چک‌لیست کارفرما (امکان تغییر بنر اصلی صفحه اول): آیتم «بنر اصلی
// صفحه اول» با tabKey="banners" اضافه شد — دقیقاً هم‌الگو با «مدیریت بلاگ»:
// محتوایی است، نه مالی/حساس، پس برای SUPPORT_AGENT هم قابل واگذاری است.
// 🆕 تسک ۱۳ چک‌لیست کارفرما (ویرایش متن «درباره ما» توسط مدیر ارشد): آیتم «متن
// صفحه درباره ما» اضافه شد. برخلاف «بنر اصلی صفحه اول»/«مدیریت بلاگ»، این آیتم
// tabKey ندارد و فقط roles: ["SUPER_ADMIN"] دارد — چون خود متن تسک صراحتاً این
// قابلیت را به مدیر ارشد محدود کرده، نه اینکه به SUPPORT_AGENT هم قابل تفویض باشد.
// 🆕 تسک ۱۱ چک‌لیست کارفرما (افزودن نقش مدیر مالی به سیستم — تکمیل نهایی دامنه‌ی
// FINANCE_MANAGER که از تسک ۱ آغاز شده بود): نقش FINANCE_MANAGER به roles سه آیتم
// دیگر هم اضافه شد:
//   - «مدیریت رزروها» (bookings): فقط-خواندنی — دکمه‌های لغو/حذف رزرو در خودِ صفحه
//     (admin/bookings/page.tsx) از قبل و مستقل از این تغییر، فقط برای isSuperAdmin
//     فعال هستند، پس مدیر مالی فقط می‌بیند.
//   - «سازمانی» (corporate): مدیر مالی وارد همین صفحه می‌شود اما در خودِ
//     admin/corporate/page.tsx به‌طور خودکار فقط بخش «کیف پول‌های سازمانی»
//     (فقط-خواندنی) را می‌بیند، نه درخواست‌های سازمانی/شماره‌های سفید را — چون آن دو
//     بخش عملیاتی/فروش هستند، نه مالی، و از قبل هم در بک‌اند (requireAdminTabAccess)
//     برای این نقش مسدودند.
//   - «لاگ‌های سیستم» (logs): بر خلاف دو مورد بالا، این یکی هم مشاهده و هم ثبت
//     یادداشت داخلی جدید را برای مدیر مالی باز می‌کند — چون سیستم لاگ داخلی
//     (تماس تلفنی، ارجاع درون‌تیمی، گزارش خطا) یک ابزار عملیاتی/گزارشی مشترک بین
//     کل کارمندان است، نه یک عملیات مالی حساس.
// هر سه آیتم tabKey خود را حفظ کردند (چون هنوز برای SUPPORT_AGENT هم تفویضی هستند)؛
// شرط فیلتر تفویض در پایین همین فایل فقط برای user.role === "SUPPORT_AGENT" اعمال
// می‌شود، پس اضافه‌شدن FINANCE_MANAGER به roles هیچ اثری روی رفتار SUPPORT_AGENT ندارد.
// 🆕 تسک ۱۴ چک‌لیست کارفرما (امکان ویرایش متن «قوانین و مقررات» توسط مدیر ارشد):
// آیتم «متن قوانین و مقررات» اضافه شد — دقیقاً هم‌الگو با «متن صفحه درباره ما»
// (tabKey ندارد، roles: ["SUPER_ADMIN"] تنها). آیکون عمداً Scale انتخاب شد نه
// ScrollText (که قبلاً برای «لاگ‌های سیستم» استفاده شده) تا این دو آیتم کاملاً
// متفاوت از هم دیگر در سایدبار قابل تشخیص باشند.
// 🆕 مورد ۲۶ چک‌لیست کارفرما (عدم نمایش پنل کاوه‌نگار / وضعیت ارسال پیامک):
// آیتم «کاوه‌نگار (وضعیت پیامک‌ها)» اضافه شد. این هم مثل «لاگ فعالیت‌ها» tabKey
// ندارد (سیستم تفویض‌دسترسی SUPPORT_AGENT روی آن اعمال نمی‌شود) و هر سه نقش
// ثابت (SUPER_ADMIN، SUPPORT_AGENT، FINANCE_MANAGER) به آن دسترسی دارند — چون
// طبق متن خودِ مورد ۲۶ («مدیران و پشتیبانی وضعیت ارسال پیام را نمی‌بینند»)، هر
// سه گروه باید بتوانند وضعیت ارسال پیامک را ببینند، نه فقط مدیر ارشد.

// 🆕 بهبود تجربه‌ی کاربری (درخواست کارفرما): دکمه‌های «بازگشت به سایت» و «خروج از
// پنل» که قبلاً پایین سایدبار بودند (و با اضافه شدن آیتم‌های زیاد به منو، کاربر
// مجبور بود اسکرول کند تا به آن‌ها برسد) از اینجا حذف و به یک هدر ثابت و همیشه در
// دسترسِ بالای صفحه منتقل شدند — دقیقاً هم‌الگو با هدر اصلی سایت
// (src/components/layout/header/Header.tsx). کامپوننت جدید مربوطه:
// src/components/admin/AdminHeader.tsx. به همین دلیل ADMIN_NAV و AdminNavItem از
// این فایل export شدند: AdminHeader.tsx همین آرایه را برای نمایش عنوان صفحه‌ی
// فعال در هدر (بر اساس مسیر جاری) دوباره استفاده می‌کند، تا هیچ‌وقت لیست منو در
// دو جا به‌صورت جداگانه نگه‌داری نشود.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  HeadphonesIcon,
  ScrollText,
  ShieldCheck,
  Home,
  Newspaper,
  Building2,
  Wallet,
  History,
  Landmark,
  Images,
  FileEdit,
  Scale,
  MessageSquare,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import type { UserRole } from "@/types/database";
import type { AdminTabKey } from "@/constants/adminPermissions";

export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  tabKey?: AdminTabKey;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { id: "dashboard", label: "داشبورد کلان", href: "/admin", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "FINANCE_MANAGER"] },
  { id: "users", label: "کاربران و مالی", href: "/admin/users", icon: Users, roles: ["SUPER_ADMIN", "FINANCE_MANAGER"] },
  { id: "wallet-history", label: "تاریخچه کیف پول", href: "/admin/wallet-history", icon: Wallet, roles: ["SUPER_ADMIN", "FINANCE_MANAGER"] },
  { id: "payments", label: "پرداخت‌ها", href: "/admin/payments", icon: Landmark, roles: ["SUPER_ADMIN", "FINANCE_MANAGER"] },
  { id: "activity-log", label: "لاگ فعالیت‌ها", href: "/admin/activity-log", icon: History, roles: ["SUPER_ADMIN", "SUPPORT_AGENT", "FINANCE_MANAGER"] },
  { id: "sms-logs", label: "کاوه‌نگار (وضعیت پیامک‌ها)", href: "/admin/sms-logs", icon: MessageSquare, roles: ["SUPER_ADMIN", "SUPPORT_AGENT", "FINANCE_MANAGER"] },
  { id: "accommodations", label: "اقامتگاه‌های اختصاصی", href: "/admin/accommodations", icon: Home, roles: ["SUPER_ADMIN", "SUPPORT_AGENT"], tabKey: "accommodations" },
  { id: "blog", label: "مدیریت بلاگ", href: "/admin/blog", icon: Newspaper, roles: ["SUPER_ADMIN", "SUPPORT_AGENT"], tabKey: "blog" },
  { id: "banners", label: "بنر اصلی صفحه اول", href: "/admin/banners", icon: Images, roles: ["SUPER_ADMIN", "SUPPORT_AGENT"], tabKey: "banners" },
  { id: "site-content-about", label: "متن صفحه درباره ما", href: "/admin/site-content/about", icon: FileEdit, roles: ["SUPER_ADMIN"] },
  { id: "site-content-terms", label: "متن قوانین و مقررات", href: "/admin/site-content/terms", icon: Scale, roles: ["SUPER_ADMIN"] },
  { id: "bookings", label: "مدیریت رزروها", href: "/admin/bookings", icon: CalendarDays, roles: ["SUPER_ADMIN", "SUPPORT_AGENT", "FINANCE_MANAGER"], tabKey: "bookings" },
  { id: "corporate", label: "سازمانی", href: "/admin/corporate", icon: Building2, roles: ["SUPER_ADMIN", "SUPPORT_AGENT", "FINANCE_MANAGER"], tabKey: "corporate" },
  { id: "tickets", label: "مرکز تیکتینگ", href: "/admin/tickets", icon: HeadphonesIcon, roles: ["SUPER_ADMIN", "SUPPORT_AGENT"], tabKey: "tickets" },
  { id: "logs", label: "لاگ‌های سیستم", href: "/admin/logs", icon: ScrollText, roles: ["SUPER_ADMIN", "SUPPORT_AGENT", "FINANCE_MANAGER"], tabKey: "logs" },
  { id: "cache", label: "پاک‌سازی کش سایت", href: "/admin/cache", icon: RefreshCw, roles: ["SUPER_ADMIN"] },
];

export default function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  if (!user) return null;

  const userPermissions: string[] = user.permissions || [];

  return (
    <aside className="w-full h-full bg-balkun-navy text-slate-300 flex flex-col">
      <div className="h-20 flex items-center gap-3 px-6 border-b border-white/5 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-balkun-cyan/20 text-balkun-cyan flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="font-black text-white text-lg tracking-wide">پنل مدیریت</span>
          <span className="text-[10px] font-bold text-balkun-yellow uppercase tracking-widest">
            {user.role === "SUPER_ADMIN"
              ? "Super Admin"
              : user.role === "FINANCE_MANAGER"
              ? "Finance Manager"
              : "Support Agent"}
          </span>
        </div>
      </div>

      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-black text-white">
            {user.firstName?.charAt(0)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-white text-sm truncate">{user.firstName} {user.lastName}</span>
            <span className="text-xs font-medium text-slate-400" dir="ltr">{user.phoneNumber}</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-4 flex flex-col gap-1">
        {ADMIN_NAV.map((item) => {
          if (!item.roles.includes(user.role as UserRole)) return null;

          if (item.tabKey && user.role === "SUPPORT_AGENT" && !userPermissions.includes(item.tabKey)) {
            return null;
          }

          const isActive = pathname.startsWith(item.href) && (item.href !== "/admin" || pathname === "/admin");
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                isActive
                  ? "bg-balkun-cyan text-white shadow-lg shadow-balkun-cyan/20"
                  : "hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}