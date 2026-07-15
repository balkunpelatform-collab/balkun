// مسیر: src/lib/banners/bannerService.ts
// لایه سرویس عمومی بنر اصلی صفحه اول (تسک ۱۸ چک‌لیست کارفرما) — فقط بنرهای فعال
// (isActive = true) را برای نمایش در سایت برمی‌گرداند، مرتب‌شده بر اساس
// displayOrder. دقیقاً هم‌الگو با src/lib/blog/blogService.ts: چون این فایل فقط
// در Server Component ها استفاده می‌شود (هرگز در کامپوننت کلاینت import نمی‌شود)،
// مجاز است مستقیماً از supabaseAdmin استفاده کند.

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { HomepageBanner } from "@/types/database";

export async function getActiveBanners(): Promise<HomepageBanner[]> {
  const { data, error } = await supabaseAdmin
    .from("homepage_banners")
    .select("*")
    .eq("isActive", true)
    .order("displayOrder", { ascending: true });

  if (error) {
    console.error("Error fetching active homepage banners:", error);
    return [];
  }

  return (data as HomepageBanner[]) || [];
}
