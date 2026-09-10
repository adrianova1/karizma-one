import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Check, Sparkles, CheckCircle2, Shield, Calendar, 
  ArrowRight, Clock, AlertCircle, RefreshCw
} from 'lucide-react';
import { Plan } from '../types.js';
import { parseSafeJson } from '../lib/api.js';

interface SubscriptionsViewProps {
  token: string;
  userSubscriptionId?: string | null;
  onSubscriptionUpdate?: () => void;
}

export default function SubscriptionsView({ token, onSubscriptionUpdate }: SubscriptionsViewProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/plans')
      .then(async res => {
        if (!res.ok) return [];
        return parseSafeJson(res);
      })
      .then(data => {
        if (Array.isArray(data)) {
          setPlans(data);
        }
      })
      .catch(err => console.error('Error fetching plans:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !receiptNumber.trim()) {
      setErrorMsg('لطفاً شماره پیگیری یا رسید پرداخت را وارد فرمایید.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/subscriptions/purchase-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          receiptNumber: receiptNumber.trim()
        })
      });

      const data = await parseSafeJson(res);
      if (!res.ok) {
        throw new Error(data?.error || 'خطا در ثبت درخواست');
      }

      setSuccessMsg('درخواست اشتراک شما ثبت شد و به زودی توسط مدیریت فعال خواهد گردید.');
      setReceiptNumber('');
      setSelectedPlan(null);
      if (onSubscriptionUpdate) onSubscriptionUpdate();
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در برقراری ارتباط');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-4 select-none pb-24 text-right dir-rtl" style={{ direction: 'rtl' }}>
      <div className="bg-gradient-to-b from-[#0f172a] to-[#0b0f19] border border-slate-800 rounded-2xl p-4 space-y-1.5 shadow-md">
        <div className="flex items-center gap-2 text-purple-400">
          <CreditCard className="w-5 h-5" />
          <h2 className="text-sm font-black text-white">طرح‌های اشتراک و دسترسی ویژه</h2>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          دسترسی نامحدود به مربی هوشمند محلی، بانک ۶۰ هزار سناریو، دوره‌های آکادمی و جعبه لایتنر.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5">
        {plans.map(plan => (
          <div
            key={plan.id}
            className={`bg-[#0b0f19] border ${
              selectedPlan?.id === plan.id ? 'border-purple-500 ring-1 ring-purple-500/30' : 'border-slate-800'
            } rounded-2xl p-4 space-y-3 transition`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-white">{plan.name}</h3>
                <span className="text-[10px] text-slate-400">{plan.durationDays} روز دسترسی کامل</span>
              </div>
              <div className="text-left">
                <span className="text-xs font-black text-purple-400 font-mono">
                  {plan.price.toLocaleString('fa-IR')}
                </span>
                <span className="text-[10px] text-slate-400 mr-1">تومان</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">{plan.description}</p>

            <ul className="space-y-1.5 pt-2 border-t border-slate-800/80">
              {plan.features?.map((f, idx) => (
                <li key={idx} className="text-[10px] text-slate-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setSelectedPlan(plan)}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                selectedPlan?.id === plan.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200'
              }`}
            >
              <span>{selectedPlan?.id === plan.id ? 'انتخاب شده ✓' : 'انتخاب این طرح'}</span>
            </button>
          </div>
        ))}
      </div>

      {selectedPlan && (
        <form onSubmit={handleSubmitReceipt} className="bg-[#0b0f19] border border-purple-500/40 rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-purple-400" />
            <span>ثبت شماره پیگیری واریز: {selectedPlan.name}</span>
          </h4>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            مبلغ {selectedPlan.price.toLocaleString('fa-IR')} تومان را واریز نموده و کد پیگیری یا ۴ رقم آخر کارت را وارد نمایید.
          </p>

          <input
            type="text"
            value={receiptNumber}
            onChange={e => setReceiptNumber(e.target.value)}
            placeholder="مثال: پیگیری ۱۲۳۴۵۶ یا ۴ رقم آخر کارت"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>ارسال رسید جهت تایید</span>
          </button>
        </form>
      )}
    </div>
  );
}
