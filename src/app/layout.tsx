import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";

// Import Layout Modules
import Header from "@/components/layout/header/Header";
import Footer from "@/components/layout/footer/Footer";
import BottomNav from "@/components/layout/bottom-nav/BottomNav";

// تنظیمات فونت وزیرمتن و تعریف آن به عنوان متغیر CSS
const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-vazirmatn",
});

export const metadata: Metadata = {
  title: "بالکن | رزرو آنلاین اقامتگاه و خدمات گردشگری",
  description: "سامانه جامع رزرو اقامتگاه، ویلا، کلبه و خدمات گردشگری در سراسر ایران",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable}`}>
      <body className="font-sans min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased selection:bg-coral-500 selection:text-white pb-16 md:pb-0">
        <Header />
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}