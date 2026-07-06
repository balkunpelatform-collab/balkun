// مسیر: src/app/api/admin/blog/route.ts
// مدیریت بلاگ یک عملیات مالی/حساس نیست (برخلاف تغییر نقش، شارژ کیف پول، حذف رزرو یا
// ویرایش/حذف اقامتگاه که طبق تصمیم معماری فاز ۱۱/بخش ۳ همیشه SUPER_ADMIN-only می‌مانند).
// به همین دلیل تمام عملیات این روت (GET و POST) صرفاً با requireAdminTabAccess و کلید
// "blog" کنترل می‌شوند: هر SUPER_ADMIN، و هر SUPPORT_AGENT که مدیر ارشد تب "blog" را
// برایش فعال کرده باشد، اجازه مدیریت کامل بلاگ (شامل ایجاد/ویرایش/حذف پست) را دارد.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminTabAccess } from "@/lib/auth/adminAuth";
import { BLOG_CATEGORIES } from "@/constants/blogCategories";
import { generateSlugFromTitle } from "@/utils/generateSlug";
import { BlogPost, BlogPostStatus } from "@/types/database";

const VALID_STATUSES: BlogPostStatus[] = ["DRAFT", "PUBLISHED"];

export async function GET(request: NextRequest) {
  const admin = await requireAdminTabAccess(request, "blog");
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim() || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from("blog_posts")
    .select("id, title, slug, category, status, createdAt, publishedAt", { count: "exact" })
    .order("createdAt", { ascending: false })
    .range(from, to);

  if (status && VALID_STATUSES.includes(status as BlogPostStatus)) {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  const { data: posts, error, count } = await query;

  if (error) {
    console.error("Admin Blog Fetch Error:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت لیست پست‌ها" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    posts: posts || [],
    pagination: { page, pageSize, total: count || 0 },
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminTabAccess(request, "blog");
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const validCategoryIds = BLOG_CATEGORIES.map((c) => c.id);
    if (!validCategoryIds.includes(body.category)) {
      return NextResponse.json({ success: false, error: "دسته‌بندی انتخاب‌شده معتبر نیست" }, { status: 400 });
    }

    if (!body.title?.trim()) {
      return NextResponse.json({ success: false, error: "عنوان پست الزامی است" }, { status: 400 });
    }

    const status: BlogPostStatus = body.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";

    // اسلاگ: یا همان چیزی که کاربر دستی وارد کرده، یا تولید خودکار از روی عنوان
    let slug = body.slug?.trim() ? generateSlugFromTitle(body.slug) : generateSlugFromTitle(body.title);
    if (!slug) slug = `post-${Date.now()}`;

    // بررسی یکتا بودن اسلاگ؛ در صورت تکراری بودن، یک پسوند عددی اضافه می‌شود
    const { data: existing } = await supabaseAdmin.from("blog_posts").select("id").eq("slug", slug).maybeSingle();
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-5)}`;
    }

    const now = new Date().toISOString();
    const postId = crypto.randomUUID();

    const newPost: Partial<BlogPost> = {
      id: postId,
      title: body.title.trim(),
      slug,
      excerpt: body.excerpt?.trim() || "",
      content: body.content?.trim() || "",
      coverImage: body.coverImage?.trim() || null,
      category: body.category,
      tags: Array.isArray(body.tags) ? body.tags : [],
      status,
      authorId: admin.userId,
      metaTitle: body.metaTitle?.trim() || null,
      metaDescription: body.metaDescription?.trim() || null,
      createdAt: now,
      updatedAt: now,
      publishedAt: status === "PUBLISHED" ? now : null,
    };

    const { data: post, error } = await supabaseAdmin.from("blog_posts").insert(newPost).select().single();

    if (error) throw error;

    await supabaseAdmin.from("admin_audit_logs").insert({
      adminId: admin.userId,
      actionType: "BLOG_POST_CHANGE",
      description: `ایجاد پست بلاگ: ${newPost.title}`,
    });

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error) {
    console.error("Admin Blog POST Error:", error);
    return NextResponse.json({ success: false, error: "خطا در ایجاد پست بلاگ" }, { status: 500 });
  }
}