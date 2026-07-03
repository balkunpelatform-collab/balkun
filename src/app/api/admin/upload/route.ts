import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole } from "@/lib/auth/adminAuth";
import sharp from "sharp";

export async function POST(request: NextRequest) {
  // ۱. بررسی دسترسی ادمین
  const admin = await requireAdminRole(request, ["SUPER_ADMIN", "SUPPORT_AGENT"]);
  if (!admin) return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) return NextResponse.json({ success: false, error: "فایلی ارسال نشده است" }, { status: 400 });

    // محدودیت حجم قبل از پردازش (۲ مگابایت)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "حجم فایل نباید بیشتر از ۲ مگابایت باشد" }, { status: 400 });
    }

    // تبدیل فایل به Buffer برای استفاده در Sharp
    const buffer = Buffer.from(await file.arrayBuffer());

    // ۲. پردازش تصویر با Sharp (تغییر فرمت به webp، فشرده‌سازی و تغییر سایز بهینه)
    const optimizedBuffer = await sharp(buffer)
      .resize({ width: 1200, withoutEnlargement: true }) // حداکثر عرض 1200 پیکسل
      .webp({ quality: 80 }) // کیفیت 80 درصد برای فرمت webp
      .toBuffer();

    // ۳. ساخت نام سئو بیس و یونیک
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileName = `balkun-exclusive-${timestamp}-${randomString}.webp`;
    const filePath = `images/${fileName}`;

    // ۴. آپلود در استورج Supabase
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("accommodations")
      .upload(filePath, optimizedBuffer, {
        contentType: "image/webp",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("خطا در آپلود عکس در سرور");
    }

    // ۵. دریافت لینک عمومی عکس
    const { data: publicUrlData } = supabaseAdmin.storage
      .from("accommodations")
      .getPublicUrl(filePath);

    return NextResponse.json({ 
      success: true, 
      url: publicUrlData.publicUrl,
      message: "تصویر با موفقیت بهینه‌سازی و آپلود شد" 
    });

  } catch (error: any) {
    console.error("Image Processing Error:", error);
    return NextResponse.json({ success: false, error: error.message || "خطا در پردازش تصویر" }, { status: 500 });
  }
}