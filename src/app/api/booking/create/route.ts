// مسیر: src/app/api/booking/create/route.ts
// نکته امنیتی مهم: پیش‌تر userId مستقیماً از بدنه درخواست کلاینت خوانده می‌شد که یعنی
// هر کاربر می‌توانست تئوریاً برای شناسه کاربری دیگری رزرو ثبت کند. از این پس userId
// فقط از هدر امن x-balkun-user-id (تزریق‌شده توسط middleware پس از تایید نشست) خوانده می‌شود.

import { NextRequest, NextResponse } from "next/server";
import { getRoomById } from "@/lib/otaghak/services/roomService";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isValidIranianNationalCode } from "@/utils/validateNationalCode";

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