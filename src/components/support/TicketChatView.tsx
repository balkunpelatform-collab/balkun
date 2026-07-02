// مسیر: src/components/support/TicketChatView.tsx
// نمای گفتگوی یک تیکت مشخص: تاریخچه پیام‌ها، ارسال پیام جدید، بستن تیکت.

"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Send, Loader2, Lock, X } from "lucide-react";
import { TICKET_STATUS_LABELS, TICKET_STATUS_STYLES } from "@/constants/support";

interface TicketMessageItem {
  id: string;
  senderType: "USER" | "ADMIN";
  messageText: string;
  sentAt: string;
}

interface TicketDetail {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
}

export default function TicketChatView({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<TicketMessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchTicket = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/support/tickets/${ticketId}`);
      const data = await res.json();
      if (data.success) {
        setTicket(data.ticket);
        setMessages(data.messages || []);
      } else {
        setError(data.error || "خطا در دریافت تیکت");
      }
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
        setTicket((prev) => (prev ? { ...prev, status: data.ticket.status } : prev));
        setNewMessage("");
      } else {
        setError(data.error || "خطا در ارسال پیام");
      }
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = async () => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, { method: "PATCH" });
      const data = await res.json();
      if (data.success) {
        setTicket((prev) => (prev ? { ...prev, status: "CLOSED" } : prev));
      }
    } catch {
      // خطای غیربحرانی؛ نیازی به نمایش پیام مسدودکننده نیست
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-balkun-cyan animate-spin mb-4" />
        <span className="font-bold text-slate-500">در حال بارگذاری...</span>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 flex flex-col items-center gap-4 text-center">
        <p className="text-sm font-bold text-red-500">{error || "تیکت یافت نشد"}</p>
        <button onClick={onBack} className="text-sm font-bold text-balkun-cyan">
          بازگشت به لیست تیکت‌ها
        </button>
      </div>
    );
  }

  const isClosed = ticket.status === "CLOSED";

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm flex flex-col h-[75vh] overflow-hidden">
      {/* هدر تیکت */}
      <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-50 shrink-0">
            <ArrowRight className="w-5 h-5 text-slate-500" />
          </button>
          <div className="min-w-0">
            <h2 className="font-black text-balkun-navy truncate">{ticket.subject}</h2>
            <span
              className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                TICKET_STATUS_STYLES[ticket.status] || "bg-slate-100 text-slate-500"
              }`}
            >
              {TICKET_STATUS_LABELS[ticket.status] || ticket.status}
            </span>
          </div>
        </div>
        {!isClosed && (
          <button
            onClick={handleClose}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            بستن تیکت
          </button>
        )}
      </div>

      {/* بدنه پیام‌ها */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5 flex flex-col gap-3 bg-slate-50/40">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.senderType === "USER" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm font-medium leading-relaxed ${
                msg.senderType === "USER"
                  ? "bg-balkun-cyan text-white rounded-tl-sm"
                  : "bg-white border border-slate-100 text-slate-700 rounded-tr-sm shadow-sm"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.messageText}</p>
              <span className={`block text-[10px] mt-1.5 ${msg.senderType === "USER" ? "text-white/70" : "text-slate-400"}`}>
                {new Date(msg.sentAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* فرم ارسال پیام */}
      <div className="p-3 md:p-4 border-t border-slate-100 shrink-0">
        {isClosed ? (
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-400 py-2">
            <Lock className="w-4 h-4" />
            این تیکت بسته شده است
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="پیام خود را بنویسید..."
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-balkun-cyan/30 focus:border-balkun-cyan"
            />
            <button
              onClick={handleSend}
              disabled={isSending || !newMessage.trim()}
              className="w-11 h-11 rounded-xl bg-balkun-cyan text-white flex items-center justify-center hover:bg-balkun-cyan-dark transition-colors shadow-md shadow-balkun-cyan/20 disabled:opacity-50 shrink-0"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}