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
export type AdminActionType = "ROLE_CHANGE" | "WALLET_ADJUST" | "USER_STATUS_CHANGE" | "OTHER";

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