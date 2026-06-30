import { Info, FileText, ShieldAlert } from "lucide-react";

interface RoomRulesProps {
  roomRules: string[];
  authenticationDocuments: string[];
  cancelRuleTypeTitle: string;
  cancelRuleTypeDescription: string;
}

export default function RoomRules({
  roomRules,
  authenticationDocuments,
  cancelRuleTypeTitle,
  cancelRuleTypeDescription,
}: RoomRulesProps) {
  return (
    <div className="flex flex-col gap-6 pt-6 border-t border-slate-100">
      <h3 className="text-lg font-black text-balkun-navy flex items-center gap-2">
        <Info className="w-5 h-5 text-balkun-orange" />
        قوانین و مقررات
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* قوانین اقامت */}
        <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 flex flex-col gap-4">
          <h4 className="text-sm font-black text-slate-700 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-400" />
            قوانین اقامت
          </h4>
          <ul className="flex flex-col gap-3">
            {roomRules && roomRules.length > 0 ? (
              roomRules.map((rule, idx) => (
                <li key={idx} className="text-sm font-medium text-slate-600 leading-relaxed flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 mt-2"></span>
                  <span>{rule}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-slate-400">قانون خاصی ثبت نشده است.</li>
            )}
          </ul>
        </div>

        {/* مدارک مورد نیاز */}
        <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 flex flex-col gap-4">
          <h4 className="text-sm font-black text-slate-700 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-slate-400" />
            مدارک محرمیت و شناسایی
          </h4>
          <ul className="flex flex-col gap-3">
            {authenticationDocuments && authenticationDocuments.length > 0 ? (
              authenticationDocuments.map((doc, idx) => (
                <li key={idx} className="text-sm font-medium text-slate-600 leading-relaxed flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-balkun-orange/50 shrink-0 mt-2"></span>
                  <span>{doc}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-slate-400">مدرک خاصی ذکر نشده است.</li>
            )}
          </ul>
        </div>

      </div>

      {/* قوانین لغو رزرو */}
      <div className="bg-red-50/50 rounded-3xl p-5 border border-red-100 flex flex-col gap-3 mt-2">
        <h4 className="text-sm font-black text-red-600 flex items-center gap-1.5">
          سیاست لغو رزرو: {cancelRuleTypeTitle}
        </h4>
        <p className="text-sm font-medium text-red-900/70 leading-relaxed text-justify">
          {cancelRuleTypeDescription || "اطلاعات مربوط به قوانین لغو این اقامتگاه ثبت نشده است."}
        </p>
      </div>

    </div>
  );
}