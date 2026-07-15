// مسیر: src/app/api/admin/wallet-history/route.ts
//
// 🆕 تسک ۱ چک‌لیست کارفرما (تاریخچه کیف پول برای مالی و مدیر ارشد):
// GET: لیست کامل و صفحه‌بندی‌شده‌ی تمام تراکنش‌های کیف پول در کل سیستم (همه‌ی کاربران،
// عادی و سازمانی)، به همراه دسته‌بندی معنایی هر تراکنش (واریز/برداشت/شارژ/برگشت طبق
// src/lib/wallet/transactionSource.ts) و اطلاعات کاربر/سازمان مرتبط.
//
// دسترسی: فقط SUPER_ADMIN و FINANCE_MANAGER — این یک عملیات مالی/حساس است (مثل شارژ
// دستی کیف پول)، پس عمداً از سیستم تب‌های تفویضی SUPPORT_AGENT (requireAdminTabAccess)
// استفاده نمی‌کند و مستقیماً با requireAdminRole کنترل می‌شود.
//
// 🆕 تسک ۷ چک‌لیست کارفرما (تفکیک کیف پول سازمانی + شارژ خودکار + غیرفعال‌سازی سازمان):
// از این پس بعضی تراکنش‌ها (شارژ/کسر دستی یا خودکار مستقیم روی استخر مشترک یک سازمان،
// بدون تعلق به یک کاربر مشخص) walletId ندارند و فقط organizationId دارند. این روت برای
// چنین تراکنش‌هایی، به‌جای اطلاعات یک کاربر، یک شبه-owner با نام سازمان می‌سازد تا در
// همان جدول قبلی (بدون نیاز به تغییر src/app/admin/wallet-history/page.tsx) درست نمایش
// داده شود. همچنین جستجو (search) حالا علاوه بر نام/موبایل کاربر، نام سازمان را هم در
// جدول organizations جستجو می‌کند تا این تراکنش‌های سطح-سازمان هم در نتایج جستجو بیایند.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole } from "@/lib/auth/adminAuth";
import { classifyTransactionSource, type TransactionSourceCategory } from "@/lib/wallet/transactionSource";

const VALID_CATEGORIES: TransactionSourceCategory[] = [
  "GATEWAY_DEPOSIT",
  "MANUAL_CHARGE",
  "REFUND",
  "BOOKING_PAYMENT",
  "MANUAL_WITHDRAWAL",
  "ORG_MANUAL_CHARGE",
  "ORG_MANUAL_WITHDRAWAL",
  "ORG_AUTO_CHARGE",
  "OTHER_DEPOSIT",
  "OTHER_WITHDRAWAL",
];

