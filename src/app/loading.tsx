import { Loader2 } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="min-h-[70vh] w-full flex flex-col items-center justify-center gap-4 p-4">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-balkun-cyan/15"></div>
        <Loader2 className="w-16 h-16 text-balkun-cyan animate-spin" strokeWidth={2.5} />
      </div>
      <span className="font-bold text-slate-400 text-sm">در حال بارگذاری بالکن...</span>
    </div>
  );
}