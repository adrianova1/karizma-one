import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, MessageSquare, Send, Plus, CheckCircle2, 
  Clock, AlertCircle, RefreshCw, ChevronLeft
} from 'lucide-react';
import { parseSafeJson } from '../lib/api.js';

interface SupportTicketsViewProps {
  token: string;
}

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'closed' | 'pending';
  createdAt: string;
  reply?: string;
}

export default function SupportTicketsView({ token }: SupportTicketsViewProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await parseSafeJson(res);
        if (Array.isArray(data)) setTickets(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: newSubject.trim(),
          message: newMessage.trim()
        })
      });

      if (res.ok) {
        setStatusMsg('تیکت شما ثبت شد و به زودی بررسی خواهد شد.');
        setNewSubject('');
        setNewMessage('');
        setShowNewModal(false);
        loadTickets();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-4 select-none pb-24 text-right dir-rtl" style={{ direction: 'rtl' }}>
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 text-orange-400">
          <HelpCircle className="w-5 h-5" />
          <h2 className="text-sm font-black text-white">پشتیبانی و تیکت‌ها</h2>
        </div>
        <button
          onClick={() => setShowNewModal(!showNewModal)}
          className="bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>تیکت جدید</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs">
          {statusMsg}
        </div>
      )}

      {showNewModal && (
        <form onSubmit={handleCreateTicket} className="bg-[#0b0f19] border border-orange-500/30 rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-white">ثبت تیکت پشتیبانی جدید</h3>
          <input
            type="text"
            value={newSubject}
            onChange={e => setNewSubject(e.target.value)}
            placeholder="موضوع تیکت (مثلاً مشکل در فعال‌سازی اشتراک)"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
          <textarea
            rows={3}
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="شرح پیام..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewModal(false)}
              className="px-3 py-1.5 rounded-xl text-xs text-slate-400 bg-slate-900"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              ارسال تیکت
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {tickets.length === 0 && !loading && (
          <div className="text-center py-8 text-xs text-slate-500">
            هنوز هیچ تیکت پشتیبانی ثبت نکرده‌اید.
          </div>
        )}

        {tickets.map(t => (
          <div key={t.id} className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white">{t.subject}</h4>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                t.status === 'open' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {t.status === 'open' ? 'در انتظار بررسی' : 'پاسخ داده شده'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
              {t.message}
            </p>
            {t.reply && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-[11px] text-emerald-200">
                <strong className="block text-[10px] text-emerald-400 mb-1">پاسخ پشتیبانی:</strong>
                {t.reply}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
