// مسیر: src/components/layout/footer/Footer.tsx
// این فایل را به‌طور کامل جایگزین فایل فعلی کنید
// 🆕 تسک ۱۶: شماره تلفن بالکن اکنون قابل کلیک است — با کلیک روی آن (به‌خصوص
// روی موبایل)، اپلیکیشن تماس گوشی مستقیماً باز می‌شود (لینک tel:).
// مقدار COMPANY_INFO.phone از قبل فقط رقم است (بدون فاصله/خط‌تیره)، پس همان
// مقدار مستقیماً در href="tel:..." استفاده شده است.
//
// 🐛→✅ تسک ۲۴: رفع باگ صدور ووچر PDF از صفحه سایت
// ریشه‌ی باگ: صفحه‌ی ووچر داخل Layout اصلی سایت رندر می‌شود، پس فوتر همیشه
// پایین صفحه‌ی ووچر هم هست. دقیقاً همین باکس «دسترسی سریع» (شامل لینک‌های
// «درباره ما» و «قوانین و مقررات») و بقیه‌ی بخش‌های فوتر بودند که در PDF/برگه‌ی
// چاپ‌شده‌ی ووچر ظاهر می‌شدند، چون تگ <footer> کلاس print:hidden نداشت.
// با اضافه شدن print:hidden، فوتر هنگام چاپ کاملاً از خروجی حذف می‌شود.

