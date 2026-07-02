// مسیر: src/app/support/page.tsx
// صفحه پشتیبانی کاربر — لیست تیکت‌ها، ایجاد تیکت جدید و گفتگوی هر تیکت.
// این مسیر توسط src/middleware.ts محافظت می‌شود؛ کاربر بدون نشست معتبر به /login می‌رود.

import { Suspense } from "react";
import SupportClient from "@/components/support/SupportClient";

export default function SupportPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl min-h-[70vh]">
      <Suspense
        fallback={
          <div className="min-h-[50vh] flex items-center justify-center font-bold text-slate-400">
            در حال بارگذاری...
          </div>
        }
      >
        <SupportClient />
      </Suspense>
    </div>
  );
}