export default function SearchPageLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl animate-pulse">
      {/* اسکلت هدر خلاصه جستجو */}
      <div className="mb-8 flex flex-col gap-3">
        <div className="h-7 w-64 bg-slate-200 rounded-xl"></div>
        <div className="h-4 w-40 bg-slate-100 rounded-lg"></div>
      </div>

      {/* اسکلت لیست نتایج */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="w-full aspect-[4/3] bg-slate-200 rounded-2xl"></div>
            <div className="h-4 w-3/4 bg-slate-200 rounded-lg"></div>
            <div className="h-3 w-1/2 bg-slate-100 rounded-lg"></div>
            <div className="h-4 w-1/3 bg-slate-100 rounded-lg"></div>
          </div>
        ))}
      </div>
    </div>
  );
}