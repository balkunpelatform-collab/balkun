"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Send, Loader2, Lock, X, ShieldCheck, User as UserIcon } from "lucide-react";
import { TICKET_STATUS_LABELS, TICKET_STATUS_STYLES, getCategoryLabel } from "@/constants/support";

export default function AdminTicketChatPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: ticketId } = use(params);

  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`);
      const data = await res.json();
      if (data.success) {
        setTicket(data.ticket);
        setMessages(data.messages || []);
        setUser(data.user);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReply = async () => {
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
        setTicket((prev: any) => ({ ...prev, status: data.ticket.status }));
        setNewMessage("");
      }
    } catch (error) {
      console.error("Reply error:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!confirm("آیا از بستن این تیکت اطمینان دارید؟")) return;
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, { method: "PATCH" });
      const data = await res.json();
      if (data.success) {
        setTicket((prev: any) => ({ ...prev, status: "CLOSED" }));
      }
    } catch (error) {
      console.error("Close error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-balkun-cyan animate-spin mb-4" />
        <span className="font-bold text-slate-500">در حال دریافت تیکت...</span>
      </div>
    );
  }

  if (!ticket) return <div className="text-center font-bold text-red-500 py-20">تیکت یافت نشد</div>;

  const isClosed = ticket.status === "CLOSED";

  return (
    <div className="flex flex-col gap-6 h-[85vh] pb-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50">
            <ArrowRight className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-black text-balkun-navy">موضوع: {ticket.subject}</h1>
            <span className="text-xs font-bold text-slate-500">
              دسته‌بندی: {getCategoryLabel(ticket.category)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${TICKET_STATUS_STYLES[ticket.status]}`}>
            {TICKET_STATUS_LABELS[ticket.status]}
          </span>
          {!isClosed && (
            <button onClick={handleCloseTicket} className="flex items-center gap-1.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-500 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold">
              <X className="w-4 h-4" /> بستن تیکت
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full overflow-hidden">
        
        {/* اطلاعات کاربر (Sidebar) */}
        <div className="hidden lg:flex flex-col gap-4 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm h-max">
          <h3 className="font-black text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserIcon className="w-4 h-4 text-balkun-cyan" />
            مشخصات کاربر
          </h3>
          {user ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-800">{user.firstName} {user.lastName}</span>
              <span className="text-xs font-bold text-slate-500" dir="ltr">{user.phoneNumber}</span>
            </div>
          ) : (
            <span className="text-xs font-bold text-slate-400">اطلاعاتی یافت نشد</span>
          )}
        </div>

        {/* نمای چت */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 bg-slate-50/50">
            {messages.map((msg) => {
              const isAdmin = msg.senderType === "ADMIN";
              return (
                <div key={msg.id} className={`flex flex-col w-full ${isAdmin ? "items-end" : "items-start"}`}>
                  <span className={`text-[10px] font-bold mb-1 flex items-center gap-1 ${isAdmin ? "text-balkun-cyan" : "text-slate-500"}`}>
                    {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                    {isAdmin ? "پشتیبانی بالکن" : (user?.firstName || "کاربر")}
                  </span>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm font-medium leading-relaxed shadow-sm ${
                    isAdmin
                      ? "bg-balkun-cyan text-white rounded-tr-sm"
                      : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm"
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.messageText}</p>
                    <span className={`block text-[10px] mt-2 ${isAdmin ? "text-white/70" : "text-slate-400"}`}>
                      {new Date(msg.sentAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="p-4 border-t border-slate-100 shrink-0 bg-white">
            {isClosed ? (
              <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-400 py-3">
                <Lock className="w-4 h-4" /> این تیکت بسته شده است و امکان ارسال پاسخ وجود ندارد.
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="پاسخ خود را به کاربر بنویسید..."
                  rows={2}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium focus:outline-none focus:border-balkun-cyan resize-none"
                />
                <button
                  onClick={handleReply}
                  disabled={isSending || !newMessage.trim()}
                  className="h-[72px] w-[72px] rounded-xl bg-balkun-cyan text-white flex items-center justify-center hover:bg-balkun-cyan-dark transition-colors shadow-md shadow-balkun-cyan/20 disabled:opacity-50 shrink-0"
                >
                  {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}