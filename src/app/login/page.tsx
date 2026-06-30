"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Phone, ShieldCheck, User as UserIcon } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import type { User } from "@/types/database";

type AuthStep = "PHONE_INPUT" | "OTP_INPUT" | "REGISTER_INFO";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  
  const [step, setStep] = useState<AuthStep>("PHONE_INPUT");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: بررسی شماره موبایل
  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // اعتبارسنجی ساده شماره ایران
    const phoneRegex = /^09[0-9]{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setError("لطفا یک شماره موبایل معتبر وارد کنید (مثال: 09123456789)");
      return;
    }

    setIsLoading(true);
    // TODO: Connect to real API later
    setTimeout(() => {
      setIsLoading(false);
      setStep("OTP_INPUT");
    }, 1000);
  };

  // Step 2: بررسی کد OTP
  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (otp.length !== 4) {
      setError("کد تایید باید ۴ رقم باشد");
      return;
    }

    setIsLoading(true);
    // TODO: Connect to real API later (Here we simulate a response)
    setTimeout(() => {
      setIsLoading(false);
      // شبیه‌سازی: اگر شماره به 1 ختم بشه کاربر جدیده، در غیر اینصورت لاگین میشه
      if (phoneNumber.endsWith("1")) {
        setStep("REGISTER_INFO");
      } else {
        // لاگین موفقیت آمیز (کاربر قدیمی)
        const mockUser: User = {
          id: "123",
          phoneNumber,
          firstName: "کاربر",
          lastName: "بالکن",
          userType: "NORMAL", // یا ORGANIZATIONAL بر اساس دیتابیس
          organizationName: null,
          joinedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          isActive: true,
        };
        login(mockUser, "mock-jwt-token-12345");
        router.push("/");
      }
    }, 1200);
  };

  // Step 3: ثبت نام کاربر جدید
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (firstName.length < 2 || lastName.length < 2) {
      setError("لطفا نام و نام خانوادگی خود را به درستی وارد کنید");
      return;
    }

    setIsLoading(true);
    // TODO: Connect to real API later
    setTimeout(() => {
      setIsLoading(false);
      const newUser: User = {
        id: "124",
        phoneNumber,
        firstName,
        lastName,
        userType: "NORMAL",
        organizationName: null,
        joinedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        isActive: true,
      };
      login(newUser, "mock-jwt-token-67890");
      router.push("/");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      
      {/* بخش راست - تصویر و معرفی (فقط در دسکتاپ) */}
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

      {/* بخش چپ - فرم ورود */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 bg-white md:rounded-l-3xl shadow-[-20px_0_40px_rgba(0,0,0,0.02)] relative z-10">
        
        {/* دکمه بازگشت */}
        <Link href="/" className="absolute top-6 right-6 p-2 text-slate-400 hover:text-balkun-navy transition-colors bg-slate-50 rounded-full">
          <ArrowRight className="w-6 h-6" />
        </Link>

        <div className="w-full max-w-sm flex flex-col items-center">
          
          {/* لوگو در موبایل */}
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
              {step === "OTP_INPUT" && `کد ۴ رقمی پیامک شده به ${phoneNumber} را وارد کنید.`}
              {step === "REGISTER_INFO" && "به بالکن خوش آمدید! لطفا اطلاعات خود را تکمیل کنید."}
            </p>
          </div>

          {error && (
            <div className="w-full bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold mb-6 text-right">
              {error}
            </div>
          )}

          {/* فرم مرحله 1: شماره موبایل */}
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
              <button 
                disabled={isLoading || phoneNumber.length !== 11}
                type="submit" 
                className="w-full bg-balkun-orange hover:bg-balkun-orange-dark text-white rounded-2xl py-4 font-bold text-lg transition-all duration-300 shadow-lg shadow-balkun-orange/30 hover:shadow-balkun-orange/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? <span className="animate-pulse">در حال بررسی...</span> : "مرحله بعد"}
              </button>
            </form>
          )}

          {/* فرم مرحله 2: کد تایید */}
          {step === "OTP_INPUT" && (
            <form onSubmit={handleOtpSubmit} className="w-full">
              <div className="relative mb-6">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <ShieldCheck className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="کد ۴ رقمی"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={4}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-4 pr-12 pl-4 text-center tracking-[1em] font-black text-2xl focus:outline-none focus:ring-2 focus:ring-balkun-cyan/50 focus:border-balkun-cyan transition-all"
                  autoFocus
                />
              </div>
              <button 
                disabled={isLoading || otp.length !== 4}
                type="submit" 
                className="w-full bg-balkun-orange hover:bg-balkun-orange-dark text-white rounded-2xl py-4 font-bold text-lg transition-all duration-300 shadow-lg shadow-balkun-orange/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <span className="animate-pulse">کمی صبر کنید...</span> : "تایید و ورود"}
              </button>
              
              <button 
                type="button"
                onClick={() => setStep("PHONE_INPUT")}
                className="w-full mt-4 text-sm font-bold text-slate-500 hover:text-balkun-navy transition-colors"
              >
                اصلاح شماره موبایل
              </button>
            </form>
          )}

          {/* فرم مرحله 3: تکمیل اطلاعات */}
          {step === "REGISTER_INFO" && (
            <form onSubmit={handleRegisterSubmit} className="w-full">
              <div className="flex flex-col gap-4 mb-6">
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <UserIcon className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="نام"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-4 pr-12 pl-4 text-right font-bold focus:outline-none focus:ring-2 focus:ring-balkun-cyan/50 focus:border-balkun-cyan transition-all"
                    autoFocus
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <UserIcon className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="نام خانوادگی"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-4 pr-12 pl-4 text-right font-bold focus:outline-none focus:ring-2 focus:ring-balkun-cyan/50 focus:border-balkun-cyan transition-all"
                  />
                </div>
              </div>
              <button 
                disabled={isLoading}
                type="submit" 
                className="w-full bg-balkun-orange hover:bg-balkun-orange-dark text-white rounded-2xl py-4 font-bold text-lg transition-all duration-300 shadow-lg shadow-balkun-orange/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
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