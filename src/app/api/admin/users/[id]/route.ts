
// مسیر: src/app/api/admin/users/[id]/route.ts
// GET: جزئیات کامل یک کاربر برای صفحه پروفایل کاربر در پنل ادمین —
// شامل اطلاعات پایه، موجودی کیف پول، ۱۰ تراکنش اخیر و ۱۰ رزرو اخیر (یعنی «فعالیت کاربر»).
// 🆕 تسک ۳ (دسترسی داشبورد برای مدیر مالی): نقش FINANCE_MANAGER به این روت (فقط GET)
// اضافه شد تا «مشاهده کاربران و فعالیت کاربران» طبق چک‌لیست فراهم شود. سایر روت‌های
// همین پوشه (role, type, permissions, wallet-adjust) که نوشتنی/حساس هستند دست‌نخورده و
// منحصراً SUPER_ADMIN باقی ماندند.
// 🆕 تسک ۸ چک‌لیست کارفرما (امکان حذف برای مدیران ارشد): متد DELETE به همین روت
// اضافه شد — فقط و فقط SUPER_ADMIN. با تشکر از FKهای ON DELETE CASCADE فاز صفر،
// با حذف ردیف کاربر، کیف پول/تراکنش‌ها/رزروها/تیکت‌ها/پیام‌های تیکت/علاقه‌مندی‌ها و
// اعلان‌های او هم خودکار حذف می‌شوند و ارجاع‌های لاگ‌ها (targetUserId) طبق تعریف
// دیتابیس NULL می‌شوند. سه سپر امنیتی دارد: (۱) مدیر ارشد نمی‌تواند خودش را حذف کند،
// (۲) هیچ کاربر با نقش SUPER_ADMIN قابل حذف نیست، (۳) کاربری که به‌عنوان کارمند
// در admin_audit_logs لاگ دارد یا اقامتگاه/پست بلاگ ثبت کرده (FKهای RESTRICT)
// حذف نمی‌شود مگر اینکه ابتدا آن سوابق مدیریت شود. هر حذف موفق با actionType
// جدید USER_DELETE در admin_audit_logs ثبت می‌شود (بند ۲۳ سند DATABASE_SQL_LOG.md).
//
// 🔧 اصلاحیه (۲۰۲۶/۰۷/۱۵) — رفع باگ «کارت موجودی سازمانی همیشه ۰» در صفحه‌ی جزئیات کاربر:
// از زمان تسک ۷ چک‌لیست کارفرما (تفکیک کیف پول سازمانی)، موجودی واقعی کاربران سازمانی
// دیگر در wallets.orgBalance نگه‌داری نمی‌شود (آن ستون همیشه ۰ است) بلکه در استخر مشترک
// organizations.walletBalance ذخیره می‌شود. این روت حالا، اگر کاربر سازمانی باشد، سازمان
// مربوطه را هم واکشی و در پاسخ برمی‌گرداند تا فرانت‌اند بتواند موجودی واقعی را نمایش دهد.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole, logAdminAction } from "@/lib/auth/adminAuth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN", "FINANCE_MANAGER"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id: targetUserId } = await params;

  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", targetUserId)
    .maybeSingle();

  if (userError || !user) {
    return NextResponse.json({ success: false, error: "کاربر مورد نظر یافت نشد" }, { status: 404 });
  }

  const { data: wallet } = await supabaseAdmin
    .from("wallets")
    .select("*")
    .eq("userId", targetUserId)
    .maybeSingle();

  // 🆕 موجودی واقعی کیف پول سازمانی (استخر مشترک) — فقط برای کاربران سازمانی که
  // سازمانشان از قبل در جدول organizations ثبت شده باشد؛ در غیر این صورت null
  // می‌ماند و فرانت‌اند پیام «سازمان هنوز ثبت نشده» را نشان می‌دهد.
  const { data: organization } =
    user.userType === "ORGANIZATIONAL" && user.organizationName
      ? await supabaseAdmin
          .from("organizations")
          .select("id, name, isActive, walletBalance, autoChargeEnabled, autoChargeAmount, autoChargeIntervalDays")
          .eq("name", user.organizationName)
          .maybeSingle()
      : { data: null };

  const [{ data: transactions }, { data: bookings }] = await Promise.all([
    wallet
      ? supabaseAdmin
          .from("transactions")
          .select("*")
          .eq("walletId", wallet.id)
          .order("createdAt", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("userId", targetUserId)
      .order("createdAt", { ascending: false })
      .limit(10),
  ]);

  return NextResponse.json({
    success: true,
    user,
    wallet: wallet || null,
    organization: organization || null,
    recentTransactions: transactions ?? [],
    recentBookings: bookings ?? [],
  });
}

