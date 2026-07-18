/**
 * Data Models & Database Schema Types for Balkun Platform
 * Based on PHASE_0_SCHEMA.md
 */

// ==========================================
// 1. Users Collection
// ==========================================
export type UserType = "NORMAL" | "ORGANIZATIONAL";
// 🆕 تسک ۱ (تاریخچه کیف پول برای مالی و مدیر ارشد) — نقش FINANCE_MANAGER اضافه شد.
// این نقش برای دسترسی‌های مالی/گزارشی سطح‌بالا استفاده می‌شود (تاریخچه کامل کیف پول،
// و در تسک‌های بعدی: داشبورد، کاربران، پرداخت‌ها). برخلاف SUPPORT_AGENT، دسترسی این نقش
// به تب‌های سیستم permissions وابسته نیست؛ دقیقاً مثل SUPER_ADMIN یک نقش با دامنه‌ی
// دسترسی ثابت (Fixed-scope role) است، با این تفاوت که دامنه‌اش محدودتر و کاملاً مالی/گزارشی است.
export type UserRole = "USER" | "SUPPORT_AGENT" | "FINANCE_MANAGER" | "SUPER_ADMIN";

export interface User {
  id: string; // UUID
  phoneNumber: string; // Primary Key - Unique
  firstName: string;
  lastName: string;
  email?: string | null; // اختیاری
  userType: UserType;
  organizationName: string | null; // Null if NORMAL user
  role: UserRole; // نقش دسترسی: کاربر عادی / پشتیبان / مدیر ارشد
  permissions?: string[] | null;
  joinedAt: Date | string;
  lastLoginAt: Date | string;
  isActive: boolean;
}

// ==========================================
// 2. Wallets Collection
// ==========================================
// 🆕 تسک ۷ چک‌لیست کارفرما (تفکیک کیف پول سازمانی + شارژ خودکار + غیرفعال‌سازی سازمان):
// از این پس ستون orgBalance دیگر «کیف پول واقعی سازمانی» محسوب نمی‌شود و همیشه ۰ باقی
// می‌ماند (به‌جای حذف کامل ستون از دیتابیس که ریسک migration دارد، فقط دیگر خوانده/نوشته
// نمی‌شود). موجودی واقعی و مشترک کیف پول سازمانی از این پس فقط و فقط در جدول جدید
// `organizations` (فیلد walletBalance) نگهداری می‌شود — نگاه کنید به تایپ Organization
// پایین همین فایل. کیف پول شخصی (normalBalance) هر کاربر بدون تغییر باقی مانده است.
export interface Wallet {
  id: string;
  userId: string; // Reference to User.id
  normalBalance: number; // In Toman (Non-withdrawable) — کیف پول شخصی کاربر
  /** @deprecated از تسک ۷ به بعد استفاده نمی‌شود؛ همیشه ۰ است. موجودی سازمانی واقعی را از Organization.walletBalance بخوانید. */
  orgBalance: number;
  updatedAt: Date | string;
}

