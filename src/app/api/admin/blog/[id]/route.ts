// مسیر: src/app/api/admin/blog/[id]/route.ts
// همانند route.ts اصلی، تمام عملیات (GET/PATCH/DELETE) با کلید تب "blog" کنترل می‌شوند.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminTabAccess } from "@/lib/auth/adminAuth";
import { BLOG_CATEGORIES } from "@/constants/blogCategories";
import { generateSlugFromTitle } from "@/utils/generateSlug";
import { BlogPostStatus } from "@/types/database";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminTabAccess(request, "blog");
  if (!admin) return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });

  const { id } = await params;
  const { data, error } = await supabaseAdmin.from("blog_posts").select("*").eq("id", id).maybeSingle();

  if (error || !data) return NextResponse.json({ success: false, error: "پست یافت نشد" }, { status: 404 });
  return NextResponse.json({ success: true, post: data });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminTabAccess(request, "blog");
  if (!admin) return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();

    if (body.category) {
      const validCategoryIds = BLOG_CATEGORIES.map((c) => c.id);
      if (!validCategoryIds.includes(body.category)) {
        return NextResponse.json({ success: false, error: "دسته‌بندی نامعتبر" }, { status: 400 });
      }
    }

    const { data: current, error: fetchError } = await supabaseAdmin
      .from("blog_posts")
      .select("slug, status, publishedAt")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !current) {
      return NextResponse.json({ success: false, error: "پست یافت نشد" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { ...body, updatedAt: new Date().toISOString() };

    // اسلاگ جدید (در صورت ارسال) باید یکتا بماند
    if (body.slug?.trim()) {
      const newSlug = generateSlugFromTitle(body.slug);
      if (newSlug && newSlug !== current.slug) {
        const { data: existing } = await supabaseAdmin
          .from("blog_posts")
          .select("id")
          .eq("slug", newSlug)
          .neq("id", id)
          .maybeSingle();
        updates.slug = existing ? `${newSlug}-${Date.now().toString().slice(-5)}` : newSlug;
      } else {
        updates.slug = current.slug;
      }
    }

    // اگر وضعیت برای اولین بار به PUBLISHED تغییر کند، publishedAt ثبت می‌شود
    const newStatus: BlogPostStatus | undefined = body.status;
    if (newStatus === "PUBLISHED" && current.status !== "PUBLISHED" && !current.publishedAt) {
      updates.publishedAt = new Date().toISOString();
    }

    const { data: updated, error } = await supabaseAdmin
      .from("blog_posts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from("admin_audit_logs").insert({
      adminId: admin.userId,
      actionType: "BLOG_POST_CHANGE",
      description: `ویرایش پست بلاگ: ${updated.title}`,
    });

    return NextResponse.json({ success: true, post: updated });
  } catch (error) {
    console.error("Admin Blog PATCH Error:", error);
    return NextResponse.json({ success: false, error: "خطا در ویرایش پست" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminTabAccess(request, "blog");
  if (!admin) return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });

  try {
    const { id } = await params;

    const { data: post } = await supabaseAdmin.from("blog_posts").select("title").eq("id", id).single();

    const { error } = await supabaseAdmin.from("blog_posts").delete().eq("id", id);
    if (error) throw error;

    await supabaseAdmin.from("admin_audit_logs").insert({
      adminId: admin.userId,
      actionType: "BLOG_POST_CHANGE",
      description: `حذف پست بلاگ: ${post?.title || id}`,
    });

    return NextResponse.json({ success: true, message: "با موفقیت حذف شد" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "خطا در حذف پست" }, { status: 500 });
  }
}