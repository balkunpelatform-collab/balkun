import Hero from "@/components/home/hero/Hero";
import FloatingSearchBox from "@/components/home/search/FloatingSearchBox";
import CategoryBar from "@/components/home/categories/CategoryBar";
import PropertyList from "@/components/home/properties/PropertyList";

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      {/* بخش بنر اصلی */}
      <Hero />
      
      {/* باکس جستجوی شناور */}
      <FloatingSearchBox />
      
      {/* نوار دسته‌بندی‌ها با اسکرول افقی */}
      <CategoryBar />

      {/* لیست اقامتگاه‌ها */}
      <PropertyList />
    </div>
  );
}