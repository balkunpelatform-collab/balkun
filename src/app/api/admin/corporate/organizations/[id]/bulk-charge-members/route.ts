// مسیر: src/app/api/admin/corporate/organizations/[id]/bulk-charge-members/route.ts
// این فایل جدید است — آن را در مسیر بالا در پروژه ایجاد کنید.
//
// 🆕 بند ۲۷ (بازگشت کیف پول سازمانی به موجودی مستقل هر کارمند):
// این روت دقیقاً همان چیزی است که کارفرما خواسته: «یک لیست از کارکنانش می‌دهد
// (مثلاً کارکنان شرکت سایپا)، می‌گوید نفری ۱۰ میلیون تومان شارژ کنید». ادمین
// یک سازمان را انتخاب می‌کند، لیست شماره‌موبایل کارکنان را (با یک مبلغ مشترک
// برای همه، یا مبلغ جداگانه برای هرکدام) وارد می‌کند، و این روت برای هر شماره:
//
//   ۱. اگر آن شماره از قبل در «لیست سفید سازمانی» نبود، اضافه‌اش می‌کند (تا
//      تشخیص خودکار سازمانی‌بودن در ثبت‌نام‌های آینده کار کند).
//   ۲. اگر کاربری با آن شماره از قبل در بالکن ثبت‌نام کرده: بلافاصله همان
//      مبلغ را به کیف پول سازمانی مستقل خودش (wallets.orgBalance) اضافه
//      می‌کند — دقیقاً فقط برای همان یک نفر، نه کل سازمان. (اگر کاربر قبلاً
//      نوع حسابش عادی بود، همین‌جا رسماً سازمانی هم می‌شود.)
//   ۳. اگر هنوز کسی با آن شماره ثبت‌نام نکرده: مبلغ به‌صورت «معلق» ذخیره
//      می‌شود و خودِ ثبت‌نام (src/app/api/auth/register/route.ts) آن را
//      خودکار روی کیف پول تازه‌ساخته‌شده‌اش اعمال می‌کند.
//
// نتیجه: مصرف بعدی هرکس (src/app/api/user/bookings/[id]/pay-with-wallet)
// فقط از سهم خودش کم می‌شود، نه از یک استخر مشترک بین همه.
//
// دسترسی: منحصراً SUPER_ADMIN (عملیات مالی حساس، هم‌تراز با شارژ/کسر دستی کیف پول).

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole, logAdminAction } from "@/lib/auth/adminAuth";
import { createPendingOrganizationalCredit } from "@/lib/wallet/pendingOrganizationalCredits";

const PHONE_REGEX = /^09[0-9]{9}$/;
const MAX_ROWS_PER_REQUEST = 1000;

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface InputRow {
  phoneNumber?: string;
  amount?: number;
}

type RowStatus =
  | "charged_now"
  | "pending_registration"
  | "conflict_other_org"
  | "duplicate"
  | "invalid";

