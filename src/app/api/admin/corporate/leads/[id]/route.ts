// مسیر: src/app/api/admin/corporate/leads/[id]/route.ts
// PATCH: تغییر وضعیت پیگیری (adminStatus) و/یا ثبت یادداشت داخلی (adminNote)
// برای یک لید سازمانی مشخص. طبق استاندارد پروژه، هر تغییر در admin_audit_logs
// ثبت می‌شود.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminTabAccess, logAdminAction } from "@/lib/auth/adminAuth";
import type { OrgLeadStatus } from "@/types/database";

const VALID_STATUSES: OrgLeadStatus[] = ["UNREAD", "CONTACTED", "CONTRACT_SIGNED", "REJECTED"];

const STATUS_LABELS: Record<OrgLeadStatus, string> = {
  UNREAD: "خوانده‌نشده",
  CONTACTED: "تماس گرفته شد",
  CONTRACT_SIGNED: "قرارداد بسته شد",
  REJECTED: "رد شد",
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdminTabAccess(request, "corporate");
  if (!admin) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id: leadId } = await params;
  const body = await request.json();
  const { adminStatus, adminNote } = body as { adminStatus?: string; adminNote?: string };

  if (adminStatus !== undefined && !VALID_STATUSES.includes(adminStatus as OrgLeadStatus)) {
    return NextResponse.json({ success: false, error: "وضعیت نامعتبر است" }, { status: 400 });
  }

  const { data: existingLead, error: fetchError } = await supabaseAdmin
    .from("organization_leads")
    .select("id, companyName, adminStatus")
    .eq("id", leadId)
    .maybeSingle();

  if (fetchError || !existingLead) {
    return NextResponse.json({ success: false, error: "درخواست سازمانی یافت نشد" }, { status: 404 });
  }

  const updatePayload: Record<string, string> = { updatedAt: new Date().toISOString() };
  if (adminStatus !== undefined) updatePayload.adminStatus = adminStatus;
  if (adminNote !== undefined) updatePayload.adminNote = adminNote;

  const { data: updatedLead, error: updateError } = await supabaseAdmin
    .from("organization_leads")
    .update(updatePayload)
    .eq("id", leadId)
    .select()
    .single();

  if (updateError) {
    console.error("Admin Corporate Lead Update Error:", updateError);
    return NextResponse.json({ success: false, error: "خطا در بروزرسانی درخواست سازمانی" }, { status: 500 });
  }

  if (adminStatus !== undefined && adminStatus !== existingLead.adminStatus) {
    await logAdminAction({
      adminId: admin.userId,
      actionType: "CORPORATE_LEAD_UPDATE",
      description: `تغییر وضعیت لید سازمانی «${existingLead.companyName}»`,
      previousValue: STATUS_LABELS[existingLead.adminStatus as OrgLeadStatus] ?? existingLead.adminStatus,
      newValue: STATUS_LABELS[adminStatus as OrgLeadStatus] ?? adminStatus,
    });
  }

  return NextResponse.json({ success: true, lead: updatedLead });
}