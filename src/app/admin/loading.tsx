import { Loader2 } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="w-full h-[60vh] flex flex-col items-center justify-center">
      <Loader2 className="w-10 h-10 text-balkun-cyan animate-spin mb-4" />
      <span className="font-bold text-slate-500">در حال بارگذاری پنل مدیریت...</span>
    </div>
  );
}