// مسیر: src/lib/wallet/pendingOrganizationalCredits.ts
// این فایل جدید است — آن را در مسیر بالا در پروژه ایجاد کنید.
//
// 🆕 بند ۲۷ (بازگشت کیف پول سازمانی به موجودی مستقل هر کارمند):
// وقتی کارفرما (مثلاً «سایپا») یک لیست شماره موبایل کارمند به بالکن می‌دهد و
// می‌خواهد نفری ۱۰ میلیون تومان شارژ شود، ممکن است بعضی از آن شماره‌ها هنوز
// در بالکن ثبت‌نام نکرده باشند. چون تا وقتی کاربری در جدول `users` ساخته
// نشود، اصلاً کیف پولی (`wallets`) برای شارژ کردن وجود ندارد، مبلغ آن شماره‌ها
// این‌جا به‌صورت «معلق» (PENDING) در جدول `organizational_number_credits`
// نگه داشته می‌شود — و دقیقاً لحظه‌ای که همان شماره در بالکن ثبت‌نام کند
// (src/app/api/auth/register/route.ts)، این مبلغ خودکار به کیف پول تازه‌ساخته‌شده‌اش
// اضافه می‌شود و ردیف‌های مربوطه APPLIED علامت می‌خورند.
//
// نیاز به جدول جدید organizational_number_credits دارد — نگاه کنید به فایل
// sql/band-27-per-employee-wallet.sql برای دستور SQL کامل ساخت این جدول.

import { supabaseAdmin } from "@/lib/supabase-admin";

// 🆕 وقتی ادمین از ابزار «شارژ گروهی از لیست شماره‌ها» برای شماره‌ای استفاده
// می‌کند که هنوز کاربری با آن ثبت‌نام نکرده، این تابع مبلغ را برای اعمال بعدی ذخیره می‌کند.
export async function createPendingOrganizationalCredit(params: {
  phoneNumber: string;
  organizationName: string;
  amount: number;
  createdByAdminId: string;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("organizational_number_credits").insert([
    {
      phoneNumber: params.phoneNumber,
      organizationName: params.organizationName,
      amount: params.amount,
      status: "PENDING",
      createdByAdminId: params.createdByAdminId,
    },
  ]);

  if (error) {
    console.error("createPendingOrganizationalCredit Error:", error);
  }
}

// 🆕 هنگام ثبت‌نام یک کاربر سازمانی جدید (بلافاصله بعد از ساخت کیف پول شخصی‌اش)
// فراخوانی می‌شود. تمام شارژهای معلق ثبت‌شده برای شماره‌موبایل+نام‌سازمان او را
// جمع می‌زند، یک‌جا به کیف پول سازمانی‌اش (wallets.orgBalance) اضافه می‌کند،
// یک تراکنش واریزی ثبت می‌کند، و ردیف‌های اعمال‌شده را APPLIED علامت می‌زند.
// مبلغ کل اعمال‌شده را برمی‌گرداند (برای لاگ/تست، اختیاری).
export async function applyPendingOrganizationalCredits(params: {
  userId: string;
  walletId: string;
  phoneNumber: string;
  organizationName: string;
  organizationId: string | null;
}): Promise<number> {
  const { userId, walletId, phoneNumber, organizationName, organizationId } = params;

  const { data: pendingRows, error } = await supabaseAdmin
    .from("organizational_number_credits")
    .select("id, amount")
    .eq("phoneNumber", phoneNumber)
    .eq("organizationName", organizationName)
    .eq("status", "PENDING");

  if (error) {
    console.error("applyPendingOrganizationalCredits Fetch Error:", error);
    return 0;
  }
  if (!pendingRows || pendingRows.length === 0) return 0;

  const total = pendingRows.reduce((sum, row) => sum + Number(row.amount), 0);
  if (total <= 0) return 0;

  const { data: wallet } = await supabaseAdmin.from("wallets").select("orgBalance").eq("id", walletId).maybeSingle();
  const currentBalance = Number(wallet?.orgBalance || 0);

  const { error: updateError } = await supabaseAdmin
    .from("wallets")
    .update({ orgBalance: currentBalance + total, updatedAt: new Date().toISOString() })
    .eq("id", walletId);

  if (updateError) {
    console.error("applyPendingOrganizationalCredits Wallet Update Error:", updateError);
    return 0;
  }

  await supabaseAdmin
    .from("organizational_number_credits")
    .update({ status: "APPLIED", appliedToUserId: userId, appliedAt: new Date().toISOString() })
    .in(
      "id",
      pendingRows.map((row) => row.id)
    );

  await supabaseAdmin.from("transactions").insert([
    {
      walletId,
      organizationId,
      amount: total,
      type: "DEPOSIT",
      walletType: "ORGANIZATIONAL",
      gatewayStatus: "SUCCESS",
      trackingCode: `EMP-CHARGE-REG-${userId.slice(0, 8)}`,
    },
  ]);

  return total;
}
