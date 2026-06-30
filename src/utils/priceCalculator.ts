/**
 * بر اساس سند راهبردی بالکن:
 * تمامی قیمت‌ها باید پیش از نمایش به کاربر، در 1.05 ضرب شوند.
 */
export const applyBalkunMargin = (rawPrice: number): number => {
  return Math.ceil(rawPrice * 1.05);
};

/**
 * فرمت کردن عدد به شکل پولی ایران (جداکننده هزارگان)
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("fa-IR").format(price);
};