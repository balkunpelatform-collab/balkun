export default function CheckoutPageLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl min-h-[70vh] animate-pulse">
      <div className="h-7 w-56 bg-slate-200 rounded-xl mb-8"></div>

      <div className="flex flex-col gap-6">
        {/* اسکلت خلاصه اقامتگاه */}
        <div className="flex gap-4 bg-white p-4 rounded-2xl border border-slate-100">
          <div className="w-24 h-24 bg-slate-200 rounded-xl shrink-0"></div>
          <div className="flex-1 flex flex-col gap-3 justify-center">
            <div className="h-4 w-3/4 bg-slate-200 rounded-lg"></div>
            <div className="h-3 w-1/2 bg-slate-100 rounded-lg"></div>
          </div>
        </div>

        {/* اسکلت فرم اطلاعات مسافر */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col gap-4">
          <div className="h-4 w-32 bg-slate-200 rounded-lg"></div>
          <div className="h-12 bg-slate-100 rounded-xl"></div>
          <div className="h-12 bg-slate-100 rounded-xl"></div>
        </div>

        {/* اسکلت جمع فاکتور */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col gap-3">
          <div className="h-4 w-24 bg-slate-200 rounded-lg"></div>
          <div className="h-3 w-full bg-slate-100 rounded-lg"></div>
          <div className="h-3 w-full bg-slate-100 rounded-lg"></div>
          <div className="h-10 w-full bg-slate-200 rounded-xl mt-2"></div>
        </div>
      </div>
    </div>
  );
}