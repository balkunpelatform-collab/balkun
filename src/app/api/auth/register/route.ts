// مسیر: src/app/api/auth/register/route.ts
//
// 🆕 بند ۲۷ (بازگشت کیف پول سازمانی به موجودی مستقل هر کارمند):
// وقتی کاربری با شماره‌ی موجود در لیست سفید سازمانی ثبت‌نام می‌کند، علاوه بر
// ساخت کیف پول شخصی/سازمانی‌اش و تضمین وجود ردیف سازمان، حالا بلافاصله بررسی
// می‌کنیم که آیا ادمین قبلاً (از ابزار «شارژ گروهی از لیست شماره‌ها» در پنل
// ادمین) برای همین شماره یک مبلغ «معلق» ثبت کرده یا نه — اگر بله، همان لحظه
// روی کیف پول سازمانی تازه‌ساخته‌شده‌اش اعمال می‌شود (applyPendingOrganizationalCredits).
// یعنی حتی اگر کارفرما لیست کارمندانی بدهد که هنوز در بالکن ثبت‌نام نکرده‌اند،
// همین که ثبت‌نام کنند، سهم ۱۰ میلیونی‌شان (یا هر مبلغ دیگری) خودکار در کیف
// پولشان می‌نشیند — بدون نیاز به هیچ اقدام دستی دوباره از سمت ادمین.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isOtpValid, consumeOtp } from "@/lib/otp/otpService";
import { sendWelcomeSms } from "@/lib/sms/smsService";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { getOrCreateOrganizationId } from "@/lib/wallet/ensureOrganization";
import { applyPendingOrganizationalCredits } from "@/lib/wallet/pendingOrganizationalCredits";

export async function POST(request: Request) {
  try {
    const { phoneNumber, otp, firstName, lastName } = await request.json();

    if (!phoneNumber || !firstName || !lastName) {
      return NextResponse.json({ success: false, error: "اطلاعات ناقص است" }, { status: 400 });
    }

    // ۱. اعتبارسنجی مجدد کد تایید در سمت سرور (واقعی، با انقضای زمانی)
    const otpValid = await isOtpValid(phoneNumber, otp);
    if (!otpValid) {
      return NextResponse.json({ success: false, error: "کد تایید نامعتبر یا منقضی شده است" }, { status: 400 });
    }

    // ۲. بررسی اینکه آیا این شماره از قبل در سیستم ثبت‌نام کرده یا نه
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("phoneNumber", phoneNumber)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ success: false, error: "این شماره موبایل قبلاً ثبت‌نام کرده است" }, { status: 409 });
    }

    // ۳. تشخیص خودکار کاربر سازمانی بر اساس لیست شماره‌های سازمانی بالکن
    const { data: orgRecord } = await supabaseAdmin
      .from("organizational_numbers")
      .select("organizationName")
      .eq("phoneNumber", phoneNumber)
      .maybeSingle();

    const userType = orgRecord ? "ORGANIZATIONAL" : "NORMAL";
    const organizationName = orgRecord ? orgRecord.organizationName : null;

    // ۴. ثبت کاربر جدید در دیتابیس (نقش پیش‌فرض همیشه USER است؛
    // ارتقا به SUPPORT_AGENT/SUPER_ADMIN فقط از پنل ادمین توسط یک SUPER_ADMIN دیگر انجام می‌شود)
    const { data: newUser, error: userError } = await supabaseAdmin
      .from("users")
      .insert([{ phoneNumber, firstName, lastName, userType, organizationName }])
      .select()
      .single();

    if (userError) throw userError;

    // ۵. ساخت اتوماتیک کیف پول شخصی/سازمانی برای این کاربر
    const { data: newWallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .insert([{ userId: newUser.id }])
      .select()
      .single();

    if (walletError) throw walletError;

    // 🆕 بند ۲۷: تضمین وجود ردیف سازمان + اعمال هر مبلغ معلقی که ادمین از قبل
    // برای همین شماره در همین سازمان ثبت کرده بود (شارژ گروهی روی لیست کارمند)
    if (organizationName) {
      const organizationId = await getOrCreateOrganizationId(organizationName);
      await applyPendingOrganizationalCredits({
        userId: newUser.id,
        walletId: newWallet.id,
        phoneNumber,
        organizationName,
        organizationId,
      });
    }

    // ۶. کد تایید را مصرف‌شده علامت می‌زنیم
    await consumeOtp(phoneNumber, otp);

    // ۷. ارسال پیامک خوش‌آمدگویی (متن متفاوت برای کاربر عادی/سازمانی)
    await sendWelcomeSms(phoneNumber, firstName, userType);

    // 🔐 صدور نشست امن (همان مکانیزم verify-otp/route.ts)
    const sessionToken = await createSessionToken({
      userId: newUser.id,
      phoneNumber: newUser.phoneNumber,
      userType: newUser.userType,
      role: newUser.role,
    });

    const legacyClientToken = `balkun-token-${newUser.id}`;

    const response = NextResponse.json({
      success: true,
      user: newUser,
      token: legacyClientToken,
    });

    response.cookies.set(SESSION_COOKIE.name, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_COOKIE.maxAge,
    });

    return response;
  } catch (error) {
    console.error("Register Error:", error);
    return NextResponse.json({ success: false, error: "خطا در ثبت نام. لطفا مجددا تلاش کنید." }, { status: 500 });
  }
}
