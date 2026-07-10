// مسیر: src/app/api/admin/corporate/leads/route.ts
// GET: لیست درخواست‌های (لیدهای) سازمانیِ ثبت‌شده از فرم عمومی /corporate،
// به همراه شمارش کلی هر وضعیت برای نمایش KPI در بالای تب «سازمانی» پنل ادمین.
// دسترسی از طریق requireAdminTabAccess با کلید "corporate" کنترل می‌شود؛
// SUPER_ADMIN بدون قیدوشرط و SUPPORT_AGENT فقط با داشتن این دسترسی وارد می‌شود.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminTabAccess } from "@/lib/auth/adminAuth";
import type { OrgLeadStatus } from "@/types/database";

const VALID_STATUSES: OrgLeadStatus[] = ["UNREAD", "CONTACTED", "CONTRACT_SIGNED", "REJECTED"];

export async function GET(request: NextRequest) {
  const admin = await requireAdminTabAccess(request, "corporate");
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim() || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from("organization_leads")
    .select("*", { count: "exact" })
    .order("createdAt", { ascending: false })
    .range(from, to);

  if (status && VALID_STATUSES.includes(status as OrgLeadStatus)) {
    query = query.eq("adminStatus", status);
  }

  if (search) {
    query = query.or(
      `companyName.ilike.%${search}%,contactPerson.ilike.%${search}%,phoneNumber.ilike.%${search}%`
    );
  }

  const [{ data: leads, error, count }, ...countResults] = await Promise.all([
    query,
    ...VALID_STATUSES.map((s) =>
      supabaseAdmin.from("organization_leads").select("id", { count: "exact", head: true }).eq("adminStatus", s)
    ),
  ]);

  if (error) {
    console.error("Admin Corporate Leads Fetch Error:", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت لیست درخواست‌های سازمانی" }, { status: 500 });
  }

  const counts = VALID_STATUSES.reduce((acc, s, idx) => {
    acc[s] = countResults[idx].count || 0;
    return acc;
  }, {} as Record<OrgLeadStatus, number>);

  return NextResponse.json({
    success: true,
    leads: leads || [],
    counts,
    pagination: { page, pageSize, total: count || 0 },
  });
}