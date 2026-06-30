// مسیر مقصد این فایل (فایل جدید): src/utils/validateNationalCode.ts
//
// اعتبارسنجی کد ملی ایرانی بر اساس الگوریتم رسمی رقم کنترلی.
// این ماژول ایزوله، هم در فرانت‌اند (فیدبک فوری به کاربر در چک‌اوت)
// و هم در بک‌اند (api/booking/create) برای جلوگیری از دستکاری استفاده می‌شود.

export function isValidIranianNationalCode(code: string): boolean {
  if (!/^\d{10}$/.test(code)) return false;

  // کدهای ساختگی مثل 0000000000 یا 1111111111 معتبر نیستند
  if (/^(\d)\1{9}$/.test(code)) return false;

  const digits = code.split("").map(Number);
  const checkDigit = digits[9];

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i);
  }

  const remainder = sum % 11;

  if (remainder < 2) {
    return checkDigit === remainder;
  }
  return checkDigit === 11 - remainder;
}