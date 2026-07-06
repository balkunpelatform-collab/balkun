// مسیر: src/app/blog/[slug]/page.tsx
// صفحه‌ی تک‌پست بلاگ — کاملاً Server-Side Rendered برای سئو، هم‌الگو با src/app/rooms/[id]/page.tsx.
// 🆕 محتوای پست به‌صورت متن ساده ذخیره می‌شود (نه HTML خام) تا از تزریق اسکریپت (XSS)
// جلوگیری شود؛ هر پاراگراف با یک خط خالی از پاراگراف بعدی جدا و به تگ <p> تبدیل می‌شود.

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Calendar, ArrowRight, Tag } from "lucide-react";
import { getPublishedPostBySlug } from "@/lib/blog/blogService";
import { getBlogCategoryLabel } from "@/constants/blogCategories";
import { COMPANY_INFO } from "@/constants/company";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) return { title: `مطلب یافت نشد | بلاگ ${COMPANY_INFO.name}` };

  const title = post.metaTitle || `${post.title} | بلاگ ${COMPANY_INFO.name}`;
  const description = post.metaDescription || post.excerpt;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: post.coverImage ? [post.coverImage] : undefined,
      type: "article",
    },
  };
}

function formatJalaliDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
  } catch {
    return "";
  }
}

function renderContent(content: string) {
  return content
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((paragraph, index) => (
      <p key={index} className="text-slate-700 leading-loose text-[15px] md:text-base whitespace-pre-line">
        {paragraph}
      </p>
    ));
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="container mx-auto px-4 py-8 md:py-10 max-w-3xl">
      <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-bold text-balkun-cyan hover:text-balkun-cyan-dark mb-6">
        <ArrowRight className="w-4 h-4" /> بازگشت به بلاگ
      </Link>

      <span className="inline-block bg-balkun-cyan/10 text-balkun-cyan text-xs font-bold px-3 py-1.5 rounded-full mb-4">
        {getBlogCategoryLabel(post.category)}
      </span>

      <h1 className="text-2xl md:text-4xl font-black text-balkun-navy leading-tight mb-4">{post.title}</h1>

      <div className="flex items-center gap-4 text-sm text-slate-500 font-bold mb-8">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          {post.publishedAt ? formatJalaliDate(post.publishedAt as string) : ""}
        </div>
      </div>

      {post.coverImage && (
        <div className="relative w-full h-56 md:h-96 rounded-2xl md:rounded-[2rem] overflow-hidden mb-8">
          <Image src={post.coverImage} alt={post.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 768px" priority />
        </div>
      )}

      <div className="flex flex-col gap-5">
        {renderContent(post.content)}
      </div>

      {post.tags?.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-10 pt-6 border-t border-slate-100">
          <Tag className="w-4 h-4 text-slate-400" />
          {post.tags.map((tag) => (
            <span key={tag} className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}