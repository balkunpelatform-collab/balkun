// مسیر مقصد این فایل: src/lib/otaghak/tokenManager.ts
//
// طبق الزام فاز ۳: «پیاده‌سازی مکانیسم Token Caching در سمت بک‌اند
// برای جلوگیری از درخواست‌های مکرر و بار اضافی روی سرور اتاقک».
//
// این پیاده‌سازی توکن را در حافظه‌ی پروسه (in-memory) نگه می‌دارد.
// نکته: روی محیط‌های Serverless (مثل Vercel) این کش فقط در طول عمر
// همان Instance گرم (Warm Lambda) معتبر است و با Cold Start از بین می‌رود.
// این برای فاز ۳ کافی است؛ اگر بعداً نیاز به کش پایدارتر بود
// (مثلاً Redis/Upstash)، فقط همین فایل باید عوض شود — بقیه‌ی پروژه دست‌نخورده می‌ماند.

import axios from "axios";
import { OTAGHAK_CONFIG } from "./config";
import { OTAGHAK_ENDPOINTS } from "./endpoints";
import type { OtaghakLoginResponse } from "./types";

interface CachedToken {
  accessToken: string;
  expiresAt: number; // timestamp (ms)
}

let cachedToken: CachedToken | null = null;

async function requestNewToken(): Promise<CachedToken> {
  const url = `${OTAGHAK_CONFIG.baseUrl}${OTAGHAK_ENDPOINTS.login}`;

  const { data } = await axios.post<OtaghakLoginResponse>(url, {
    username: OTAGHAK_CONFIG.username,
    password: OTAGHAK_CONFIG.password,
  });

  const ttlMs =
    (data.expiresIn ? data.expiresIn : OTAGHAK_CONFIG.tokenTtlSeconds) * 1000;

  return {
    accessToken: data.accessToken,
    expiresAt: Date.now() + ttlMs,
  };
}

/**
 * توکن معتبر اتاقک را برمی‌گرداند.
 * اگر توکن کش‌شده هنوز معتبر باشد همان را برمی‌گرداند، در غیر این صورت
 * یک توکن جدید می‌گیرد و کش را آپدیت می‌کند.
 */
export async function getValidOtaghakToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.accessToken;
  }

  cachedToken = await requestNewToken();
  return cachedToken.accessToken;
}

/**
 * توکن کش‌شده را باطل می‌کند تا درخواست بعدی، توکن تازه بگیرد.
 * برای هندل کردن خودکار پاسخ‌های Unauthorized استفاده می‌شود (الزام فاز ۳).
 */
export function invalidateOtaghakToken(): void {
  cachedToken = null;
}
