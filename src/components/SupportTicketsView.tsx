import React, { useState, useEffect } from 'react';
import { RefreshCw, MessageSquare, Plus, CheckCircle, X, ArrowRight, Lock, Unlock, Send, AlertCircle } from 'lucide-react';
import { Ticket, TicketMessage } from '../types.js';
import { parseSafeJson } from '../lib/api.js';

interface SupportTicketsViewProps {
  token: string;
}

export default function SupportTicketsView({ token }: SupportTicketsViewProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  
  const [viewTicket, setViewTicket] = useState<{ticket: Ticket, messages: TicketMessage[]} | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tickets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await parseSafeJson(res);
      if (Array.isArray(data)) {
        setTickets(data);
      }
    } catch (e) {
      console.error('Error fetching tickets:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [token]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) return;
    
    setActionLoading(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ subject: newSubject.trim(), message: newMessage.trim() })
      });
      if (res.ok) {
        setIsCreating(false);
        setNewSubject('');
        setNewMessage('');
        await fetchTickets();
        setFeedbackMsg('تیکت شما با موفقیت ثبت شد و به زودی بررسی خواهد شد.');
        setTimeout(() => setFeedbackMsg(''), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenTicket = async (id: string) => {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await parseSafeJson(res);
      if (data && data.ticket) {
        setViewTicket(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !viewTicket) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tickets/${viewTicket.ticket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: replyMessage.trim() })
      });
      if (res.ok) {
        setReplyMessage('');
        await handleOpenTicket(viewTicket.ticket.id);
        await fetchTickets();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (ticketId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'closed' ? 'open' : 'closed';
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        await handleOpenTicket(ticketId);
        await fetchTickets();
        setFeedbackMsg(newStatus === 'closed' ? 'تیکت با موفقیت بسته شد.' : 'تیکت مجدداً بازگشایی شد.');
        setTimeout(() => setFeedbackMsg(''), 4000);
      }
    } catch (e) {
      console.error('Error toggling ticket status:', e);
    } finally {
      setActionLoading(false);
    }
  };

  if (viewTicket) {
    const isClosed = viewTicket.ticket.status === 'closed';

    return (
      <div className="p-4 md:p-6 text-right space-y-6" style={{ direction: 'rtl' }}>
        {feedbackMsg && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs rounded-2xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <button
                onClick={() => setViewTicket(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer flex items-center gap-1 text-xs"
                title="بازگشت به لیست"
              >
                <ArrowRight className="w-4 h-4" />
                <span>بازگشت</span>
              </button>
              <h2 className="text-base sm:text-lg font-bold text-white mr-2">{viewTicket.ticket.subject}</h2>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className={`px-2.5 py-0.5 rounded-md font-bold ${
                viewTicket.ticket.status === 'open' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                viewTicket.ticket.status === 'answered' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                'bg-slate-500/10 text-slate-400 border border-slate-500/20'
              }`}>
                {viewTicket.ticket.status === 'open' ? 'در انتظار پاسخ کارشناس' : 
                 viewTicket.ticket.status === 'answered' ? 'پاسخ داده شده' : 'بسته شده'}
              </span>
              <span className="text-slate-500 text-[11px]">
                {new Date(viewTicket.ticket.createdAt).toLocaleDateString('fa-IR')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Direct Close / Reopen Ticket Button */}
            <button
              disabled={actionLoading}
              onClick={() => handleToggleStatus(viewTicket.ticket.id, viewTicket.ticket.status)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                isClosed
                  ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 hover:bg-red-950/40 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/30'
              }`}
            >
              {isClosed ? <Unlock className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-slate-400" />}
              <span>{isClosed ? 'بازگشایی مجدد تیکت' : 'بستن تیکت'}</span>
            </button>

            <button
              onClick={() => setViewTicket(null)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="بستن پنجره"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="space-y-4 max-h-[480px] overflow-y-auto pl-1 pr-1">
            {viewTicket.messages.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                پیامی در این تیکت یافت نشد.
              </div>
            ) : (
              viewTicket.messages.map((msg, idx) => {
                const isAdmin = msg.senderRole === 'admin' || msg.senderRole === 'moderator';
                return (
                  <div key={msg.id || idx} className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md ${
                      isAdmin 
                        ? 'bg-sky-950/40 border border-sky-500/30 text-slate-200' 
                        : 'bg-slate-800 border border-slate-700 text-white'
                    }`}>
                      <div className="text-[11px] font-bold mb-1 flex items-center justify-between gap-4">
                        <span className={isAdmin ? 'text-sky-400' : 'text-slate-300'}>
                          {isAdmin ? 'پشتیبانی فنی کاریزما' : 'پیام شما'}
                        </span>
                        <span className="text-[9px] opacity-60 font-mono">
                          {new Date(msg.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* If Ticket is closed, show banner */}
          {isClosed ? (
            <div className="mt-4 p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                <span>این تیکت به وضعیت «بسته شده» تغییر یافته است. در صورت نیاز می‌توانید آن را بازگشایی نمایید.</span>
              </div>
              <button
                disabled={actionLoading}
                onClick={() => handleToggleStatus(viewTicket.ticket.id, viewTicket.ticket.status)}
                className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-xl font-bold text-xs transition cursor-pointer shrink-0"
              >
                بازگشایی تیکت
              </button>
            </div>
          ) : (
            <form onSubmit={handleReply} className="mt-4 flex flex-col sm:flex-row items-stretch gap-2 border-t border-slate-800 pt-4">
              <div className="flex-1">
                <textarea
                  value={replyMessage}
                  onChange={e => setReplyMessage(e.target.value)}
                  placeholder="پاسخ یا توضیحات تکمیلی خود را اینجا بنویسید..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500/50 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white resize-none h-20 outline-none transition"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={actionLoading || !replyMessage.trim()}
                className="bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-bold px-6 py-3 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-500/10"
              >
                <Send className="w-4 h-4" />
                <span>ارسال پاسخ</span>
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 text-right space-y-6" style={{ direction: 'rtl' }}>
      {feedbackMsg && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs rounded-2xl flex items-center gap-2 shadow-lg">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white mb-1.5 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-orange-400" />
            <span>پشتیبانی و تیکت‌ها</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">پیگیری مشکلات، پرداخت‌ها و ارتباط مستقیم با تیم مدیریت کاریزما</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTickets}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
            title="بروزرسانی"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition flex items-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer active:scale-95"
          >
            {isCreating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span className="inline">{isCreating ? 'انصراف' : 'ثبت تیکت جدید'}</span>
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl animate-fade-in">
          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">موضوع تیکت</label>
              <input
                type="text"
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                placeholder="مثال: مشکل در فعال‌سازی اشتراک، سوال درباره سناریوها..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500/50 rounded-xl px-4 py-3 text-xs sm:text-sm text-white outline-none transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">متن پیام و توضیحات</label>
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="توضیحات کامل مشکل، سوال یا شماره تراکنش بانکی خود را اینجا بنویسید..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500/50 rounded-xl px-4 py-3 text-xs sm:text-sm text-white h-32 resize-none outline-none transition"
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={actionLoading || !newSubject.trim() || !newMessage.trim()}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 disabled:opacity-50 text-slate-950 font-bold px-8 py-2.5 rounded-xl transition shadow-lg shadow-orange-500/20 cursor-pointer"
              >
                ارسال تیکت
              </button>
            </div>
          </form>
        </div>
      )}

      {!isCreating && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          {loading && tickets.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
              <span>در حال دریافت تیکت‌ها...</span>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs sm:text-sm space-y-3">
              <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
              <p>شما در حال حاضر هیچ تیکتی ثبت نکرده‌اید.</p>
              <button
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs rounded-xl font-bold transition cursor-pointer"
              >
                ایجاد اولین تیکت پشتیبانی
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {tickets.map(t => (
                <div
                  key={t.id}
                  onClick={() => handleOpenTicket(t.id)}
                  className="p-5 hover:bg-slate-800/40 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white truncate text-sm">{t.subject}</h3>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">
                      کد پیگیری: {t.id} • {new Date(t.createdAt).toLocaleDateString('fa-IR')}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:w-auto w-full">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      t.status === 'open' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      t.status === 'answered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                      {t.status === 'open' ? 'در انتظار پاسخ' : t.status === 'answered' ? 'پاسخ داده شده' : 'بسته شده'}
                    </span>
                    <button className="text-sky-400 text-xs font-bold hover:underline">
                      مشاهده و گفتگو
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
