// مسیر: src/app/api/admin/corporate/organizations/[id]/charge/route.ts
// این فایل جدید است — آن را در مسیر بالا در پروژه ایجاد کنید.
//
// 🆕 تسک ۷ چک‌لیست کارفرما (تفکیک کیف پول سازمانی + شارژ خودکار + غیرفعال‌سازی سازمان):
// شارژ/کسر دستی کیف پول مشترک یک سازمان توسط مدیر ارشد.
// برخلاف src/app/api/admin/users/[id]/wallet-adjust/route.ts (که موجودی شخصی یک
// کاربر را تغییر می‌دهد)، این روت مستقیماً موجودی مشترک سازمان (organizations.walletBalance)
// را تغییر می‌دهد — همان استخری که تمام پرسنل سازمان برای پرداخت رزرو از آن استفاده می‌کنند.
// تراکنش ثبت‌شده walletId ندارد (چون به یک کاربر خاص تعلق ندارد) و فقط با organizationId
// مرتبط می‌شود؛ نمایش آن در «تاریخچه کامل کیف پول» پنل ادمین با یک برچسب «کیف پول مشترک
// سازمان» انجام می‌شود (نگاه کنید به src/app/api/admin/wallet-history/route.ts).
//
// دسترسی: منحصراً SUPER_ADMIN (طبق سیاست مالی بالکن، همان سطح دسترسی wallet-adjust).

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole, logAdminAction } from "@/lib/auth/adminAuth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id: organizationId } = await params;
  const body = await request.json().catch(() => ({}));
  const { direction, amount, reason } = body as { direction?: string; amount?: number; reason?: string };

  if (direction !== "DEPOSIT" && direction !== "WITHDRAWAL") {
    return NextResponse.json({ success: false, error: "نوع عملیات نامعتبر است" }, { status: 400 });
  }
  const numericAmount = Number(amount);
  if (!numericAmount || numericAmount <= 0) {
    return NextResponse.json({ success: false, error: "مبلغ باید عددی مثبت باشد" }, { status: 400 });
  }
  if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
    return NextResponse.json(
      { success: false, error: "درج دلیل این تغییر دستی الزامی است (حداقل ۵ کاراکتر)" },
      { status: 400 }
    );
  }

  const { data: organization, error: fetchError } = await supabaseAdmin
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .maybeSingle();

  if (fetchError || !organization) {
    return NextResponse.json({ success: false, error: "سازمان مورد نظر یافت نشد" }, { status: 404 });
  }

  const currentBalance = Number(organization.walletBalance);
  const delta = direction === "DEPOSIT" ? numericAmount : -numericAmount;
  const newBalance = currentBalance + delta;

  if (newBalance < 0) {
    return NextResponse.json(
      { success: false, error: "موجودی کیف پول سازمان برای این مقدار کسر کافی نیست" },
      { status: 400 }
    );
  }

  // کسر/افزایش شرطی (CAS) برای جلوگیری از Race Condition در صورت دو درخواست هم‌زمان
  const { data: updatedOrganization } = await supabaseAdmin
    .from("organizations")
    .update({ walletBalance: newBalance, updatedAt: new Date().toISOString() })
    .eq("id", organizationId)
    .eq("walletBalance", currentBalance)
    .select()
    .maybeSingle();

  if (!updatedOrganization) {
    return NextResponse.json(
      { success: false, error: "موجودی سازمان هم‌زمان تغییر کرده است. لطفاً دوباره تلاش کنید." },
      { status: 409 }
    );
  }

  const trackingCode = `ORG-${direction === "DEPOSIT" ? "CHARGE" : "WITHDRAW"}-${admin.userId.slice(0, 8)}`;

  const { error: txError } = await supabaseAdmin.from("transactions").insert([
    {
      walletId: null,
      organizationId,
      amount: numericAmount,
      type: direction,
      walletType: "ORGANIZATIONAL",
      gatewayStatus: "SUCCESS",
      trackingCode,
    },
  ]);

  if (txError) {
    // Rollback: ثبت تراکنش شکست خورد، پس موجودی تغییریافته را برمی‌گردانیم
    console.error("Organization Charge Transaction Insert Error (rolled back):", txError);
    await supabaseAdmin
      .from("organizations")
      .update({ walletBalance: currentBalance, updatedAt: new Date().toISOString() })
      .eq("id", organizationId);
    return NextResponse.json({ success: false, error: "خطا در ثبت تراکنش؛ موجودی سازمان تغییر نکرد" }, { status: 500 });
  }

  await logAdminAction({
    adminId: admin.userId,
    actionType: "ORGANIZATION_CHANGE",
    description: `${direction === "DEPOSIT" ? "شارژ دستی" : "کسر دستی"} ${numericAmount.toLocaleString(
      "fa-IR"
    )} تومان ${direction === "DEPOSIT" ? "به" : "از"} کیف پول مشترک سازمان «${organization.name}» — دلیل: ${reason.trim()}`,
    previousValue: String(currentBalance),
    newValue: String(newBalance),
  });

  return NextResponse.json({
    success: true,
    organization: updatedOrganization,
    message: "موجودی سازمان با موفقیت به‌روزرسانی شد",
  });
}