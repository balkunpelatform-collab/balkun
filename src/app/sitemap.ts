import { MetadataRoute } from 'next';
import { getAllPublishedSlugsForSitemap } from '@/lib/blog/blogService';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://balkun.com';

  const mockRoomIds = ["1", "2", "3", "4", "5", "1001", "1002"];

  const roomUrls = mockRoomIds.map((id) => ({
    url: `${baseUrl}/rooms/${id}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  // 🆕 فاز ۱۱ / بخش ۴: پست‌های منتشرشده‌ی بلاگ هم به نقشه سایت اضافه می‌شوند
  const blogPosts = await getAllPublishedSlugsForSitemap();
  const blogUrls = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/corporate`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    ...roomUrls,
    ...blogUrls,
  ];
}