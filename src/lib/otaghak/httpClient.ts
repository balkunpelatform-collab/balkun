// مسیر مقصد این فایل: src/lib/otaghak/httpClient.ts
//
// تمام درخواست‌های واقعی به اتاقک از طریق این کلاینت انجام می‌شود.
// این فایل توکن را خودکار به هدر اضافه می‌کند و اگر پاسخ ۴۰۱ بگیرد،
// یک بار توکن را رفرش کرده و درخواست را دوباره امتحان می‌کند
// (الزام فاز ۳: «هندل کردن خودکار پاسخ‌های Unauthorized و رفرش توکن»).

import axios, { AxiosRequestConfig } from "axios";
import { OTAGHAK_CONFIG } from "./config";
import { getValidOtaghakToken, invalidateOtaghakToken } from "./tokenManager";

const rawClient = axios.create({
  baseURL: OTAGHAK_CONFIG.baseUrl,
  timeout: 15000,
});

export async function otaghakRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const token = await getValidOtaghakToken();

  try {
    const res = await rawClient.request<T>({
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      },
    });
    return res.data;
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status : null;

    if (status === 401) {
      // توکن منقضی شده — یک بار دیگر با توکن تازه امتحان می‌کنیم
      invalidateOtaghakToken();
      const freshToken = await getValidOtaghakToken();

      const retryRes = await rawClient.request<T>({
        ...config,
        headers: {
          ...config.headers,
          Authorization: `Bearer ${freshToken}`,
        },
      });
      return retryRes.data;
    }

    throw err;
  }
}
