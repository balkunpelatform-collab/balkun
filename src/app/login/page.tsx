// مسیر: src/app/login/page.tsx
// این فایل را به‌طور کامل جایگزین فایل فعلی کنید

// 🟢 رفع باگ: قبلاً پس از ورود موفق، کاربر همیشه به «/» فرستاده می‌شد؛ حتی
// وقتی میدلور او را از یک صفحه محافظت‌شده (مثلاً /admin) با پارامتر
// ?redirect=/admin به این صفحه هدایت کرده بود. یعنی کاربر مجبور بود بعد از
// ورود، دوباره دستی به آدرس مقصد برود. از این پس این پارامتر خوانده و
// معتبرسنجی می‌شود تا کاربر دقیقاً به همان مسیری که قصد داشت بازگردد.

"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Phone, ShieldCheck, User as UserIcon } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

type AuthStep = "PHONE_INPUT" | "OTP_INPUT" | "REGISTER_INFO";

// امنیت: مقدار redirect مستقیماً از URL خوانده می‌شود، پس نباید بدون بررسی
// به آن اعتماد کرد (جلوگیری از Open Redirect). فقط مسیرهای داخلی و نسبی
// (شروع‌شونده با یک "/" ساده، نه "//" که می‌تواند به دامنه دیگری اشاره کند) مجازند.
function getSafeRedirectPath(rawRedirect: string | null): string {
  if (!rawRedirect) return "/";
  if (!rawRedirect.startsWith("/") || rawRedirect.startsWith("//")) return "/";
  return rawRedirect;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();

  const safeRedirect = getSafeRedirectPath(searchParams.get("redirect"));

  const [step, setStep] = useState<AuthStep>("PHONE_INPUT");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const phoneRegex = /^09[0-9]{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setError("لطفا یک شماره موبایل معتبر وارد کنید (مثال: 09123456789)");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("OTP_INPUT");
      } else {
        setError(data.error || "خطا در ارسال پیامک");
      }
    } catch (err) {
      setError("خطا در برقراری ارتباط با سرور");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // 🟢 اصلاح شد: کد تولیدشده در otpService.ts شش رقمی است (نه چهار رقمی)
    if (otp.length !== 6) {
      setError("کد تایید باید ۶ رقم باشد");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, otp }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.isNewUser) {
          setStep("REGISTER_INFO"); // کاربر جدیده، بره فرم ثبت‌نام
        } else {
          login(data.user, data.token); // کاربر قدیمیه، لاگین شد
          router.push(safeRedirect); // 🟢 بازگشت به مسیری که کاربر قصد داشت (نه همیشه صفحه اصلی)
        }
      } else {
        setError(data.error || "کد وارد شده نامعتبر است");
      }
    } catch (err) {
      setError("خطا در بررسی کد تایید");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (firstName.length < 2 || lastName.length < 2) {
      setError("لطفا نام و نام خانوادگی خود را به درستی وارد کنید");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 🟢 ارسال otp همراه با اطلاعات ثبت‌نام، تا سرور بتواند مرحله تایید را
        // به‌صورت مستقل و امن دوباره بررسی کند.
        body: JSON.stringify({ phoneNumber, otp, firstName, lastName }),
      });
      const data = await res.json();

      if (data.success) {
        login(data.user, data.token);
        router.push(safeRedirect); // 🟢 بازگشت به مسیری که کاربر قصد داشت (نه همیشه صفحه اصلی)
      } else {
        setError(data.error || "خطا در ثبت نام");
      }
    } catch (err) {
      setError("خطا در ثبت اطلاعات");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <div className="hidden md:flex flex-1 relative bg-balkun-navy flex-col justify-center items-center p-12 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
          <Image src="/hero1.webp" alt="پس زمینه" fill className="object-cover" />
          <div className="absolute inset-0 bg-balkun-navy/80 mix-blend-multiply"></div>
        </div>
        <div className="relative z-10 text-center max-w-md">
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center p-4 mx-auto mb-8 shadow-2xl shadow-black/20">
            <Image src="/logo.png" alt="بالکن" width={100} height={100} className="object-contain" />
          </div>
          <h2 className="text-3xl font-black text-white mb-4 leading-tight">به بالکن خوش آمدید</h2>
          <p className="text-slate-300 text-lg leading-relaxed font-medium">سریع، امن و لوکس. با ورود به حساب کاربری، تجربه‌ای متفاوت از رزرو اقامتگاه را آغاز کنید.</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center p-6 bg-white md:rounded-l-3xl shadow-[-20px_0_40px_rgba(0,0,0,0.02)] relative z-10">
        <Link href="/" className="absolute top-6 right-6 p-2 text-slate-400 hover:text-balkun-navy transition-colors bg-slate-50 rounded-full">
          <ArrowRight className="w-6 h-6" />
        </Link>

        <div className="w-full max-w-sm flex flex-col items-center">
          <div className="md:hidden w-20 h-20 bg-white border border-slate-100 rounded-2xl flex items-center justify-center p-2 mb-8 shadow-sm">
            <Image src="/logo.png" alt="بالکن" width={60} height={60} className="object-contain" />
          </div>

          <div className="w-full text-right mb-8">
            <h1 className="text-2xl font-black text-balkun-navy mb-2">
              {step === "PHONE_INPUT" && "ورود یا ثبت‌نام"}
              {step === "OTP_INPUT" && "کد تایید"}
              {step === "REGISTER_INFO" && "تکمیل اطلاعات"}
            </h1>
            <p className="text-sm font-medium text-slate-500">
              {step === "PHONE_INPUT" && "برای ادامه، شماره موبایل خود را وارد کنید."}
              {/* 🟢 اصلاح شد: ۶ رقمی */}
              {step === "OTP_INPUT" && `کد ۶ رقمی پیامک شده به ${phoneNumber} را وارد کنید.`}
              {step === "REGISTER_INFO" && "به بالکن خوش آمدید! لطفا اطلاعات خود را تکمیل کنید."}
            </p>
          </div>

          {error && (
            <div className="w-full bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold mb-6 text-right">
              {error}
            </div>
          )}

          {step === "PHONE_INPUT" && (
            <form onSubmit={handlePhoneSubmit} className="w-full">
              <div className="relative mb-6">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <Phone className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="09123456789"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={11}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-4 pr-12 pl-4 text-left font-bold text-lg focus:outline-none focus:ring-2 focus:ring-balkun-cyan/50 focus:border-balkun-cyan transition-all"
                  autoFocus
                />
              </div>
              <button disabled={isLoading || phoneNumber.length !== 11} type="submit" className="w-full bg-balkun-orange hover:bg-balkun-orange-dark text-white rounded-2xl py-4 font-bold text-lg transition-all duration-300 shadow-lg shadow-balkun-orange/30 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                {isLoading ? <span className="animate-pulse">در حال بررسی...</span> : "مرحله بعد"}
              </button>
            </form>
          )}

          {step === "OTP_INPUT" && (
            <form onSubmit={handleOtpSubmit} className="w-full">
              <div className="relative mb-6">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <ShieldCheck className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="کد ۶ رقمی"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={6}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-4 pr-12 pl-4 text-center tracking-[0.5em] font-black text-2xl focus:outline-none focus:ring-2 focus:ring-balkun-cyan/50 focus:border-balkun-cyan transition-all"
                  autoFocus
                />
              </div>
              <button disabled={isLoading || otp.length !== 6} type="submit" className="w-full bg-balkun-orange hover:bg-balkun-orange-dark text-white rounded-2xl py-4 font-bold text-lg transition-all duration-300 shadow-lg shadow-balkun-orange/30 disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? <span className="animate-pulse">کمی صبر کنید...</span> : "تایید و ورود"}
              </button>
              <button type="button" onClick={() => setStep("PHONE_INPUT")} className="w-full mt-4 text-sm font-bold text-slate-500 hover:text-balkun-navy transition-colors">
                اصلاح شماره موبایل
              </button>
            </form>
          )}

          {step === "REGISTER_INFO" && (
            <form onSubmit={handleRegisterSubmit} className="w-full">
              <div className="flex flex-col gap-4 mb-6">
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <UserIcon className="w-5 h-5 text-slate-400" />
                  </div>
                  <input type="text" placeholder="نام" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-4 pr-12 pl-4 text-right font-bold focus:outline-none focus:ring-2 focus:ring-balkun-cyan/50 focus:border-balkun-cyan transition-all" autoFocus />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <UserIcon className="w-5 h-5 text-slate-400" />
                  </div>
                  <input type="text" placeholder="نام خانوادگی" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-4 pr-12 pl-4 text-right font-bold focus:outline-none focus:ring-2 focus:ring-balkun-cyan/50 focus:border-balkun-cyan transition-all" />
                </div>
              </div>
              <button disabled={isLoading} type="submit" className="w-full bg-balkun-orange hover:bg-balkun-orange-dark text-white rounded-2xl py-4 font-bold text-lg transition-all duration-300 shadow-lg shadow-balkun-orange/30 disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? <span className="animate-pulse">در حال ثبت...</span> : "ثبت نام و ورود به بالکن"}
              </button>
            </form>
          )}

          <p className="mt-8 text-xs text-slate-400 font-medium text-center leading-relaxed">
            با ورود و ثبت‌نام در سایت، <Link href="/terms" className="text-balkun-cyan font-bold hover:underline">قوانین و مقررات</Link> بالکن را می‌پذیرم.
          </p>
        </div>
      </div>
    </div>
  );
}

// 🟢 useSearchParams طبق قوانین Next.js App Router باید داخل Suspense باشد
// (وگرنه در زمان Build با خطای پری‌رندر مواجه می‌شویم).
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}