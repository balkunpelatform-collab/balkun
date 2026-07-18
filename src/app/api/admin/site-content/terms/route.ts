// مسیر: src/app/api/admin/site-content/terms/route.ts
//
// تسک ۱۴ چک‌لیست کارفرما (امکان ویرایش متن «قوانین و مقررات» توسط مدیر ارشد).
// دقیقاً هم‌الگو با src/app/api/admin/site-content/about/route.ts (تسک ۱۳)، با یک
// تفاوت اصلی: چون بندهای قوانین یک آرایه‌ی پویا هستند (نه ۳ کارت ثابت)، اعتبارسنجی
// PUT به‌جای تعداد ثابت، فقط حداقل تعداد بند (TERMS_SECTIONS_MIN_COUNT) را بررسی
// می‌کند و امکان افزودن/حذف/جابه‌جایی بند را — که در فرم ادمین انجام می‌شود — رد
// نمی‌کند.
//
// دسترسی: عمداً فقط SUPER_ADMIN — دقیقاً هم‌الگو با about/route.ts؛ متن خود تسک
// («توسط مدیر ارشد») صراحتاً این قابلیت را محدود کرده است.
//
// GET: محتوای فعلی (یا مقدار پیش‌فرض در صورت نبود ردیف) را برای پر کردن فرم ویرایش برمی‌گرداند.
// PUT: محتوای جدید را پس از اعتبارسنجی کامل ذخیره و در admin_audit_logs ثبت می‌کند.
// POST: مقدار پیش‌فرض را برمی‌گرداند (برای دکمه‌ی «بازگردانی متن پیش‌فرض» در فرم ادمین).

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth/adminAuth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  TERMS_SECTIONS_MIN_COUNT,
  DEFAULT_TERMS_CONTENT,
  getTermsPageContent,
  saveTermsPageContent,
  type TermsPageContent,
  type TermsSectionItem,
} from "@/lib/siteContent/siteContentService";

export async function GET(request: NextRequest) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const content = await getTermsPageContent();
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
    const rawSections = Array.isArray(body.sections) ? body.sections : [];

    if (!heroTitle) {
      return NextResponse.json({ success: false, error: "عنوان اصلی صفحه الزامی است" }, { status: 400 });
    }
    if (!heroDescription) {
      return NextResponse.json({ success: false, error: "توضیح زیر عنوان اصلی الزامی است" }, { status: 400 });
    }
    if (rawSections.length < TERMS_SECTIONS_MIN_COUNT) {
      return NextResponse.json(
        { success: false, error: "باید حداقل یک بند قوانین وجود داشته باشد" },
        { status: 400 }
      );
    }

    const sections: TermsSectionItem[] = rawSections.map((item: unknown) => {
      const v = (item ?? {}) as Record<string, unknown>;
      return {
        title: typeof v.title === "string" ? v.title.trim() : "",
        body: typeof v.body === "string" ? v.body.trim() : "",
      };
    });

    const emptyIndex = sections.findIndex((s) => !s.title || !s.body);
    if (emptyIndex !== -1) {
      return NextResponse.json(
        { success: false, error: `عنوان و متن بند شماره ${emptyIndex + 1} الزامی است` },
        { status: 400 }
      );
    }

    const content: TermsPageContent = { heroTitle, heroDescription, sections };

    await saveTermsPageContent(content, admin.userId);

    await supabaseAdmin.from("admin_audit_logs").insert({
      adminId: admin.userId,
      actionType: "SITE_CONTENT_CHANGE",
      description: "ویرایش متن صفحه‌ی «قوانین و مقررات»",
    });

    return NextResponse.json({ success: true, content });
  } catch (error) {
    console.error("Admin Site Content (Terms) PUT Error:", error);
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

  return NextResponse.json({ success: true, content: DEFAULT_TERMS_CONTENT });
}