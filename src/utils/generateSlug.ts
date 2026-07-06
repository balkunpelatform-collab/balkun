// مسیر: src/utils/generateSlug.ts
// تولید اسلاگ (آدرس اینترنتی) از روی عنوان فارسی/انگلیسی پست بلاگ.
// حروف فارسی/عربی و انگلیسی و اعداد نگه داشته می‌شوند، فاصله‌ها به خط تیره تبدیل
// و بقیه کاراکترهای خاص حذف می‌شوند.

export function generateSlugFromTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}