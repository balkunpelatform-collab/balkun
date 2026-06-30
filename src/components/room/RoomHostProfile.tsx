import Image from "next/image";
import { Star, ShieldCheck, Award } from "lucide-react";

interface RoomHostProfileProps {
  hostName: string;
  hostAvatar?: string;
  rating: number | null;
}

export default function RoomHostProfile({ hostName, hostAvatar, rating }: RoomHostProfileProps) {
  return (
    <div className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
      <div className="flex items-center gap-4">
        <div className="relative w-14 h-14 rounded-full overflow-hidden bg-slate-100 border-2 border-white shadow-md flex items-center justify-center shrink-0">
          {hostAvatar ? (
            <Image src={hostAvatar} alt={hostName} fill className="object-cover" />
          ) : (
            <span className="text-xl font-black text-slate-300">{hostName.charAt(0)}</span>
          )}
        </div>
        
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-slate-400">میزبان شما</span>
          <h3 className="text-base font-black text-balkun-navy flex items-center gap-1.5">
            {hostName}
            <ShieldCheck className="w-4 h-4 text-balkun-cyan" />
          </h3>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        {rating ? (
          <>
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 fill-balkun-yellow stroke-balkun-yellow" />
              <span className="text-lg font-black text-slate-700 pt-1">{rating}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400">امتیاز مهمانان</span>
          </>
        ) : (
          <div className="flex items-center gap-1 text-slate-400">
            <Award className="w-5 h-5" />
            <span className="text-xs font-bold">میزبان جدید</span>
          </div>
        )}
      </div>
    </div>
  );
}