interface RowResult {
  row: number;
  phoneNumber: string;
  amount: number;
  status: RowStatus;
  reason?: string;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id: organizationId } = await params;
  const body = await request.json().catch(() => ({}));
  const { rows, defaultAmount, reason } = body as {
    rows?: InputRow[];
    defaultAmount?: number;
    reason?: string;
  };

  if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
    return NextResponse.json(
      { success: false, error: "درج دلیل این شارژ گروهی الزامی است (حداقل ۵ کاراکتر)" },
      { status: 400 }
    );
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ success: false, error: "لیست شماره‌ها خالی است" }, { status: 400 });
  }
  if (rows.length > MAX_ROWS_PER_REQUEST) {
    return NextResponse.json(
      { success: false, error: `حداکثر ${MAX_ROWS_PER_REQUEST} ردیف در هر بار مجاز است (تعداد ارسالی: ${rows.length})` },
      { status: 400 }
    );
  }

  const { data: organization, error: orgFetchError } = await supabaseAdmin
    .from("organizations")
    .select("id, name")
    .eq("id", organizationId)
    .maybeSingle();

  if (orgFetchError || !organization) {
    return NextResponse.json({ success: false, error: "سازمان مورد نظر یافت نشد" }, { status: 404 });
  }

  const results: RowResult[] = [];
  const seenInThisRequest = new Set<string>();
  let chargedNowTotal = 0;
  let pendingTotal = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 1;
    const rawPhone = (rows[i].phoneNumber || "").toString().trim();
    const rawAmountInput = rows[i].amount !== undefined && rows[i].amount !== null ? rows[i].amount : defaultAmount;
    const rawAmount = Number(rawAmountInput);

    if (!rawPhone || !PHONE_REGEX.test(rawPhone)) {
      results.push({ row: rowNumber, phoneNumber: rawPhone, amount: 0, status: "invalid", reason: "شماره موبایل معتبر نیست" });
      continue;
    }
    if (!rawAmount || rawAmount <= 0) {
      results.push({ row: rowNumber, phoneNumber: rawPhone, amount: 0, status: "invalid", reason: "مبلغ نامعتبر است" });
      continue;
    }
    if (seenInThisRequest.has(rawPhone)) {
      results.push({
        row: rowNumber,
        phoneNumber: rawPhone,
        amount: rawAmount,
        status: "duplicate",
        reason: "این شماره چند بار در همین لیست تکرار شده",
      });
      continue;
    }
    seenInThisRequest.add(rawPhone);

    // تضمین وجود این شماره در لیست سفید سازمانی (برای ثبت‌نام‌های آینده)
    const { data: existingNumber } = await supabaseAdmin
      .from("organizational_numbers")
      .select("id, organizationName")
      .eq("phoneNumber", rawPhone)
      .maybeSingle();

    if (!existingNumber) {
      await supabaseAdmin.from("organizational_numbers").insert([{ phoneNumber: rawPhone, organizationName: organization.name }]);
    } else if (existingNumber.organizationName !== organization.name) {
      results.push({
        row: rowNumber,
        phoneNumber: rawPhone,
        amount: rawAmount,
        status: "conflict_other_org",
        reason: `این شماره از قبل متعلق به سازمان «${existingNumber.organizationName}» است`,
      });
      continue;
    }

    // آیا کاربری با این شماره از قبل در بالکن ثبت‌نام کرده؟
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id, userType, organizationName")
      .eq("phoneNumber", rawPhone)
      .maybeSingle();

    if (existingUser) {
      if (existingUser.userType === "ORGANIZATIONAL" && existingUser.organizationName && existingUser.organizationName !== organization.name) {
        results.push({
          row: rowNumber,
          phoneNumber: rawPhone,
          amount: rawAmount,
          status: "conflict_other_org",
          reason: `این کاربر از قبل عضو سازمان «${existingUser.organizationName}» است`,
        });
        continue;
      }

      // اگر کاربر تا الان عادی بود (هنوز سازمانی نشده)، حالا رسماً عضو همین سازمان می‌شود
      if (existingUser.userType !== "ORGANIZATIONAL" || !existingUser.organizationName) {
        await supabaseAdmin
          .from("users")
          .update({ userType: "ORGANIZATIONAL", organizationName: organization.name })
          .eq("id", existingUser.id);
      }

      let { data: wallet } = await supabaseAdmin.from("wallets").select("*").eq("userId", existingUser.id).maybeSingle();
      if (!wallet) {
        const { data: newWallet } = await supabaseAdmin.from("wallets").insert([{ userId: existingUser.id }]).select().single();
        wallet = newWallet;
      }
      if (!wallet) {
        results.push({ row: rowNumber, phoneNumber: rawPhone, amount: rawAmount, status: "invalid", reason: "خطا در دسترسی به کیف پول این کاربر" });
        continue;
      }

      const currentBalance = Number(wallet.orgBalance);
      const newBalance = currentBalance + rawAmount;

      // کسر/افزایش شرطی (CAS) برای جلوگیری از Race Condition
      const { data: updatedWallet } = await supabaseAdmin
        .from("wallets")
        .update({ orgBalance: newBalance, updatedAt: new Date().toISOString() })
        .eq("id", wallet.id)
        .eq("orgBalance", currentBalance)
        .select()
        .maybeSingle();

      if (!updatedWallet) {
        results.push({
          row: rowNumber,
          phoneNumber: rawPhone,
          amount: rawAmount,
          status: "invalid",
          reason: "موجودی این کاربر هم‌زمان تغییر کرد؛ این ردیف را دوباره ارسال کنید",
        });
        continue;
      }

      const { error: txError } = await supabaseAdmin.from("transactions").insert([
        {
          walletId: wallet.id,
          organizationId: organization.id,
          amount: rawAmount,
          type: "DEPOSIT",
          walletType: "ORGANIZATIONAL",
          gatewayStatus: "SUCCESS",
          trackingCode: `EMP-BULKCHARGE-${admin.userId.slice(0, 8)}-${rowNumber}`,
        },
      ]);

      if (txError) {
        console.error("Bulk Charge Members Transaction Insert Error (rolled back):", txError);
        await supabaseAdmin
          .from("wallets")
          .update({ orgBalance: currentBalance, updatedAt: new Date().toISOString() })
          .eq("id", wallet.id);
        results.push({ row: rowNumber, phoneNumber: rawPhone, amount: rawAmount, status: "invalid", reason: "خطا در ثبت تراکنش؛ این ردیف اعمال نشد" });
        continue;
      }

      chargedNowTotal += rawAmount;
      results.push({ row: rowNumber, phoneNumber: rawPhone, amount: rawAmount, status: "charged_now" });
    } else {
      // کاربر هنوز ثبت‌نام نکرده — مبلغ به‌صورت معلق ذخیره می‌شود تا لحظه‌ی ثبت‌نام
      await createPendingOrganizationalCredit({
        phoneNumber: rawPhone,
        organizationName: organization.name,
        amount: rawAmount,
        createdByAdminId: admin.userId,
      });
      pendingTotal += rawAmount;
      results.push({ row: rowNumber, phoneNumber: rawPhone, amount: rawAmount, status: "pending_registration" });
    }
  }

  const chargedCount = results.filter((r) => r.status === "charged_now").length;
  const pendingCount = results.filter((r) => r.status === "pending_registration").length;
  const conflictCount = results.filter((r) => r.status === "conflict_other_org").length;
  const invalidCount = results.filter((r) => r.status === "invalid").length;
  const duplicateCount = results.filter((r) => r.status === "duplicate").length;

  if (chargedCount > 0 || pendingCount > 0) {
    await logAdminAction({
      adminId: admin.userId,
      actionType: "ORGANIZATION_CHANGE",
      description: `شارژ گروهی کارکنان سازمان «${organization.name}» از روی لیست شماره‌ها: ${chargedCount} نفر بلافاصله شارژ شدند (مجموع ${chargedNowTotal.toLocaleString(
        "fa-IR"
      )} تومان)، ${pendingCount} نفر هنوز در بالکن ثبت‌نام نکرده‌اند و شارژشان هنگام ثبت‌نام خودکار اعمال می‌شود (مجموع ${pendingTotal.toLocaleString(
        "fa-IR"
      )} تومان) — دلیل: ${reason.trim()}`,
      newValue: `${chargedCount + pendingCount} نفر`,
    });
  }

  return NextResponse.json({
    success: true,
    summary: {
      total: rows.length,
      chargedNow: chargedCount,
      pending: pendingCount,
      conflict: conflictCount,
      invalid: invalidCount,
      duplicate: duplicateCount,
      chargedNowTotal,
      pendingTotal,
    },
    results,
  });
}
