// مسیر: src/app/api/admin/corporate/numbers/bulk/route.ts
// 🆕 تسک ۶ چک‌لیست: افزودن گروهی شماره‌های سازمانی از طریق فایل (CSV/Excel).
// قبل از این فایل، تنها راه افزودن شماره به لیست سفید سازمانی، فرم تکی
// (POST /api/admin/corporate/numbers) بود که هر بار فقط یک شماره اضافه می‌کرد.
//
// این روت، ردیف‌های آماده‌شده در سمت مرورگر (بعد از پارس فایل CSV/Excel توسط
// خودِ صفحه‌ی ادمین) را به‌صورت گروهی دریافت و یک‌به‌یک با همان قوانین اعتبارسنجی
// فرم تکی (رجکس شماره موبایل ایران + طول نام سازمان) بررسی و درج می‌کند.
// چون درج دسته‌جمعی Supabase در صورت تکراری‌بودن حتی یک شماره، کل عملیات را
// شکست می‌دهد، این‌جا هر ردیف جداگانه درج می‌شود تا بقیه‌ی ردیف‌های معتبر فایل
// (در صورت تکراری یا نامعتبر بودن چند ردیف دیگر) بدون مشکل ثبت شوند و گزارش
// دقیقی از نتیجه‌ی هر ردیف به ادمین برگردد.
//
// 🆕 تسک ۷ چک‌لیست کارفرما (تفکیک کیف پول سازمانی + شارژ خودکار + غیرفعال‌سازی سازمان):
// بعد از پایان درج، برای تمام نام‌های سازمانِ منحصربه‌فردی که حداقل یک شماره‌ی جدید
// برایشان با موفقیت درج شد، ردیف سازمان در جدول `organizations` تضمین می‌شود
// (ensureOrganizationExists) تا فوراً در تب «کیف پول‌های سازمانی» پنل ادمین دیده شوند.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminTabAccess, logAdminAction } from "@/lib/auth/adminAuth";
import { ensureOrganizationExists } from "@/lib/wallet/ensureOrganization";

const PHONE_REGEX = /^09[0-9]{9}$/;
const MAX_ROWS_PER_UPLOAD = 1000;

interface BulkRow {
  phoneNumber?: string;
  organizationName?: string;
}

interface RowResult {
  row: number; // شماره ردیف در فایل (برای نمایش خطا به ادمین)، از ۱ شروع می‌شود
  phoneNumber: string;
  organizationName: string;
  status: "inserted" | "duplicate" | "invalid";
  reason?: string;
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminTabAccess(request, "corporate");
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const body = await request.json();
  const rows = body?.rows as BulkRow[] | undefined;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ success: false, error: "فایل خالی است یا هیچ ردیف قابل‌قبولی در آن یافت نشد" }, { status: 400 });
  }

  if (rows.length > MAX_ROWS_PER_UPLOAD) {
    return NextResponse.json(
      { success: false, error: `حداکثر ${MAX_ROWS_PER_UPLOAD} ردیف در هر بار آپلود مجاز است (تعداد ارسالی: ${rows.length})` },
      { status: 400 }
    );
  }

  const results: RowResult[] = [];
  // برای جلوگیری از تلاش برای درج دو ردیف با شماره‌ی یکسان از داخل خودِ همین فایل
  const seenInThisFile = new Set<string>();
  // 🆕 تسک ۷: نام سازمان‌هایی که حداقل یک شماره‌ی جدید برایشان درج شد
  const insertedOrgNames = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const rawPhone = (rows[i].phoneNumber || "").toString().trim();
    const rawOrgName = (rows[i].organizationName || "").toString().trim();
    const rowNumber = i + 1;

    if (!rawPhone || !PHONE_REGEX.test(rawPhone)) {
      results.push({ row: rowNumber, phoneNumber: rawPhone, organizationName: rawOrgName, status: "invalid", reason: "شماره موبایل معتبر نیست" });
      continue;
    }
    if (!rawOrgName || rawOrgName.length < 2) {
      results.push({ row: rowNumber, phoneNumber: rawPhone, organizationName: rawOrgName, status: "invalid", reason: "نام سازمان الزامی است" });
      continue;
    }
    if (seenInThisFile.has(rawPhone)) {
      results.push({ row: rowNumber, phoneNumber: rawPhone, organizationName: rawOrgName, status: "duplicate", reason: "این شماره چند بار در همین فایل تکرار شده" });
      continue;
    }
    seenInThisFile.add(rawPhone);

    const { error } = await supabaseAdmin
      .from("organizational_numbers")
      .insert([{ phoneNumber: rawPhone, organizationName: rawOrgName }]);

    if (error) {
      if (error.code === "23505") {
        results.push({ row: rowNumber, phoneNumber: rawPhone, organizationName: rawOrgName, status: "duplicate", reason: "این شماره قبلاً در لیست سفید سازمانی ثبت شده است" });
      } else {
        console.error("Admin Corporate Bulk Number Insert Error:", error);
        results.push({ row: rowNumber, phoneNumber: rawPhone, organizationName: rawOrgName, status: "invalid", reason: "خطای دیتابیس هنگام درج این ردیف" });
      }
      continue;
    }

    insertedOrgNames.add(rawOrgName);
    results.push({ row: rowNumber, phoneNumber: rawPhone, organizationName: rawOrgName, status: "inserted" });
  }

  const insertedCount = results.filter((r) => r.status === "inserted").length;
  const duplicateCount = results.filter((r) => r.status === "duplicate").length;
  const invalidCount = results.filter((r) => r.status === "invalid").length;

  // 🆕 تسک ۷: تضمین وجود ردیف سازمان برای تمام سازمان‌های تازه‌دیده‌شده در این فایل
  for (const orgName of insertedOrgNames) {
    await ensureOrganizationExists(orgName);
  }

  if (insertedCount > 0) {
    await logAdminAction({
      adminId: admin.userId,
      actionType: "CORPORATE_NUMBER_CHANGE",
      description: `افزودن گروهی ${insertedCount} شماره به لیست سفید سازمانی از طریق فایل (${duplicateCount} تکراری، ${invalidCount} نامعتبر رد شد)`,
      newValue: `${insertedCount} شماره`,
    });
  }

  return NextResponse.json({
    success: true,
    summary: { total: rows.length, inserted: insertedCount, duplicate: duplicateCount, invalid: invalidCount },
    results,
  });
}