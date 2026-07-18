"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, User, Wallet, ShieldCheck, Save, Loader2, Building2, AlertTriangle } from "lucide-react";
import { formatPrice } from "@/utils/priceCalculator";
import { useAuthStore } from "@/store/authStore";
import { ADMIN_TAB_KEYS, ADMIN_TAB_LABELS } from "@/constants/adminPermissions";

interface UserDetail {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: string;
  userType: string;
  organizationName: string | null;
  joinedAt: string;
  permissions: string[]; // 🆕 فاز ۱۱
}

interface UserWallet {
  normalBalance: number;
}

// 🆕 (۲۰۲۶/۰۷/۱۵) موجودی سازمانی دیگر شخصی نیست؛ یک استخر مشترک به ازای هر سازمان است
// که از جدول organizations خوانده می‌شود (نه از wallets.orgBalance که همیشه ۰ است).
interface OrganizationWallet {
  id: string;
  name: string;
  isActive: boolean;
  walletBalance: number;
  autoChargeEnabled: boolean;
  autoChargeAmount: number;
  autoChargeIntervalDays: number;
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: userId } = use(params);
  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  const [user, setUser] = useState<UserDetail | null>(null);
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [organization, setOrganization] = useState<OrganizationWallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // فرم تنظیمات نقش
  const [selectedRole, setSelectedRole] = useState("");
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // فرم تنظیمات سازمانی
  const [userType, setUserType] = useState("");
  const [orgName, setOrgName] = useState("");
  const [isUpdatingType, setIsUpdatingType] = useState(false);

  // 🆕 فرم دسترسی تب‌به‌تب پنل (فاز ۱۱، بخش ۳)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);

  // فرم شارژ دستی
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState("DEPOSIT");
  const [adjustWalletType, setAdjustWalletType] = useState("NORMAL");
  const [adjustReason, setAdjustReason] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    fetchUserDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setWallet(data.wallet);
        setOrganization(data.organization || null);
        setSelectedRole(data.user.role);
        setUserType(data.user.userType);
        setOrgName(data.user.organizationName || "");
        setSelectedPermissions(data.user.permissions || []);
      }
    } catch (error) {
      console.error("Fetch user detail error", error);
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  const handleUpdateRole = async () => {
    if (!isSuperAdmin) return;
    setIsUpdatingRole(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage("نقش کاربر با موفقیت تغییر کرد", "success");
        // 🆕 رفرش اطلاعات کاربر تا بخش «دسترسی تب‌ها» بلافاصله بر اساس نقش جدید نمایش/مخفی شود
        fetchUserDetails();
      } else {
        showMessage(data.error, "error");
      }
    } catch {
      showMessage("خطا در ارتباط با سرور", "error");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleUpdateType = async () => {
    if (!isSuperAdmin) return;
    setIsUpdatingType(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/type`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userType, organizationName: orgName }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage("نوع حساب کاربر با موفقیت تغییر کرد", "success");
        // 🆕 نوع/نام سازمان عوض شده، پس موجودی سازمانی نمایش‌داده‌شده هم باید رفرش شود
        fetchUserDetails();
      } else showMessage(data.error, "error");
    } catch {
      showMessage("خطا در ارتباط با سرور", "error");
    } finally {
      setIsUpdatingType(false);
    }
  };

  // 🆕 تغییر وضعیت یک چک‌باکس تب (بدون ذخیره فوری — فقط state محلی)
  const handleTogglePermission = (tabKey: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(tabKey) ? prev.filter((p) => p !== tabKey) : [...prev, tabKey]
    );
  };

  // 🆕 ذخیره دسترسی‌های تب انتخاب‌شده
  const handleUpdatePermissions = async () => {
    if (!isSuperAdmin) return;
    setIsUpdatingPermissions(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: selectedPermissions }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage("دسترسی‌های کاربر با موفقیت به‌روزرسانی شد", "success");
        setUser((prev) => (prev ? { ...prev, permissions: data.permissions } : prev));
      } else {
        showMessage(data.error, "error");
      }
    } catch {
      showMessage("خطا در ارتباط با سرور", "error");
    } finally {
      setIsUpdatingPermissions(false);
    }
  };

  const handleWalletAdjust = async () => {
    if (!isSuperAdmin) return;
    if (!adjustAmount || Number(adjustAmount) <= 0) {
      showMessage("مبلغ نامعتبر است", "error");
      return;
    }
    if (adjustReason.trim().length < 5) {
      showMessage("لطفاً دلیل موجه (حداقل ۵ کاراکتر) وارد کنید", "error");
      return;
    }
    setIsAdjusting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/wallet-adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletType: adjustWalletType,
          direction: adjustType,
          amount: Number(adjustAmount),
          reason: adjustReason
        }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage("عملیات کیف پول با موفقیت انجام شد", "success");
        setWallet(data.wallet);
        // 🆕 وقتی عملیات روی کیف پول سازمانی بوده، سرور موجودی به‌روز‌شده‌ی استخر
        // مشترک سازمان را هم در data.organization برمی‌گرداند؛ همان را نمایش می‌دهیم
        // تا کارت «موجودی سازمانی» بلافاصله و بدون رفرش صفحه درست شود.
        if (data.organization) setOrganization(data.organization);
        setAdjustAmount("");
        setAdjustReason("");
      } else {
        showMessage(data.error, "error");
      }
    } catch {
      showMessage("خطا در ارتباط با سرور", "error");
    } finally {
      setIsAdjusting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-balkun-cyan animate-spin mb-4" />
        <span className="font-bold text-slate-500">در حال دریافت اطلاعات کاربر...</span>
      </div>
    );
  }

  if (!user) return <div className="text-center font-bold text-red-500 py-20">کاربر یافت نشد</div>;

  // 🆕 آیا چک‌باکس‌های دسترسی نسبت به مقدار ذخیره‌شده تغییر کرده‌اند؟
  const permissionsChanged =
    JSON.stringify([...selectedPermissions].sort()) !== JSON.stringify([...(user.permissions || [])].sort());

  return (
    <div className="flex flex-col gap-6 pb-10">

      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <button onClick={() => router.back()} className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50">
          <ArrowRight className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-black text-balkun-navy flex items-center gap-2">
            پروفایل: {user.firstName} {user.lastName}
          </h1>
          <span className="text-sm font-bold text-slate-500" dir="ltr">{user.phoneNumber}</span>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl font-bold text-sm ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* مدیریت دسترسی و نوع حساب (فقط سوپر ادمین) */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col gap-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-5 h-5 text-balkun-cyan" />
              مدیریت نقش و دسترسی
            </h2>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-600">نقش در سیستم</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                disabled={!isSuperAdmin}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-balkun-cyan outline-none"
              >
                <option value="USER">کاربر عادی</option>
                <option value="SUPPORT_AGENT">پشتیبان بالکن</option>
                <option value="FINANCE_MANAGER">مدیر مالی (Finance Manager)</option>
                <option value="SUPER_ADMIN">مدیر ارشد (Super Admin)</option>
              </select>
            </div>
            {isSuperAdmin && selectedRole !== user.role && (
              <button onClick={handleUpdateRole} disabled={isUpdatingRole} className="bg-balkun-cyan text-white rounded-xl py-3 font-bold text-sm hover:bg-balkun-cyan-dark flex justify-center items-center gap-2 mt-2">
                {isUpdatingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                ذخیره تغییر نقش
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col gap-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="w-5 h-5 text-balkun-orange" />
              نوع حساب کاربری
            </h2>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-600">نوع کاربری</label>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                disabled={!isSuperAdmin}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-balkun-cyan outline-none"
              >
                <option value="NORMAL">شخصی / عادی</option>
                <option value="ORGANIZATIONAL">سازمانی</option>
              </select>
            </div>
            {userType === "ORGANIZATIONAL" && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-600">نام سازمان</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={!isSuperAdmin}
                  placeholder="مثلاً: شرکت همراه اول"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-balkun-cyan outline-none"
                />
              </div>
            )}
            {isSuperAdmin && (userType !== user.userType || orgName !== (user.organizationName || "")) && (
              <button onClick={handleUpdateType} disabled={isUpdatingType} className="bg-balkun-orange text-white rounded-xl py-3 font-bold text-sm hover:bg-balkun-orange-dark flex justify-center items-center gap-2 mt-2">
                {isUpdatingType ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                ذخیره تغییرات نوع حساب
              </button>
            )}
          </div>

          {/* 🆕 دسترسی به تب‌های پنل مدیریت (فاز ۱۱، بخش ۳) */}
          {/* 🆕 تسک ۱: نقش FINANCE_MANAGER هم اینجا نمایش داده می‌شود، اما چون دسترسی این
              نقش «ثابت» است (نه تفویضی مثل SUPPORT_AGENT)، به‌جای چک‌باکس‌های تب، فقط
              توضیح دامنه‌ی فعلی دسترسی‌اش نشان داده می‌شود. */}
          {(user.role === "SUPPORT_AGENT" || user.role === "SUPER_ADMIN" || user.role === "FINANCE_MANAGER") && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col gap-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldCheck className="w-5 h-5 text-balkun-cyan" />
                دسترسی به تب‌های پنل
              </h2>

              {user.role === "SUPER_ADMIN" ? (
                <div className="bg-slate-50 text-slate-600 p-4 rounded-xl text-sm font-bold">
                  این کاربر «مدیر ارشد» است و مستقل از این تنظیمات، همیشه به تمام تب‌های پنل دسترسی کامل دارد.
                </div>
              ) : user.role === "FINANCE_MANAGER" ? (
                <div className="bg-balkun-yellow/10 text-amber-800 p-4 rounded-xl text-sm font-bold leading-relaxed">
                  این کاربر «مدیر مالی» است. دسترسی این نقش تفویضی نیست (مثل پشتیبان‌ها) بلکه ثابت
                  و از پیش تعریف‌شده است. طبق تسک ۱۱ چک‌لیست کارفرما، دامنه‌ی دسترسی این نقش
                  اکنون تکمیل شده و شامل موارد زیر می‌شود — همه فقط‌خواندنی (به‌جز «لاگ‌های سیستم»
                  که ثبت یادداشت داخلی جدید هم در آن مجاز است، چون یک ابزار عملیاتی مشترک بین
                  کارمندان است، نه یک عملیات مالی حساس)، بدون هیچ عملیات نوشتنی/حساس دیگری
                  (تغییر نقش، تغییر نوع حساب، عملیات دستی کیف پول، لغو/حذف رزرو، تغییر وضعیت
                  لیدهای سازمانی):
                  <ul className="list-disc pr-5 mt-2 flex flex-col gap-1 font-normal">
                    <li>داشبورد کلان</li>
                    <li>کاربران و فعالیت آن‌ها (همین صفحه، شامل موجودی و ۱۰ تراکنش/رزرو اخیر)</li>
                    <li>تاریخچه کامل کیف پول (همه‌ی واریز/برداشت/شارژ/برگشت‌های کل سیستم)</li>
                    <li>پرداخت‌ها (تمام تراکنش‌های مرتبط با رزروها، درگاه و کیف پول)</li>
                    <li>سازمان‌ها (فقط بخش «کیف پول‌های سازمانی» در تب سازمانی)</li>
                    <li>مدیریت رزروها (فقط مشاهده‌ی لیست، بدون امکان لغو یا حذف)</li>
                    <li>لاگ‌های سیستم (مشاهده و ثبت یادداشت داخلی جدید — تماس/ارجاع/خطا)</li>
                    <li>لاگ فعالیت‌ها (فقط اقدامات خودش)</li>
                  </ul>
                </div>
              ) : (
                <>
                  {!isSuperAdmin && (
                    <div className="bg-orange-50 text-orange-700 p-3 rounded-xl text-xs font-bold text-center">
                      فقط مدیر ارشد می‌تواند دسترسی تب‌ها را تغییر دهد.
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ADMIN_TAB_KEYS.map((tabKey) => (
                      <label
                        key={tabKey}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold transition-colors ${
                          selectedPermissions.includes(tabKey)
                            ? "bg-balkun-cyan/10 border-balkun-cyan text-balkun-navy"
                            : "bg-slate-50 border-slate-200 text-slate-500"
                        } ${isSuperAdmin ? "cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(tabKey)}
                          disabled={!isSuperAdmin}
                          onChange={() => handleTogglePermission(tabKey)}
                          className="w-4 h-4 accent-balkun-cyan"
                        />
                        {ADMIN_TAB_LABELS[tabKey]}
                      </label>
                    ))}
                  </div>

                  {isSuperAdmin && permissionsChanged && (
                    <button
                      onClick={handleUpdatePermissions}
                      disabled={isUpdatingPermissions}
                      className="bg-balkun-cyan text-white rounded-xl py-3 font-bold text-sm hover:bg-balkun-cyan-dark flex justify-center items-center gap-2 mt-2"
                    >
                      {isUpdatingPermissions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      ذخیره دسترسی‌های تب‌ها
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* مدیریت کیف پول و مالی (فقط سوپر ادمین) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col gap-4">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Wallet className="w-5 h-5 text-balkun-yellow" />
            کیف پول و عملیات دستی
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col gap-1">
               <span className="text-xs font-bold text-slate-500">موجودی عادی</span>
               <span className="text-lg font-black text-balkun-navy">{formatPrice(wallet?.normalBalance || 0)} <span className="text-[10px] font-normal">تومان</span></span>
            </div>

            {/* 🆕 (۲۰۲۶/۰۷/۱۵) این کارت اصلاح شد: قبلاً از wallet.orgBalance (فیلد قدیمی و
                شخصی که از تسک ۷ به بعد همیشه ۰ است) می‌خواند و همیشه ۰ نشان می‌داد؛ حالا
                موجودی واقعی استخر مشترک سازمانِ همین کاربر (organization.walletBalance) را
                نشان می‌دهد — همان عددی که در تب «کیف پول‌های سازمانی» پنل هم دیده می‌شود. */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col gap-1">
               <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                 <Building2 className="w-3.5 h-3.5 text-slate-400" />
                 موجودی سازمانی (استخر مشترک)
               </span>
               <span className="text-lg font-black text-balkun-navy">
                 {formatPrice(organization?.walletBalance || 0)} <span className="text-[10px] font-normal">تومان</span>
               </span>
               {organization && !organization.isActive && (
                 <span className="inline-flex w-fit items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-500">
                   <AlertTriangle className="w-3 h-3" /> سازمان غیرفعال است
                 </span>
               )}
               {user.userType === "ORGANIZATIONAL" && !organization && (
                 <span className="text-[10px] font-bold text-orange-500 mt-1 leading-relaxed">
                   سازمان «{user.organizationName}» هنوز در سیستم کیف پول ثبت نشده است.
                 </span>
               )}
            </div>
          </div>

          {!isSuperAdmin ? (
             <div className="bg-orange-50 text-orange-700 p-4 rounded-xl text-sm font-bold text-center">
               فقط مدیر ارشد مجاز به انجام عملیات دستی کیف پول است.
             </div>
          ) : (
            <div className="flex flex-col gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h3 className="font-bold text-sm text-slate-700 mb-2">اصلاح دستی موجودی (ویژه پشتیبانی)</h3>

              <div className="grid grid-cols-2 gap-3">
                <select value={adjustWalletType} onChange={(e) => setAdjustWalletType(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-balkun-cyan outline-none">
                  <option value="NORMAL">کیف پول عادی</option>
                  <option value="ORGANIZATIONAL">کیف پول سازمانی</option>
                </select>
                <select value={adjustType} onChange={(e) => setAdjustType(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-balkun-cyan outline-none">
                  <option value="DEPOSIT">واریز (شارژ)</option>
                  <option value="WITHDRAWAL">برداشت (کسر)</option>
                </select>
              </div>

              {/* 🆕 یادآوری برای ادمین: عملیات سازمانی روی کل پرسنل سازمان اثر می‌گذارد */}
              {adjustWalletType === "ORGANIZATIONAL" && (
                <div className="text-[11px] font-bold text-amber-700 bg-balkun-yellow/10 px-3 py-2 rounded-lg leading-relaxed">
                  توجه: این عملیات روی استخر مشترک کل سازمان «{user.organizationName || "—"}» اعمال می‌شود، نه فقط همین کاربر؛ روی موجودی همه‌ی پرسنل آن سازمان اثر دارد.
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500">مبلغ (تومان)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder="مثلاً: 100000"
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-balkun-cyan outline-none dir-ltr"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500">دلیل موجه (در لاگ سیستم ثبت می‌شود)</label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="دلیل شارژ یا کسر وجه را به صورت کامل بنویسید..."
                  rows={2}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-balkun-cyan outline-none resize-none"
                />
              </div>

              <button
                onClick={handleWalletAdjust}
                disabled={isAdjusting || !adjustAmount || adjustReason.trim().length < 5}
                className="w-full bg-slate-800 text-white rounded-xl py-3 font-bold text-sm hover:bg-slate-900 flex justify-center items-center gap-2 mt-2 disabled:opacity-50"
              >
                {isAdjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : "اجرای عملیات روی کیف پول"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}