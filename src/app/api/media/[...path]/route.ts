// مسیر: src/app/api/media/[...path]/route.ts
// این فایل جدید است — آن را دقیقاً در همین مسیر در پروژه ایجاد کنید.
//
// 🆕 بند ۲۸ — رفع قطعی مشکل «عکس بنر نمایش داده نمی‌شود»:
//
// ریشه‌ی واقعی مشکل (که راه‌حل‌های قبلی، از جمله `images.unoptimized: true` در
// next.config.ts، فقط بخشی از آن را حل کرده بودند): آدرس عمومی تصاویر Supabase
// Storage یک دامنه‌ی خارجی است (چیزی شبیه xxxx.supabase.co). وقتی خودِ مرورگر
// کاربر (نه سرور پروژه) مستقیماً بخواهد این آدرس را بارگذاری کند، در بسیاری از
// شبکه‌های اینترنت ایران این دامنه به‌طور کامل یا بخشی مسدود/کند/قطع می‌شود —
// این یک محدودیت شبکه‌ای سمت کاربر است، نه یک تنظیم اشتباه در Next.js، پس هیچ
// مقداری در next.config.ts (مثل remotePatterns یا unoptimized) نمی‌تواند آن را
// حل کند، چون آن‌ها فقط رفتار «سرور» پروژه را کنترل می‌کنند، نه دسترسی مرورگر
// کاربر نهایی به یک دامنه‌ی خارجی.
//
// راه‌حل: این Route Handler، خودش یک «پراکسی تصویر» است. مرورگر کاربر دیگر هرگز
// مستقیم به Supabase وصل نمی‌شود؛ به‌جایش از همان دامنه‌ی خودِ سایت بالکن
// (`/api/media/<bucket>/<مسیر فایل>`) تصویر را می‌خواهد. این Route Handler روی
// سرور پروژه (روی زیرساخت Vercel، نه داخل ایران) اجرا می‌شود، تصویر را از
// Supabase می‌گیرد (این ارتباط سرور-به-سرور است و هرگز توسط فیلترینگ ایران
// مسدود نمی‌شود) و بایت‌های همان تصویر را مستقیماً به مرورگر کاربر برمی‌گرداند.
//
// از این پس src/app/api/admin/upload/route.ts به‌جای آدرس خام Supabase، همین
// آدرس پراکسی‌شده را برمی‌گرداند و در دیتابیس ذخیره می‌شود — پس این مشکل برای
// همیشه (نه فقط برای بنر، بلکه برای عکس آگهی‌ها و بلاگ هم) رفع می‌شود.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// دقیقاً همان سه باکتی که در src/app/api/admin/upload/route.ts مجاز است
const ALLOWED_BUCKETS = ["accommodations", "blog", "banners"] as const;
type AllowedBucket = (typeof ALLOWED_BUCKETS)[number];

function isAllowedBucket(value: string): value is AllowedBucket {
  return (ALLOWED_BUCKETS as readonly string[]).includes(value);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  if (!path || path.length < 2) {
    return NextResponse.json({ success: false, error: "مسیر تصویر نامعتبر است" }, { status: 400 });
  }

  const [bucket, ...restSegments] = path;

  // امنیت: فقط باکت‌های شناخته‌شده و بدون خروج از مسیر (Path Traversal) مجازند
  if (!isAllowedBucket(bucket) || restSegments.some((seg) => seg.includes("..") || seg.trim() === "")) {
    return NextResponse.json({ success: false, error: "مسیر تصویر نامعتبر است" }, { status: 400 });
  }

  const objectPath = restSegments.join("/");

  try {
    const { data: publicUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(objectPath);

    // این fetch از سرور پروژه (Vercel) به Supabase انجام می‌شود — نه از مرورگر
    // کاربر — پس هیچ‌وقت با فیلترینگ اینترنت ایران برخورد نمی‌کند.
    const upstreamResponse = await fetch(publicUrlData.publicUrl, {
      // تصاویر آپلودی همیشه با یک نام تصادفی+زمان‌دار ذخیره می‌شوند و هرگز
      // بازنویسی (Overwrite) نمی‌شوند، پس کش طولانی‌مدت کاملاً امن است.
      next: { revalidate: 60 * 60 * 24 * 30 },
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      return NextResponse.json({ success: false, error: "تصویر یافت نشد" }, { status: 404 });
    }

    const contentType = upstreamResponse.headers.get("content-type") || "image/webp";

    return new NextResponse(upstreamResponse.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // یک ماه کش در CDN/مرورگر کاربر؛ چون نام فایل تصادفی و تکرارنشدنی است
        "Cache-Control": "public, max-age=2592000, immutable",
      },
    });
  } catch (error) {
    console.error("Media Proxy Error:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت تصویر از سرور ذخیره‌سازی" }, { status: 502 });
  }
}