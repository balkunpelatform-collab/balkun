// مسیر: src/app/blog/[slug]/page.tsx
// صفحه‌ی تک‌پست بلاگ — کاملاً Server-Side Rendered برای سئو، هم‌الگو با src/app/rooms/[id]/page.tsx.
// محتوای پست به‌صورت متن ساده ذخیره می‌شود (نه HTML خام) تا از تزریق اسکریپت (XSS)
// جلوگیری شود؛ هر پاراگراف با یک خط خالی از پاراگراف بعدی جدا و به تگ <p> تبدیل می‌شود.
//
// 🆕 تسک ۵ چک‌لیست کارفرما (خطای 404 در بلاگ):
// این صفحه صراحتاً «force-dynamic» شد تا هرگز در زمان Build با لیست خالی/قدیمی پست‌ها
// پیش‌ساخته (پیش‌رندر) نشود؛ هر بار درخواست می‌آید، مستقیماً و تازه از دیتابیس خوانده
// می‌شود. این یعنی هر پستی که همین الان در پنل مدیریت «منتشر شده» می‌شود، بلافاصله و
// بدون نیاز به Build مجدد سایت، روی آدرس /blog/{slug} در دسترس است.
// نکته‌ی مهم درباره‌ی ۴۰۴: این صفحه فقط پست‌هایی را نشان می‌دهد که وضعیت‌شان دقیقاً
// «PUBLISHED» (منتشر شده) باشد (نگاه کنید به blogService.getPublishedPostBySlug).
// اگر پستی هنوز روی «پیش‌نویس» باشد، طبق طراحی همیشه 404 می‌دهد — این یک باگ نیست،
// اما چون در پنل قدیم به‌سادگی قابل تشخیص نبود، در تسک ۵ یک تذکر واضح هم به فرم
// ایجاد/ویرایش پست (src/app/admin/blog/[id]/page.tsx) اضافه شد تا دیگر کسی گیج نشود.

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Calendar, ArrowRight, Tag } from "lucide-react";
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

// 🆕 تسک ۵: قبلاً پاراگراف‌ها فقط با یک خط کاملاً خالی (Enter دوبار) از هم جدا
// می‌شدند. خیلی از نویسنده‌های غیرفنی عادت دارند بین هر پاراگراف فقط یک بار Enter
// بزنند؛ در آن حالت قبلی، کل متن به‌صورت یک بلوک بزرگ و فشرده (بدون فاصله‌ی
// پاراگراف‌بندی) نمایش داده می‌شد که همان «نمایش نامناسب» گزارش‌شده بود.
// منطق جدید: اول تلاش می‌کند با خط خالی جدا کند (روش استاندارد و ترجیحی)؛
// اگر متن اصلاً خط خالی نداشت (یعنی نویسنده فقط Enter تکی زده)، هر خط را خودش
// یک پاراگراف مستقل در نظر می‌گیرد تا فاصله‌گذاری بصری درست باشد.
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
        <div className="relative w-full h-56 md:h-96 rounded-2xl md:rounded-[2rem] overflow-hidden mb-8 bg-slate-100">
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