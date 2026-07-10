// مسیر: src/middleware.ts
// این فایل، خلأ امنیتی مستندشده در PHASE_8_USER_DASHBOARD.md (بخش ۳) را می‌بندد.
// وظیفه: قبل از رسیدن درخواست به صفحات محافظت‌شده (/profile, /support, /voucher, /admin) یا API های
// زیر /api/user، /api/booking/create، /api/support و /api/admin، کوکی نشست را اعتبارسنجی می‌کند.
// اگر معتبر نبود: صفحات ریدایرکت به /login می‌شوند و API‌ها خطای ۴۰۱ برمی‌گردانند.
// اگر معتبر بود، شناسه کاربر را (که فقط از روی امضای سرور قابل استخراج است، نه از
// ورودی کاربر) در هدر داخلی به Route Handler بعدی پاس می‌دهد.
// 🆕 برای مسیرهای /admin و /api/admin، یک بررسی سریع نقش هم انجام می‌شود (فقط برای UX سریع؛
// بررسی نهایی و معتبر همیشه در خود Route Handler با src/lib/auth/adminAuth.ts انجام می‌شود).
// 🔒 اصلاحیه امنیتی (بند ۱.۱ تسک تکمیل): مسیر /voucher به لیست صفحات محافظت‌شده اضافه شد
// تا دیگر هیچ‌کس بدون لاگین نتواند فقط با حدس زدن آیدی رزرو، به ووچر (شامل کد ملی و شماره
// موبایل مهمان) دسترسی پیدا کند. بررسی مالکیت دقیق (اینکه این ووچر متعلق به همین کاربر است یا نه)
// در خود فایل src/app/voucher/[id]/page.tsx انجام می‌شود.

import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";

const PROTECTED_PAGE_PREFIXES = ["/profile", "/support", "/voucher"];
const ADMIN_PAGE_PREFIXES = ["/admin"];
const PROTECTED_API_PREFIXES = ["/api/user", "/api/booking/create", "/api/support"];
const ADMIN_API_PREFIXES = ["/api/admin"];
const ADMIN_ROLES = ["SUPER_ADMIN", "SUPPORT_AGENT"];

function matchesAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedPage = matchesAny(pathname, PROTECTED_PAGE_PREFIXES);
  const isAdminPage = matchesAny(pathname, ADMIN_PAGE_PREFIXES);
  const isProtectedApi = matchesAny(pathname, PROTECTED_API_PREFIXES);
  const isAdminApi = matchesAny(pathname, ADMIN_API_PREFIXES);

  if (!isProtectedPage && !isAdminPage && !isProtectedApi && !isAdminApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE.name)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (isProtectedApi || isAdminApi) {
      return NextResponse.json(
        { success: false, error: "برای دسترسی به این بخش ابتدا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if ((isAdminPage || isAdminApi) && !ADMIN_ROLES.includes(session.role)) {
    if (isAdminApi) {
      return NextResponse.json(
        { success: false, error: "شما دسترسی لازم برای این بخش را ندارید" },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // شناسه و نقش کاربر را به‌صورت امن (فقط قابل تولید با امضای سرور) به Route Handler پاس می‌دهیم
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-balkun-user-id", session.userId);
  requestHeaders.set("x-balkun-user-type", session.userType);
  requestHeaders.set("x-balkun-role", session.role);
  requestHeaders.set("x-balkun-phone", session.phoneNumber);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/profile/:path*",
    "/support/:path*",
    "/voucher/:path*",
    "/admin/:path*",
    "/api/user/:path*",
    "/api/booking/create",
    "/api/support/:path*",
    "/api/admin/:path*",
  ],
};