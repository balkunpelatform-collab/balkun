import Link from "next/link";
import Image from "next/image";
import { User, Menu, Bell } from "lucide-react";
import { HEADER_LINKS } from "@/constants/navigation";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        <div className="flex-1 flex items-center justify-start gap-4">
          <button className="md:hidden p-2 -mr-2 text-slate-700 hover:text-balkun-cyan transition-colors">
            <Menu className="w-6 h-6" />
          </button>
          
          <nav className="hidden md:flex items-center gap-6">
            {HEADER_LINKS.map((link) => (
              <Link 
                key={link.href} 
                href={link.href} 
                className="text-slate-700 hover:text-balkun-cyan transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Center: Logo (بزرگتر شد و متن حذف شد) */}
        <div className="flex-1 flex items-center justify-center">
          <Link href="/" className="flex items-center group">
            <div className="relative w-14 h-14 md:w-16 md:h-16 transition-transform duration-300 group-hover:scale-105">
              <Image 
                src="/logo.png" 
                alt="لوگوی بالکن" 
                fill
                className="object-contain"
                sizes="64px"
                priority
              />
            </div>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-end gap-3">
          <button className="relative p-2 text-slate-700 hover:text-balkun-cyan transition-colors">
            <Bell className="w-6 h-6" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-balkun-orange rounded-full border-2 border-white"></span>
          </button>

          <Link 
            href="/login" 
            className="hidden sm:flex items-center gap-2 bg-balkun-cyan hover:bg-balkun-cyan-dark text-white px-4 py-2 rounded-xl transition-all duration-300 font-medium text-sm shadow-md shadow-balkun-cyan/20"
          >
            <User className="w-4 h-4" />
            <span>ورود / ثبت‌نام</span>
          </Link>
        </div>

      </div>
    </header>
  );
}