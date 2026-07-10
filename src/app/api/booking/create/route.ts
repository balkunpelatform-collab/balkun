// مسیر: src/app/api/booking/create/route.ts
// نکته امنیتی مهم: پیش‌تر userId مستقیماً از بدنه درخواست کلاینت خوانده می‌شد که یعنی
// هر کاربر می‌توانست تئوریاً برای شناسه کاربری دیگری رزرو ثبت کند. از این پس userId
// فقط از هدر امن x-balkun-user-id (تزریق‌شده توسط middleware پس از تایید نشست) خوانده می‌شود.

import { NextRequest, NextResponse } from "next/server";
import { getRoomById } from "@/lib/otaghak/services/roomService";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isValidIranianNationalCode } from "@/utils/validateNationalCode";

// همان الگوی تشخیص UUID که در roomService.ts استفاده شده: یعنی این اقامتگاه
// مستقیماً توسط خود بالکن در جدول accommodations ثبت شده (نه از طریق اتاقک).
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-balkun-user-id");
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "برای ثبت رزرو ابتدا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    const { roomId, checkinUnix, checkoutUnix, guests, nationalCode } = await request.json();

    if (!roomId || !checkinUnix || !checkoutUnix || !guests || !nationalCode) {
      return NextResponse.json({ success: false, error: "اطلاعات ناقص است" }, { status: 400 });
    }

    // ۰. اعتبارسنجی کد ملی در سمت سرور (الزامی - نباید فقط به فرانت‌اند اعتماد کرد)
    if (!isValidIranianNationalCode(String(nationalCode))) {
      return NextResponse.json({ success: false, error: "کد ملی واردشده معتبر نیست" }, { status: 400 });
    }

    // ۱. دریافت مجدد اطلاعات اقامتگاه به صورت امن (این دیتا ۵٪ بالکن رو از قبل داره)
    const room = await getRoomById(roomId);

    if (!room) {
      return NextResponse.json({ success: false, error: "اقامتگاه یافت نشد" }, { status: 404 });
    }

    // ۲. اعتبارسنجی ظرفیت
    const maxCapacity = room.personCapacity + room.extraPersonCapacity;
    if (guests > maxCapacity) {
      return NextResponse.json({ success: false, error: "تعداد مسافران بیش از ظرفیت مجاز است" }, { status: 400 });
    }

    // ۳. محاسبه مجدد فاکتور (Security Check)
    const nights = Math.max(1, Math.round((checkoutUnix - checkinUnix) / 86400));
    const extraGuests = Math.max(0, guests - room.personCapacity);
    const nightlyRate = room.afterDiscount + extraGuests * room.extraPersonPrice;
    const totalPaidAmount = nights * nightlyRate;

    // تبدیل Timestamp به ISO Date برای ذخیره در دیتابیس
    const checkInDate = new Date(checkinUnix * 1000).toISOString();
    const checkOutDate = new Date(checkoutUnix * 1000).toISOString();

    // 🆕 تسک ۱.۵ — جلوگیری از رزرو همپوشان (Double Booking) برای اقامتگاه‌های اختصاصی بالکن.
    // فقط وقتی roomId یک UUID است (یعنی اقامتگاه در جدول accommodations خود بالکن ثبت شده،
    // نه اقامتگاه اتاقک) این بررسی انجام می‌شود. این یک لایه‌ی «پیام خطای سریع و دوستانه» است؛
    // لایه‌ی نهایی و ضدِ Race-Condition همان Constraint سطح دیتابیس است که در پایین insert
    // هم مدیریت شده (کد خطای 23P01) — پیشنهاد SQL آن انتهای پیام چت آمده.
    if (UUID_REGEX.test(roomId)) {
      const { data: overlappingBookings, error: overlapError } = await supabaseAdmin
        .from("bookings")
        .select("id")
        .eq("roomId", roomId)
        .in("status", ["WAITING_FOR_PAYMENT", "PAID_CONFIRMED"])
        .lt("checkInDate", checkOutDate)
        .gt("checkOutDate", checkInDate)
        .limit(1);

      if (overlapError) {
        console.error("Booking Overlap Check Error:", overlapError);
        throw new Error("خطا در بررسی تاریخ رزرو");
      }

      if (overlappingBookings && overlappingBookings.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "این بازه‌ی تاریخی برای این اقامتگاه قبلاً رزرو شده است. لطفاً تاریخ دیگری انتخاب کنید.",
          },
          { status: 409 }
        );
      }
    }

    // ۴. ثبت رکورد در جدول Bookings
    const { data: booking, error: dbError } = await supabaseAdmin
      .from("bookings")
      .insert([
        {
          userId,
          roomId,
          roomName: room.roomName,
          checkInDate,
          checkOutDate,
          basePersonCount: room.personCapacity,
          extraPersonCount: extraGuests,
          nationalCode: String(nationalCode),
          totalPaidAmount,
          status: "WAITING_FOR_PAYMENT", // فعلا منتظر پرداخته (در فاز ۶ به درگاه وصل می‌شه)
          isVisibleForUser: true,
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error("Booking Insert Error:", dbError);
      // 🆕 اگر Constraint سطح دیتابیس (پیشنهادشده در پایین پیام چت) فعال باشد،
      // در همان لحظه‌ی رزروهای هم‌زمان (Race Condition) این کد خطا برمی‌گردد.
      if ((dbError as { code?: string }).code === "23P01") {
        return NextResponse.json(
          {
            success: false,
            error: "این بازه‌ی تاریخی برای این اقامتگاه قبلاً رزرو شده است. لطفاً تاریخ دیگری انتخاب کنید.",
          },
          { status: 409 }
        );
      }
      throw new Error("خطا در ثبت دیتابیس");
    }

    // TODO: وقتی Credentials واقعی اتاقک رسید، اینجا باید درخواست رزرو به API اتاقک هم ارسال بشه
    // و otaghakBookingId توی دیتابیس آپدیت بشه.

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      message: "رزرو با موفقیت ثبت شد",
    });
  } catch (error) {
    console.error("Booking Create API Error:", error);
    return NextResponse.json({ success: false, error: "خطا در پردازش درخواست" }, { status: 500 });
  }
}