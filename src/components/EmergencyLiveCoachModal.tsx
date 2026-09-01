import React, { useState } from 'react';
import { 
  Zap, X, MapPin, MessageSquare, Target, Flame, Sparkles, Send, RefreshCw
} from 'lucide-react';
import { CoachingMode } from '../types.js';
import { trackEvent } from '../lib/tracking.js';

interface EmergencyLiveCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitLiveCoach: (prompt: string, mode: CoachingMode) => void;
  loading?: boolean;
}

export default function EmergencyLiveCoachModal({
  isOpen,
  onClose,
  onSubmitLiveCoach,
  loading = false
}: EmergencyLiveCoachModalProps) {
  const [location, setLocation] = useState('کافه / رستوران');
  const [partnerStatement, setPartnerStatement] = useState('');
  const [goal, setGoal] = useState('ادامه گفتگو و جذابیت');
  const [tone, setTone] = useState('کاریزماتیک و باکلاس');

  if (!isOpen) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerStatement.trim() || loading) return;

    const compiledPrompt = `[کوچ لحظه‌ای فوری - Real-Time Emergency Coach]
موقعیت مکانی: ${location}
اتفاق / پیام طرف مقابل: "${partnerStatement.trim()}"
هدف کاربر: ${goal}
لحن ترجیحی: ${tone}

لطفاً همین الان با توجه به موقعیت مکانی و هدف، ۵ پاسخ فوق‌العاده کاریزماتیک با ۵ لحن (مستقیم، شوخ‌طبع، کاریزماتیک، احساسی و تحلیل روانشناسی) همراه با نکات لحن و زبان بدن ارائه بده.`;

    trackEvent('emergency_coach_used', 'coach', {
      location,
      goal,
      tone
    });

    onSubmitLiveCoach(compiledPrompt, 'live_coach');
    onClose();
  };

  const locationsList = [
    'کافه / رستوران', 'باشگاه ورزشی', 'خیابان / پاساژ', 
    'دایرکت اینستاگرام', 'واتساپ / تلگرام', 'دانشگاه / محل کار', 'مهمانی / دورهمی'
  ];

  const goalsList = [
    'شروع مکالمه از صفر', 'ادامه گفتگو و جذابیت', 'گرفتن شماره / پیشنهاد قرار', 
    'حاضرجوابی و شوخی', 'تعیین حد و مرز و اقتدار', 'خروج از فرندزون'
  ];

  const tonesList = [
    'شوخ و پرانرژی', 'کاریزماتیک و باکلاس', 'مقتدر و سنگین', 'احساسی و عاطفی'
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-sans text-slate-100 animate-fade-in" style={{ direction: 'rtl' }}>
      <div className="w-full max-w-lg bg-[#121216] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-black/20 rounded-xl border border-white/20 animate-pulse shrink-0">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200 fill-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs sm:text-sm text-white">کوچ لحظه‌ای و کمک فوری</h3>
                <span className="px-2 py-0.5 bg-black/30 text-amber-200 text-[9px] sm:text-[10px] rounded-full font-mono border border-amber-300/30">
                  ۱۰ ثانیه‌ای
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-amber-100/90">پاسخ‌دهی آنی در موقعیت‌های واقعی اجتماعی</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-full transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable Container */}
        <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          
          <div className="p-3.5 sm:p-5 space-y-3.5 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-800">
            {/* 1. Location */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>۱. الان دقیقا کجا هستید؟</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {locationsList.map(loc => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLocation(loc)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium border transition cursor-pointer active:scale-95 ${
                      location === loc 
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm' 
                        : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Partner Statement */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>۲. طرف مقابل چی گفت یا چه اتفاقی افتاد؟ *</span>
              </label>
              <textarea
                required
                rows={2}
                value={partnerStatement}
                onChange={(e) => setPartnerStatement(e.target.value)}
                placeholder="مثلا: گفت 'آره شلوغم فعلا' یا تو کافه نگاهم کرد و خندید..."
                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none resize-none"
              />
            </div>

            {/* 3. Goal */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>۳. هدفت از این پاسخ چیست؟</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {goalsList.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGoal(g)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium border transition cursor-pointer active:scale-95 ${
                      goal === g 
                        ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm' 
                        : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Tone */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>۴. لحن دلخواهت چیه؟</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {tonesList.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium border transition cursor-pointer active:scale-95 ${
                      tone === t 
                        ? 'bg-purple-500 text-white font-bold border-purple-400 shadow-sm' 
                        : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky/Fixed Footer Action */}
          <div className="p-3.5 sm:p-4 bg-slate-950/90 border-t border-slate-800/80 shrink-0">
            <button
              type="submit"
              disabled={!partnerStatement.trim() || loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer active:scale-98"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>در حال دریافت فوری ۵ پاسخ...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>دریافت فوری ۵ پاسخ کاریزماتیک</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
