import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, HelpCircle, ChevronRight, ChevronLeft, Check, X, 
  RotateCw, RefreshCw, Star, Info, Flame, Heart, Smile
} from 'lucide-react';
import { ScenarioNode } from '../data/scenarios.js';
import { trackEvent } from '../lib/tracking.js';

interface LeitnerStudyViewProps {
  allScenarios: ScenarioNode[];
  leitnerBoxes: Record<string, number>;
  saveLeitnerBoxes: (boxes: Record<string, number>) => void;
  onCopyText: (text: string, id: string) => void;
  copiedId: string | null;
}

export default function LeitnerStudyView({
  allScenarios,
  leitnerBoxes,
  saveLeitnerBoxes,
  onCopyText,
  copiedId
}: LeitnerStudyViewProps) {
  const [leitnerFilter, setLeitnerFilter] = useState<'all' | 'box1' | 'box2' | 'box3'>('all');
  const [leitnerIndex, setLeitnerIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [todayReviewed, setTodayReviewed] = useState(3);
  const [streakDays, setStreakDays] = useState(5);
  const [earnedXP, setEarnedXP] = useState(120);

  // Helper to retrieve the box number of a scenario
  const getBoxNumber = (id: string) => {
    return leitnerBoxes[id] || 1; // Defaults to Box 1
  };

  // Calculate box counts
  const countBox1 = allScenarios.filter(s => getBoxNumber(s.id) === 1).length;
  const countBox2 = allScenarios.filter(s => getBoxNumber(s.id) === 2).length;
  const countBox3 = allScenarios.filter(s => getBoxNumber(s.id) === 3).length;

  const totalScenarios = allScenarios.length || 1;
  const masteryPercentage = Math.round((countBox3 / totalScenarios) * 100);

  // Helper for next review schedule date string
  const getNextReviewSchedule = (boxNum: number) => {
    if (boxNum === 1) return 'فردا (۲۴ ساعت بعد)';
    if (boxNum === 2) return '۳ روز آینده';
    return '۷ روز آینده (تثبیت کامل)';
  };

  // Filter scenarios based on selection
  const filteredScenarios = allScenarios.filter(s => {
    const box = getBoxNumber(s.id);
    if (leitnerFilter === 'box1') return box === 1;
    if (leitnerFilter === 'box2') return box === 2;
    if (leitnerFilter === 'box3') return box === 3;
    return true;
  });

  const hasCards = filteredScenarios.length > 0;
  // Ensure index is within range
  const currentIndex = hasCards ? leitnerIndex % filteredScenarios.length : 0;
  const currentCard = hasCards ? filteredScenarios[currentIndex] : null;

  // Reset progress for this box or all boxes
  const handleResetProgress = () => {
    if (window.confirm("آیا مایلید تمام کارت‌های سناریو را به جعبه ۱ (نیاز به تمرین) برگردانید و مرور را از ابتدا شروع کنید؟")) {
      saveLeitnerBoxes({});
      setLeitnerIndex(0);
      setIsFlipped(false);
    }
  };

  // Move card to Box 1
  const handleMoveToBox1 = (id: string) => {
    const nextBoxes = { ...leitnerBoxes, [id]: 1 };
    saveLeitnerBoxes(nextBoxes);
    setIsFlipped(false);
    setTodayReviewed(prev => prev + 1);
    setEarnedXP(prev => prev + 15);
    trackEvent('leitner_card_reviewed', 'leitner', {
      scenarioId: id,
      targetBox: 1,
      isCorrect: false
    });
    // Go to next card if we have multiple
    if (filteredScenarios.length > 1) {
      setLeitnerIndex(prev => prev + 1);
    }
  };

  // Move card to Next Box
  const handleMoveToNextBox = (id: string) => {
    const currentBox = getBoxNumber(id);
    const nextBox = Math.min(currentBox + 1, 3);
    const nextBoxes = { ...leitnerBoxes, [id]: nextBox };
    saveLeitnerBoxes(nextBoxes);
    setIsFlipped(false);
    setTodayReviewed(prev => prev + 1);
    setEarnedXP(prev => prev + 30);
    trackEvent('leitner_card_reviewed', 'leitner', {
      scenarioId: id,
      targetBox: nextBox,
      isCorrect: true
    });
    // Go to next card if we have multiple
    if (filteredScenarios.length > 1) {
      setLeitnerIndex(prev => prev + 1);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" style={{ direction: 'rtl' }}>
      
      {/* Daily Goal, Streak & Mastery Learning Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-sky-950/40 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 text-amber-400 fill-amber-400/20" />
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">زنجیره مطالعه: {streakDays} روز متوالی 🔥</h3>
              <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] rounded-full font-mono font-bold">
                +{earnedXP} XP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">برنامه مرور هوشمند جعبه لایتنر بر اساس حافظه بلندمدت</p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-800/80 pt-3 md:pt-0">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-semibold">مرور امروز:</span>
            <span className="text-xs font-black text-sky-400 font-mono">{todayReviewed} از ۱۰ کارت</span>
          </div>

          <div className="text-right pl-2 border-r border-slate-800 pr-4">
            <span className="text-[10px] text-slate-400 block font-semibold">نرخ تسلط کلی:</span>
            <span className="text-xs font-black text-emerald-400 font-mono">{masteryPercentage}٪ تسلط کامل</span>
          </div>
        </div>
      </div>
      
      {/* Leitner Metrics Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => { setLeitnerFilter('all'); setLeitnerIndex(0); setIsFlipped(false); }}
          className={`glass-card rounded-2xl p-4.5 border text-right transition-all cursor-pointer flex flex-col justify-between ${
            leitnerFilter === 'all' 
              ? 'border-sky-500/30 bg-sky-500/5 shadow-lg shadow-sky-500/5' 
              : 'border-slate-800/80 hover:border-slate-700/80'
          }`}
        >
          <span className="text-[10px] text-slate-400 font-semibold block mb-1">کل کارت‌های دانش</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white font-mono">{allScenarios.length}</span>
            <span className="text-slate-500 text-[10px]">موقعیت</span>
          </div>
        </button>

        <button
          onClick={() => { setLeitnerFilter('box1'); setLeitnerIndex(0); setIsFlipped(false); }}
          className={`glass-card rounded-2xl p-4.5 border text-right transition-all cursor-pointer flex flex-col justify-between ${
            leitnerFilter === 'box1' 
              ? 'border-rose-500/30 bg-rose-500/5 shadow-lg shadow-rose-500/5' 
              : 'border-slate-800/80 hover:border-slate-700/80'
          }`}
        >
          <span className="text-[10px] text-rose-400 font-bold block mb-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            جعبه ۱ - نیاز به تمرین
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white font-mono">{countBox1}</span>
            <span className="text-slate-500 text-[10px]">کارت مهارتی</span>
          </div>
        </button>

        <button
          onClick={() => { setLeitnerFilter('box2'); setLeitnerIndex(0); setIsFlipped(false); }}
          className={`glass-card rounded-2xl p-4.5 border text-right transition-all cursor-pointer flex flex-col justify-between ${
            leitnerFilter === 'box2' 
              ? 'border-amber-500/30 bg-amber-500/5 shadow-lg shadow-amber-500/5' 
              : 'border-slate-800/80 hover:border-slate-700/80'
          }`}
        >
          <span className="text-[10px] text-amber-400 font-bold block mb-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            جعبه ۲ - مسلط نسبی
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white font-mono">{countBox2}</span>
            <span className="text-slate-500 text-[10px]">کارت مهارتی</span>
          </div>
        </button>

        <button
          onClick={() => { setLeitnerFilter('box3'); setLeitnerIndex(0); setIsFlipped(false); }}
          className={`glass-card rounded-2xl p-4.5 border text-right transition-all cursor-pointer flex flex-col justify-between ${
            leitnerFilter === 'box3' 
              ? 'border-emerald-500/30 bg-emerald-500/5 shadow-lg shadow-emerald-500/5' 
              : 'border-slate-800/80 hover:border-slate-700/80'
          }`}
        >
          <span className="text-[10px] text-emerald-400 font-bold block mb-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            جعبه ۳ - حفظ کامل
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white font-mono">{countBox3}</span>
            <span className="text-slate-500 text-[10px]">کارت مهارتی</span>
          </div>
        </button>
      </div>

      {/* Main Flashcard Learning Area */}
      <div className="flex flex-col items-center justify-center py-4">
        {hasCards && currentCard ? (
          <div className="w-full max-w-2xl space-y-6">
            
            {/* Index Counter & Reset */}
            <div className="flex justify-between items-center px-2">
              <span className="text-xs text-slate-400 font-semibold font-mono">
                کارت {currentIndex + 1} از {filteredScenarios.length}
              </span>
              <button
                onClick={handleResetProgress}
                className="text-slate-500 hover:text-slate-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>ریست پیشرفت جعبه لایتنر</span>
              </button>
            </div>

            {/* FLIP CARD INNER WRAPPER */}
            <div 
              onClick={() => setIsFlipped(!isFlipped)}
              className="relative w-full aspect-auto md:min-h-[380px] bg-slate-950/60 border border-slate-800 hover:border-slate-700/60 rounded-3xl p-6 md:p-8 cursor-pointer transition-all shadow-2xl flex flex-col justify-between overflow-hidden group select-none"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-sky-500/5 to-purple-500/5 blur-[50px] rounded-full pointer-events-none" />
              
              {/* Header inside Card */}
              <div className="flex items-center justify-between border-b border-slate-900 pb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-slate-900 text-sky-400 border border-slate-800">
                    {currentCard.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ${
                    getBoxNumber(currentCard.id) === 3 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : getBoxNumber(currentCard.id) === 2
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    جعبه {getBoxNumber(currentCard.id)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-semibold">
                  <span>وضعیت:</span>
                  <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{currentCard.difficulty}</span>
                </div>
              </div>

              {/* CARD FACE */}
              <div className="flex-1 py-6 flex flex-col justify-center text-right">
                {!isFlipped ? (
                  // FRONT: Question / Context
                  <div className="space-y-4 animate-fade-in">
                    <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider block">صورت سناریو گفتگو:</span>
                    <h3 className="text-base md:text-lg font-bold text-white leading-snug">
                      {currentCard.title}
                    </h3>
                    <div className="bg-slate-900/40 p-4.5 border border-slate-900 rounded-2xl leading-relaxed text-xs text-slate-300 font-medium">
                      {currentCard.context}
                    </div>
                    <div className="flex items-center gap-1.5 justify-end text-[10px] text-slate-500 font-medium">
                      <RotateCw className="w-3.5 h-3.5 text-slate-600 animate-spin" style={{ animationDuration: '6s' }} />
                      <span>برای چرخاندن کارت و مشاهده ترفند مهارتی ضربه بزنید...</span>
                    </div>
                  </div>
                ) : (
                  // BACK: Solutions & Intelligence
                  <div className="space-y-5 animate-fade-in">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">✓ بهترین راهکار کاریزماتیک نهایی:</span>
                    <div className="bg-gradient-to-r from-sky-900/25 to-purple-900/15 p-4 border border-sky-500/20 rounded-2xl text-slate-100 font-semibold text-xs leading-relaxed">
                      « {currentCard.analysis.bestAnswer} »
                    </div>

                    <div className="space-y-3.5 pt-2">
                      <div className="text-[11px] leading-relaxed text-slate-300">
                        <span className="font-bold text-purple-400 block mb-0.5">🎯 تحلیل روانشناختی پشت پاسخ:</span>
                        {currentCard.analysis.reason}
                      </div>

                      <div className="text-[11px] leading-relaxed text-slate-300">
                        <span className="font-bold text-amber-400 block mb-0.5">🎭 زبان بدن و تن صدا پیشنهادی:</span>
                        {currentCard.analysis.bodyLanguage}
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-slate-900/40 p-3 border border-slate-900 rounded-xl text-[10px]">
                          <span className="font-bold text-emerald-400 block mb-0.5">➡️ گام بعدی گفتگو:</span>
                          <span className="text-slate-400">{currentCard.analysis.nextStep}</span>
                        </div>
                        <div className="bg-slate-900/40 p-3 border border-slate-900 rounded-xl text-[10px]">
                          <span className="font-bold text-indigo-400 block mb-0.5">❓ سوال مکمل پیشبردی:</span>
                          <span className="text-slate-400">{currentCard.analysis.followUpQuestion}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CARD FOOTER INFO */}
              <div className="border-t border-slate-900 pt-4 flex justify-between items-center text-[10px] text-slate-500 shrink-0">
                <span>احساس حاکم: <span className="font-bold text-slate-400">{currentCard.emotion}</span></span>
                <span className="flex items-center gap-1 font-semibold text-slate-400">
                  <RotateCw className="w-3 h-3" />
                  <span>چرخاندن</span>
                </span>
              </div>
            </div>

            {/* USER REPETITION FEEDBACK BUTTONS (Only visible when flipped) */}
            {isFlipped ? (
              <div className="grid grid-cols-2 gap-4 animate-slide-up">
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveToBox1(currentCard.id); }}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-2xl py-3.5 px-4 text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <X className="w-4 h-4 shrink-0" />
                  <span>❌ نیاز به تمرین (بازگشت به جعبه ۱)</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveToNextBox(currentCard.id); }}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-2xl py-3.5 px-4 text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span>✅ کاملاً مسلطم! (انتقال به جعبه بعدی)</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsFlipped(true)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-2xl py-3 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <RotateCw className="w-4 h-4 text-purple-400" />
                <span>برگرداندن کارت و مشاهده راه‌حل</span>
              </button>
            )}

            {/* MANUAL STEP NAVIGATION */}
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => { setLeitnerIndex(prev => (prev === 0 ? filteredScenarios.length - 1 : prev - 1)); setIsFlipped(false); }}
                className="bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
                <span>قبلی</span>
              </button>

              <span className="text-[11px] text-slate-500 font-medium">
                روی صورت کارت کلیک کنید تا پاسخ باز شود
              </span>

              <button
                onClick={() => { setLeitnerIndex(prev => prev + 1); setIsFlipped(false); }}
                className="bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>بعدی</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

          </div>
        ) : (
          // Empty State Box
          <div className="w-full max-w-lg glass-card rounded-3xl p-8 border border-dashed border-slate-800 text-center space-y-5 my-6">
            <div className="w-12 h-12 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-2xl flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-white">هیچ کارتی در این موقعیت یا جعبه نیست!</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {leitnerFilter === 'all' 
                  ? 'هنوز کارتی ایجاد نکرده‌اید یا تمامی کارت‌ها پاک شده‌اند.' 
                  : `تبریک می‌گوییم! تمامی کارت‌های طبقه‌بندی شده در "${
                      leitnerFilter === 'box1' ? 'نیاز به تمرین' :
                      leitnerFilter === 'box2' ? 'مسلط نسبی' : 'حفظ کامل'
                    }" را با موفقیت مرور کرده‌اید.`}
              </p>
            </div>
            <button
              onClick={() => { setLeitnerFilter('all'); setLeitnerIndex(0); setIsFlipped(false); }}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              مشاهده تمامی کارت‌های مهارتی
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
