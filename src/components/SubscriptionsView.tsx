import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  CreditCard, Check, Sparkles, CheckCircle2, Shield, Calendar, 
  ArrowRight, Clock, AlertCircle, RefreshCw, Copy, X, ArrowDownRight,
  ShieldCheck, FileText, CheckCircle, Camera, ExternalLink, Send
} from 'lucide-react';
import { Plan } from '../types.js';
import { parseSafeJson } from '../lib/api.js';

interface SubscriptionsViewProps {
  token: string;
  userSubscriptionId?: string | null;
  onSubscriptionUpdate?: () => void;
}

interface PublicCardSettings {
  cardNumber: string;
  cardOwner: string;
  cardBank: string;
  supportReceiptUrl?: string;
  supportReceiptTitle?: string;
}

interface UserReceipt {
  id: string;
  planId?: string;
  planName?: string;
  amount: number;
  traceNumber?: string;
  status: 'pending' | 'success' | 'failed';
  senderCard?: string;
  createdAt: string;
}

export default function SubscriptionsView({ token, onSubscriptionUpdate }: SubscriptionsViewProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardSettings, setCardSettings] = useState<PublicCardSettings>({
    cardNumber: '6037-9911-2233-4455',
    cardOwner: 'مدیریت مرکز کاریزما',
    cardBank: 'بانک ملی ایران',
    supportReceiptUrl: '',
    supportReceiptTitle: 'ارسال فیش و اسکرین‌شات به پشتیبانی'
  });
  
  // Payment Popup State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [senderCard, setSenderCard] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalSuccessMsg, setModalSuccessMsg] = useState('');
  const [modalErrorMsg, setModalErrorMsg] = useState('');
  const [copiedCard, setCopiedCard] = useState(false);
  const [copiedSupportLink, setCopiedSupportLink] = useState(false);

  // User receipts history
  const [userReceipts, setUserReceipts] = useState<UserReceipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);

  // Load Plans & Card Info
  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, cardRes] = await Promise.all([
        fetch('/api/plans'),
        fetch('/api/settings/public')
      ]);

      if (plansRes.ok) {
        const data = await parseSafeJson(plansRes);
        if (Array.isArray(data)) setPlans(data);
      }

      if (cardRes.ok) {
        const cardData = await parseSafeJson(cardRes);
        if (cardData && cardData.cardNumber) {
          setCardSettings(cardData);
        }
      }
    } catch (err) {
      console.error('Error fetching subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserReceipts = async () => {
    if (!token) return;
    setLoadingReceipts(true);
    try {
      const res = await fetch('/api/receipts/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await parseSafeJson(res);
        if (Array.isArray(data)) {
          setUserReceipts(data);
        }
      }
    } catch (err) {
      console.error('Error loading receipts:', err);
    } finally {
      setLoadingReceipts(false);
    }
  };

  useEffect(() => {
    loadData();
    loadUserReceipts();
  }, [token]);

  const handleOpenPayment = (plan: Plan) => {
    setSelectedPlan(plan);
    setSenderCard('');
    setReceiptNumber('');
    setModalSuccessMsg('');
    setModalErrorMsg('');
    setShowPaymentModal(true);
  };

  const handleCopyCard = () => {
    const rawCard = cardSettings.cardNumber.replace(/\s+|-/g, '');
    navigator.clipboard.writeText(rawCard);
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2500);
  };

  const getResolvedSupportUrl = () => {
    let targetUrl = (cardSettings.supportReceiptUrl || '').trim();
    if (!targetUrl) {
      targetUrl = 'https://t.me/Karizma_Academy';
    } else if (targetUrl.startsWith('@')) {
      targetUrl = `https://t.me/${targetUrl.replace('@', '')}`;
    } else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }
    return targetUrl;
  };

  const handleCopySupportLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = getResolvedSupportUrl();
    navigator.clipboard.writeText(url);
    setCopiedSupportLink(true);
    setTimeout(() => setCopiedSupportLink(false), 2500);
  };

  const handleOpenSupportLink = () => {
    const targetUrl = getResolvedSupportUrl();
    try {
      const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        window.location.assign(targetUrl);
      }
    } catch (e) {
      window.location.href = targetUrl;
    }
  };

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    if (!senderCard.trim()) {
      setModalErrorMsg('لطفاً شماره کارت واریزکننده (یا ۴ رقم آخر) را وارد کنید.');
      return;
    }

    setSubmitting(true);
    setModalErrorMsg('');
    setModalSuccessMsg('');

    try {
      const res = await fetch('/api/receipts/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          amount: selectedPlan.price,
          senderCard: senderCard.trim(),
          traceNumber: receiptNumber.trim() || 'MANUAL-' + Date.now().toString().slice(-6)
        })
      });

      const data = await parseSafeJson(res);
      if (!res.ok) {
        throw new Error(data?.error || 'خطا در ثبت فیش واریزی');
      }

      if (data.status === 'success') {
        setModalSuccessMsg('واریزی شما با اطلاعات بانکی تطابق یافت و اشتراک فوراً فعال گردید! 🎉');
      } else {
        setModalSuccessMsg('فیش واریزی شما با موفقیت ثبت شد و به زودی توسط مدیریت تایید و فعال خواهد شد.');
      }

      // Reload receipts and notify parent
      loadUserReceipts();
      if (onSubscriptionUpdate) onSubscriptionUpdate();
      
      setTimeout(() => {
        setShowPaymentModal(false);
        setModalSuccessMsg('');
      }, 3500);

    } catch (err: any) {
      setModalErrorMsg(err.message || 'خطا در برقراری ارتباط');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-5 select-none pb-24 text-right dir-rtl" style={{ direction: 'rtl' }}>
      
      {/* Header Banner */}
      <div className="bg-gradient-to-b from-[#121c33] via-[#0d1527] to-[#090d18] border border-sky-500/20 rounded-3xl p-5 space-y-2 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-sky-400">
            <div className="w-9 h-9 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">طرح‌های اشتراک و فعال‌سازی ویژه</h2>
              <span className="text-[11px] text-slate-400">پرداخت کارت به کارت با تایید آنی یا حداکثر ۱۵ دقیقه</span>
            </div>
          </div>
          <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-xl">
            دستور کانونیکال محلی
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed pt-1">
          با ارتقای حساب کاربری، به تمام قابلیت‌های مربی کاریزما با ۵ لحن اختصاصی، بانک ۶۰ هزار سناریو، دوره‌های آکادمی و فلش‌کارت‌های لایتنر دسترسی پیدا می‌کنید.
        </p>
      </div>

      {/* Plans List */}
      <div className="space-y-3.5">
        <h3 className="text-xs font-black text-white flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>طرح‌های قابل انتخاب:</span>
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {plans.map(plan => {
              const isPopular = plan.id === 'p3' || plan.durationDays >= 30;
              return (
                <div
                  key={plan.id}
                  className={`bg-[#0b0f19] border ${
                    isPopular ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-slate-800'
                  } rounded-3xl p-5 space-y-3.5 shadow-lg relative overflow-hidden transition hover:border-sky-500/40`}
                >
                  {isPopular && (
                    <div className="absolute top-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[9px] px-3 py-0.5 rounded-br-2xl shadow-sm">
                      پیشنهاد ویژه
                    </div>
                  )}

                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-black text-white">{plan.name}</h4>
                      <span className="text-[10px] text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded-md inline-block mt-1">
                        دسترسی کامل {plan.durationDays} روزه
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="text-base font-black text-white font-mono">
                        {plan.price.toLocaleString('fa-IR')}
                      </span>
                      <span className="text-[11px] text-slate-400 mr-1.5">تومان</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{plan.description}</p>

                  <ul className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    {plan.features?.map((f, idx) => (
                      <li key={idx} className="text-[11px] text-slate-400 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => handleOpenPayment(plan)}
                    className={`w-full py-3 rounded-2xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 active:scale-98 shadow-md ${
                      isPopular
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950'
                        : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>خرید و واریز کارت به کارت</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User Receipts History Section */}
      <div className="pt-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-white flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-sky-400" />
            <span>سوابق و وضعیت فیش‌های ثبت‌شده شما:</span>
          </h3>
          <button 
            type="button" 
            onClick={loadUserReceipts}
            className="text-[10px] text-slate-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${loadingReceipts ? 'animate-spin' : ''}`} />
            <span>بروزرسانی</span>
          </button>
        </div>

        {userReceipts.length === 0 ? (
          <div className="bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-4 text-center text-xs text-slate-500">
            هنوز رسید یا فیش پرداختی از جانب شما ثبت نشده است.
          </div>
        ) : (
          <div className="space-y-2">
            {userReceipts.map(rec => (
              <div 
                key={rec.id}
                className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white">{rec.planName || 'طرح اشتراک'}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {rec.amount.toLocaleString('fa-IR')} تومان
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-2">
                    <span>کارت مبدأ: {rec.senderCard || 'ثبت دستی'}</span>
                    {rec.traceNumber && <span>پیگیری: {rec.traceNumber}</span>}
                  </div>
                </div>

                <div>
                  {rec.status === 'success' && (
                    <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>تایید و فعال شده</span>
                    </span>
                  )}
                  {rec.status === 'pending' && (
                    <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>در انتظار بررسی</span>
                    </span>
                  )}
                  {rec.status === 'failed' && (
                    <span className="bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1">
                      <X className="w-3 h-3" />
                      <span>رد شده</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= CARD-TO-CARD PAYMENT POPUP MODAL ================= */}
      {showPaymentModal && selectedPlan && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in" 
          style={{ direction: 'rtl' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPaymentModal(false);
          }}
        >
          <div className="bg-[#0b0f19] border border-sky-500/40 rounded-3xl w-full max-w-[440px] max-h-[92vh] sm:max-h-[86vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            
            {/* 1. Sticky Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3 border-b border-slate-800/90 bg-[#0d1424] shrink-0">
              <div className="flex items-center gap-2 text-sky-400">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 shrink-0" />
                <h3 className="text-xs sm:text-sm font-black text-white">پرداخت کارت‌به‌کارت: {selectedPlan.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 2. Scrollable Body Content (min-h-0 prevents bottom buttons from overflowing) */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3.5 sm:px-4 py-2.5 sm:py-3 space-y-2.5 custom-scrollbar text-right">
              
              {/* Notification Messages */}
              {modalSuccessMsg && (
                <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{modalSuccessMsg}</span>
                </div>
              )}

              {modalErrorMsg && (
                <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{modalErrorMsg}</span>
                </div>
              )}

              {/* Visual Bank Card */}
              <div className="bg-gradient-to-tr from-[#162035] via-[#0e172a] to-[#070e1e] border border-sky-500/40 rounded-2xl p-3 sm:p-3.5 shadow-2xl relative overflow-hidden space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sky-300">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-black">{cardSettings.cardBank || 'بانک ملی ایران'}</span>
                  </div>
                  {/* Chip Icon */}
                  <div className="w-7 h-5 rounded-md bg-gradient-to-tr from-amber-400 to-amber-200 border border-amber-500 shadow-inner flex items-center justify-center">
                    <div className="w-4 h-2.5 border border-amber-600/40 rounded-xs opacity-60" />
                  </div>
                </div>

                {/* Card Number & Copy */}
                <div className="space-y-0.5 text-center py-0.5">
                  <span className="text-[10px] text-slate-400 block font-medium">شماره کارت مقصد جهت واریز:</span>
                  <div className="flex items-center justify-center font-mono text-base sm:text-lg font-black text-amber-300 tracking-wider dir-ltr select-all py-0.5" style={{ direction: 'ltr' }}>
                    {cardSettings.cardNumber}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-slate-700/60 text-xs">
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 block">صاحب حساب:</span>
                    <span className="font-black text-white text-xs">{cardSettings.cardOwner || 'مدیریت مرکز کاریزما'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCard}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                  >
                    {copiedCard ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCard ? 'کپی شد ✓' : 'کپی کارت'}</span>
                  </button>
                </div>

                {/* Amount reminder */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">مبلغ دقیق واریزی:</span>
                  <span className="text-amber-300 font-black font-mono text-xs sm:text-sm">
                    {selectedPlan.price.toLocaleString('fa-IR')} تومان
                  </span>
                </div>
              </div>

              {/* Instruction */}
              <p className="text-[10px] sm:text-[11px] text-slate-300 leading-relaxed bg-slate-900/70 p-2 rounded-xl border border-slate-800">
                💡 لطفاً مبلغ را به کارت بالا واریز کنید؛ سپس شماره کارت مبدأ را در کادر زیر ثبت نمایید. همچنین با دکمه پایین می‌توانید تصویر رسید را به پشتیبانی ارسال کنید.
              </p>

              {/* Form inputs */}
              <form id="receipt-form" onSubmit={handleSubmitReceipt} className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white block">
                    شماره کارت واریزکننده (کارت مبدأ) <span className="text-rose-400">*</span>:
                  </label>
                  <input
                    type="text"
                    value={senderCard}
                    onChange={e => setSenderCard(e.target.value)}
                    placeholder="مثال: ۵۰۲۲۲۹... یا ۴ رقم آخر (مثلاً ۱۲۳۴)"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 outline-none font-mono dir-ltr text-right"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-white block">
                    شماره پیگیری یا کد ارجاع فیش (اختیاری):
                  </label>
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={e => setReceiptNumber(e.target.value)}
                    placeholder="مثال: ۱۲۳۴۵۶ یا شماره پیگیری تراکنش"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 outline-none font-mono dir-ltr text-right"
                  />
                </div>
              </form>

            </div>

            {/* 3. Sticky Bottom Footer (Always in viewport - Buttons never overflow or get hidden) */}
            <div className="p-2.5 sm:p-3 border-t border-slate-800/90 bg-[#070b14] shrink-0 space-y-2">
              
              {/* Button: Send Receipt Screenshot to Support (Direct Link + Copy fallback) */}
              <div className="flex items-center gap-1.5">
                <a
                  href={getResolvedSupportUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    try {
                      const win = window.open(getResolvedSupportUrl(), '_blank', 'noopener,noreferrer');
                      if (win) e.preventDefault();
                    } catch {
                      // Let native <a> navigate
                    }
                  }}
                  className="flex-1 py-2 px-3 bg-gradient-to-r from-sky-600/25 via-blue-600/25 to-indigo-600/25 hover:from-sky-600/35 hover:to-indigo-600/35 border border-sky-500/50 hover:border-sky-400 text-sky-100 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-sm no-underline text-center"
                >
                  <Camera className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>{cardSettings.supportReceiptTitle || 'ارسال فیش و اسکرین‌شات به پشتیبانی'}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400/90 shrink-0" />
                </a>

                <button
                  type="button"
                  onClick={handleCopySupportLink}
                  title="کپی آیدی یا لینک پشتیبانی"
                  className="px-2.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-sky-300 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 shrink-0 flex items-center gap-1"
                >
                  {copiedSupportLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[10px] hidden sm:inline">{copiedSupportLink ? 'کپی شد' : 'کپی لینک'}</span>
                </button>
              </div>

              {/* Submit & Cancel Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  form="receipt-form"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black text-xs py-2.5 sm:py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-98"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>ثبت فیش و فعال‌سازی اشتراک</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2.5 sm:py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer active:scale-98 shrink-0"
                >
                  انصراف
                </button>
              </div>

            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
