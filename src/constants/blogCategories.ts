// مسیر: src/constants/blogCategories.ts
// دسته‌بندی‌های ثابت بلاگ بالکن — هم در فرم ادمین و هم در فیلتر صفحه عمومی بلاگ استفاده می‌شود.

export const BLOG_CATEGORIES = [
  { id: "travel-tips", label: "نکات و راهنمای سفر" },
  { id: "destinations", label: "معرفی مقاصد گردشگری" },
  { id: "hosting", label: "میزبانی و اقامتگاه‌داری" },
  { id: "guides", label: "راهنمای رزرو و استفاده از بالکن" },
  { id: "news", label: "اخبار و رویدادهای بالکن" },
];

export function getBlogCategoryLabel(id: string): string {
  return BLOG_CATEGORIES.find((c) => c.id === id)?.label || id;
}