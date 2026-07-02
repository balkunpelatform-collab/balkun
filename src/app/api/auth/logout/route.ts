// مسیر: src/app/api/auth/logout/route.ts
// خروج امن از حساب: کوکی نشست را در سمت سرور باطل می‌کند.
// نکته مهم: قبل از این فایل، دکمه «خروج از حساب» فقط state محلی (Zustand) را پاک می‌کرد
// و کوکی سرور همچنان معتبر باقی می‌ماند — این نقص هم‌زمان با این فایل رفع شد (ProfileSidebar.tsx).

import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE.name, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}