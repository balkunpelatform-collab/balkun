// مسیر: src/app/terms/page.tsx
//
// 🆕 تسک ۱.۷ — این نسخه بر اساس بررسی متن قوانین و مقررات چند پلتفرم مشابه
// (از جمله Airbnb و جاباما) و منطق واقعی پیاده‌سازی‌شده در کد بالکن (فرآیند
// رزرو، کیف پول، سیاست لغو) نوشته و تکمیل شده است.
//
// ⚠️ با این حال، این متن هم‌چنان یک پیش‌نویس فنی است، نه مشاوره‌ی حقوقی.
// پیش از انتشار نهایی روی سایت، توصیه‌ی اکید می‌شود توسط یک وکیل یا مشاور
// حقوقی (به‌خصوص برای بندهای بازگشت وجه، مسئولیت میزبان/بالکن، حریم خصوصی
// و قانون حاکم) بررسی و در صورت نیاز اصلاح شود.
//
// 🆕 تسک ۱۴ چک‌لیست کارفرما (امکان ویرایش متن «قوانین و مقررات» توسط مدیر ارشد):
// عنوان/توضیح بنر بالای صفحه و تک‌تک بندهای قوانین دیگر هاردکد نیستند و از جدول
// site_content (کلید "terms") خوانده می‌شوند — دقیقاً هم‌الگو با صفحه‌ی درباره‌ما
// (تسک ۱۳، src/app/about/page.tsx). به همین دلیل این صفحه هم صراحتاً force-dynamic
// شد تا وقتی مدیر ارشد از پنل (/admin/site-content/terms) متن را تغییر می‌دهد، بدون
// نیاز به دیپلوی یا ری‌بیلد جدید، بلافاصله روی سایت دیده شود. آیکون بنر (ScrollText)
// طبق متن دقیق تسک، همچنان ثابت است — فقط «متن» صفحه (و تعداد/ترتیب بندها) قابل
// ویرایش شد.

import { ScrollText } from "lucide-react";
import { COMPANY_INFO } from "@/constants/company";
import { getTermsPageContent } from "@/lib/siteContent/siteContentService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
  return {
    title: `قوانین و مقررات | ${COMPANY_INFO.name}`,
    description: "قوانین و مقررات استفاده از پلتفرم بالکن",
  };
}

export default async function TermsPage() {
  const content = await getTermsPageContent();

  return (
    <div className="flex flex-col w-full">
      {/* بخش بنر بالای صفحه */}
      <section className="relative w-full bg-balkun-navy overflow-hidden rounded-b-[2.5rem] md:rounded-b-[4rem]">
        <div className="absolute -top-16 -left-16 w-72 h-72 bg-balkun-cyan/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-balkun-orange/10 rounded-full blur-[110px] pointer-events-none"></div>

        <div className="relative z-10 container mx-auto px-4 py-16 md:py-20 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-balkun-yellow/15 border border-balkun-yellow/30 flex items-center justify-center mb-6">
            <ScrollText className="w-8 h-8 text-balkun-yellow" />
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-white mb-4 leading-tight max-w-2xl">
            {content.heroTitle}
          </h1>
          <p className="text-slate-300 text-sm md:text-base max-w-xl leading-loose font-medium">
            {content.heroDescription}
          </p>
        </div>
      </section>

      {/* بدنه‌ی قوانین */}
      <section className="container mx-auto px-4 py-12 md:py-16 max-w-3xl">
        <div className="flex flex-col gap-4">
          {content.sections.map((section, index) => (
            <div
              key={`${index}-${section.title}`}
              className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100"
            >
              <h2 className="font-black text-balkun-navy text-base md:text-lg mb-3">
                {section.title}
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed font-medium text-justify">
                {section.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}