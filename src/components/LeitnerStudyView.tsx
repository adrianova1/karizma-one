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

function extractCardData(card: any) {
  if (!card) return null;
  
  // 1. Best / Golden Answer
  const bestAnswer = 
    card.analysis?.bestAnswer ||
    card.responses?.charismatic ||
    card.responses?.tone_1 ||
    card.responses?.confident ||
    (Array.isArray(card.answers) && card.answers[0]?.text) ||
    '';

  // 2. Multi-tone responses
  const answersList: { style: string; text: string }[] = [];
  
  if (Array.isArray(card.answers) && card.answers.length > 0) {
    for (const a of card.answers) {
      if (a && a.text) {
        answersList.push({ style: a.style || 'کاریزماتیک', text: a.text });
      }
    }
  } else if (card.responses && typeof card.responses === 'object') {
    const toneLabels: Record<string, string> = {
      charismatic: 'کاریزماتیک و باکلاس',
      funny: 'شوخ‌طبع و رندانه',
      confident: 'مقتدر و با اعتمادبه‌نفس',
      mysterious: 'مرموز و پرکشش',
      mature: 'متین و پخته',
      friendly: 'صمیمی',
      direct: 'صریح'
    };
    for (const [k, v] of Object.entries(card.responses)) {
      if (typeof v === 'string' && v.trim()) {
        answersList.push({ style: toneLabels[k] || k, text: v.trim() });
      }
    }
  }

  // 3. Technique / Psychological Reason
  const technique = card.analysis?.reason || card.technique || card.tips || '';
  
  // 4. Body Language
  const bodyLanguage = card.analysis?.bodyLanguage || card.bodyLanguage || '';
  
  // 5. Next move
  const nextMove = card.analysis?.nextStep || card.nextMove || card.analysis?.followUpQuestion || '';

  return {
    title: card.title || card.situation || 'سناریوی تمرینی',
    situation: card.situation || card.context || card.title || '',
    opponentLine: card.opponentLine || (card.context && card.context !== card.situation ? card.context : ''),
    environment: card.category || card.environment || 'سناریوی ارتباطی',
    bestAnswer,
    answersList,
    technique,
    bodyLanguage,
    nextMove
  };
}

export default function LeitnerStudyView({ token, onBack, onStudyComplete }: LeitnerStudyViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cards, setCards] = useState<any[]>(() => PRESEEDED_SCENARIOS.slice(0, 15));
  const [reviewedCount, setReviewedCount] = useState(0);

  // Optionally fetch dynamic scenarios from database to enrich Leitner deck
  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    fetch('/api/scenarios?limit=30', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (isMounted && data?.scenarios && Array.isArray(data.scenarios) && data.scenarios.length > 0) {
          // Merge preseeded + db scenarios
          setCards(prev => {
            const combined = [...prev, ...data.scenarios];
            // unique by title or id
            const seen = new Set<string>();
            return combined.filter(item => {
              const key = item.id || item.title;
              if (!key || seen.has(key)) return false;
              seen.add(key);
              return true;
            });
          });
        }
      })
      .catch(() => {
        // Fallback gracefully to preseeded scenarios
      });
    return () => { isMounted = false; };
  }, [token]);

  const rawCard = cards[currentIndex];
  const currentCard = rawCard ? extractCardData(rawCard) : null;

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
        <p className="text-xs text-slate-400">شما {reviewedCount} کارت را با موفقیت مرور کردید.</p>
        <button
          onClick={onBack}
          className="bg-sky-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
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
        className="bg-gradient-to-b from-[#0f172a] to-[#0b0f19] border border-slate-800 hover:border-amber-500/40 rounded-3xl p-5 sm:p-6 min-h-[300px] flex flex-col justify-between shadow-xl cursor-pointer transition relative"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full">
            {currentCard.environment || 'سناریوی ارتباطی'}
          </span>
          <span className="text-[10px] text-amber-400 font-medium">
            {isFlipped ? 'برای دیدن صورت مسئله کلیک کنید ↻' : 'برای دیدن پاسخ کلیک کنید ↻'}
          </span>
        </div>

        <div className="my-auto py-4 space-y-3 text-center">
          {!isFlipped ? (
            <>
              <span className="text-[10px] text-sky-400 font-bold block">موقعیت / چالش:</span>
              <h2 className="text-base font-extrabold text-white leading-relaxed">
                {currentCard.situation || currentCard.title}
              </h2>
              {currentCard.opponentLine && (
                <div className="text-xs text-slate-300 bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl inline-block mt-2 max-w-full text-right leading-relaxed">
                  طرف مقابل: «{currentCard.opponentLine}»
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3 text-right">
              {/* Golden Answer */}
              {currentCard.bestAnswer && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-amber-400 block flex items-center gap-1">
                    👑 بهترین پاسخ کاریزماتیک (پاسخ طلایی):
                  </span>
                  <p className="text-xs font-bold text-white leading-relaxed">
                    «{currentCard.bestAnswer}»
                  </p>
                </div>
              )}

              {/* Other Tone Answers if available */}
              {currentCard.answersList.length > 0 && (
                <div className="text-xs text-slate-200 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">
                    سایر گزینه‌های پاسخ و سبک‌ها:
                  </span>
                  {currentCard.answersList.slice(0, 3).map((ans, idx) => (
                    <p key={idx} className="leading-relaxed">
                      <strong className="text-sky-400">{ans.style}:</strong> «{ans.text}»
                    </p>
                  ))}
                </div>
              )}

              {/* Technique & Psychological Reason */}
              {currentCard.technique && (
                <div className="text-[11px] text-slate-300 bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl leading-relaxed">
                  💡 <strong className="text-emerald-400">تحلیل و علت روانشناختی:</strong> {currentCard.technique}
                </div>
              )}

              {/* Body Language */}
              {currentCard.bodyLanguage && (
                <div className="text-[11px] text-slate-400 bg-slate-950/40 border border-slate-800/60 p-2 rounded-xl leading-relaxed">
                  👁️ <strong className="text-sky-300">زبان بدن و لحن:</strong> {currentCard.bodyLanguage}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-center text-[10px] text-slate-500">
          جعبه لایتنر هوشمند کاریزما • برای چرخش کارت کلیک کنید
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
