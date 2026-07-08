// مسیر: src/app/api/admin/otp-codes/route.ts
// GET: نمایش لیست آخرین کدهای تایید (OTP) صادر شده در سیستم — فقط برای مدیران ارشد (SUPER_ADMIN).
//
// هدف: تا وقتی پنل پیامکی واقعی وصل نشده (یعنی SMS_USE_MOCK=true یا کلید SMS_API_KEY خالی است)،
// مدیران ارشد بتوانند کد ورود اعضای تیم را از همین‌جا ببینند و تلفنی/پیامی به آن‌ها بدهند،
// بدون نیاز به چک کردن مداوم لاگ‌های Vercel.
//
// 🔒 نکته‌ی امنیتی: این مسیر عمداً با requireAdminRole روی نقش SUPER_ADMIN محدود شده
// (نه requireAdminTabAccess) — چون این کدها عملاً معادل «رمز عبور موقت» هر کاربر هستند
// و باید حساس‌ترین سطح دسترسی را داشته باشند. پشتیبان‌ها (SUPPORT_AGENT) حتی اگر دسترسی
// تب logs را هم داشته باشند، این کدها را نمی‌بینند.
//
// 🔁 خاموش‌شدن خودکار: به محض این‌که پنل پیامکی واقعی وصل شود (SMS_USE_MOCK=false در .env),
// این مسیر به‌جای کدها، فقط disabled:true برمی‌گرداند — پس این قابلیت به‌صورت خودکار
// از رده خارج می‌شود و لازم نیست کسی یادش بماند که آن را دستی حذف کند.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole } from "@/lib/auth/adminAuth";
import { SMS_CONFIG } from "@/lib/sms/smsConfig";

// فقط کدهای صادرشده در این بازه‌ی زمانیِ اخیر نمایش داده می‌شوند
const OTP_VIEW_WINDOW_MINUTES = Number(process.env.OTP_ADMIN_VIEW_WINDOW_MINUTES || 30);
const MAX_ROWS = 50;

export async function GET(request: NextRequest) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  // اگر پنل پیامکی واقعی از قبل وصل شده، این قابلیت دیگر معنا ندارد و خاموش می‌ماند
  if (!SMS_CONFIG.useMock) {
    return NextResponse.json({ success: true, disabled: true, codes: [] });
  }

  const windowStart = new Date(Date.now() - OTP_VIEW_WINDOW_MINUTES * 60 * 1000).toISOString();

  const { data: codes, error } = await supabaseAdmin
    .from("otp_codes")
    .select("id, phoneNumber, code, createdAt, expiresAt, isUsed")
    .gte("createdAt", windowStart)
    .order("createdAt", { ascending: false })
    .limit(MAX_ROWS);

  if (error) {
    console.error("OTP Codes Fetch Error:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت کدهای ورود" }, { status: 500 });
  }

  // برای راحتی مدیر ارشد، اسم صاحب شماره را هم (در صورت وجود) کنار کد نشان می‌دهیم
  const phoneNumbers = Array.from(new Set((codes || []).map((c) => c.phoneNumber)));
  let namesByPhone: Record<string, string> = {};

  if (phoneNumbers.length > 0) {
    const { data: users } = await supabaseAdmin
      .from("users")
      .select("phoneNumber, firstName, lastName")
      .in("phoneNumber", phoneNumbers);

    namesByPhone = Object.fromEntries(
      (users || []).map((u) => [u.phoneNumber, `${u.firstName} ${u.lastName}`.trim()])
    );
  }

  const result = (codes || []).map((c) => ({
    id: c.id,
    phoneNumber: c.phoneNumber,
    fullName: namesByPhone[c.phoneNumber] || null,
    code: c.code,
    createdAt: c.createdAt,
    expiresAt: c.expiresAt,
    isUsed: c.isUsed,
    isExpired: new Date(c.expiresAt).getTime() <= Date.now(),
  }));

  return NextResponse.json({ success: true, disabled: false, codes: result });
}