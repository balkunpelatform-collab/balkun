import { notFound } from "next/navigation";
import { getRoomById } from "@/lib/otaghak/services/roomService";
import CheckoutClient from "@/components/checkout/CheckoutClient";

interface CheckoutPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkin: string; checkout: string; guests: string }>;
}

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const roomId = resolvedParams.id;
  const checkinUnix = Number(resolvedSearchParams.checkin);
  const checkoutUnix = Number(resolvedSearchParams.checkout);
  const guests = Number(resolvedSearchParams.guests);

  if (!roomId || !checkinUnix || !checkoutUnix || !guests) {
    // پارامترهای ناقص
    notFound();
  }

  // دیتا رو دوباره سمت سرور می‌گیریم تا قیمت غیرقابل دستکاری باشه
  const room = await getRoomById(roomId);
  
  if (!room) {
    notFound();
  }

  // محاسبات ایمن در لایه سرور جهت نمایش اولیه
  const nights = Math.max(1, Math.round((checkoutUnix - checkinUnix) / 86400));
  const extraGuests = Math.max(0, guests - room.personCapacity);
  const nightlyRate = room.afterDiscount + (extraGuests * room.extraPersonPrice);
  const totalAmount = nights * nightlyRate;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl min-h-[70vh]">
      <CheckoutClient 
        room={room} 
        checkinUnix={checkinUnix} 
        checkoutUnix={checkoutUnix} 
        guests={guests} 
        nights={nights}
        nightlyRate={nightlyRate}
        totalAmount={totalAmount}
      />
    </div>
  );
}