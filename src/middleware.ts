// مسیر: src/middleware.ts
// این فایل، خلأ امنیتی مستندشده در PHASE_8_USER_DASHBOARD.md (بخش ۳) را می‌بندد.
// وظیفه: قبل از رسیدن درخواست به صفحه /profile یا هر API زیر /api/user و /api/booking/create،
// کوکی نشست را اعتبارسنجی می‌کند. اگر معتبر نبود: صفحات ریدایرکت به /login می‌شوند و
// API‌ها خطای ۴۰۱ برمی‌گردانند. اگر معتبر بود، شناسه کاربر را (که فقط از روی امضای سرور
// قابل استخراج است، نه از ورودی کاربر) در هدر داخلی به Route Handler بعدی پاس می‌دهد.

import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";

const PROTECTED_PAGE_PREFIXES = ["/profile"];
const PROTECTED_API_PREFIXES = ["/api/user", "/api/booking/create"];

function matchesAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedPage = matchesAny(pathname, PROTECTED_PAGE_PREFIXES);
  const isProtectedApi = matchesAny(pathname, PROTECTED_API_PREFIXES);

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE.name)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (isProtectedApi) {
      return NextResponse.json(
        { success: false, error: "برای دسترسی به این بخش ابتدا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // شناسه کاربر را به‌صورت امن (فقط قابل تولید با امضای سرور) به Route Handler پاس می‌دهیم
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-balkun-user-id", session.userId);
  requestHeaders.set("x-balkun-user-type", session.userType);
  requestHeaders.set("x-balkun-phone", session.phoneNumber);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/profile/:path*", "/api/user/:path*", "/api/booking/create"],
};