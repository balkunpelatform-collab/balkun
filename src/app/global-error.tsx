"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root Layout Crash Caught:", error);
  }, [error]);

  // این فایل جایگزین کامل layout.tsx اصلی می‌شود (حتی تگ‌های html/body) —
  // پس عمداً به‌جای کلاس‌های Tailwind از استایل Inline استفاده شده تا در بدترین
  // حالت ممکن (خرابی کامل ریشه اپلیکیشن) هم صد‌درصد قابل نمایش و خوانا بماند.
  return (
    <html lang="fa" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          fontFamily:
            "Tahoma, 'Segoe UI', system-ui, -apple-system, sans-serif",
          backgroundColor: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            backgroundColor: "#ffffff",
            borderRadius: "28px",
            border: "1px solid #f1f5f9",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            padding: "36px 28px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "9999px",
              backgroundColor: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: "32px",
            }}
          >
            ⚠️
          </div>

          <h1
            style={{
              fontSize: "20px",
              fontWeight: 900,
              color: "#153e75",
              margin: "0 0 10px",
            }}
          >
            بالکن با یک خطای جدی مواجه شد
          </h1>
          <p
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "#64748b",
              lineHeight: 1.8,
              margin: "0 0 28px",
            }}
          >
            متاسفانه در بارگذاری کلی سایت مشکلی پیش آمد. تیم فنی بالکن از این
            خطا مطلع شد. لطفاً دوباره تلاش کنید.
          </p>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => reset()}
              style={{
                flex: 1,
                backgroundColor: "#153e75",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "14px",
                padding: "14px",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
              }}
            >
              تلاش مجدد
            </button>
            <a
              href="/"
              style={{
                flex: 1,
                backgroundColor: "#f1f5f9",
                color: "#475569",
                fontWeight: 700,
                fontSize: "14px",
                padding: "14px",
                borderRadius: "12px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              صفحه اصلی
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}