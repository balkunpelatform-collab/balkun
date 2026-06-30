// مسیر: src/app/api/user/wallet/route.ts
// API برای دریافت اطلاعات کیف پول و تراکنش‌ها

import { NextRequest, NextResponse } from "next/server";

// Mock Database
const MOCK_WALLETS = new Map();
const MOCK_TRANSACTIONS = new Map();

// Helper: استخراج userId از توکن
function getUserIdFromToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer balkun-token-")) {
    return null;
  }
  return authHeader.replace("Bearer balkun-token-", "");
}

// GET: دریافت اطلاعات کیف پول و تراکنش‌های اخیر
export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req.headers.get("authorization"));

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "احراز هویت ناموفق" },
        { status: 401 }
      );
    }

    // TODO: در فاز ۶ با Supabase و درگاه پرداخت
    // const { data: walletData } = await supabase
    //   .from('wallets')
    //   .select('*')
    //   .eq('user_id', userId)
    //   .single();
    //
    // const { data: transactions } = await supabase
    //   .from('transactions')
    //   .select('*')
    //   .eq('wallet_id', walletData.id)
    //   .order('created_at', { ascending: false })
    //   .limit(10);

    // Mock Data - فعلاً یک والت خالی نشان می‌دهیم
    // در فاز ۶ این بخش کامل می‌شود
    const mockWallet = MOCK_WALLETS.get(userId) || {
      id: `wallet-${userId}`,
      userId,
      normalBalance: 0,
      orgBalance: 0,
      updatedAt: new Date().toISOString()
    };

    const mockTransactions = MOCK_TRANSACTIONS.get(userId) || [];

    return NextResponse.json({
      success: true,
      wallet: mockWallet,
      recentTransactions: mockTransactions
    });
  } catch (error) {
    console.error("Error fetching wallet:", error);
    return NextResponse.json(
      { success: false, error: "خطا در دریافت اطلاعات کیف پول" },
      { status: 500 }
    );
  }
}

// POST: شارژ کیف پول (فقط برای تست - در فاز ۶ با درگاه واقعی)
export async function POST(req: NextRequest) {
  try {
    const userId = getUserIdFromToken(req.headers.get("authorization"));

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "احراز هویت ناموفق" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: false,
      error: "این بخش در فاز ۶ (درگاه پرداخت) فعال خواهد شد"
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "خطا در پردازش درخواست" },
      { status: 500 }
    );
  }
}
