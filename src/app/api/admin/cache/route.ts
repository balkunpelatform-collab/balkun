// مسیر: src/app/api/admin/cache/route.ts
// این فایل جدید است — آن را دقیقاً در همین مسیر در پروژه ایجاد کنید.
//
// 🆕 «کش‌پاک‌کن سراسری پنل مدیر»: یک اقدام حساس و سیستمی است (روی کل سایت اثر
// می‌گذارد، نه فقط یک بخش)، پس دقیقاً هم‌الگو با «متن صفحه درباره ما» (site-content)
// فقط با requireAdminRole(["SUPER_ADMIN"]) کنترل می‌شود؛ هیچ tabKey ای ندارد و
// SUPPORT_AGENT/FINANCE_MANAGER به آن دسترسی ندارند.
//
// کاری که انجام می‌دهد: تمام صفحات عمومی سایت (خانه، بلاگ، بنرها روی صفحه‌ی خانه،
// درباره‌ما/قوانین، صفحه‌ی هر آگهی/اتاق) را با revalidatePath از «کش رندر کامل»
// (Full Route Cache) و «کش روتر» نکست‌جی‌اس بیرون می‌کشد تا در اولین بازدید بعدی،
// دوباره و مستقیم از دیتابیس رندر شوند.
//
// ⚠️ نکته‌ی مهم و صادقانه (لطفاً قبل از تکیه‌کردن روی این ابزار بخوانید):
// در نسخه‌ی نکست‌جی‌اس این پروژه (16) و با توجه به این‌که تقریباً همه‌ی صفحات
// عمومی از قبل `export const revalidate = 0` دارند، این صفحات از اساس کش
// نمی‌شوند و هر بار مستقیم از دیتابیس خوانده می‌شوند. یعنی این دکمه برای مشکلاتی
// مثل «عکس بنر نمایش داده نمی‌شود» یا «بلاگ در لیست نیست»، به احتمال زیاد چیزی
// را عوض نمی‌کند، چون اصلاً کشی در کار نبوده. با این حال، به‌عنوان یک ابزار عمومی
// و مفید برای پاک کردن کش مرورگر/CDN کاربران و هر صفحه‌ای که در آینده کش شود،
// همچنان ارزش نگه‌داری دارد — و ضرری هم ندارد.

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminRole, logAdminAction } from "@/lib/auth/adminAuth";

// لیست تمام مسیرهای عمومی سایت که ممکن است در آینده کش شوند.
// نوع "layout" یعنی: این مسیر و تمام زیرمسیرهای آن (حتی صفحات پویا مثل [slug])
// با هم پاک می‌شوند.
const PATHS_TO_REVALIDATE: { path: string; type?: "layout" | "page" }[] = [
  { path: "/", type: "layout" }, // صفحه‌ی اصلی (بنرها، دسته‌بندی‌ها، لیست اقامتگاه‌ها)
  { path: "/blog", type: "layout" }, // لیست بلاگ
  { path: "/blog/[slug]", type: "page" }, // تک‌تک پست‌های بلاگ
  { path: "/rooms/[id]", type: "page" }, // صفحه‌ی هر اقامتگاه/اتاق
  { path: "/search", type: "page" }, // نتایج جست‌وجو
  { path: "/about", type: "page" },
  { path: "/terms", type: "page" },
  { path: "/corporate", type: "page" },
];

export async function POST(request: NextRequest) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const results: { path: string; ok: boolean; error?: string }[] = [];

  for (const item of PATHS_TO_REVALIDATE) {
    try {
      revalidatePath(item.path, item.type);
      results.push({ path: item.path, ok: true });
    } catch (error) {
      results.push({
        path: item.path,
        ok: false,
        error: error instanceof Error ? error.message : "خطای نامشخص",
      });
    }
  }

  await logAdminAction({
    adminId: admin.userId,
    actionType: "CACHE_CLEAR",
    description: `پاک‌سازی کامل کش سایت (${results.filter((r) => r.ok).length} مسیر)`,
  });

  return NextResponse.json({ success: true, results });
}