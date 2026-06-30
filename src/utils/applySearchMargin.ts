// مسیر مقصد این فایل: src/utils/applySearchMargin.ts
//
// این فایل از priceCalculator.ts موجود پروژه استفاده می‌کند و فقط
// منطق «روی کدام فیلدها و کدام آرایه اعمال شود» را اضافه می‌کند.
// طبق الزام فاز ۳ و ۴: این منطق فقط و فقط در سمت سرور اجرا می‌شود.

import { applyBalkunMargin } from "./priceCalculator";
import type { OtaghakRawSearchItem, BalkunSearchItem } from "@/lib/otaghak/types";

export function applySearchMargin(items: OtaghakRawSearchItem[]): BalkunSearchItem[] {
  return items.map((item) => ({
    ...item,
    basePrice: applyBalkunMargin(item.basePrice),
    afterDiscount: applyBalkunMargin(item.afterDiscount),
  }));
}
