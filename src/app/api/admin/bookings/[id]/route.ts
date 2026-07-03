
// مسیر: src/app/api/admin/bookings/[id]/route.ts
// 🆕 فایل جدید — قابلیت جاافتاده‌ی «ویرایش/حذف رزرو توسط ادمین» که در بازبینی درخواست شد.
//
// PATCH  → لغو رزرو توسط ادمین همراه با ثبت اجباری «دلیل لغو» (cancelReason). اگر رزرو قبلاً
//          به صورت قطعی (PAID_CONFIRMED) پرداخت شده باشد، مبلغ به‌صورت خودکار به کیف پول
//          مسافر عودت داده می‌شود — دقیقاً مطابق منطق src/app/api/user/bookings/[id]/cancel،
//          چون هیچ سرمایه‌ای نباید بدون ثبت تراکنش رسمی جابه‌جا شود.
// DELETE → حذف کامل و دائمی یک رکورد رزرو از دیتابیس. این عملیات غیرقابل بازگشت است و صرفاً
//          برای رزروهای تستی/اشتباهی که هرگز نباید در سیستم می‌بودند طراحی شده — نه برای لغو
//          رزروهای واقعی مسافران (برای آن حالت از همین PATCH برای لغو با ثبت دلیل استفاده کنید).
//          حذف باعث پاک شدن سابقه‌ی تراکنش‌های مالی نمی‌شود، چون ستون bookingId در جدول
//          transactions با ON DELETE SET NULL تعریف شده است.
//
// دسترسی هر دو عملیات: فقط SUPER_ADMIN. طبق بخش ۵ سند فاز ۹، SUPPORT_AGENT فقط اجازه‌ی
// مشاهده‌ی لیست رزروها را دارد، نه تغییر یا حذف — این‌ها اقدامات مالی/حساس محسوب می‌شوند.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRole, logAdminAction } from "@/lib/auth/adminAuth";
import { sendBookingCancelledSms, sendRefundSms } from "@/lib/sms/smsService";
import { formatPrice } from "@/utils/priceCalculator";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "این عملیات فقط برای مدیر ارشد (SUPER_ADMIN) مجاز است" },
        { status: 403 }
      );
    }

    const { id: bookingId } = await params;
    const body = await request.json();
    const { status, reason } = body;

    // فعلاً تنها تغییر وضعیت مجاز از این مسیر، «لغو توسط ادمین» است. اگر در آینده عملیات
    // دیگری (مثل تغییر تاریخ) اضافه شود، باید این بخش گسترش یابد.
    if (status !== "CANCELLED_BY_HOST") {
      return NextResponse.json({ success: false, error: "وضعیت درخواستی نامعتبر است" }, { status: 400 });
    }
    if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: "درج دلیل لغو الزامی است (حداقل ۵ کاراکتر)" },
        { status: 400 }
      );
    }

    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (fetchError || !booking) {
      return NextResponse.json({ success: false, error: "رزرو یافت نشد" }, { status: 404 });
    }

    if (["CANCELLED_BY_GUEST", "CANCELLED_BY_HOST"].includes(booking.status)) {
      return NextResponse.json({ success: false, error: "این رزرو قبلاً لغو شده است" }, { status: 400 });
    }

    const wasPaidConfirmed = booking.status === "PAID_CONFIRMED";

    // اگر رزرو قطعی و پرداخت‌شده بود، پول را قبل از تغییر وضعیت به کیف پول مسافر برمی‌گردانیم
    if (wasPaidConfirmed) {
      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("id, normalBalance")
        .eq("userId", booking.userId)
        .maybeSingle();

      if (wallet) {
        const newBalance = Number(wallet.normalBalance) + Number(booking.totalPaidAmount);

        await supabaseAdmin
          .from("wallets")
          .update({ normalBalance: newBalance, updatedAt: new Date().toISOString() })
          .eq("id", wallet.id);

        await supabaseAdmin.from("transactions").insert([
          {
            walletId: wallet.id,
            amount: booking.totalPaidAmount,
            type: "DEPOSIT",
            walletType: "NORMAL",
            gatewayStatus: "SUCCESS",
            bookingId: booking.id,
            trackingCode: `ADMIN-REFUND-${booking.id.split("-")[0]}`,
          },
        ]);
      }
    }

    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({ status: "CANCELLED_BY_HOST", cancelReason: reason.trim() })
      .eq("id", bookingId)
      .select()
      .single();

    if (updateError) {
      console.error("Admin Booking Cancel Error:", updateError);
      return NextResponse.json({ success: false, error: "خطا در ثبت لغو رزرو" }, { status: 500 });
    }

    // ثبت اجباری در لاگ ممیزی (طبق الزام امنیتی بخش ۵ سند فاز ۹)
    await logAdminAction({
      adminId: admin.userId,
      actionType: "BOOKING_STATUS_CHANGE",
      targetUserId: booking.userId,
      description: `لغو رزرو «${booking.roomName}» (شناسه رزرو: ${booking.id}) توسط ادمین. دلیل: ${reason.trim()}`,
      previousValue: booking.status,
      newValue: "CANCELLED_BY_HOST",
    });

    // اطلاع‌رسانی پیامکی (غیرحیاتی — نباید پاسخ موفق را مختل کند)
    try {
      const { data: guestUser } = await supabaseAdmin
        .from("users")
        .select("phoneNumber, firstName")
        .eq("id", booking.userId)
        .maybeSingle();

      if (guestUser) {
        await sendBookingCancelledSms(guestUser.phoneNumber, guestUser.firstName, booking.roomName, "HOST");
        if (wasPaidConfirmed) {
          await sendRefundSms(guestUser.phoneNumber, guestUser.firstName, formatPrice(booking.totalPaidAmount));
        }
      }
    } catch (smsError) {
      console.error("Admin Booking Cancel SMS Error (non-blocking):", smsError);
    }

    return NextResponse.json({
      success: true,
      message: "رزرو با موفقیت لغو شد" + (wasPaidConfirmed ? " و مبلغ به کیف پول مسافر عودت داده شد." : "."),
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Admin Booking PATCH Error:", error);
    return NextResponse.json({ success: false, error: "خطا در پردازش درخواست" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const admin = await requireAdminRole(request, ["SUPER_ADMIN"]);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "این عملیات فقط برای مدیر ارشد (SUPER_ADMIN) مجاز است" },
        { status: 403 }
      );
    }

    const { id: bookingId } = await params;

    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (fetchError || !booking) {
      return NextResponse.json({ success: false, error: "رزرو یافت نشد" }, { status: 404 });
    }

    const { error: deleteError } = await supabaseAdmin.from("bookings").delete().eq("id", bookingId);

    if (deleteError) {
      console.error("Admin Booking Delete Error:", deleteError);
      return NextResponse.json({ success: false, error: "خطا در حذف رزرو" }, { status: 500 });
    }

    // ثبت اجباری در لاگ ممیزی — چون حذف دائمی است، اطلاعات کامل رزرو قبل از حذف را
    // در previousValue نگه می‌داریم تا در صورت نیاز بعداً قابل بررسی باشد.
    await logAdminAction({
      adminId: admin.userId,
      actionType: "BOOKING_DELETE",
      targetUserId: booking.userId,
      description: `حذف دائمی رزرو «${booking.roomName}» (شناسه رزرو: ${booking.id}) توسط ادمین.`,
      previousValue: JSON.stringify({
        status: booking.status,
        totalPaidAmount: booking.totalPaidAmount,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        otaghakBookingId: booking.otaghakBookingId,
      }),
      newValue: null,
    });

    return NextResponse.json({ success: true, message: "رزرو برای همیشه حذف شد" });
  } catch (error) {
    console.error("Admin Booking DELETE Error:", error);
    return NextResponse.json({ success: false, error: "خطا در پردازش درخواست" }, { status: 500 });
  }
}