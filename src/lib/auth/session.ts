// مسیر: src/lib/auth/session.ts
// هسته امنیتی نشست کاربران بالکن.
// از این پس، تنها منبع معتبرِ «کاربر لاگین‌شده کیست» همین توکن امضاشده (JWT) است که
// در یک کوکی HttpOnly ذخیره می‌شود — نه هیچ مقداری که از سمت کلاینت (فرانت‌اند) ارسال شود.
// از کتابخانه jose استفاده شده چون در Edge Runtime (که Middleware نکست‌جی‌اس روی آن اجرا می‌شود) کار می‌کند.
// 🆕 از این نسخه، نقش کاربر (role) هم در توکن حمل می‌شود تا میدلور بتواند مسیرهای /admin را
// بدون رفت‌وبرگشت اضافه به دیتابیس، در همان لبه (Edge) کنترل کند. بررسی نهایی و معتبرِ نقش
// برای عملیات حساس ادمین، همیشه در خودِ Route Handler از روی دیتابیس دوباره انجام می‌شود
// (به فایل src/lib/auth/adminAuth.ts نگاه کن) — یعنی توکن فقط برای تجربه کاربری سریع است، نه تنها خط دفاعی.

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { UserType, UserRole } from "@/types/database";

export const SESSION_COOKIE = {
  name: "balkun_session",
  maxAge: 60 * 60 * 24 * 30, // ۳۰ روز (به ثانیه)
};

export interface BalkunSessionPayload extends JWTPayload {
  userId: string;
  phoneNumber: string;
  userType: UserType;
  role: UserRole;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET تنظیم نشده یا خیلی کوتاه است. یک مقدار امن حداقل ۳۲ کاراکتری در .env.local قرار بده."
    );
  }
  return new TextEncoder().encode(secret);
}

// ساخت توکن نشست هنگام ورود/ثبت‌نام موفق
export async function createSessionToken(payload: {
  userId: string;
  phoneNumber: string;
  userType: UserType;
  role: UserRole;
}): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_COOKIE.maxAge}s`)
    .sign(getSecretKey());
}

// اعتبارسنجی توکن نشست (استفاده در src/middleware.ts)
export async function verifySessionToken(
  token: string
): Promise<BalkunSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.userId === "string" &&
      typeof payload.phoneNumber === "string" &&
      (payload.userType === "NORMAL" || payload.userType === "ORGANIZATIONAL") &&
      (payload.role === "USER" || payload.role === "SUPPORT_AGENT" || payload.role === "SUPER_ADMIN")
    ) {
      return payload as BalkunSessionPayload;
    }
    return null;
  } catch {
    // توکن نامعتبر، دستکاری‌شده یا منقضی است
    return null;
  }
}