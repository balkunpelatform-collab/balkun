export default function RoomPageLoading() {
  return (
    <main className="container mx-auto px-4 py-6 md:py-8 max-w-6xl animate-pulse">
      {/* اسکلت گالری تصاویر */}
      <div className="w-full h-64 md:h-[420px] bg-slate-200 rounded-3xl"></div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        {/* ستون سمت راست: اطلاعات */}
        <div className="lg:col-span-8 flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <div className="h-8 w-3/4 bg-slate-200 rounded-xl"></div>
            <div className="flex flex-wrap gap-3">
              <div className="h-8 w-32 bg-slate-100 rounded-full"></div>
              <div className="h-8 w-24 bg-slate-100 rounded-full"></div>
              <div className="h-8 w-28 bg-slate-100 rounded-full"></div>
            </div>
          </div>

          <div className="h-20 bg-slate-100 rounded-2xl"></div>

          <div className="flex flex-col gap-4">
            <div className="h-5 w-40 bg-slate-200 rounded-lg"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-xl"></div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="h-5 w-32 bg-slate-200 rounded-lg"></div>
            <div className="h-24 bg-slate-100 rounded-2xl"></div>
          </div>
        </div>

        {/* ستون سمت چپ: باکس رزرو */}
        <div className="lg:col-span-4">
          <div className="h-96 bg-slate-100 rounded-[2rem] border border-slate-100"></div>
        </div>
      </div>
    </main>
  );
}