// مسیر مقصد این فایل (فایل جدید): src/components/search/SearchResultsList.tsx

import { SearchX } from "lucide-react";
import SearchResultCard from "./SearchResultCard";
import type { BalkunSearchItem } from "@/lib/otaghak/types";

export default function SearchResultsList({ items }: { items: BalkunSearchItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <SearchX className="w-7 h-7 text-slate-400" />
        </div>
        <p className="text-slate-700 font-bold mb-1">اقامتگاهی با این مشخصات پیدا نشد</p>
        <p className="text-sm text-slate-400">مقصد یا تاریخ را تغییر دهید و دوباره امتحان کنید</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {items.map((item) => (
        <SearchResultCard key={item.roomId} item={item} />
      ))}
    </div>
  );
}
