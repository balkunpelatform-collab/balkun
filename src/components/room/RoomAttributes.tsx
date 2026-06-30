import { Sparkles, CheckCircle2 } from "lucide-react";

interface RoomAttributesProps {
  topAttributes: string[];
  allAttributes: string[];
}

export default function RoomAttributes({ topAttributes, allAttributes }: RoomAttributesProps) {
  if (!allAttributes || allAttributes.length === 0) return null;

  return (
    <div className="flex flex-col gap-6 pt-6 border-t border-slate-100">
      <h3 className="text-lg font-black text-balkun-navy flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-balkun-cyan" />
        امکانات این اقامتگاه
      </h3>

      {/* امکانات ویژه (Top Attributes) به صورت چیپ‌های رنگی */}
      {topAttributes && topAttributes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {topAttributes.map((attr, idx) => (
            <span key={idx} className="bg-balkun-cyan/10 text-balkun-cyan text-xs font-bold px-4 py-2 rounded-xl">
              {attr}
            </span>
          ))}
        </div>
      )}

      {/* لیست کامل امکانات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
        {allAttributes.map((attr, idx) => (
          <div key={idx} className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
            <span className="text-sm font-medium text-slate-600 leading-relaxed">{attr}</span>
          </div>
        ))}
      </div>
    </div>
  );
}