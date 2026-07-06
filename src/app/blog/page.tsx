// مسیر: src/app/blog/page.tsx
// صفحه‌ی عمومی لیست بلاگ — Server Component؛ مستقیماً از blogService پست‌های
// منتشرشده را می‌خواند، دقیقاً هم‌الگو با src/app/search/page.tsx.

import Link from "next/link";
import Image from "next/image";
import { Calendar, ArrowLeft } from "lucide-react";
import { getPublishedPosts } from "@/lib/blog/blogService";
import { BLOG_CATEGORIES, getBlogCategoryLabel } from "@/constants/blogCategories";
import { COMPANY_INFO } from "@/constants/company";

export const metadata = {
  title: `بلاگ ${COMPANY_INFO.name}`,
  description: "مقالات، راهنماها و اخبار سفر و اقامتگاه از تیم بالکن.",
};

function formatJalaliDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
  } catch {
    return "";
  }
}

interface BlogPageProps {
  searchParams: Promise<{ page?: string; category?: string }>;
}

export default async function BlogListPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;
  const category = params.category || "";

  const { posts, total, pageSize } = await getPublishedPosts({ page, category: category || undefined });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <div className="flex flex-col items-center text-center gap-3 mb-10">
        <h1 className="text-2xl md:text-4xl font-black text-balkun-navy">بلاگ بالکن</h1>
        <p className="text-slate-500 font-medium max-w-xl">مقالات، راهنماهای سفر و اخبار تازه از تیم بالکن</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
        <Link
          href="/blog"
          className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${!category ? "bg-balkun-cyan text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          همه مطالب
        </Link>
        {BLOG_CATEGORIES.map((c) => (
          <Link
            key={c.id}
            href={`/blog?category=${c.id}`}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${category === c.id ? "bg-balkun-cyan text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20 text-slate-500 font-bold">
          هنوز مطلبی در این بخش منتشر نشده است.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-lg transition-shadow overflow-hidden flex flex-col"
            >
              <div className="relative w-full h-48 bg-slate-100">
                <Image
                  src={post.coverImage || "/hero1.webp"}
                  alt={post.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, 400px"
                />
                <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-balkun-navy text-[11px] font-bold px-3 py-1 rounded-full">
                  {getBlogCategoryLabel(post.category)}
                </span>
              </div>
              <div className="p-5 flex flex-col gap-2 flex-1">
                <h2 className="font-black text-balkun-navy text-base leading-snug line-clamp-2">{post.title}</h2>
                <p className="text-sm text-slate-500 font-medium line-clamp-2 flex-1">{post.excerpt}</p>
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-50">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                    <Calendar className="w-3.5 h-3.5" />
                    {post.publishedAt ? formatJalaliDate(post.publishedAt as string) : ""}
                  </div>
                  <span className="flex items-center gap-1 text-balkun-cyan text-xs font-bold">
                    ادامه مطلب <ArrowLeft className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/blog?page=${p}${category ? `&category=${category}` : ""}`}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold ${p === page ? "bg-balkun-cyan text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}