import Link from "next/link";
import Image from "next/image";
import { COMPANY_INFO } from "@/constants/company";
import { HEADER_LINKS } from "@/constants/navigation";
import { MapPin, Phone, Mail, ArrowUpLeft, Code2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="print:hidden relative bg-[#030712] text-slate-300 pt-16 pb-28 md:pb-12 mt-24 overflow-hidden rounded-t-[2.5rem] md:rounded-t-[4rem] shadow-[0_-15px_50px_rgba(0,0,0,0.3)] border-t border-white/[0.02]">
      
      {/* Subtle top glow line - matching the cyan vibe */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-balkun-cyan/40 to-transparent z-10"></div>

      {/* Subtle Wave Background for the ENTIRE footer */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full">
          <path fill="#ffffff" d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,144C672,139,768,181,864,197.3C960,213,1056,203,1152,176C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          <path fill="#ffffff" fillOpacity="0.5" d="M0,256L48,245.3C96,235,192,213,288,218.7C384,224,480,256,576,256C672,256,768,224,864,213.3C960,203,1056,213,1152,229.3C1248,245,1344,267,1392,277.3L1440,288L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        
        {/* Bento Box Grid System */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
          
          {/* Box 1: Brand, Slogan & Description (Span 5) */}
          <div className="md:col-span-12 lg:col-span-5 bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 md:p-10 relative overflow-hidden group hover:border-balkun-cyan/20 transition-colors duration-500 flex flex-col items-start">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-balkun-cyan/10 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            
            <div className="relative w-32 h-32 mb-6 bg-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.08)] border-4 border-white/10 overflow-hidden">
              <Image 
                src="/logo-footer.png" 
                alt="لوگوی بالکن" 
                fill
                className="object-contain p-1"
                sizes="128px"
              />
            </div>

            <h3 className="text-lg md:text-xl font-black text-balkun-yellow mb-5 tracking-tight relative z-10 drop-shadow-sm">
              جامع ترین پلتفرم گردشگری کشور
            </h3>

            <p className="text-sm leading-loose text-slate-400 text-justify relative z-10 font-medium border-r-2 border-balkun-yellow/30 pr-3">
              {COMPANY_INFO.description}
            </p>
          </div>
          
          {/* Box 2: Quick Links (Span 3) */}
          <div className="md:col-span-6 lg:col-span-3 bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 md:p-10 flex flex-col hover:border-white/10 transition-colors duration-500 relative overflow-hidden group">
            <div className="absolute inset-0 bg-balkun-yellow/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none blur-[50px]"></div>

            <h4 className="text-sm font-black text-white tracking-widest mb-8 uppercase opacity-80 relative z-10">
              دسترسی سریع
            </h4>
            <ul className="space-y-1 flex-1 flex flex-col justify-between relative z-10">
              {HEADER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="flex items-center justify-between w-full group/link py-2">
                    <span className="text-slate-400 group-hover/link:text-white transition-colors text-sm font-bold">{link.label}</span>
                    <ArrowUpLeft className="w-5 h-5 text-slate-600 group-hover/link:text-balkun-yellow transition-all duration-300 group-hover/link:-translate-y-1 group-hover/link:translate-x-1" />
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/terms" className="flex items-center justify-between w-full group/link py-2 border-t border-white/5 mt-2 pt-4">
                  <span className="text-slate-400 group-hover/link:text-white transition-colors text-sm font-bold">قوانین و مقررات</span>
                  <ArrowUpLeft className="w-5 h-5 text-slate-600 group-hover/link:text-balkun-yellow transition-all duration-300 group-hover/link:-translate-y-1 group-hover/link:translate-x-1" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Box 3: Contact Info (Span 4) */}
          <div className="md:col-span-6 lg:col-span-4 bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 md:p-10 relative overflow-hidden group hover:border-balkun-orange/20 transition-colors duration-500">
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-balkun-orange/10 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            
            <h4 className="text-sm font-black text-white tracking-widest mb-8 uppercase opacity-80 relative z-10">
              ارتباط با ما
            </h4>
            <div className="flex flex-col gap-8 relative z-10">
              
              <div className="flex items-start gap-4 group/item">
                <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/5 group-hover/item:border-balkun-cyan/30 group-hover/item:bg-balkun-cyan/10 transition-colors">
                  <MapPin className="w-5 h-5 text-slate-400 group-hover/item:text-balkun-cyan transition-colors" />
                </div>
                <span className="leading-relaxed font-medium text-sm text-slate-400 mt-1">{COMPANY_INFO.address}</span>
              </div>

              {/* 🆕 تسک ۱۶: شماره تلفن اکنون یک لینک tel: است تا با کلیک/لمس، مستقیم تماس گرفته شود */}
              <a
                href={`tel:${COMPANY_INFO.phone}`}
                className="flex items-center gap-4 group/item"
                aria-label={`تماس با بالکن: ${COMPANY_INFO.phone}`}
              >
                <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/5 group-hover/item:border-balkun-orange/30 group-hover/item:bg-balkun-orange/10 transition-colors">
                  <Phone className="w-5 h-5 text-slate-400 group-hover/item:text-balkun-orange transition-colors" />
                </div>
                <span dir="ltr" className="font-black text-white tracking-widest text-lg group-hover/item:text-balkun-orange transition-colors">
                  {COMPANY_INFO.phone}
                </span>
              </a>

              <div className="flex items-center gap-4 group/item">
                <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/5 group-hover/item:border-balkun-yellow/30 group-hover/item:bg-balkun-yellow/10 transition-colors">
                  <Mail className="w-5 h-5 text-slate-400 group-hover/item:text-balkun-yellow transition-colors" />
                </div>
                <span className="font-medium text-sm text-slate-400">{COMPANY_INFO.email}</span>
              </div>

            </div>
          </div>

        </div>
        
        {/* Modern Minimal Copyright Bar with KiyaDev Signature */}
        <div className="mt-4 bg-white/[0.02] border border-white/[0.05] rounded-[1.5rem] px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
          
          <p className="text-xs font-bold text-slate-500">
            © {COMPANY_INFO.copyrightYear} <span className="text-white">Balkun</span>. تمامی حقوق محفوظ است.
          </p>
          
          {/* --- امضای پرمیوم تاریک کیا دِو (KiyaDev Signature) --- */}
          <a 
            href="https://kiyadev.ir" 
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-balkun-cyan/30 px-5 py-2.5 rounded-2xl transition-all duration-500"
          >
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 font-medium group-hover:text-slate-400 transition-colors">
                طراحی و مهندسی توسط
              </span>
              <span className="text-xs font-black text-slate-300 group-hover:text-white flex items-center gap-1.5 transition-colors">
                KiyaDev Team
                <Code2 className="h-3.5 w-3.5 text-balkun-cyan group-hover:animate-pulse shadow-balkun-cyan" />
              </span>
            </div>
            
            <div className="h-9 w-9 bg-white/[0.05] group-hover:bg-balkun-cyan/10 rounded-xl flex items-center justify-center shadow-sm transition-colors duration-500 border border-white/[0.02] group-hover:border-balkun-cyan/20">
               <Code2 className="h-4.5 w-4.5 text-slate-400 group-hover:text-balkun-cyan" />
            </div>
          </a>
          {/* -------------------------------------- */}

        </div>

      </div>
    </footer>
  );
}