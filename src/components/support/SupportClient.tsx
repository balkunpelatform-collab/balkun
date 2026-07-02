// مسیر: src/components/support/SupportClient.tsx
// کامپوننت اصلی صفحه پشتیبانی: لیست تیکت‌ها + فرم ایجاد تیکت جدید.
// نمای گفتگوی هر تیکت در TicketChatView.tsx پیاده‌سازی شده.

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, MessageCircleQuestion, Loader2, ChevronLeft } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { TICKET_CATEGORIES, TICKET_STATUS_LABELS, TICKET_STATUS_STYLES } from "@/constants/support";
import TicketChatView from "./TicketChatView";

interface TicketListItem {
  id: string;
  subject: string;
  category: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function SupportClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTicketId = searchParams.get("ticket");
  const { isAuthenticated } = useAuthStore();

  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/support/tickets");
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets || []);
      } else {
        setError(data.error || "خطا در دریافت تیکت‌ها");
      }
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setIsLoading(false);
    }
  };

  const openTicket = (id: string) => router.push(`/support?ticket=${id}`);

  const closeTicketView = () => {
    router.push("/support");
    fetchTickets();
  };

  const handleTicketCreated = (newTicketId: string) => {
    setShowNewForm(false);
    fetchTickets();
    router.push(`/support?ticket=${newTicketId}`);
  };

  if (!isAuthenticated) return null;

  if (activeTicketId) {
    return <TicketChatView ticketId={activeTicketId} onBack={closeTicketView} />;
  }

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 md:p-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-xl font-black text-balkun-navy">پشتیبانی بالکن</h1>
          <p className="text-sm font-medium text-slate-400 mt-1">
            تیکت‌های خود را پیگیری کنید یا سوال جدیدی مطرح کنید
          </p>
        </div>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="flex items-center gap-2 bg-balkun-cyan text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-balkun-cyan-dark transition-colors shadow-md shadow-balkun-cyan/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          تیکت جدید
        </button>
      </div>

      {showNewForm && <NewTicketForm onCreated={handleTicketCreated} onCancel={() => setShowNewForm(false)} />}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-balkun-cyan animate-spin mb-4" />
          <span className="font-bold text-slate-500">در حال بارگذاری...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-2xl border border-red-100 p-6 text-center">
          <p className="text-sm font-bold text-red-600">{error}</p>
        </div>
      ) : tickets.length === 0 && !showNewForm ? (
        <div className="flex flex-col items-center justify-center text-center py-16">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <MessageCircleQuestion className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-lg font-black text-slate-700 mb-2">هنوز تیکتی ثبت نکرده‌اید</h3>
          <p className="text-sm font-medium text-slate-500 max-w-md leading-relaxed">
            اگر سوالی درباره رزرو یا حساب کاربری خود دارید، از دکمه «تیکت جدید» استفاده کنید.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => openTicket(ticket.id)}
              className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 hover:border-balkun-cyan/30 hover:bg-slate-50/50 transition-all text-right"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <span className="font-black text-balkun-navy truncate">{ticket.subject}</span>
                <span className="text-xs font-medium text-slate-400">
                  {new Date(ticket.updatedAt).toLocaleDateString("fa-IR")}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    TICKET_STATUS_STYLES[ticket.status] || "bg-slate-100 text-slate-500"
                  }`}
                >
                  {TICKET_STATUS_LABELS[ticket.status] || ticket.status}
                </span>
                <ChevronLeft className="w-4 h-4 text-slate-300" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// فرم ثبت تیکت جدید (دسته‌بندی + پیام اول)
function NewTicketForm({
  onCreated,
  onCancel,
}: {
  onCreated: (ticketId: string) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState<string>(TICKET_CATEGORIES[0].value);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async () => {
    if (message.trim().length < 5) {
      setFormError("متن پیام باید حداقل ۵ کاراکتر باشد");
      return;
    }
    setFormError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message }),
      });
      const data = await res.json();
      if (data.success) {
        onCreated(data.ticket.id);
      } else {
        setFormError(data.error || "خطا در ثبت تیکت");
      }
    } catch {
      setFormError("خطا در ارتباط با سرور");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 md:p-5 mb-6 flex flex-col gap-4">
      <div>
        <label className="text-sm font-bold text-slate-600 mb-2 block">دسته‌بندی</label>
        <div className="grid grid-cols-2 gap-2">
          {TICKET_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`px-3 py-2.5 rounded-xl text-sm font-bold transition-colors border ${
                category === c.value
                  ? "bg-balkun-cyan text-white border-balkun-cyan shadow-md shadow-balkun-cyan/20"
                  : "bg-white text-slate-600 border-slate-200 hover:border-balkun-cyan/30"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-bold text-slate-600 mb-2 block">توضیحات</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="مشکل یا سوال خود را با جزئیات بنویسید..."
          className="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-balkun-cyan/30 focus:border-balkun-cyan resize-none"
        />
      </div>

      {formError && <p className="text-xs font-bold text-red-500">{formError}</p>}

      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onCancel}
          type="button"
          className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
        >
          انصراف
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          type="button"
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-balkun-orange hover:bg-balkun-orange-dark transition-colors shadow-md shadow-balkun-orange/20 disabled:opacity-50"
        >
          {isSubmitting ? "در حال ارسال..." : "ارسال تیکت"}
        </button>
      </div>
    </div>
  );
}