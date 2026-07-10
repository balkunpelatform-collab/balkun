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
  permissions?: string[] | null;
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
  bookingId: string | null;
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
  id: string;
  otaghakBookingId: string | null;
  userId: string;
  roomId: string;
  roomName: string;
  checkInDate: Date | string;
  checkOutDate: Date | string;
  basePersonCount: number;
  extraPersonCount: number;
  nationalCode: string;
  totalPaidAmount: number;
  status: BookingStatus;
  isVisibleForUser: boolean;
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
// اگر این فایل را جایگزین می‌کنید، حتماً migration مربوطه (بخش ۱۴ سند
// DATABASE_SQL_LOG.md) را هم روی دیتابیس Supabase اجرا کنید.
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