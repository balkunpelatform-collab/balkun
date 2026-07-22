// مسیر: src/app/api/media/[...path]/route.ts
// این فایل جایگزین همان فایل جدیدی می‌شود که در بند ۲۸ ساختید (همان مسیر).
//
// 🆕 بند ۲۹ — رفع باگ «پلیس‌هولدر ریز/عکس خراب» در خودِ پراکسی تصویر:
//
// نسخه‌ی قبلی این فایل، عکس را از Supabase با گزینه‌ی `next: { revalidate }`
// روی fetch می‌گرفت. این گزینه مخصوص کش کردن پاسخ‌های متنی/JSON در معماری کش
// داخلی Next.js است؛ وقتی همین مکانیزم روی یک پاسخ باینری (عکس) اعمال شود،
// در مسیر ذخیره/بازخوانی از کش داخلی Next.js، بایت‌های تصویر به‌درستی حفظ
// نمی‌شوند و در مرورگر به‌صورت یک تصویر خراب/بسیار کوچک (Placeholder) دیده
// می‌شود — دقیقاً همان چیزی که مشاهده کردید.
//
// راه‌حل: ۱) این fetch را کاملاً از کش داخلی Next.js کنار می‌گذاریم
// (`cache: "no-store"`) — کش واقعی و درست همچنان از طریق هدر Cache-Control
// خودِ پاسخ نهایی (پایین همین فایل) روی مرورگر/CDN کاربر اعمال می‌شود، نه از
// طریق کش داخلی fetch؛ ۲) به‌جای پاس‌دادن مستقیم Stream، کل بایت‌های تصویر را
// یک‌جا با arrayBuffer() می‌خوانیم و کامل و دست‌نخورده برمی‌گردانیم — برای
// عکس‌های چند ده/چند صد کیلوبایتی (مثل بنر) این کاملاً مطمئن و بی‌خطاست.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

  if (!isAllowedBucket(bucket) || restSegments.some((seg) => seg.includes("..") || seg.trim() === "")) {
    return NextResponse.json({ success: false, error: "مسیر تصویر نامعتبر است" }, { status: 400 });
  }

  const objectPath = restSegments.join("/");

  try {
    const { data: publicUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(objectPath);

    // 🆕 بند ۲۹: cache: "no-store" یعنی این fetch هرگز وارد کش داخلی fetch
    // نکست‌جی‌اس نمی‌شود (که باعث خراب‌شدن بایت‌های باینری می‌شد). این fetch
    // همچنان از سرور پروژه (Vercel) به Supabase انجام می‌شود، نه از مرورگر کاربر.
    const upstreamResponse = await fetch(publicUrlData.publicUrl, { cache: "no-store" });

    if (!upstreamResponse.ok) {
      return NextResponse.json({ success: false, error: "تصویر یافت نشد" }, { status: 404 });
    }

    // 🆕 بند ۲۹: کل عکس را یک‌جا و دست‌نخورده می‌خوانیم (نه Stream تکه‌تکه)
    const imageBuffer = await upstreamResponse.arrayBuffer();
    const contentType = upstreamResponse.headers.get("content-type") || "image/webp";

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(imageBuffer.byteLength),
        // کش واقعی و درست، فقط از همین‌جا (نه از کش داخلی fetch) اعمال می‌شود —
        // یک ماه در مرورگر/CDN کاربر؛ چون نام فایل تصادفی و تکرارنشدنی است.
        "Cache-Control": "public, max-age=2592000, immutable",
      },
    });
  } catch (error) {
    console.error("Media Proxy Error:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت تصویر از سرور ذخیره‌سازی" }, { status: 502 });
  }
}