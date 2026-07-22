// مسیر مقصد این فایل در پروژه: src/app/api/admin/upload/route.ts
// (این فایل را جایگزین فایل فعلی با همین مسیر کنید — کامل جایگزین شود)
//
// 🆕 حذف کامل پردازش/بهینه‌سازی تصویر (sharp) — طبق تصمیم صریح کارفرما:
// علت این تغییر: مرحله‌ی پردازش عکس (sharp -> resize -> تبدیل به webp) باعث
// می‌شد بایت‌های فایل نهایی که روی Supabase Storage ذخیره می‌شود خراب/ناسالم
// باشد. اندازه‌ی فایل ذخیره‌شده طبیعی به نظر می‌رسید (نه صفر، نه خیلی کوچک)
// و متادیتای mimetype هم درست بود، اما مرورگر نمی‌توانست فایل را دیکد/نمایش
// دهد (همان "placeholder" / تصویر خراب که در گالری ادمین و بنر سایت دیده
// می‌شد) — یعنی مشکل هرگز از دیتابیس، دسترسی‌ها یا تنظیمات Storage نبود؛
// دقیقاً همان مرحله‌ی تبدیل عکس روی سرور بود.
//
// چون این پروژه اصلاً نیازی به فشرده‌سازی یا تغییر ابعاد سمت سرور ندارد
// (محدودیت حجم ۲ مگابایتی همچنان از قبل توسط خودِ ادمین رعایت می‌شود)، به‌جای
// اصلاح/دیباگ‌کردن خودِ sharp، این مرحله کاملاً حذف شد: از این پس همان فایلی
// که ادمین از دستگاهش انتخاب می‌کند، بدون کوچک‌ترین تغییری در بایت‌ها،
// مستقیماً روی Supabase Storage ذخیره می‌شود.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole } from "@/lib/auth/adminAuth";

const ALLOWED_BUCKETS = ["accommodations", "blog", "banners"] as const;
type AllowedBucket = (typeof ALLOWED_BUCKETS)[number];

function isAllowedBucket(value: string): value is AllowedBucket {
  return (ALLOWED_BUCKETS as readonly string[]).includes(value);
}

// نگاشت فرمت‌های مجاز به پسوند فایل — دقیقاً همان فرمت‌هایی که در سه باکت
// Storage (accommodations/blog/banners) به‌عنوان allowed_mime_types ثبت شده‌اند.
const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: NextRequest) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN", "SUPPORT_AGENT"]);
  if (!admin) return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const requestedBucket = (formData.get("bucket") as string) || "accommodations";
    const bucket: AllowedBucket = isAllowedBucket(requestedBucket) ? requestedBucket : "accommodations";

    if (!file) return NextResponse.json({ success: false, error: "فایلی ارسال نشده است" }, { status: 400 });

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "حجم فایل نباید بیشتر از ۲ مگابایت باشد" }, { status: 400 });
    }

    const extension = ALLOWED_MIME_TYPES[file.type];
    if (!extension) {
      return NextResponse.json(
        { success: false, error: "فرمت فایل مجاز نیست (فقط JPG, PNG, WEBP, GIF مجاز است)" },
        { status: 400 }
      );
    }

    // 🆕 دیگر هیچ پردازش/بازفشرده‌سازی/تغییر اندازه‌ای روی فایل انجام نمی‌شود.
    // بایت‌های فایل دقیقاً همان‌طور که کاربر آپلود کرده، بدون دست‌خوردگی ذخیره می‌شوند.
    const buffer = Buffer.from(await file.arrayBuffer());

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const prefix = bucket === "blog" ? "balkun-blog" : bucket === "banners" ? "balkun-banner" : "balkun-exclusive";
    const fileName = `${prefix}-${timestamp}-${randomString}.${extension}`;
    const filePath = `images/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("خطا در آپلود عکس در سرور");
    }

    // آدرس پراکسی‌شده‌ی خودِ پروژه (بدون تغییر نسبت به قبل) — چون دامنه‌ی خام
    // Supabase در برخی شبکه‌های ایران مسدود/کند است.
    const proxiedUrl = `/api/media/${bucket}/${filePath}`;

    return NextResponse.json({
      success: true,
      url: proxiedUrl,
      message: "تصویر با موفقیت آپلود شد",
    });
  } catch (error: any) {
    console.error("Image Processing Error:", error);
    return NextResponse.json({ success: false, error: error.message || "خطا در پردازش تصویر" }, { status: 500 });
  }
}