// ==========================================
// 2.5. Organizations Collection (تسک ۷ چک‌لیست کارفرما)
// ==========================================
// هر سازمان دقیقاً یک ردیف دارد که با ستون User.organizationName / organizational_numbers.organizationName
// مطابقت داده می‌شود (بر اساس نام، نه شناسه — چون این دو جدول از قبل نام سازمان را به‌صورت متن
// ذخیره می‌کردند و برای جلوگیری از یک migration پرریسک، همان الگو حفظ شد).
export interface Organization {
  id: string;
  name: string; // باید دقیقاً با User.organizationName یکی باشد
  isActive: boolean; // اگر false شود، هیچ پرسنلی نمی‌تواند از کیف پول سازمانی برای رزرو استفاده کند
  walletBalance: number; // موجودی مشترک کیف پول سازمانی (تومان، غیرقابل برداشت) — توسط تمام پرسنل قابل استفاده
  autoChargeEnabled: boolean; // آیا شارژ خودکار دوره‌ای برای این سازمان فعال است
  autoChargeAmount: number; // مبلغی که هر بار به‌صورت خودکار شارژ می‌شود
  autoChargeIntervalDays: number; // فاصله‌ی زمانی بین دو شارژ خودکار (روز)
  lastAutoChargeAt: Date | string | null; // آخرین باری که شارژ خودکار واقعاً اجرا شد
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ==========================================
// 3. Transactions History Collection
// ==========================================
export type TransactionType = "DEPOSIT" | "WITHDRAWAL";
export type GatewayStatus = "SUCCESS" | "PENDING" | "FAILED";

export interface Transaction {
  id: string;
  // 🆕 تسک ۷: از این پس walletId می‌تواند null باشد — فقط برای تراکنش‌های سطح-سازمان
  // (شارژ دستی/خودکار مستقیم روی استخر مشترک سازمان، بدون تعلق به یک کاربر مشخص).
  // برای تمام تراکنش‌های دیگر (شخصی یا پرداخت رزرو از کیف پول سازمانی توسط یک کاربر
  // مشخص) walletId مثل قبل همیشه پر است.
  walletId: string | null; // Reference to Wallet.id
  // 🆕 تسک ۷: وقتی این تراکنش به کیف پول مشترک یک سازمان مربوط باشد (شارژ/کسر/برداشت
  // بابت رزرو از کیف پول سازمانی)، شناسه‌ی همان سازمان اینجا هم ثبت می‌شود — چه در کنار
  // walletId (پرداخت رزرو توسط یک کاربر مشخص) و چه به‌تنهایی (شارژ دستی/خودکار مستقیم سازمان).
  organizationId?: string | null; // Reference to Organization.id
  amount: number; // In Toman
  type: TransactionType;
  walletType: UserType; // NORMAL or ORGANIZATIONAL
  gatewayStatus: GatewayStatus;
  trackingCode: string | null;
  bookingId: string | null;
  createdAt: Date | string;
}

// ==========================================
// 4. Bookings Collection (Otaghak Sync)
// ==========================================
// 🆕 اصلاح مورد ۱ (۲۰۲۶/۰۷/۱۱): وضعیت "EXPIRED" اضافه شد — برای رزروهایی که
// در وضعیت WAITING_FOR_PAYMENT مانده‌اند و مهلت پرداختشان (به‌طور خودکار توسط
// src/lib/booking/expirePendingBookings.ts) به پایان رسیده است. اگر این فایل
// را جایگزین می‌کنید، حتماً migration مربوطه (بخش ۱۶ سند DATABASE_SQL_LOG.md)
// را هم روی دیتابیس Supabase اجرا کنید تا ستون status این مقدار را بپذیرد.
export type BookingStatus =
  | "WAITING_FOR_HOST"
  | "WAITING_FOR_PAYMENT"
  | "PAID_CONFIRMED"
  | "CANCELLED_BY_HOST"
  | "CANCELLED_BY_GUEST"
  | "EXPIRED";

export interface Booking {
  id: string;
  otaghakBookingId: string | null;
  userId: string;
  roomId: string;
  roomName: string;
  checkInDate: Date | string;
  checkOutDate: Date | string;
  basePersonCount: number;
  extraPersonCount: number;
  // 🆕 تسک ۲۱: از این پس فرم رزرو دیگر کد ملی نمی‌گیرد، پس رزروهای جدید همیشه این
  // مقدار را NULL ثبت می‌کنند؛ فقط رزروهای قدیمی‌تر (پیش از این تسک) مقدار دارند.
  nationalCode: string | null;
  totalPaidAmount: number;
  status: BookingStatus;
  isVisibleForUser: boolean;
  cancelReason: string | null;
  createdAt: Date | string;
  // 🆕 تسک ۲۷ چک‌لیست کارفرما (پرداخت ترکیبی کیف پول + درگاه): اگر بخشی از مبلغ
  // این رزرو از کیف پول (شخصی یا مشترک سازمانی) به‌صورت پیش‌پرداخت کسر شده باشد،
  // مقدار آن اینجا ثبت می‌شود؛ باقیمانده‌ی قابل پرداخت رزرو همیشه برابر است با:
  // totalPaidAmount - (walletAmountApplied || 0)
  walletAmountApplied?: number | null;
  // اینکه پیش‌پرداخت بالا از کدام کیف پول کسر شده — برای عودت صحیح در صورت لغو/انقضا
  walletTypeApplied?: "NORMAL" | "ORGANIZATIONAL" | null;
}

// ==========================================
// 5. Support Tickets & Messages Collection
// ==========================================
export type TicketStatus = "NEW" | "IN_PROGRESS" | "ANSWERED" | "CLOSED";
export type SenderType = "USER" | "ADMIN";
export type TicketCategory =
  | "PRE_BOOKING_QUESTION"
  | "FINANCIAL_ISSUE"
  | "CANCELLATION_FOLLOWUP"
  | "OTHER";

export interface Ticket {
  id: string;
  userId: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderType: SenderType;
  messageText: string;
  sentAt: Date | string;
}

// ==========================================
// 6. Organization Leads Collection
// ==========================================
export type OrgLeadStatus = "UNREAD" | "CONTACTED" | "CONTRACT_SIGNED" | "REJECTED";

export interface OrganizationLead {
  id: string;
  companyName: string;
  contactPerson: string;
  phoneNumber: string;
  personnelCount: number;
  description: string;
  adminStatus: OrgLeadStatus;
  adminNote: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ==========================================
// 7. Internal Logs Collection (Admin Panel)
// ==========================================
export type LogCategory =
  | "PHONE_CALL_RECORD"
  | "TEAM_INTERNAL_TICKET"
  | "SYSTEM_ERROR"
  | "SMS_REPORT";

export interface InternalLog {
  id: string;
  logCategory: LogCategory;
  creatorId: string;
  targetUserId: string | null;
  subject: string;
  details: string;
  actionTaken: string;
  nextActionRequired: string | null;
  loggedAt: Date | string;
}

// 🆕 تسک ۱۰ چک‌لیست کارفرما (امکان پاسخ‌گویی به لاگ‌های داخلی): هر لاگ می‌تواند
// چند پاسخ/پیگیری از اعضای مختلف تیم داشته باشد (بند ۲۴ فایل DATABASE_SQL_LOG.md).
export interface InternalLogReply {
  id: string;
  logId: string; // Reference to InternalLog.id
  creatorId: string;
  message: string;
  createdAt: Date | string;
}

// ==========================================
// 8. Saved Properties Collection (علاقه‌مندی‌ها)
// ==========================================
export interface SavedProperty {
  id: string;
  userId: string;
  roomId: string;
  roomName: string;
  cityName: string | null;
  stateName: string | null;
  pricePerNight: number | null;
  imageUrl: string | null;
  rating: number | null;
  savedAt: Date | string;
}

// ==========================================
// 9. Admin Audit Logs Collection (شفافیت اقدامات ادمین)
// ==========================================
// 🆕 BLOG_POST_CHANGE برای عملیات مدیریت بلاگ (فاز ۱۱، بخش ۴) اضافه شد.
// 🆕 تسک ۲ چک‌لیست کارفرما (نمایش لاگ فعالیت پشتیبانی/مالی/مدیر ارشد): دو نوع
// اکشن جدید TICKET_REPLY و TICKET_STATUS_CHANGE اضافه شد تا پاسخ‌دهی و
// بستن تیکت توسط ادمین/پشتیبان هم مثل بقیه‌ی اقدامات حساس، در همین جدول
// admin_audit_logs ثبت و در صفحه‌ی «لاگ فعالیت‌ها» (`/admin/activity-log`) قابل مشاهده باشد.
// 🆕 تسک ۷ چک‌لیست کارفرما: نوع اکشن جدید ORGANIZATION_CHANGE اضافه شد — برای
// فعال/غیرفعال‌سازی سازمان، شارژ/کسر دستی کیف پول مشترک سازمان و تغییر تنظیمات
// شارژ خودکار (src/app/api/admin/corporate/organizations/**).
// 🆕 تسک ۱۸ چک‌لیست کارفرما (امکان تغییر بنر اصلی صفحه اول): نوع اکشن جدید
// BANNER_CHANGE اضافه شد تا افزودن/ویرایش/حذف بنرهای صفحه اول هم مثل بقیه‌ی
// اقدامات غیرمالی/محتوایی (بلاگ، سازمانی) در admin_audit_logs ثبت شود.
// 🆕 تسک ۱۳ چک‌لیست کارفرما (ویرایش متن «درباره ما» توسط مدیر ارشد): نوع اکشن
// جدید SITE_CONTENT_CHANGE اضافه شد تا هر بار مدیر ارشد متن صفحه‌ی درباره‌ما را
// از پنل ویرایش می‌کند، در admin_audit_logs ثبت شود.
// 🆕 تسک ۸ چک‌لیست کارفرما (امکان حذف برای مدیران ارشد): دو نوع اکشن جدید
// USER_DELETE و TICKET_DELETE اضافه شد تا «حذف کاربر» و «حذف تیکت» توسط مدیر ارشد
// هم مثل بقیه‌ی اقدامات حساس، به‌صورت اجباری در admin_audit_logs ثبت شود و در
// صفحه‌ی «لاگ فعالیت‌ها» (`/admin/activity-log`) قابل ردیابی باشد.
// (نکته: حذف خودِ ردیف‌های لاگ — چه در /admin/activity-log و چه در /admin/logs —
// عمداً در همین جدول ثبت نمی‌شود تا تجربه‌ی «پاک‌سازی لاگ» واقعاً پاک‌سازی باشد؛
// نگاه کنید به توضیح تسک ۸ در balkun-tasks-checklist.md.)
// اگر این فایل را جایگزین می‌کنید، حتماً migration مربوطه (بند ۲۳ سند
// DATABASE_SQL_LOG.md) را هم روی دیتابیس Supabase اجرا کنید تا ستون actionType
// این دو مقدار جدید را بپذیرد.
export type AdminActionType =
  | "ROLE_CHANGE"
  | "WALLET_ADJUST"
  | "USER_STATUS_CHANGE"
  | "BOOKING_STATUS_CHANGE"
  | "BOOKING_DELETE"
  | "PERMISSIONS_CHANGE"
  | "BLOG_POST_CHANGE"
  | "CORPORATE_LEAD_UPDATE"
  | "CORPORATE_NUMBER_CHANGE"
  | "TICKET_REPLY"
  | "TICKET_STATUS_CHANGE"
  | "ORGANIZATION_CHANGE"
  | "BANNER_CHANGE"
  | "SITE_CONTENT_CHANGE"
  | "USER_DELETE"
  | "TICKET_DELETE"
  | "OTHER";

export interface AdminAuditLog {
  id: string;
  adminId: string;
  actionType: AdminActionType;
  targetUserId: string | null;
  description: string;
  previousValue: string | null;
  newValue: string | null;
  createdAt: Date | string;
}

// ==========================================
// 10. Accommodations Collection
// ==========================================
export type AccommodationStatus = "ACTIVE" | "INACTIVE" | "PENDING_REVIEW";

export interface Accommodation {
  id: string;
  adminId: string;
  title: string;
  description: string;
  location: string;
  address: string;
  pricePerNight: number;
  rating: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  amenities: string[];
  images: string[];
  category: string;
  status: AccommodationStatus;
  isFeatured: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  publishedAt: Date | string | null;
  contactPhone: string;
  contactEmail: string;
  checkInTime: string;
  checkOutTime: string;
  houseRules: string;
  cancellationPolicy: string;
  additionalFees: {
    cleaningFee: number;
    serviceFee: number;
    tax: number;
  };
}

// ==========================================
// 11. Blog Posts Collection (بخش ۴ فاز ۱۱ — بلاگ)
// ==========================================
export type BlogPostStatus = "DRAFT" | "PUBLISHED";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  category: string; // باید با id های موجود در src/constants/blogCategories.ts یکی باشد
  tags: string[];
  status: BlogPostStatus;
  authorId: string; // Reference to User.id
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  publishedAt: Date | string | null;
}

// ==========================================
// 12. OTP Codes Collection (کدهای تایید ورود/ثبت‌نام)
// ==========================================
// 🆕 اضافه شد تا مدیران ارشد بتوانند کدهای اخیر را از پنل ادمین (بخش لاگ‌ها) ببینند
// (src/app/api/admin/otp-codes/route.ts) — فقط تا زمانی که پنل پیامکی واقعی وصل نشده.
export interface OtpCode {
  id: string;
  phoneNumber: string;
  code: string;
  expiresAt: Date | string;
  isUsed: boolean;
  ipAddress: string | null;
  attemptCount: number;
  createdAt: Date | string;
}

// ==========================================
// 13. Homepage Banners Collection (بنر اصلی صفحه اول — تسک ۱۸ چک‌لیست کارفرما)
// ==========================================
// 🆕 اضافه شد تا مدیر ارشد (و پشتیبان‌های دارای دسترسی تب "banners") بتوانند
// بدون نیاز به دخالت دولوپر، عکس، متن و کمپین/جشنواره‌ی بنر بالای صفحه اول را
// از پنل مدیریت تغییر دهند. title/subtitle/badgeText/linkUrl همگی اختیاری‌اند:
// اگر title یا subtitle خالی بماند، فرانت‌اند از متن پیش‌فرض سراسری
// (src/constants/home.ts → HERO_CONTENT) استفاده می‌کند.
export interface HomepageBanner {
  id: string;
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  badgeText: string | null; // برچسب کمپین/جشنواره، مثلاً «جشنواره تابستانه»
  linkUrl: string | null; // در صورت وجود، کلیک روی بنر کاربر را به این آدرس می‌برد
  displayOrder: number;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ==========================================
// 14. Notifications Collection (اعلان‌های درون‌برنامه‌ای — تسک ۱۵ چک‌لیست کارفرما)
// ==========================================
// 🆕 قبل از این تسک، زنگوله‌ی بالای هدر (src/components/layout/header/Header.tsx)
// کاملاً تزئینی بود: نه onClick داشت و نه به هیچ داده‌ای وصل بود؛ نقطه‌ی نارنجی رویش
// هم همیشه هاردکد نمایش داده می‌شد. از این پس هر رویداد مهم چرخه‌ی کاربر (تایید
// پرداخت رزرو، لغو رزرو توسط خود کاربر یا میزبان، پاسخ پشتیبانی به تیکت و شارژ
// موفق کیف پول) یک ردیف در همین جدول ثبت می‌کند؛ تنها نقطه‌ی ساخت آن هم
// src/lib/notifications/notificationService.ts است — دقیقاً هم‌الگو با تجمیع
// ارسال پیامک در src/lib/sms/smsService.ts.
export type NotificationType =
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "TICKET_REPLIED"
  | "WALLET_CHARGED"
  | "GENERAL";

export interface UserNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl: string | null; // در صورت وجود، کلیک روی اعلان کاربر را به این آدرس می‌برد
  isRead: boolean;
  createdAt: Date | string;
}

// ==========================================
// 15. Site Content Collection (متن صفحات محتوایی سایت — تسک ۱۳ چک‌لیست کارفرما)
// ==========================================
// 🆕 اضافه شد تا مدیر ارشد بتواند متن صفحه‌ی «درباره ما» را بدون نیاز به دخالت
// دولوپر و دیپلوی مجدد، از پنل مدیریت ویرایش کند. این جدول به شکل key/value عمومی
// طراحی شده (نه فقط یک ستون ثابت برای درباره‌ما) تا در آینده برای صفحات محتوایی
// مشابه دیگر (مثل قوانین و مقررات — مورد ۱۴ چک‌لیست کارفرما) هم با همین یک جدول
// و بدون migration جدید قابل استفاده باشد؛ هر ردیف با یک key منحصربه‌فرد (مثلاً
// "about") شناسایی می‌شود و ستون content کل محتوای آن صفحه را به‌صورت JSON نگه
// می‌دارد. شکل دقیق JSON صفحه‌ی درباره‌ما با AboutPageContent (در
// src/lib/siteContent/siteContentService.ts) مشخص شده.
export interface SiteContent {
  key: string;
  content: Record<string, unknown>;
  updatedAt: Date | string;
  updatedBy: string | null; // Reference to User.id (کدام ادمین آخرین‌بار ویرایش کرده)
}

// ==========================================
// 16. SMS Logs Collection (وضعیت ارسال پیامک — مورد ۲۶ چک‌لیست کارفرما)
// ==========================================
// 🆕 اضافه شد تا مدیر ارشد، پشتیبانی و مدیر مالی بتوانند از پنل ادمین جدید
// (`/admin/sms-logs`) وضعیت دقیق هر پیامک ارسالی سیستم را ببینند — قبل از این
// تسک، خروجی هر ارسال پیامک فقط یک خط console.log/console.warn زودگذر در سرور
// بود که با ری‌استارت سرور از بین می‌رفت و هیچ‌جا در دیتابیس ذخیره نمی‌شد.
// تنها نقطه‌ی نوشتن روی این جدول src/lib/sms/smsLogService.ts است — دقیقاً
// هم‌الگو با سایر جداول تک‌نقطه‌ای پروژه (admin_audit_logs، notifications).
//
// ⚠️ نکته‌ی مهم درباره‌ی محدوده‌ی فعلی این تسک: طبق تصمیم صریح کارفرما، در این
// مرحله فقط زیرساخت (این جدول + سرویس لاگ + پنل نمایش + کلاینت آماده‌ی کاوه‌نگار
// در src/lib/sms/kavenegarClient.ts) ساخته می‌شود. تا وقتی SMS_API_KEY واقعی در
// .env.local قرار نگرفته، SMS_CONFIG.useMock همچنان true می‌ماند و تمام ردیف‌های
// این جدول با status="MOCK" ثبت می‌شوند — درست مثل رفتار قبلی سیستم، با این تفاوت
// که از این پس در پنل ادمین هم قابل مشاهده و پیگیری‌اند. به محض دریافت کلید واقعی
// از کارفرما و قرار دادن آن در .env.local (بدون نیاز به هیچ تغییر کد یا دیتابیس
// دیگری)، همین جدول وضعیت واقعی SENT/FAILED هر پیامک را ثبت خواهد کرد.
export type SmsMessageType =
  | "OTP"
  | "WELCOME"
  | "BOOKING_CONFIRMED"
  | "VOUCHER_ISSUED"
  | "BOOKING_CANCELLED"
  | "REFUND"
  | "TICKET_REPLY";

export type SmsLogStatus = "MOCK" | "SENT" | "FAILED";

export interface SmsLog {
  id: string;
  messageType: SmsMessageType;
  recipientPhone: string;
  messageText: string;
  status: SmsLogStatus;
  providerMessageId: string | null; // شناسه‌ی پیامک که کاوه‌نگار پس از ارسال موفق برمی‌گرداند
  errorMessage: string | null; // متن خطای دریافتی از کاوه‌نگار (فقط وقتی status="FAILED")
  relatedUserId: string | null; // Reference to User.id (در صورت وجود)
  relatedBookingId: string | null; // Reference to Booking.id (در صورت وجود)
  relatedTicketId: string | null; // Reference to Ticket.id (در صورت وجود)
  createdAt: Date | string;
}