export async function GET(request: NextRequest) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN", "FINANCE_MANAGER"]);
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || ""; // نام، شماره موبایل یا نام سازمان
  const walletType = searchParams.get("walletType"); // NORMAL | ORGANIZATIONAL
  const type = searchParams.get("type"); // DEPOSIT | WITHDRAWAL
  const category = searchParams.get("category") as TransactionSourceCategory | null;
  const dateFrom = searchParams.get("dateFrom"); // YYYY-MM-DD
  const dateTo = searchParams.get("dateTo"); // YYYY-MM-DD
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // اگر جستجو بر اساس نام/موبایل/سازمان بود، ابتدا شناسه‌ی کاربران و سازمان‌های منطبق را پیدا می‌کنیم
  let matchedUserIds: string[] | null = null;
  let matchedOrganizationIds: string[] | null = null;
  if (search) {
    const [{ data: matchedUsers }, { data: matchedOrganizations }] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("id")
        .or(`firstName.ilike.%${search}%,lastName.ilike.%${search}%,phoneNumber.ilike.%${search}%,organizationName.ilike.%${search}%`),
      supabaseAdmin.from("organizations").select("id").ilike("name", `%${search}%`),
    ]);

    matchedUserIds = (matchedUsers || []).map((u) => u.id);
    matchedOrganizationIds = (matchedOrganizations || []).map((o) => o.id);

    if (matchedUserIds.length === 0 && matchedOrganizationIds.length === 0) {
      return NextResponse.json({
        success: true,
        transactions: [],
        pagination: { page, pageSize, total: 0 },
      });
    }
  }

  // برای فیلتر بر اساس userId باید ابتدا walletId های متناظر را پیدا کنیم
  // (چون transactions مستقیماً userId ندارد، فقط walletId دارد)
  let walletIdFilter: string[] | null = null;
  if (matchedUserIds) {
    if (matchedUserIds.length === 0) {
      walletIdFilter = [];
    } else {
      const { data: matchedWallets } = await supabaseAdmin
        .from("wallets")
        .select("id")
        .in("userId", matchedUserIds);
      walletIdFilter = (matchedWallets || []).map((w) => w.id);
    }
  }

  let query = supabaseAdmin
    .from("transactions")
    .select("*", { count: "exact" })
    .order("createdAt", { ascending: false })
    .range(from, to);

  if (walletType === "NORMAL" || walletType === "ORGANIZATIONAL") {
    query = query.eq("walletType", walletType);
  }
  if (type === "DEPOSIT" || type === "WITHDRAWAL") {
    query = query.eq("type", type);
  }
  if (dateFrom) {
    query = query.gte("createdAt", new Date(dateFrom).toISOString());
  }
  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    query = query.lte("createdAt", toDate.toISOString());
  }

  // 🆕 تسک ۷: وقتی جستجو فعال است، تراکنش باید یا از کاربر منطبق‌شده (از طریق walletId)
  // یا از سازمان منطبق‌شده (از طریق organizationId مستقیم) باشد
  if (walletIdFilter && matchedOrganizationIds) {
    const walletPart = walletIdFilter.length > 0 ? `walletId.in.(${walletIdFilter.join(",")})` : "";
    const orgPart = matchedOrganizationIds.length > 0 ? `organizationId.in.(${matchedOrganizationIds.join(",")})` : "";
    const orParts = [walletPart, orgPart].filter(Boolean);
    if (orParts.length === 0) {
      return NextResponse.json({ success: true, transactions: [], pagination: { page, pageSize, total: 0 } });
    }
    query = query.or(orParts.join(","));
  }

  const { data: transactions, error, count } = await query;

  if (error) {
    console.error("Admin Wallet History Fetch Error:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت تاریخچه کیف پول" }, { status: 500 });
  }

  // پیوست دسته‌بندی معنایی (واریز/برداشت/شارژ/برگشت) به هر تراکنش
  let enriched = (transactions || []).map((tx) => ({
    ...tx,
    source: classifyTransactionSource({ type: tx.type, trackingCode: tx.trackingCode }),
  }));

  // 🆕 فیلتر بر اساس دسته‌ی معنایی (بعد از استخراج، چون در دیتابیس ذخیره نشده است)
  if (category && VALID_CATEGORIES.includes(category)) {
    enriched = enriched.filter((tx) => tx.source.category === category);
  }

  // پیوست اطلاعات کاربر مرتبط با هر کیف پول شخصی
  const walletIds = Array.from(new Set(enriched.map((tx) => tx.walletId).filter((id): id is string => Boolean(id))));
  let walletsMap: Record<string, { userId: string }> = {};
  if (walletIds.length > 0) {
    const { data: wallets } = await supabaseAdmin.from("wallets").select("id, userId").in("id", walletIds);
    walletsMap = (wallets || []).reduce((acc, w) => {
      acc[w.id] = { userId: w.userId };
      return acc;
    }, {} as typeof walletsMap);
  }

  const userIds = Array.from(new Set(Object.values(walletsMap).map((w) => w.userId)));
  let usersMap: Record<
    string,
    { firstName: string; lastName: string; phoneNumber: string; userType: string; organizationName: string | null }
  > = {};
  if (userIds.length > 0) {
    const { data: users } = await supabaseAdmin
      .from("users")
      .select("id, firstName, lastName, phoneNumber, userType, organizationName")
      .in("id", userIds);
    usersMap = (users || []).reduce((acc, u) => {
      acc[u.id] = {
        firstName: u.firstName,
        lastName: u.lastName,
        phoneNumber: u.phoneNumber,
        userType: u.userType,
        organizationName: u.organizationName,
      };
      return acc;
    }, {} as typeof usersMap);
  }

  // 🆕 تسک ۷: پیوست نام سازمان برای تراکنش‌های سطح-سازمان (walletId خالی، فقط organizationId)
  const orgIdsNeeded = Array.from(
    new Set(enriched.filter((tx) => !tx.walletId && tx.organizationId).map((tx) => tx.organizationId as string))
  );
  let organizationsMap: Record<string, string> = {};
  if (orgIdsNeeded.length > 0) {
    const { data: organizations } = await supabaseAdmin.from("organizations").select("id, name").in("id", orgIdsNeeded);
    organizationsMap = (organizations || []).reduce((acc, o) => {
      acc[o.id] = o.name;
      return acc;
    }, {} as typeof organizationsMap);
  }

  const finalTransactions = enriched.map((tx) => {
    if (tx.walletId) {
      const ownerId = walletsMap[tx.walletId]?.userId || null;
      return {
        ...tx,
        owner: ownerId ? usersMap[ownerId] || null : null,
      };
    }

    // تراکنش سطح-سازمان (بدون walletId) — شبه-owner با نام سازمان می‌سازیم
    if (tx.organizationId && organizationsMap[tx.organizationId]) {
      return {
        ...tx,
        owner: {
          firstName: "کیف پول",
          lastName: "مشترک سازمان",
          phoneNumber: "—",
          userType: "ORGANIZATIONAL",
          organizationName: organizationsMap[tx.organizationId],
        },
      };
    }

    return { ...tx, owner: null };
  });

  return NextResponse.json({
    success: true,
    transactions: finalTransactions,
    // 🆕 نکته: چون فیلتر «category» بعد از دریافت از دیتابیس اعمال می‌شود، اگر این فیلتر
    // فعال باشد، «total» برابر تعداد رکوردهای همین صفحه محاسبه می‌شود (نه کل دیتابیس) —
    // برای دقتِ کامل شمارش با فیلتر دسته‌بندی، از فیلترهای دیگر (نوع/تاریخ/جستجو) هم‌زمان استفاده کنید.
    pagination: {
      page,
      pageSize,
      total: category ? finalTransactions.length + from : count || 0,
    },
  });
}