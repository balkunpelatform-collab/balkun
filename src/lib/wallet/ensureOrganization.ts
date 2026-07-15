// مسیر: src/lib/wallet/ensureOrganization.ts
//
// 🆕 تسک ۷ چک‌لیست کارفرما (تفکیک کیف پول سازمانی + شارژ خودکار + غیرفعال‌سازی سازمان):
// از این پس کیف پول سازمانی دیگر per-user نیست؛ هر سازمان دقیقاً یک ردیف در جدول
// جدید `organizations` دارد که موجودی کیف پول مشترک (walletBalance)، وضعیت فعال/غیرفعال
// (isActive) و تنظیمات شارژ خودکار آن را نگه می‌دارد. این تابع کمکی تضمین می‌کند که
// هر بار نام یک سازمان جدید در سیستم ظاهر می‌شود (چه از ثبت‌نام کاربر، چه از افزودن
// شماره به لیست سفید سازمانی تکی/گروهی)، بلافاصله یک ردیف سازمان برایش ساخته شود —
// در غیر این صورت آن سازمان کیف پول قابل مدیریتی در پنل ادمین نخواهد داشت.
//
// idempotent است: اگر سازمان از قبل وجود داشته باشد، هیچ تغییری اعمال نمی‌شود.
// این فایل، فایل جدیدی است — آن را در مسیر بالا در پروژه ایجاد کنید.

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function ensureOrganizationExists(organizationName: string): Promise<void> {
  const name = organizationName.trim();
  if (!name) return;

  const { data: existing } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (existing) return;

  const { error } = await supabaseAdmin.from("organizations").insert([{ name }]);

  // اگر خطا از نوع نقض یکتایی بود (23505)، یعنی هم‌زمان توسط یک درخواست دیگر ساخته شده — بی‌خطر است.
  if (error && error.code !== "23505") {
    console.error("ensureOrganizationExists Error:", error);
  }
}