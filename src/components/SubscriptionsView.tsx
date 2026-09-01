import React, { useState, useEffect } from 'react';
import { 
  CreditCard, CheckCircle2, ShieldCheck, Zap, Star, Flame, Receipt, AlertCircle, Sparkles, Copy, Check, Lock, XCircle
} from 'lucide-react';
import { Plan } from '../types.js';
import { parseSafeJson } from '../lib/api.js';

interface SubscriptionsViewProps {
  token: string;
  userSubscriptionId: string | null;
  onSubscriptionUpdate: (subName: string) => void;
}

export default function SubscriptionsView({ token, userSubscriptionId, onSubscriptionUpdate }: SubscriptionsViewProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasingPlan, setPurchasingPlan] = useState<Plan | null>(null);
  const [adminCard, setAdminCard] = useState('6037-9911-2233-4455');
  const [adminCardOwner, setAdminCardOwner] = useState('مرکز ارتباطات کاریزما');
  const [adminCardBank, setAdminCardBank] = useState('بانک ملی ایران');
  const [copied, setCopied] = useState(false);
  
  // Manual submission form state
  const [senderCard, setSenderCard] = useState('');
  const [amount, setAmount] = useState('');
  const [traceNumber, setTraceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'pending' | 'success'>('idle');
  const [error, setError] = useState('');

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/plans');
      if (res.ok) {
        const data = await parseSafeJson(res);
        if (Array.isArray(data)) {
          setPlans(data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminCard = async () => {
    try {
      const res = await fetch('/api/settings/public');
      if (res.ok) {
        const data = await parseSafeJson(res);
        if (data) {
          if (data.cardNumber) setAdminCard(data.cardNumber);
          if (data.cardOwner) setAdminCardOwner(data.cardOwner);
          if (data.cardBank) setAdminCardBank(data.cardBank);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchAdminCard();
  }, []);

  const handleCopyCard = () => {
    navigator.clipboard.writeText(adminCard.replace(/\s+|-/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchasingPlan) return;
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/receipts/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          senderCard,
          amount: Number(amount) || purchasingPlan.price,
          planId: purchasingPlan.id,
          traceNumber
        })
      });

      const data = await parseSafeJson(res) || {};
      if (!res.ok) {
        throw new Error(data.error || `خطا در ثبت رسید تراکنش بانکی (${res.status}).`);
      }

      if (data.status === 'success') {
        setSubmitStatus('success');
        onSubscriptionUpdate(purchasingPlan.name);
      } else {
        setSubmitStatus('pending');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 text-slate-100 font-sans" style={{ direction: 'rtl' }}>
      
      {/* Header section */}
      <div className="text-center max-w-2xl mx-auto mb-10 mt-2">
        <span className="text-[10px] font-extrabold tracking-widest text-sky-400 bg-sky-500/10 px-3.5 py-1.5 rounded-full uppercase mb-3 inline-block">
          عضویت در باشگاه نخبگان کاریزما
        </span>
        <h1 className="text-2xl md:text-3xl font-black text-white mt-1 mb-2">طرح‌های طلایی ارتقای جذابیت و کاریزمای فردی</h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          دسترسی خود را به موتور فوق هوشمند پاسخ حاضر جوابی، باز کردن گفتگو، سناریوهای روانشناسی رابطه و کارت‌های طلایی مرکز کاریزما فعال کنید.
        </p>
      </div>

      {error && (
        <div className="mb-6 max-w-xl mx-auto p-4 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl text-right flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid listing plans */}
      {loading && plans.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <span className="text-xs text-slate-400">در حال دریافت طرح‌ها...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map(plan => {
            const isGold = plan.id === 'p3';
            const isSilver = plan.id === 'p2';
            return (
              <div 
                key={plan.id}
                className={`glass-panel rounded-3xl p-6 md:p-8 border text-right flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                  isGold 
                    ? 'border-purple-500/40 bg-purple-950/10 shadow-2xl shadow-purple-500/5' 
                    : isSilver 
                    ? 'border-sky-500/30 bg-sky-950/5' 
                    : 'border-slate-800'
                }`}
              >
                {/* Decorative glow badge */}
                {(isGold || isSilver || plan.badge) && (
                  <div className={`absolute top-0 left-0 text-white text-[9px] font-black px-4 py-1.5 rounded-br-2xl flex items-center gap-1 ${
                    isGold 
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600' 
                      : isSilver 
                      ? 'bg-gradient-to-r from-sky-500 to-blue-600' 
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {isGold ? <Flame className="w-3 h-3" /> : isSilver ? <Star className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                    <span>{plan.badge || (isGold ? 'پیشنهاد VIP ویژه' : isSilver ? 'محبوب‌ترین طرح' : 'پایه')}</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-3 pt-1">
                    {isGold ? <Sparkles className="w-5 h-5 text-purple-400" /> : isSilver ? <Star className="w-5 h-5 text-sky-400" /> : <Zap className="w-5 h-5 text-slate-400" />}
                    <h3 className="text-sm font-bold text-white">{plan.name}</h3>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-5">
                    {plan.description}
                  </p>

                  <div className="mb-5 pb-5 border-b border-slate-900">
                    <span className="text-2xl font-black text-white">{(plan.price).toLocaleString('fa-IR')}</span>
                    <span className="text-xs text-slate-400 mr-1.5">
                      تومان / {plan.durationDays === 7 ? '۷ روزه' : plan.durationDays === 15 ? '۱۵ روزه' : plan.durationDays === 30 ? 'یک ماهه (۳۰ روز)' : `${plan.durationDays || 30} روز`}
                    </span>
                  </div>

                  {/* Bullet perks list */}
                  <ul className="space-y-3 mb-6 text-[11px] text-slate-300">
                    {plan.features && plan.features.length > 0 ? (
                      plan.features.map((feat, idx) => {
                        const isLocked = feat.includes('غیرفعال') || feat.includes('قفل') || feat.includes('🔒');
                        return (
                          <li key={idx} className="flex items-start gap-2.5">
                            {isLocked ? (
                              <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                            ) : (
                              <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${
                                isGold ? 'text-purple-400' : isSilver ? 'text-sky-400' : 'text-emerald-400'
                              }`} />
                            )}
                            <span className={isLocked ? 'text-slate-500 line-through' : 'text-slate-200 font-medium'}>{feat}</span>
                          </li>
                        );
                      })
                    ) : (
                      <>
                        <li className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>سهمیه کوئری هوشمند: <strong>{plan.maxQueries.toLocaleString('fa-IR')}</strong> در ماه</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>کارت‌های طلایی رابطه: <strong>{plan.maxKnowledgeCards.toLocaleString('fa-IR')}</strong> کارت</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                <button
                  onClick={() => {
                    setPurchasingPlan(plan);
                    setAmount(plan.price.toString());
                    setSenderCard('');
                    setTraceNumber('');
                    setSubmitStatus('idle');
                    setError('');
                  }}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition cursor-pointer text-center active:scale-[0.98] ${
                    isGold
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/10'
                      : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white'
                  }`}
                >
                  خرید و ارتقای طرح
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* SECURE CARD-TO-CARD PAYMENT MODAL */}
      {purchasingPlan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center p-3 sm:p-4 z-[100] overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl relative text-right max-h-[88dvh] sm:max-h-[90vh] overflow-y-auto flex flex-col my-auto">
            
            <div className="flex justify-between items-center border-b border-slate-900 pb-3 mb-3.5 shrink-0">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 shrink-0" />
                <span className="truncate">پرداخت کارت‌به‌کارت و فعال‌سازی {purchasingPlan.name.startsWith('طرح') ? purchasingPlan.name : `طرح ${purchasingPlan.name}`}</span>
              </h3>
              <button 
                onClick={() => setPurchasingPlan(null)} 
                className="text-slate-400 hover:text-white p-1 text-xl cursor-pointer shrink-0"
              >
                ×
              </button>
            </div>

            {submitStatus === 'success' ? (
              // Match / Instantly Activated Card
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-emerald-400">تطبیق خودکار موفقیت‌آمیز بود!</h4>
                <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                  تراکنش پرداخت شما به سرعت با سوابق بانکی تطبیق داده شد و اشتراک <strong>{purchasingPlan.name}</strong> بلافاصله فعال گردید.
                </p>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs space-y-2.5 font-mono max-w-sm mx-auto text-right">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">طرح فعال شده:</span>
                    <span className="text-white font-bold">{purchasingPlan.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">کارت فرستنده شما:</span>
                    <span className="text-white font-bold">{senderCard}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">مبلغ تایید شده:</span>
                    <span className="text-emerald-400 font-bold">{(Number(amount) || purchasingPlan.price).toLocaleString('fa-IR')} تومان</span>
                  </div>
                </div>

                <button
                  onClick={() => setPurchasingPlan(null)}
                  className="w-full max-w-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold py-3 rounded-xl text-xs cursor-pointer mx-auto block"
                >
                  بستن و بازگشت به داشبورد
                </button>
              </div>
            ) : submitStatus === 'pending' ? (
              // Registered in Pending Mode
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Receipt className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-amber-400">رسید پرداخت با موفقیت ثبت شد</h4>
                <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                  اطلاعات تراکنش شما دریافت شد و به علت عدم تطبیق آنی در انتظار تایید مربی‌های مرکز کاریزما است. این فرآیند حداکثر طی ۱۵ الی ۳۰ دقیقه آینده انجام خواهد شد.
                </p>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs space-y-2.5 font-mono max-w-sm mx-auto text-right">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">وضعیت فعلی:</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/20 font-bold">در انتظار تایید اپراتور</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">کارت واریز کننده:</span>
                    <span className="text-white font-bold">{senderCard}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">مبلغ ارسالی:</span>
                    <span className="text-white font-bold">{(Number(amount) || purchasingPlan.price).toLocaleString('fa-IR')} تومان</span>
                  </div>
                </div>

                <button
                  onClick={() => setPurchasingPlan(null)}
                  className="w-full max-w-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold py-3 rounded-xl text-xs cursor-pointer mx-auto block"
                >
                  فهمیدم، بستن صفحه
                </button>
              </div>
            ) : (
              // Main Interactive Card-to-Card payment Form
              <div className="space-y-3.5">
                {/* Simulated Bank Card Display */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-3.5 sm:p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 bg-sky-500/10 w-28 h-28 blur-3xl rounded-full" />
                  
                  <div className="flex justify-between items-center mb-3 sm:mb-5">
                    <span className="text-[9px] sm:text-[10px] font-bold text-sky-400 uppercase tracking-wider">کارت بانکی جهت واریزی</span>
                    <span className="text-xs font-black text-slate-400">{adminCardBank}</span>
                  </div>

                  <div className="mb-3 sm:mb-4">
                    <div className="text-[10px] text-slate-500 mb-1.5">شماره کارت مقصد جهت انتقال وجه:</div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                      <span className="text-base sm:text-xl font-black font-mono tracking-[0.08em] sm:tracking-[0.1em] text-white break-all" dir="ltr">{adminCard}</span>
                      <button 
                        type="button"
                        onClick={handleCopyCard}
                        className="w-full sm:w-auto p-2 sm:p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold shrink-0"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'کپی شد' : 'کپی شماره کارت'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center text-[10px] text-slate-400 pt-2.5 border-t border-slate-800/60 gap-1.5 sm:gap-2">
                    <div className="flex items-center gap-1.5">
                      <span>نام صاحب حساب:</span>
                      <strong className="text-white">{adminCardOwner}</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>مبلغ قابل انتقال:</span>
                      <strong className="text-sky-400">{(purchasingPlan.price).toLocaleString('fa-IR')} تومان</strong>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 sm:p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] rounded-xl leading-relaxed">
                  💡 <strong>راهنما:</strong> پس از انتقال وجه کارت‌به‌کارت، مشخصات واریز را در فرم زیر وارد نمایید تا اشتراک شما فعال گردد.
                </div>

                {/* Submittal Form */}
                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">شماره کارت ۱۶ رقمی شما (کارت مبدأ):</label>
                    <input 
                      type="text" 
                      required
                      placeholder="مثال: ۵۰۲۲-۲۹۱۰-۱۲۳۴-۵۶۷۸"
                      value={senderCard}
                      onChange={(e) => setSenderCard(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 sm:py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/50 text-left font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-1">مبلغ پرداختی (تومان):</label>
                      <input 
                        type="number" 
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 sm:py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/50 text-left font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-1">کد پیگیری تراکنش (اختیاری):</label>
                      <input 
                        type="text" 
                        placeholder="کد ۶ تا ۱۲ رقمی پیگیری"
                        value={traceNumber}
                        onChange={(e) => setTraceNumber(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 sm:py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/50 text-left font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-900 mt-2">
                    <button
                      type="button"
                      onClick={() => setPurchasingPlan(null)}
                      className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer text-center transition"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto bg-gradient-to-r from-sky-500 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 text-center transition"
                    >
                      {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      <span>{submitting ? 'در حال ثبت رسید...' : 'ثبت اطلاعات و فعال‌سازی'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