// 🆕 تسک ۸ چک‌لیست کارفرما — DELETE: حذف کامل یک کاربر (فقط مدیر ارشد).
// عمداً با requireAdminRole(["SUPER_ADMIN"]) کنترل می‌شود، نه سیستم تب‌های تفویضی —
// حذف کاربر یک عملیات غیرقابل‌بازگشت و حساس است و نباید به هیچ نقش دیگری
// (حتی با تفویض تب) برسد.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id: targetUserId } = await params;

  const { data: targetUser, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("id, firstName, lastName, phoneNumber, role, userType")
    .eq("id", targetUserId)
    .maybeSingle();

  if (fetchError || !targetUser) {
    return NextResponse.json({ success: false, error: "کاربر مورد نظر یافت نشد" }, { status: 404 });
  }

  // 🛡️ سپر ۱: مدیر ارشد هرگز نمی‌تواند حساب خودش را حذف کند (جلوگیری از قفل‌شدن سیستم)
  if (targetUser.id === admin.userId) {
    return NextResponse.json(
      { success: false, error: "شما نمی‌توانید حساب کاربری خودتان را حذف کنید" },
      { status: 400 }
    );
  }

  // 🛡️ سپر ۲: حساب هیچ مدیر ارشد دیگری هم از این مسیر قابل حذف نیست
  if (targetUser.role === "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, error: "حذف حساب مدیر ارشد مجاز نیست" },
      { status: 400 }
    );
  }

  // 🛡️ سپر ۳: اگر کاربر به‌عنوان کارمند در سیستم سابقه دارد (لاگ فعالیت ثبت کرده)،
  // قید RESTRICT روی admin_audit_logs.adminId اجازه‌ی حذف نمی‌دهد — با پیام شفاف
  // جلوش را می‌گیریم تا مدیر بداند باید چه کند.
  const { count: staffLogCount } = await supabaseAdmin
    .from("admin_audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("adminId", targetUserId);

  if ((staffLogCount ?? 0) > 0) {
    return NextResponse.json(
      {
        success: false,
        error:
          "این کاربر به‌عنوان کارمند در سیستم لاگ فعالیت ثبت کرده و مستقیماً قابل حذف نیست. ابتدا لاگ‌های او را از صفحه‌ی «لاگ فعالیت‌ها» حذف کنید، یا به‌جای حذف، حسابش را غیرفعال کنید.",
      },
      { status: 409 }
    );
  }

  // حذف ردیف کاربر — به لطف ON DELETE CASCADE فاز صفر، کیف پول، تراکنش‌ها، رزروها،
  // تیکت‌ها (و پیام‌هایشان)، علاقه‌مندی‌ها و اعلان‌های کاربر هم خودکار حذف می‌شوند؛
  // و به لطف ON DELETE SET NULL، ارجاع targetUserId در لاگ‌های داخلی و ممیزی NULL می‌شود.
  const { error: deleteError } = await supabaseAdmin.from("users").delete().eq("id", targetUserId);

  if (deleteError) {
    console.error("Admin User Delete Error:", deleteError);
    // 23503 = نقض قید خارجی (مثلاً کاربر اقامتگاه اختصاصی یا پست بلاگ ثبت کرده —
    // آن FKها RESTRICT هستند) → پیام شفاف به جای خطای خام ۵۰۰
    if (deleteError.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          error:
            "این کاربر سوابقی در سیستم دارد (مانند اقامتگاه یا پست بلاگ ثبت‌شده به نام او) که مانع حذف مستقیم است. ابتدا آن موارد را حذف یا منتقل کنید، یا حساب کاربر را غیرفعال کنید.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: "خطا در حذف کاربر" }, { status: 500 });
  }

  // ثبت اجباری در لاگ ممیزی — چون کاربر دیگر وجود ندارد، targetUserId عمداً null
  // می‌ماند (درج شناسه‌ی کاربر حذف‌شده قید خارجی را نقض می‌کرد) و هویت کامل او
  // در متن شرح حفظ می‌شود.
  await logAdminAction({
    adminId: admin.userId,
    actionType: "USER_DELETE",
    targetUserId: null,
    description: `حذف کامل کاربر «${targetUser.firstName} ${targetUser.lastName}» با شماره ${targetUser.phoneNumber} (نوع حساب: ${targetUser.userType}، نقش: ${targetUser.role}) به‌همراه تمام داده‌های مرتبط (کیف پول، رزروها، تیکت‌ها) توسط مدیر ارشد.`,
    previousValue: targetUser.role,
    newValue: "DELETED",
  });

  return NextResponse.json({ success: true, message: "کاربر با موفقیت حذف شد" });
}
