// مسیر: src/app/api/admin/corporate/organizations/[id]/route.ts
// این فایل جدید است — آن را در مسیر بالا در پروژه ایجاد کنید.
//
// 🆕 تسک ۷ چک‌لیست کارفرما (تفکیک کیف پول سازمانی + شارژ خودکار + غیرفعال‌سازی سازمان):
// PATCH: تغییر وضعیت فعال/غیرفعال سازمان و/یا تنظیمات شارژ خودکار (فعال/غیرفعال بودن،
// مبلغ هر بار شارژ، فاصله‌ی زمانی بین دو شارژ).
//
// نکته مهم درباره «غیرفعال‌سازی سازمان»: وقتی isActive روی false تنظیم شود، از این پس
// هیچ‌یک از پرسنل آن سازمان دیگر نمی‌توانند از کیف پول سازمانی برای پرداخت رزرو استفاده
// کنند — این بررسی در src/app/api/user/bookings/[id]/pay-with-wallet/route.ts (که با
// همین migration به‌روزرسانی شده) اعمال می‌شود؛ موجودی کیف پول همچنان حفظ می‌شود و با
// فعال‌سازی مجدد سازمان بلافاصله دوباره قابل استفاده خواهد بود.
//
// دسترسی: منحصراً SUPER_ADMIN (تصمیم حساس تجاری/مالی، هم‌تراز با تغییر نقش کاربر یا
// شارژ/کسر دستی کیف پول).

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole, logAdminAction } from "@/lib/auth/adminAuth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id: organizationId } = await params;
  const body = await request.json().catch(() => ({}));
  const { isActive, autoChargeEnabled, autoChargeAmount, autoChargeIntervalDays } = body as {
    isActive?: boolean;
    autoChargeEnabled?: boolean;
    autoChargeAmount?: number;
    autoChargeIntervalDays?: number;
  };

  const { data: organization, error: fetchError } = await supabaseAdmin
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .maybeSingle();

  if (fetchError || !organization) {
    return NextResponse.json({ success: false, error: "سازمان مورد نظر یافت نشد" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  const logLines: string[] = [];

  if (typeof isActive === "boolean" && isActive !== organization.isActive) {
    updates.isActive = isActive;
    logLines.push(isActive ? "فعال‌سازی سازمان" : "غیرفعال‌سازی سازمان (کیف پول سازمانی برای پرسنل قفل شد)");
  }

  if (typeof autoChargeEnabled === "boolean") {
    updates.autoChargeEnabled = autoChargeEnabled;
    logLines.push(`شارژ خودکار: ${autoChargeEnabled ? "فعال" : "غیرفعال"}`);
  }

  if (autoChargeAmount !== undefined) {
    const numericAmount = Number(autoChargeAmount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return NextResponse.json({ success: false, error: "مبلغ شارژ خودکار نامعتبر است" }, { status: 400 });
    }
    updates.autoChargeAmount = numericAmount;
    logLines.push(`مبلغ شارژ خودکار: ${numericAmount.toLocaleString("fa-IR")} تومان`);
  }

  if (autoChargeIntervalDays !== undefined) {
    const numericInterval = Number(autoChargeIntervalDays);
    if (!Number.isInteger(numericInterval) || numericInterval < 1) {
      return NextResponse.json({ success: false, error: "بازه‌ی شارژ خودکار نامعتبر است (حداقل ۱ روز)" }, { status: 400 });
    }
    updates.autoChargeIntervalDays = numericInterval;
    logLines.push(`بازه شارژ خودکار: هر ${numericInterval} روز`);
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ success: false, error: "هیچ تغییری ارسال نشده است" }, { status: 400 });
  }

  const { data: updatedOrganization, error: updateError } = await supabaseAdmin
    .from("organizations")
    .update(updates)
    .eq("id", organizationId)
    .select()
    .single();

  if (updateError) {
    console.error("Admin Organization Update Error:", updateError);
    return NextResponse.json({ success: false, error: "خطا در به‌روزرسانی سازمان" }, { status: 500 });
  }

  await logAdminAction({
    adminId: admin.userId,
    actionType: "ORGANIZATION_CHANGE",
    description: `تغییرات روی سازمان «${organization.name}»: ${logLines.join("، ")}`,
    previousValue: JSON.stringify({
      isActive: organization.isActive,
      autoChargeEnabled: organization.autoChargeEnabled,
      autoChargeAmount: organization.autoChargeAmount,
      autoChargeIntervalDays: organization.autoChargeIntervalDays,
    }),
    newValue: JSON.stringify({
      isActive: updatedOrganization.isActive,
      autoChargeEnabled: updatedOrganization.autoChargeEnabled,
      autoChargeAmount: updatedOrganization.autoChargeAmount,
      autoChargeIntervalDays: updatedOrganization.autoChargeIntervalDays,
    }),
  });

  return NextResponse.json({ success: true, organization: updatedOrganization, message: "سازمان با موفقیت به‌روزرسانی شد" });
}