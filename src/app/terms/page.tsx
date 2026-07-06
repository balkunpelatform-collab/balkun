// مسیر: src/app/terms/page.tsx
//
// ⚠️ نکته‌ی مهم: متن این صفحه یک پیش‌نویس استاندارد برای پلتفرم رزرو اقامتگاه است
// تا مشکل ۴۰۴ رفع شود و ساختار صفحه آماده باشد. پیش از انتشار نهایی روی سایت،
// حتماً باید توسط یک مشاور حقوقی بازبینی و در صورت نیاز اصلاح شود.

import { ScrollText } from "lucide-react";
import { COMPANY_INFO } from "@/constants/company";

const SECTIONS = [
  {
    title: "۱. تعاریف",
    body: "«بالکن» به پلتفرم آنلاین رزرو اقامتگاه اطلاق می‌شود که امکان جست‌وجو، مقایسه و رزرو انواع اقامتگاه (ویلا، کلبه، سوییت و موارد مشابه) را برای «کاربر» فراهم می‌کند. «میزبان» به مالک یا مدیر اقامتگاه ارائه‌شده در پلتفرم گفته می‌شود.",
  },
  {
    title: "۲. نحوه‌ی رزرو و پرداخت",
    body: "رزرو در بالکن پس از تکمیل اطلاعات مسافر و پرداخت آنلاین مبلغ اقامت نهایی می‌شود. مبلغ نمایش داده‌شده در هر مرحله از رزرو، شامل تمام هزینه‌های قابل پرداخت توسط کاربر است و پس از تایید پرداخت، کد رزرو برای کاربر صادر می‌شود.",
  },
  {
    title: "۳. لغو رزرو و بازگشت وجه",
    body: "قوانین لغو رزرو (مهلت لغو رایگان، جریمه‌ی احتمالی لغو دیرهنگام و زمان بازگشت وجه به کیف پول یا حساب کاربر) بر اساس نوع اقامتگاه و در صفحه‌ی هر رزرو به‌صورت شفاف اعلام می‌شود. در صورت لغو رزرو از سمت میزبان، مبلغ پرداختی به‌طور کامل به کاربر بازگردانده می‌شود.",
  },
  {
    title: "۴. مسئولیت‌های کاربر",
    body: "کاربر متعهد است اطلاعات هویتی صحیح ارائه دهد، در بازه‌ی زمانی رزروشده در اقامتگاه حضور یابد و قوانین داخلی هر اقامتگاه (اعلام‌شده در صفحه‌ی محصول) را رعایت کند. هرگونه خسارت وارده به اقامتگاه در طول اقامت، بر عهده‌ی کاربر رزروکننده است.",
  },
  {
    title: "۵. مسئولیت‌های بالکن",
    body: "بالکن تلاش می‌کند صحت اطلاعات اقامتگاه‌های منتشرشده را پیش از انتشار بررسی کند، اما نقش واسط میان کاربر و میزبان را ایفا می‌کند. در صورت بروز مغایرت میان اطلاعات اعلام‌شده و وضعیت واقعی اقامتگاه، کاربر می‌تواند از طریق بخش پشتیبانی موضوع را پیگیری کند.",
  },
  {
    title: "۶. حریم خصوصی",
    body: "اطلاعات هویتی و تماس کاربران صرفاً برای فرآیند رزرو، ارتباط پشتیبانی و الزامات قانونی نگهداری می‌شود و در اختیار اشخاص ثالث (به‌جز میزبان مربوط به هر رزرو) قرار نمی‌گیرد.",
  },
  {
    title: "۷. تغییر قوانین",
    body: "بالکن این حق را دارد که در هر زمان قوانین و مقررات استفاده از پلتفرم را به‌روزرسانی کند. تغییرات از تاریخ انتشار در همین صفحه لازم‌الاجرا خواهد بود.",
  },
  {
    title: "۸. ارتباط با ما",
    body: `در صورت هرگونه سوال درباره‌ی این قوانین می‌توانید از طریق ایمیل ${COMPANY_INFO.email} یا شماره تماس ${COMPANY_INFO.phone} با تیم بالکن در ارتباط باشید.`,
  },
];

export const metadata = {
  title: `قوانین و مقررات | ${COMPANY_INFO.name}`,
  description: "قوانین و مقررات استفاده از پلتفرم بالکن",
};

export default function TermsPage() {
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
            قوانین و مقررات
          </h1>
          <p className="text-slate-300 text-sm md:text-base max-w-xl leading-loose font-medium">
            لطفاً پیش از رزرو، قوانین زیر را با دقت مطالعه کنید.
          </p>
        </div>
      </section>

      {/* بدنه‌ی قوانین */}
      <section className="container mx-auto px-4 py-12 md:py-16 max-w-3xl">
        <div className="flex flex-col gap-4">
          {SECTIONS.map((section) => (
            <div
              key={section.title}
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