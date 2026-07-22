// مسیر: src/lib/wallet/ensureOrganization.ts
//
// 🆕 بند ۲۷ (بازگشت کیف پول سازمانی به موجودی مستقل هر کارمند):
// این فایل از تسک ۷ قبلی باقی مانده و بدون تغییر در منطق اصلی‌اش کار می‌کند —
// هنوز هم هر سازمان دقیقاً یک ردیف در جدول `organizations` دارد (برای نگه‌داشتن
// isActive، تنظیمات شارژ خودکار، و غیره). تنها تغییر: یک تابع کمکی جدید
// (getOrganizationIdByName) اضافه شده تا بقیه‌ی کد مجبور نباشد بعد از
// ensureOrganizationExists دوباره و دوباره همان کوئری select را بنویسد.
//
// idempotent است: اگر سازمان از قبل وجود داشته باشد، هیچ تغییری اعمال نمی‌شود.

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

// 🆕 بند ۲۷: تضمین وجود سازمان و برگرداندن شناسه‌ی (id) آن در یک فراخوانی.
// چون از این پس در چند نقطه (ثبت‌نام، شارژ گروهی کارکنان) بلافاصله بعد از
// ensureOrganizationExists به organizationId هم نیاز داریم.
export async function getOrCreateOrganizationId(organizationName: string): Promise<string | null> {
  const name = organizationName.trim();
  if (!name) return null;

  await ensureOrganizationExists(name);

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  return org?.id ?? null;
}
