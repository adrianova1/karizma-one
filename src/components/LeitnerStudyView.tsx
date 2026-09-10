import React, { useState, useEffect } from 'react';
import { 
  Layers, ArrowRight, RotateCw, CheckCircle2, XCircle, Sparkles, 
  HelpCircle, Award, ChevronLeft, ChevronRight, Eye
} from 'lucide-react';
import { ScenarioItem } from '../types.js';
import { PRESEEDED_SCENARIOS } from '../data/scenarios.js';

interface LeitnerStudyViewProps {
  token: string;
  onBack: () => void;
  onStudyComplete: () => void;
}

export default function LeitnerStudyView({ token, onBack, onStudyComplete }: LeitnerStudyViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cards, setCards] = useState<ScenarioItem[]>(() => PRESEEDED_SCENARIOS.slice(0, 15));
  const [reviewedCount, setReviewedCount] = useState(0);

  const currentCard = cards[currentIndex];

  const handleNext = (remembered: boolean) => {
    setIsFlipped(false);
    setReviewedCount(prev => prev + 1);
    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onStudyComplete();
    }
  };

  if (!currentCard) {
    return (
      <div className="p-6 text-center space-y-4">
        <h3 className="text-sm font-bold text-white">جلسه مطالعه لایتنر پایان یافت!</h3>
        <button
          onClick={onBack}
          className="bg-sky-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs"
        >
          بازگشت به خانه
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto h-full p-4 space-y-4 text-right dir-rtl select-none pb-24" style={{ direction: 'rtl' }}>
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 transition cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت</span>
        </button>
        <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" />
          <span>کارت {currentIndex + 1} از {cards.length}</span>
        </span>
      </div>

      <div 
        onClick={() => setIsFlipped(!isFlipped)}
        className="bg-gradient-to-b from-[#0f172a] to-[#0b0f19] border border-slate-800 hover:border-amber-500/40 rounded-3xl p-6 min-h-[280px] flex flex-col justify-between shadow-xl cursor-pointer transition relative"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full">
            {currentCard.environment || 'سناریوی ارتباطی'}
          </span>
          <span className="text-[10px] text-amber-400 font-medium">برای دیدن پاسخ کلیک کنید ↻</span>
        </div>

        <div className="my-auto py-4 space-y-3 text-center">
          {!isFlipped ? (
            <>
              <span className="text-[10px] text-sky-400 font-bold block">موقعیت / چالش:</span>
              <h2 className="text-base font-extrabold text-white leading-relaxed">
                {currentCard.situation || currentCard.title}
              </h2>
              {currentCard.opponentLine && (
                <div className="text-xs text-slate-300 bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl inline-block mt-2">
                  طرف مقابل: «{currentCard.opponentLine}»
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3 text-right">
              <span className="text-[10px] text-emerald-400 font-bold block text-center">پاسخ‌های پیشنهادی و کاریزماتیک:</span>
              <div className="text-xs text-slate-200 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl space-y-2">
                <p><strong className="text-amber-400">کاریزماتیک:</strong> {currentCard.responses?.charismatic || '-'}</p>
                <p><strong className="text-sky-400">شوخ‌طبع:</strong> {currentCard.responses?.funny || '-'}</p>
                {currentCard.technique && (
                  <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                    💡 <strong>تکنیک:</strong> {currentCard.technique}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-[10px] text-slate-500">
          جعبه لایتنر هوشمند کاریزما
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={() => handleNext(false)}
          className="bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-bold text-xs py-3 rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <XCircle className="w-4 h-4" />
          <span>یادم نبود (تکرار)</span>
        </button>
        <button
          onClick={() => handleNext(true)}
          className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-xs py-3 rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>مسلط هستم (مرحله بعد)</span>
        </button>
      </div>
    </div>
  );
}
