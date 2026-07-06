// مسیر: src/lib/blog/blogService.ts
// لایه سرویس عمومی بلاگ — مخصوص خواندن پست‌های منتشرشده برای بخش عمومی سایت
// (صفحه لیست، صفحه تک‌پست و sitemap). دقیقاً هم‌الگو با
// src/lib/otaghak/services/searchService.ts: چون این فایل فقط در Server Component ها
// استفاده می‌شود (هرگز در کامپوننت کلاینت import نمی‌شود)، مجاز است مستقیماً از
// supabaseAdmin استفاده کند.

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

  let query = supabaseAdmin
    .from("blog_posts")
    .select("*", { count: "exact" })
    .eq("status", "PUBLISHED")
    .order("publishedAt", { ascending: false })
    .range(from, to);

  if (params.category) {
    query = query.eq("category", params.category);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching published blog posts:", error);
    return { posts: [], total: 0, page, pageSize: PAGE_SIZE };
  }

  return { posts: (data as BlogPost[]) || [], total: count || 0, page, pageSize: PAGE_SIZE };
}

export async function getPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabaseAdmin
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "PUBLISHED")
    .maybeSingle();

  if (error || !data) return null;
  return data as BlogPost;
}

export async function getAllPublishedSlugsForSitemap(): Promise<{ slug: string; updatedAt: string }[]> {
  const { data, error } = await supabaseAdmin
    .from("blog_posts")
    .select("slug, updatedAt")
    .eq("status", "PUBLISHED");

  if (error || !data) return [];
  return data as { slug: string; updatedAt: string }[];
}