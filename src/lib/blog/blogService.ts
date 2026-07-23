// مسیر: src/lib/blog/blogService.ts
// لایه سرویس عمومی بلاگ — مخصوص خواندن پست‌های منتشرشده برای بخش عمومی سایت
// (صفحه لیست، صفحه تک‌پست و sitemap). دقیقاً هم‌الگو با
// src/lib/otaghak/services/searchService.ts: چون این فایل فقط در Server Component ها
// استفاده می‌شود (هرگز در کامپوننت کلاینت import نمی‌شود)، مجاز است مستقیماً از
// supabaseAdmin استفاده کند.
//
// 🆕 رفع مشکل «پست منتشرشده گاهی 404 می‌دهد»:
// قبلاً هر خطای اتصال/شبکه به Supabase در getPublishedPostBySlug کاملاً بی‌صدا
// (بدون هیچ لاگی) به یک "پست پیدا نشد" ساده تبدیل می‌شد؛ یعنی اگر ارتباط سرور با
// Supabase برای یک لحظه با تاخیر/قطعی مواجه می‌شد (چیزی که در شرایط اینترنت ایران
// برای سرویس‌های خارج از کشور بعید نیست)، کاربر یک صفحه‌ی ۴۰۴ کاملاً معمولی می‌دید
// و هیچ ردی از خطای واقعی جایی ثبت نمی‌شد تا بعداً بشود فهمید مشکل از کجا بوده.
// حالا: (۱) هر کوئری ناموفق یک‌بار خودکار و بلافاصله تکرار می‌شود، (۲) اگر باز هم
// خطا داد، دقیقاً همان خطا با console.error ثبت می‌شود تا در لاگ‌های سرور/هاست
// قابل مشاهده باشد. رفتار قابل مشاهده برای کاربر تغییری نکرده (همچنان ۴۰۴ برای
// پست‌های واقعاً پیدا نشده)، اما حالا قابل ردیابی و کمتر مستعد خطای گذرای شبکه است.

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { BlogPost } from "@/types/database";

const PAGE_SIZE = 9;

export interface PublishedPostsResult {
  posts: BlogPost[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getPublishedPosts(params: {
  page?: number;
  category?: string;
}): Promise<PublishedPostsResult> {
  const page = Math.max(1, params.page || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const runQuery = () => {
    let query = supabaseAdmin
      .from("blog_posts")
      .select("*", { count: "exact" })
      .eq("status", "PUBLISHED")
      .order("publishedAt", { ascending: false })
      .range(from, to);

    if (params.category) {
      query = query.eq("category", params.category);
    }

    return query;
  };

  let { data, error, count } = await runQuery();

  if (error) {
    // تلاش دوباره برای رد کردن خطاهای گذرا/موقتی شبکه (مثلاً یک قطعی لحظه‌ای ارتباط با Supabase)
    ({ data, error, count } = await runQuery());
  }

  if (error) {
    console.error("[blogService] getPublishedPosts failed after retry:", error);
    return { posts: [], total: 0, page, pageSize: PAGE_SIZE };
  }

  return { posts: (data as BlogPost[]) || [], total: count || 0, page, pageSize: PAGE_SIZE };
}

export async function getPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
  const runQuery = () =>
    supabaseAdmin
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "PUBLISHED")
      .maybeSingle();

  let { data, error } = await runQuery();

  if (error) {
    // تلاش دوباره برای رد کردن خطاهای گذرا/موقتی شبکه؛ قبلاً همین خطا بی‌صدا به ۴۰۴ تبدیل می‌شد
    ({ data, error } = await runQuery());
  }

  if (error) {
    console.error(`[blogService] getPublishedPostBySlug("${slug}") failed after retry:`, error);
    return null;
  }

  if (!data) return null;
  return data as BlogPost;
}

export async function getAllPublishedSlugsForSitemap(): Promise<{ slug: string; updatedAt: string }[]> {
  const { data, error } = await supabaseAdmin
    .from("blog_posts")
    .select("slug, updatedAt")
    .eq("status", "PUBLISHED");

  if (error) {
    console.error("[blogService] getAllPublishedSlugsForSitemap failed:", error);
    return [];
  }
  if (!data) return [];
  return data as { slug: string; updatedAt: string }[];
}