import { MapPin, CalendarDays, User, Search } from "lucide-react";
import { HERO_CONTENT } from "@/constants/home";

export default function FloatingSearchBox() {
  return (
    <div className="relative z-20 container mx-auto px-4 -mt-24 md:-mt-20 mb-8 max-w-5xl">
      <div className="bg-white rounded-[2rem] shadow-2xl shadow-balkun-navy/10 border border-slate-100 p-4 md:p-6">
        
        <div className="flex flex-col md:flex-row items-center justify-between mb-4 bg-slate-50 md:bg-transparent rounded-2xl md:rounded-none p-2 md:p-0">
          
          <div className="flex-1 w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors rounded-xl cursor-pointer md:border-l border-slate-200">
            <div className="p-2 bg-balkun-cyan/10 rounded-full text-balkun-cyan">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-[11px] font-bold text-slate-400 mb-0.5">مقصد</span>
              <input 
                type="text" 
                readOnly
                placeholder="انتخاب مقصد"
                className="w-full bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-900 placeholder:font-bold font-medium cursor-pointer"
              />
            </div>
          </div>

          <div className="w-full h-[1px] md:hidden bg-slate-200 my-1"></div>

          <div className="flex-[1.2] w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors rounded-xl cursor-pointer md:border-l border-slate-200">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-0.5">
                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-400">تاریخ ورود</span>
              </div>
              <span className="text-sm font-bold text-slate-900 pr-5">انتخاب تاریخ</span>
            </div>
            
            <div className="w-[1px] h-8 bg-slate-200 mx-2"></div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-0.5">
                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-400">تاریخ خروج</span>
              </div>
              <span className="text-sm font-bold text-slate-900 pr-5">انتخاب تاریخ</span>
            </div>
          </div>

          <div className="w-full h-[1px] md:hidden bg-slate-200 my-1"></div>

          <div className="flex-1 w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors rounded-xl cursor-pointer">
            <div className="p-2 text-slate-400">
              <User className="w-5 h-5" />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-[11px] font-bold text-slate-400 mb-0.5">تعداد مسافران</span>
              <span className="text-sm font-bold text-slate-900">انتخاب کنید</span>
            </div>
          </div>

        </div>

        {/* استفاده از رنگ نارنجی برای ایجاد اکشن جذاب در صفحه */}
        <button className="h-[52px] w-full bg-balkun-orange hover:bg-balkun-orange-dark text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-balkun-orange/30 hover:shadow-balkun-orange/50 hover:-translate-y-0.5">
          <Search className="w-5 h-5" />
          <span className="text-lg">{HERO_CONTENT.searchButtonText}</span>
        </button>

      </div>
    </div>
  );
}