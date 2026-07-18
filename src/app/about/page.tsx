// مسیر: src/app/about/page.tsx
// 🆕 تسک ۱۶: شماره تلفن بالکن در بخش «راه‌های ارتباط با ما» اکنون قابل کلیک است
// (لینک tel:) — دقیقاً همان اصلاحی که در فوتر سایت هم انجام شد.
//
// 🆕 تسک ۱۳ چک‌لیست کارفرما (امکان ویرایش متن «درباره ما» توسط مدیر ارشد): متن
// بنر بالای صفحه و متن سه کارت بخش «چرا بالکن؟» دیگر هاردکد نیستند و از جدول
// site_content (کلید "about") خوانده می‌شوند — دقیقاً هم‌الگو با صفحه‌ی اصلی سایت
// که بعد از تسک ۱۸ چک‌لیست کارفرما، بنرها را زنده از دیتابیس می‌خواند
// (src/app/page.tsx). به همین دلیل این صفحه هم صراحتاً force-dynamic شد تا وقتی
// مدیر ارشد از پنل (/admin/site-content/about) متن را تغییر می‌دهد، بدون نیاز به
// دیپلوی یا ری‌بیلد جدید، بلافاصله روی سایت دیده شود. آیکون هر کارت (ShieldCheck/
// HeartHandshake/Sparkles) و بخش «راه‌های ارتباط با ما» (که از COMPANY_INFO خوانده
// می‌شود) طبق متن دقیق تسک، همچنان ثابت هستند — فقط «متن» صفحه قابل ویرایش شد.

import { Building2, ShieldCheck, HeartHandshake, MapPin, Phone, Mail, Sparkles } from "lucide-react";
import { COMPANY_INFO } from "@/constants/company";
import { getAboutPageContent } from "@/lib/siteContent/siteContentService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ترتیب این آیکون‌ها با ترتیب values[] برگشتی از getAboutPageContent() یکی است
// (کارت اول = ShieldCheck، دوم = HeartHandshake، سوم = Sparkles).
const VALUE_ICONS = [ShieldCheck, HeartHandshake, Sparkles];

export async function generateMetadata() {
  const content = await getAboutPageContent();
  return {
    title: `درباره ما | ${COMPANY_INFO.name}`,
    description: content.heroDescription,
  };
}

export default async function AboutPage() {
  const content = await getAboutPageContent();

  return (
    <div className="flex flex-col w-full">
      {/* بخش بنر بالای صفحه */}
      <section className="relative w-full bg-balkun-navy overflow-hidden rounded-b-[2.5rem] md:rounded-b-[4rem]">
        <div className="absolute -top-16 -left-16 w-72 h-72 bg-balkun-cyan/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-balkun-orange/10 rounded-full blur-[110px] pointer-events-none"></div>

        <div className="relative z-10 container mx-auto px-4 py-16 md:py-24 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-balkun-cyan/15 border border-balkun-cyan/30 flex items-center justify-center mb-6">
            <Building2 className="w-8 h-8 text-balkun-cyan" />
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-white mb-4 leading-tight max-w-2xl">
            {content.heroTitle}
          </h1>
          <p className="text-slate-300 text-sm md:text-base max-w-xl leading-loose font-medium">
            {content.heroDescription}
          </p>
        </div>
      </section>

      {/* چرا بالکن؟ */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <h2 className="text-xl md:text-2xl font-black text-balkun-navy mb-8 text-center">
          {content.valuesSectionTitle}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {content.values.map((value, index) => {
            const Icon = VALUE_ICONS[index] ?? Sparkles;
            return (
              <div
                key={index}
                className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-balkun-cyan/10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-balkun-cyan" />
                </div>
                <h3 className="font-black text-balkun-navy text-lg">{value.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">{value.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* راه‌های ارتباطی */}
      <section className="container mx-auto px-4 pb-16 md:pb-24">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 md:p-10">
          <h2 className="text-lg md:text-xl font-black text-balkun-navy mb-8">راه‌های ارتباط با ما</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-balkun-cyan/10 rounded-2xl shrink-0">
                <MapPin className="w-5 h-5 text-balkun-cyan" />
              </div>
              <span className="text-sm text-slate-500 font-medium leading-relaxed mt-1.5">
                {COMPANY_INFO.address}
              </span>
            </div>

            {/* 🆕 تسک ۱۶: شماره تلفن اکنون یک لینک tel: است تا با کلیک/لمس، مستقیم تماس گرفته شود */}
            <a
              href={`tel:${COMPANY_INFO.phone}`}
              className="flex items-center gap-4 group"
              aria-label={`تماس با بالکن: ${COMPANY_INFO.phone}`}
            >
              <div className="p-3 bg-balkun-orange/10 rounded-2xl shrink-0">
                <Phone className="w-5 h-5 text-balkun-orange" />
              </div>
              <span dir="ltr" className="font-black text-balkun-navy tracking-widest text-lg group-hover:text-balkun-orange transition-colors">
                {COMPANY_INFO.phone}
              </span>
            </a>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-balkun-yellow/10 rounded-2xl shrink-0">
                <Mail className="w-5 h-5 text-balkun-yellow" />
              </div>
              <span className="text-sm text-slate-500 font-medium">{COMPANY_INFO.email}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}