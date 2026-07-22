// مسیر: src/app/api/admin/upload/route.ts
// 🆕 فاز ۱۱ / بخش ۴ (بلاگ): این روت از این پس بین دو باکت Supabase Storage
// ("accommodations" و "blog") انتخاب می‌کند. فیلد اختیاری "bucket" در FormData
// مشخص می‌کند تصویر برای کدام بخش آپلود می‌شود؛ اگر ارسال نشود یا نامعتبر باشد،
// پیش‌فرض همان "accommodations" قبلی باقی می‌ماند (سازگار با فراخوانی‌های قبلی).
// 🆕 تسک ۱۸ چک‌لیست کارفرما (امکان تغییر بنر اصلی صفحه اول): باکت سوم "banners"
// اضافه شد تا تصاویر بنر اسلایدر صفحه اول هم از همین روت مشترک آپلود شوند.
//
// 🆕 بند ۲۸ (رفع قطعی مشکل «عکس بنر نمایش داده نمی‌شود»):
// قبلاً این روت آدرس عمومی خام Supabase Storage (یک دامنه‌ی خارجی) را مستقیم
// برمی‌گرداند و همان آدرس در دیتابیس ذخیره می‌شد. چون دامنه‌ی Supabase در بسیاری
// از شبکه‌های اینترنت ایران برای خودِ مرورگر کاربر مسدود/کند است (برخلاف سرور
// پروژه که چنین محدودیتی ندارد)، تصویر برای کاربر نهایی هیچ‌وقت بارگذاری
// نمی‌شد — even though آپلود از پنل ادمین خودش بدون خطا انجام می‌شد.
// از این پس، به‌جای آدرس خام Supabase، آدرس پراکسی‌شده‌ی خودِ همین پروژه
// (`/api/media/<bucket>/<مسیر فایل>` — نگاه کنید به
// src/app/api/media/[...path]/route.ts) برگردانده و در دیتابیس ذخیره می‌شود؛
// مرورگر کاربر از این پس فقط با دامنه‌ی خودِ سایت بالکن صحبت می‌کند.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole } from "@/lib/auth/adminAuth";
import sharp from "sharp";

const ALLOWED_BUCKETS = ["accommodations", "blog", "banners"] as const;
type AllowedBucket = (typeof ALLOWED_BUCKETS)[number];

function isAllowedBucket(value: string): value is AllowedBucket {
  return (ALLOWED_BUCKETS as readonly string[]).includes(value);
}

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

    const buffer = Buffer.from(await file.arrayBuffer());

    const optimizedBuffer = await sharp(buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const prefix = bucket === "blog" ? "balkun-blog" : bucket === "banners" ? "balkun-banner" : "balkun-exclusive";
    const fileName = `${prefix}-${timestamp}-${randomString}.webp`;
    const filePath = `images/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, optimizedBuffer, {
        contentType: "image/webp",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("خطا در آپلود عکس در سرور");
    }

    // 🆕 بند ۲۸: به‌جای آدرس خام Supabase (که برای بعضی کاربران ایرانی مستقیماً
    // در دسترس نیست)، آدرس پراکسی‌شده‌ی خودِ پروژه را برمی‌گردانیم. مرورگر کاربر
    // این آدرس را از دامنه‌ی خودِ سایت بالکن می‌خواهد، نه از Supabase.
    const proxiedUrl = `/api/media/${bucket}/${filePath}`;

    return NextResponse.json({
      success: true,
      url: proxiedUrl,
      message: "تصویر با موفقیت بهینه‌سازی و آپلود شد",
    });
  } catch (error: any) {
    console.error("Image Processing Error:", error);
    return NextResponse.json({ success: false, error: error.message || "خطا در پردازش تصویر" }, { status: 500 });
  }
}