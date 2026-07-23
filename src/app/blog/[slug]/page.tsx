// مسیر: src/app/blog/[slug]/page.tsx
// این فایل را جایگزین کامل فایل فعلی با همین مسیر در پروژه کنید.
//
// صفحه‌ی تک‌پست بلاگ — کاملاً Server-Side Rendered برای سئو، هم‌الگو با src/app/rooms/[id]/page.tsx.
// محتوای پست به‌صورت متن ساده ذخیره می‌شود (نه HTML خام) تا از تزریق اسکریپت (XSS)
// جلوگیری شود؛ هر پاراگراف با یک خط خالی از پاراگراف بعدی جدا و به تگ <p> تبدیل می‌شود.
//
// این صفحه صراحتاً «force-dynamic» است تا هرگز در زمان Build با لیست خالی/قدیمی پست‌ها
// پیش‌ساخته نشود؛ هر بار درخواست می‌آید، مستقیماً و تازه از دیتابیس خوانده می‌شود.
// نکته‌ی مهم درباره‌ی ۴۰۴: این صفحه فقط پست‌هایی را نشان می‌دهد که وضعیت‌شان دقیقاً
// «PUBLISHED» (منتشر شده) باشد.
//
// 🆕 رفع باگ UI: «بازگشت به بلاگ» و برچسب دسته‌بندی توی هم بودند.
// علتش این بود که هر دو Link به‌صورت inline-flex/inline-block رندر می‌شدند؛ چون
// المان‌های inline هستند، تا وقتی جا داشته باشند کنار هم روی یک خط می‌مانند —
// margin-bottom روی المان inline باعث شکستن خط نمی‌شود. الان هر دو داخل یک
// wrapper با flex-col قرار گرفته‌اند تا همیشه، مستقل از عرض صفحه، دقیقاً زیر هم
// (نه کنار هم) قرار بگیرند.

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Calendar, ArrowRight, Tag, Clock } from "lucide-react";
import { getPublishedPostBySlug } from "@/lib/blog/blogService";
import { getBlogCategoryLabel } from "@/constants/blogCategories";
import { COMPANY_INFO } from "@/constants/company";

// همیشه در لحظه‌ی درخواست از دیتابیس خوانده شود؛ هرگز در Build پیش‌رندر/کش نشود.
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

// تخمین زمان مطالعه از روی تعداد کلمات متن پست (میانگین ~۱۸۰ کلمه در دقیقه)
function estimateReadingMinutes(content: string): number {
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 180));
}

// قبلاً پاراگراف‌ها فقط با یک خط کاملاً خالی (Enter دوبار) از هم جدا می‌شدند. خیلی از
// نویسنده‌های غیرفنی عادت دارند بین هر پاراگراف فقط یک بار Enter بزنند؛ منطق زیر اول
// تلاش می‌کند با خط خالی جدا کند (روش استاندارد و ترجیحی)؛ اگر متن اصلاً خط خالی
// نداشت، هر خط را خودش یک پاراگراف مستقل در نظر می‌گیرد تا فاصله‌گذاری بصری درست باشد.
function renderContent(content: string) {
  const byBlankLine = content
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const paragraphs = byBlankLine.length > 1
    ? byBlankLine
    : content
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean);

  return paragraphs.map((paragraph, index) => (
    <p key={index} className="text-slate-700 leading-loose text-[15px] md:text-lg whitespace-pre-line">
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

  const readingMinutes = estimateReadingMinutes(post.content);

  return (
    <article className="container mx-auto px-4 py-8 md:py-14 max-w-3xl">
      {/* 🆕 بازگشت به بلاگ + دسته‌بندی: هر دو داخل یک wrapper با flex-col تا همیشه
          زیر هم قرار بگیرند و هرگز کنار هم/توی هم نشوند (چون خودشان inline هستند) */}
      <div className="flex flex-col items-start gap-4 mb-6">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-balkun-cyan transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-balkun-cyan/40 rounded-md"
        >
          <ArrowRight className="w-4 h-4" /> بازگشت به بلاگ
        </Link>

        <Link
          href={`/blog?category=${post.category}`}
          className="inline-block bg-balkun-cyan/10 text-balkun-cyan text-xs font-bold px-3 py-1.5 rounded-full hover:bg-balkun-cyan/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-balkun-cyan/40"
        >
          {getBlogCategoryLabel(post.category)}
        </Link>
      </div>

      <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-balkun-navy leading-[1.3] md:leading-[1.25] mb-6">
        {post.title}
      </h1>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500 font-bold pb-8 mb-10 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          {post.publishedAt ? formatJalaliDate(post.publishedAt as string) : ""}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          {readingMinutes.toLocaleString("fa-IR")} دقیقه مطالعه
        </div>
      </div>

      {post.coverImage && (
        <div className="relative w-full aspect-[16/10] sm:aspect-[21/9] rounded-2xl md:rounded-[2rem] overflow-hidden mb-10 md:mb-12 bg-slate-100 border border-slate-100 shadow-sm">
          {/* پس‌زمینه‌ی بلورشده از همان عکس، فقط برای پر کردن فضای خالی اطراف — خود عکس اصلی هرگز برش نمی‌خورد */}
          <Image
            src={post.coverImage}
            alt=""
            aria-hidden="true"
            fill
            className="object-cover scale-125 blur-3xl opacity-70"
          />
          {/* عکس اصلی، همیشه کامل و بدون برش */}
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        </div>
      )}

      <div className="flex flex-col gap-5">
        {renderContent(post.content)}
      </div>

      {post.tags?.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-12 pt-6 border-t border-slate-100">
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