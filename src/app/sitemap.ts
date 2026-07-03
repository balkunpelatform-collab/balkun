import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://balkun.com';

  // در حالت واقعی، اینجا باید لیست تمام ID اقامتگاه‌ها را از دیتابیس/API بگیریم
  // فعلاً چند ID نمونه (Mock) برای ایندکس اولیه قرار می‌دهیم
  const mockRoomIds = ["1", "2", "3", "4", "5", "1001", "1002"];

  const roomUrls = mockRoomIds.map((id) => ({
    url: `${baseUrl}/rooms/${id}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
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
    ...roomUrls,
  ];
}