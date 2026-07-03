/**
 * Data Models & Database Schema Types for Balkun Platform
 * Based on PHASE_0_SCHEMA.md
 */

// ==========================================
// 1. Users Collection
// ==========================================
export type UserType = "NORMAL" | "ORGANIZATIONAL";
export type UserRole = "USER" | "SUPPORT_AGENT" | "SUPER_ADMIN";

export interface User {
  id: string; // UUID
  phoneNumber: string; // Primary Key - Unique
  firstName: string;
  lastName: string;
  email?: string | null; // اختیاری
  userType: UserType;
  organizationName: string | null; // Null if NORMAL user
  role: UserRole; // نقش دسترسی: کاربر عادی / پشتیبان / مدیر ارشد
  joinedAt: Date | string;
  lastLoginAt: Date | string;
  isActive: boolean;
}

// ==========================================
// 2. Wallets Collection
// ==========================================
export interface Wallet {
  id: string;
  userId: string; // Reference to User.id
  normalBalance: number; // In Toman (Non-withdrawable)
  orgBalance: number; // In Toman (Non-withdrawable)
  updatedAt: Date | string;
}

// ==========================================
// 3. Transactions History Collection
// ==========================================
export type TransactionType = "DEPOSIT" | "WITHDRAWAL";
export type GatewayStatus = "SUCCESS" | "PENDING" | "FAILED";

export interface Transaction {
  id: string;
  walletId: string; // Reference to Wallet.id
  amount: number; // In Toman
  type: TransactionType;
  walletType: UserType; // NORMAL or ORGANIZATIONAL
  gatewayStatus: GatewayStatus;
  trackingCode: string | null;
  bookingId: string | null; // Reference to Booking.id (فاز ۶ — اتصال تراکنش به رزرو، جلوگیری از Race Condition)
  createdAt: Date | string;
}

// ==========================================
// 4. Bookings Collection (Otaghak Sync)
// ==========================================
export type BookingStatus =
  | "WAITING_FOR_HOST"
  | "WAITING_FOR_PAYMENT"
  | "PAID_CONFIRMED"
  | "CANCELLED_BY_HOST"
  | "CANCELLED_BY_GUEST";

export interface Booking {
  id: string; // Internal Balkun Booking ID
  otaghakBookingId: string | null; // Reference ID in Otaghak
  userId: string; // Reference to User.id
  roomId: string; // Otaghak Room ID
  roomName: string;
  checkInDate: Date | string;
  checkOutDate: Date | string;
  basePersonCount: number;
  extraPersonCount: number;
  nationalCode: string; // کد ملی مهمان اصلی - الزامی برای ثبت در اتاقک
  totalPaidAmount: number; // MUST include 5% margin
  status: BookingStatus;
  isVisibleForUser: boolean; // 15-min visibility rule if cancelled
  // 🆕 دلیل لغو (چه توسط ادمین، چه در آینده توسط میزبان). طبق سند فاز ۹ (بخش ۳)، ادمین‌ها باید
  // مادام‌العمر به دلیل لغو هر رزرو دسترسی داشته باشند تا در صورت تماس مسافر پاسخگو باشند.
  cancelReason: string | null;
  createdAt: Date | string;
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
  userId: string; // Reference to User.id
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TicketMessage {
  id: string;
  ticketId: string; // Reference to Ticket.id
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
  createdAt: Date | string;
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
  creatorId: string; // Reference to Admin ID
  targetUserId: string | null; // Optional reference to User.id
  subject: string;
  details: string;
  actionTaken: string;
  nextActionRequired: string | null;
  loggedAt: Date | string;
}

// ==========================================
// 8. Saved Properties Collection (علاقه‌مندی‌ها)
// ==========================================
export interface SavedProperty {
  id: string;
  userId: string; // Reference to User.id
  roomId: string; // Otaghak Room ID
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
// 🆕 BOOKING_STATUS_CHANGE و BOOKING_DELETE برای پشتیبانی از قابلیت جدید «لغو/حذف رزرو توسط
// ادمین» در ماژول Booking CRM (src/app/admin/bookings) اضافه شدند. اگر این فایل را جایگزین
// می‌کنید، حتماً migration مربوطه در sql/2026-07-03_admin_booking_actions.sql را هم روی
// دیتابیس Supabase اجرا کنید، چون ستون "actionType" در جدول admin_audit_logs یک
// CHECK constraint دارد که باید هم‌زمان به‌روزرسانی شود.
export type AdminActionType =
  | "ROLE_CHANGE"
  | "WALLET_ADJUST"
  | "USER_STATUS_CHANGE"
  | "BOOKING_STATUS_CHANGE"
  | "BOOKING_DELETE"
  | "OTHER";

export interface AdminAuditLog {
  id: string;
  adminId: string; // Reference to User.id (ادمین انجام‌دهنده)
  actionType: AdminActionType;
  targetUserId: string | null; // کاربری که تحت تأثیر قرار گرفته
  description: string;
  previousValue: string | null;
  newValue: string | null;
  createdAt: Date | string;
}

// ==========================================
// 10. Accommodations Collection (ادمین‌ها می‌توانند اقامتگاه‌های اختصاصی خود را مدیریت کنند)
// ==========================================
export type AccommodationStatus = "ACTIVE" | "INACTIVE" | "PENDING_REVIEW";

export interface Accommodation {
  id: string; // UUID
  adminId: string; // Reference to User.id (ادمین ایجادکننده)
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
  amenities: string[]; // لیست امکانات
  images: string[]; // آرایه URL تصاویر
  category: string; // باید با id های موجود در src/constants/categories.ts یکی باشد
  status: AccommodationStatus;
  isFeatured: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  publishedAt: Date | string | null;
  // فیلدهای اضافی برای مدیریت
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