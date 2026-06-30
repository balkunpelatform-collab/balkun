import { notFound } from "next/navigation";
import { getRoomById } from "@/lib/otaghak/services/roomService";
import RoomGallery from "@/components/room/RoomGallery";
import RoomHostProfile from "@/components/room/RoomHostProfile";
import RoomAttributes from "@/components/room/RoomAttributes";
import RoomRules from "@/components/room/RoomRules";
import BookingWidget from "@/components/room/BookingWidget";
import { MapPin, Users } from "lucide-react";

// تولید متادیتای داینامیک برای سئوی فوق‌العاده گوگل
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const room = await getRoomById(resolvedParams.id);
  
  if (!room) return { title: "اقامتگاه یافت نشد | بالکن" };
  
  return {
    title: `رزرو ${room.roomName} در ${room.cityName} | بالکن`,
    description: `اجاره ${room.roomType} در ${room.stateName}، ${room.cityName} با ظرفیت ${room.personCapacity} نفر. بهترین قیمت را در بالکن تجربه کنید.`,
  };
}

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  // فراخوانی اطلاعات از لایه سرویس
  // قیمتِ room.afterDiscount از قبل قانون تجاری ۵ درصد را دریافت کرده است
  const room = await getRoomById(resolvedParams.id);

  if (!room) {
    notFound();
  }

  return (
    <main className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">
      
      {/* بخش ۱: گالری تصاویر */}
      <RoomGallery media={room.roomMedia} />

      {/* ساختار گرید اصلی صفحه */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 relative">
        
        {/* ستون سمت راست: اطلاعات اصلی */}
        <div className="lg:col-span-8 flex flex-col gap-10">
            
            {/* هدر اطلاعات اولیه */}
            <div className="flex flex-col gap-4">
              <h1 className="text-2xl md:text-3xl font-black text-balkun-navy leading-tight">
                {room.roomName}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-500">
                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                  <MapPin className="w-4 h-4 text-balkun-cyan" />
                  <span>{room.stateName}، {room.cityName}</span>
                </div>
                
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 hidden sm:block"></span>
                
                <span className="text-balkun-navy bg-balkun-navy/5 px-3 py-1.5 rounded-full">
                  {room.roomType}
                </span>

                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 hidden sm:block"></span>
                
                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>پایه {room.personCapacity} نفر</span>
                  {room.extraPersonCapacity > 0 && (
                    <span className="text-slate-400"> (تا {room.extraPersonCapacity} نفر اضافه)</span>
                  )}
                </div>
              </div>
            </div>

            {/* کامپوننت مشخصات میزبان */}
            <RoomHostProfile 
              hostName={room.hostName} 
              hostAvatar={room.hostAvatar} 
              rating={room.rating} 
            />

            {/* کامپوننت امکانات */}
            <RoomAttributes 
              topAttributes={room.topAttributes} 
              allAttributes={room.allAttributes} 
            />

            {/* کامپوننت قوانین */}
            <RoomRules 
              roomRules={room.roomRules}
              authenticationDocuments={room.authenticationDocuments}
              cancelRuleTypeTitle={room.cancelRuleTypeTitle}
              cancelRuleTypeDescription={room.cancelRuleTypeDescription}
            />

        </div>

        {/* ستون سمت چپ: باکس چسبان تقویم رزرو (Booking Widget) */}
        <div className="lg:col-span-4 relative h-full">
            <BookingWidget 
              roomId={room.roomId}
              pricePerNight={room.afterDiscount} 
              extraPersonPrice={room.extraPersonPrice}
              baseCapacity={room.personCapacity}
              maxExtraCapacity={room.extraPersonCapacity}
            />
        </div>

      </div>
    </main>
  );
}