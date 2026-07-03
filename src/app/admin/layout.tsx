"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    // با استفاده از fixed inset-0 و z-100 تمام اجزای سایت اصلی (هدر و فوتر) رو زیر این لایه مخفی می‌کنیم
    <div className="fixed inset-0 z-[100] bg-slate-50 flex overflow-hidden dir-rtl font-sans text-slate-900">
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-72 shrink-0 h-full shadow-2xl z-20">
        <AdminSidebar />
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-4/5 max-w-sm h-full bg-balkun-navy shadow-2xl flex flex-col animate-in slide-in-from-right">
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-6 left-6 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-50"
            >
              <X className="w-5 h-5" />
            </button>
            <AdminSidebar onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Mobile Topbar */}
        <div className="md:hidden h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 z-10">
          <span className="font-black text-balkun-navy">پنل مدیریت بالکن</span>
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 bg-slate-100 rounded-xl text-slate-700 hover:bg-slate-200"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}