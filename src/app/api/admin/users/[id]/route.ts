// مسیر: src/app/api/admin/users/[id]/route.ts
// GET: جزئیات کامل یک کاربر برای صفحه پروفایل کاربر در پنل ادمین —
// شامل اطلاعات پایه، موجودی کیف پول، ۱۰ تراکنش اخیر و ۱۰ رزرو اخیر.
// دسترسی: فقط SUPER_ADMIN (شامل اطلاعات مالی حساس).

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole } from "@/lib/auth/adminAuth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
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
    recentTransactions: transactions ?? [],
    recentBookings: bookings ?? [],
  });
}