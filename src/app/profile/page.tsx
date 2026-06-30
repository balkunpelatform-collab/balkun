// مسیر مقصد این فایل (فایل جدید): src/app/profile/page.tsx
// کانتینر اصلی داشبورد کاربری

"use client";

import { useEffect, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import BookingsManager from "@/components/profile/BookingsManager";
import SavedProperties from "@/components/profile/SavedProperties";
import AccountSettings from "@/components/profile/AccountSettings";
import WalletView from "@/components/profile/WalletView";

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "bookings";
  const { isAuthenticated, user, setUser } = useAuthStore();
  const [localUser, setLocalUser] = useState(user);

  useEffect(() => {
    // محافظت از مسیر (Route Protection) سمت کلاینت
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  // همگام‌سازی user از store
  useEffect(() => {
    if (user) {
      setLocalUser(user);
    }
  }, [user]);

  // تا زمانی که وضعیت لاگین مشخص نشده رندر نمی‌کنیم
  if (!isAuthenticated || !localUser) return null;

  // هندلر به‌روزرسانی اطلاعات کاربر
  const handleUserUpdate = (updatedData: any) => {
    const updated = { ...localUser, ...updatedData };
    setLocalUser(updated);
    setUser(updated);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl min-h-[70vh]">
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        
        {/* سایدبار سمت راست */}
        <div className="w-full md:w-1/3 lg:w-1/4">
          <ProfileSidebar activeTab={tab} user={localUser} />
        </div>
        
        {/* محتوای اصلی سمت چپ */}
        <div className="w-full md:w-2/3 lg:w-3/4">
          {tab === "bookings" || tab === "active" ? (
            <BookingsManager defaultTab={tab === "active" ? "ACTIVE" : "ACTIVE"} token={localUser.id} />
          ) : tab === "saved" ? (
            <SavedProperties userId={localUser.id} />
          ) : tab === "wallet" ? (
            <WalletView userId={localUser.id} userType={localUser.userType} />
          ) : tab === "settings" ? (
            <AccountSettings user={localUser} onUpdate={handleUserUpdate} />
          ) : null}
        </div>

      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center font-bold text-slate-400">در حال بارگذاری...</div>}>
      <ProfileContent />
    </Suspense>
  );
}