// مسیر: src/app/api/admin/site-content/about/route.ts
//
// تسک ۱۳ چک‌لیست کارفرما (امکان ویرایش متن «درباره ما» توسط مدیر ارشد).
//
// دسترسی: عمداً فقط SUPER_ADMIN — متن خود عبارت تسک («توسط مدیر ارشد») صراحتاً
// این قابلیت را به مدیر ارشد محدود کرده، پس برخلاف بنر/بلاگ (که با
// requireAdminTabAccess برای SUPPORT_AGENT هم قابل تفویض‌اند)، این روت مستقیماً
// با requireAdminRole(request, ["SUPER_ADMIN"]) کنترل می‌شود — دقیقاً هم‌الگو با
// src/app/api/admin/payments/route.ts.
//
// GET: محتوای فعلی (یا مقدار پیش‌فرض در صورت نبود ردیف) را برای پر کردن فرم ویرایش برمی‌گرداند.
// PUT: محتوای جدید را پس از اعتبارسنجی کامل ذخیره و در admin_audit_logs ثبت می‌کند.

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth/adminAuth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  ABOUT_PAGE_VALUES_COUNT,
  DEFAULT_ABOUT_CONTENT,
  getAboutPageContent,
  saveAboutPageContent,
  type AboutPageContent,
  type AboutPageValueItem,
} from "@/lib/siteContent/siteContentService";

export async function GET(request: NextRequest) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const content = await getAboutPageContent();
  return NextResponse.json({ success: true, content });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const heroTitle = typeof body.heroTitle === "string" ? body.heroTitle.trim() : "";
    const heroDescription = typeof body.heroDescription === "string" ? body.heroDescription.trim() : "";
    const valuesSectionTitle =
      typeof body.valuesSectionTitle === "string" ? body.valuesSectionTitle.trim() : "";
    const rawValues = Array.isArray(body.values) ? body.values : [];

    if (!heroTitle) {
      return NextResponse.json({ success: false, error: "عنوان اصلی صفحه الزامی است" }, { status: 400 });
    }
    if (!heroDescription) {
      return NextResponse.json({ success: false, error: "توضیح زیر عنوان اصلی الزامی است" }, { status: 400 });
    }
    if (!valuesSectionTitle) {
      return NextResponse.json({ success: false, error: "عنوان بخش «چرا بالکن؟» الزامی است" }, { status: 400 });
    }
    if (rawValues.length !== ABOUT_PAGE_VALUES_COUNT) {
      return NextResponse.json(
        { success: false, error: `دقیقاً باید ${ABOUT_PAGE_VALUES_COUNT} کارت ویژگی وارد شود` },
        { status: 400 }
      );
    }

    const values: AboutPageValueItem[] = rawValues.map((item: unknown) => {
      const v = (item ?? {}) as Record<string, unknown>;
      return {
        title: typeof v.title === "string" ? v.title.trim() : "",
        description: typeof v.description === "string" ? v.description.trim() : "",
      };
    });

    const emptyIndex = values.findIndex((v) => !v.title || !v.description);
    if (emptyIndex !== -1) {
      return NextResponse.json(
        { success: false, error: `عنوان و توضیح کارت ویژگی شماره ${emptyIndex + 1} الزامی است` },
        { status: 400 }
      );
    }

    const content: AboutPageContent = { heroTitle, heroDescription, valuesSectionTitle, values };

    await saveAboutPageContent(content, admin.userId);

    await supabaseAdmin.from("admin_audit_logs").insert({
      adminId: admin.userId,
      actionType: "SITE_CONTENT_CHANGE",
      description: "ویرایش متن صفحه‌ی «درباره ما»",
    });

    return NextResponse.json({ success: true, content });
  } catch (error) {
    console.error("Admin Site Content (About) PUT Error:", error);
    return NextResponse.json({ success: false, error: "خطا در ذخیره‌سازی متن صفحه" }, { status: 500 });
  }
}

// برای دکمه‌ی «بازگردانی به پیش‌فرض» در فرم ادمین — عمداً چیزی در دیتابیس ذخیره
// نمی‌کند، فقط مقدار پیش‌فرض را برمی‌گرداند تا خود ادمین با دکمه‌ی «ذخیره»،
// آگاهانه آن را ثبت کند.
export async function POST(request: NextRequest) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  return NextResponse.json({ success: true, content: DEFAULT_ABOUT_CONTENT });
}