import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layers, ArrowRight, RotateCw, CheckCircle2, XCircle, Sparkles, 
  Award, Copy, Check, RefreshCw, BookOpen, ChevronLeft, ChevronRight,
  TrendingUp, Star, ShieldCheck, Flame, Plus, Search, X
} from 'lucide-react';
import { PRESEEDED_SCENARIOS } from '../data/scenarios.js';

interface LeitnerStudyViewProps {
  token: string;
  onBack: () => void;
  onStudyComplete: () => void;
}

export interface LeitnerItem {
  id: string;
  box: 1 | 2 | 3 | 4 | 5;
  lastReviewed?: string;
  reviewCount: number;
  data: {
    id: string;
    title: string;
    situation: string;
    opponentLine: string;
    environment: string;
    bestAnswer: string;
    answersList: { style: string; text: string }[];
    technique: string;
    bodyLanguage: string;
    nextMove: string;
  };
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
    id: card.id || 'c_' + Math.random().toString(36).substring(2, 9),
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

const STORAGE_KEY = 'karizma_leitner_deck_v3';

export default function LeitnerStudyView({ token, onBack, onStudyComplete }: LeitnerStudyViewProps) {
  // All cards in user's Leitner deck
  const [deck, setDeck] = useState<LeitnerItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading Leitner deck:', e);
    }
    // Initialize from preseeded scenarios
    return PRESEEDED_SCENARIOS.slice(0, 20).map((s, idx) => ({
      id: s.id || `init_${idx}`,
      box: 1,
      reviewCount: 0,
      data: extractCardData(s)!
    }));
  });

  // Selected filter: 'all' or box number 1..5
  const [activeBoxFilter, setActiveBoxFilter] = useState<'all' | 1 | 2 | 3 | 4 | 5>('all');
  
  // Current active study queue derived from filter
  const [activeQueue, setActiveQueue] = useState<string[]>([]);
  const [currentCardId, setCurrentCardId] = useState<string | null>(null);
  
  const [isFlipped, setIsFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userTrialAnswer, setUserTrialAnswer] = useState('');

  // Add scenario modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalResults, setModalResults] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalHasSearched, setModalHasSearched] = useState(false);
  const [addedToast, setAddedToast] = useState<string | null>(null);
  
  // Session statistics
  const [sessionPromoted, setSessionPromoted] = useState(0);
  const [sessionDemoted, setSessionDemoted] = useState(0);
  const [sessionFinished, setSessionFinished] = useState(false);

  // Sync deck to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
    } catch (e) {
      console.warn('Error saving Leitner deck:', e);
    }
  }, [deck]);

  // Optionally load more rich scenarios from API into Box 1 if deck is small
  useEffect(() => {
    if (!token) return;
    fetch('/api/scenarios?limit=35', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data?.scenarios && Array.isArray(data.scenarios) && data.scenarios.length > 0) {
          setDeck(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newItems: LeitnerItem[] = [];
            for (const s of data.scenarios) {
              if (s && s.id && !existingIds.has(s.id)) {
                const extracted = extractCardData(s);
                if (extracted && extracted.bestAnswer) {
                  existingIds.add(s.id);
                  newItems.push({
                    id: s.id,
                    box: 1,
                    reviewCount: 0,
                    data: extracted
                  });
                }
              }
            }
            return newItems.length > 0 ? [...prev, ...newItems] : prev;
          });
        }
      })
      .catch(() => {});
  }, [token]);

  // Re-build active queue when box filter changes or on initial start
  useEffect(() => {
    const candidateIds = deck
      .filter(item => activeBoxFilter === 'all' || item.box === activeBoxFilter)
      .map(item => item.id);
    
    setActiveQueue(candidateIds);
    setCurrentCardId(candidateIds[0] || null);
    setIsFlipped(false);
    setSessionFinished(false);
  }, [activeBoxFilter, deck.length]);

  // Current card data lookup
  const currentItem = useMemo(() => {
    if (!currentCardId) return null;
    return deck.find(item => item.id === currentCardId) || null;
  }, [deck, currentCardId]);

  // Box counters
  const boxCounts = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, all: deck.length };
    for (const item of deck) {
      if (item.box >= 1 && item.box <= 5) {
        counts[item.box] = (counts[item.box] || 0) + 1;
      }
    }
    return counts;
  }, [deck]);

  // Handle flashcard action: remembered (promoted) vs forgotten (demoted)
  const handleAnswer = (remembered: boolean) => {
    if (!currentItem) return;
    setIsFlipped(false);
    setCopied(false);
    setUserTrialAnswer('');

    const cardId = currentItem.id;
    const oldBox = currentItem.box;

    if (remembered) {
      // Advance to next box (max 5)
      const nextBox = Math.min(5, oldBox + 1) as 1 | 2 | 3 | 4 | 5;
      setSessionPromoted(prev => prev + 1);

      setDeck(prev => prev.map(item => {
        if (item.id === cardId) {
          return {
            ...item,
            box: nextBox,
            reviewCount: item.reviewCount + 1,
            lastReviewed: new Date().toISOString()
          };
        }
        return item;
      }));

      // Remove from current queue
      const nextQueue = activeQueue.filter(id => id !== cardId);
      setActiveQueue(nextQueue);
      if (nextQueue.length > 0) {
        setCurrentCardId(nextQueue[0]);
      } else {
        setSessionFinished(true);
        onStudyComplete();
      }
    } else {
      // Demote to Box 1 and put at the end of the session queue for immediate reinforcement!
      setSessionDemoted(prev => prev + 1);

      setDeck(prev => prev.map(item => {
        if (item.id === cardId) {
          return {
            ...item,
            box: 1,
            reviewCount: item.reviewCount + 1,
            lastReviewed: new Date().toISOString()
          };
        }
        return item;
      }));

      // Move to end of current queue
      const remaining = activeQueue.filter(id => id !== cardId);
      const reQueued = [...remaining, cardId];
      setActiveQueue(reQueued);
      if (remaining.length > 0) {
        setCurrentCardId(remaining[0]);
      } else {
        // Only one card left and it was demoted, keep studying it
        setCurrentCardId(cardId);
      }
    }
  };

  const handleSearchFromModal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!modalSearchQuery.trim()) return;
    setModalLoading(true);
    setModalHasSearched(true);
    try {
      const res = await fetch(`/api/scenarios?search=${encodeURIComponent(modalSearchQuery.trim())}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setModalResults(data.scenarios || []);
      }
    } catch (err) {
      console.error('Error searching scenarios for Leitner:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddScenarioToDeck = (scenario: any) => {
    const extracted = extractCardData(scenario);
    if (!extracted) return;

    const existingIdx = deck.findIndex(d => d.id === scenario.id || d.data?.id === scenario.id);
    if (existingIdx >= 0) {
      setAddedToast('این سناریو هم‌اکنون در جعبه لایتنر شما وجود دارد.');
      setTimeout(() => setAddedToast(null), 3000);
      return;
    }

    const newItem: LeitnerItem = {
      id: scenario.id,
      box: 1,
      reviewCount: 0,
      lastReviewed: new Date().toISOString(),
      data: extracted
    };

    setDeck(prev => [newItem, ...prev]);
    setActiveQueue(prev => [newItem.id, ...prev]);
    setCurrentCardId(newItem.id);
    setIsFlipped(false);
    setUserTrialAnswer('');
    setAddedToast(`سناریوی «${extracted.title}» به خانه ۱ اضافه شد! 🗃️`);
    setTimeout(() => setAddedToast(null), 3000);
  };

  const handleCopyAnswer = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetDeck = () => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید تمام کارت‌ها به خانه ۱ بازگردانده شوند؟')) {
      const reset = deck.map(item => ({ ...item, box: 1 as const, reviewCount: 0 }));
      setDeck(reset);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
      const ids = reset.map(r => r.id);
      setActiveQueue(ids);
      setCurrentCardId(ids[0] || null);
      setIsFlipped(false);
      setSessionFinished(false);
    }
  };

  const boxLabels: Record<number, { title: string; color: string; desc: string }> = {
    1: { title: 'خانه ۱', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30', desc: 'جدید و نیازمند تکرار روزانه' },
    2: { title: 'خانه ۲', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', desc: 'در حال یادگیری (مرور هر ۲ روز)' },
    3: { title: 'خانه ۳', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30', desc: 'در حال تثبیت (مرور هر ۴ روز)' },
    4: { title: 'خانه ۴', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30', desc: 'تسلط اولیه (مرور هر ۸ روز)' },
    5: { title: 'خانه ۵', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', desc: 'تسلط کامل و حافظه دائمی 🏆' },
  };

  return (
    <div className="flex-1 overflow-y-auto h-full p-4 space-y-4 text-right dir-rtl select-none pb-28" style={{ direction: 'rtl' }}>
      
      {/* 1. Header with back and reset */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 transition cursor-pointer active:scale-95"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت</span>
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black text-amber-400 flex items-center gap-1">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>جعبه لایتنر سناریوها</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl px-2.5 py-1.5 transition cursor-pointer active:scale-95"
            title="نوشتن موقعیت و جستجو در بانک سناریوها برای تمرین"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold">افزودن از بانک سناریو</span>
          </button>

          <button
            type="button"
            onClick={handleResetDeck}
            title="ریست کارت‌ها به خانه ۱"
            className="text-[11px] text-slate-400 hover:text-rose-300 p-1.5 bg-slate-900 border border-slate-800 rounded-xl transition cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. 5-Box Leitner Tabs Indicator */}
      <div className="bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-2.5 space-y-2 shadow-md">
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span className="font-bold text-white flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
            <span>مراحل تسلط کلامی (خانه‌های ۵ گانه):</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {activeQueue.length} کارت در نوبت تمرین
          </span>
        </div>

        <div className="grid grid-cols-6 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveBoxFilter('all')}
            className={`py-1.5 px-1 rounded-xl text-center transition cursor-pointer border ${
              activeBoxFilter === 'all'
                ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 font-bold'
                : 'bg-slate-900/60 border-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-[9px]">همه</div>
            <div className="text-xs font-mono font-black mt-0.5">{boxCounts.all}</div>
          </button>

          {[1, 2, 3, 4, 5].map((b) => {
            const num = b as 1 | 2 | 3 | 4 | 5;
            const info = boxLabels[num];
            const isSelected = activeBoxFilter === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => setActiveBoxFilter(num)}
                className={`py-1.5 px-1 rounded-xl text-center transition cursor-pointer border ${
                  isSelected
                    ? `${info.color} font-bold ring-1 ring-amber-400/30`
                    : 'bg-slate-900/60 border-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-[9px]">خانه {num}</div>
                <div className="text-xs font-mono font-black mt-0.5">{boxCounts[num]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Study Area */}
      {sessionFinished || !currentItem ? (
        /* Completion Screen */
        <div className="bg-gradient-to-b from-[#0f172a] to-[#0b0f19] border border-amber-500/30 rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-black text-white">جلسه مطالعه لایتنر تکمیل شد! 🎉</h3>
            <p className="text-xs text-slate-300">
              تسلط شما بر تکنیک‌های حاضر جوابی کاریزماتیک با موفقیت تثبیت شد.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto py-2">
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
              <div className="text-[10px] text-slate-400">ارتقاء به خانه بعد</div>
              <div className="text-sm font-black text-emerald-400 font-mono mt-1">+{sessionPromoted} کارت ✅</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
              <div className="text-[10px] text-slate-400">نیازمند مرور مجدد</div>
              <div className="text-sm font-black text-rose-400 font-mono mt-1">{sessionDemoted} کارت 🔄</div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveBoxFilter('all');
                const ids = deck.map(d => d.id);
                setActiveQueue(ids);
                setCurrentCardId(ids[0] || null);
                setIsFlipped(false);
                setSessionFinished(false);
                setSessionPromoted(0);
                setSessionDemoted(0);
              }}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl transition cursor-pointer shadow-md active:scale-95"
            >
              شروع مجدد دوره لایتنر
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer active:scale-95"
            >
              بازگشت به داشبورد
            </button>
          </div>
        </div>
      ) : (
        /* Active Flashcard */
        <div className="space-y-3">
          
          {/* Card Meta Indicator */}
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-1.5">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${boxLabels[currentItem.box].color}`}>
                {boxLabels[currentItem.box].title} ({boxLabels[currentItem.box].desc})
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              کارت {activeQueue.indexOf(currentItem.id) + 1} از {activeQueue.length}
            </span>
          </div>

          {/* Interactive Flip Card */}
          <div 
            onClick={() => setIsFlipped(!isFlipped)}
            className="bg-gradient-to-b from-[#0f172a] to-[#0b0f19] border border-slate-800 hover:border-amber-500/40 rounded-3xl p-5 sm:p-6 min-h-[320px] flex flex-col justify-between shadow-xl cursor-pointer transition relative group select-none"
          >
            {/* Top Bar inside card */}
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
              <span className="text-[10px] text-slate-400 bg-slate-900/90 border border-slate-800 px-2.5 py-0.5 rounded-full">
                {currentItem.data.environment || 'سناریوی ارتباطی'}
              </span>
              <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1 group-hover:underline">
                <RotateCw className="w-3 h-3 text-amber-400 animate-spin-slow" />
                <span>{isFlipped ? 'مشاهده چالش و صورت‌مسئله' : 'چرخش و دیدن پاسخ طلایی'}</span>
              </span>
            </div>

            {/* Main Card Content: Front vs Back */}
            <div className="my-auto py-4 space-y-3">
              {!isFlipped ? (
                /* FRONT OF CARD: Challenge / Situation */
                <div className="text-center space-y-3 py-2">
                  <span className="text-[10px] text-sky-400 font-black tracking-wider uppercase block">
                    موقعیت / چالش کلامی
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-white leading-relaxed px-2">
                    {currentItem.data.situation || currentItem.data.title}
                  </h2>
                  {currentItem.data.opponentLine && (
                    <div className="text-xs text-slate-200 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl inline-block mt-2 max-w-full text-right leading-relaxed shadow-inner">
                      <span className="text-sky-400 font-bold ml-1">جمله طرف مقابل:</span>
                      «{currentItem.data.opponentLine}»
                    </div>
                  )}

                  {/* Active Recall Practice Input */}
                  <div className="pt-2 px-1 max-w-md mx-auto text-right space-y-1.5" onClick={e => e.stopPropagation()}>
                    <label className="text-[11px] text-amber-300 font-bold block">
                      ✍️ پاسخ خودت رو بنویس تا با پاسخ طلایی مقایسه کنی:
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={userTrialAnswer}
                        onChange={(e) => setUserTrialAnswer(e.target.value)}
                        placeholder="پاسخ پیشنهادی شما..."
                        className="flex-1 bg-slate-950/90 border border-slate-700/80 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setIsFlipped(true);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setIsFlipped(true)}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer shrink-0 active:scale-95"
                      >
                        بررسی پاسخ
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 pt-1">
                    💡 قبل از چرخاندن کارت، پاسخ خودت رو در ذهن یا کادر بالا بسنج.
                  </p>
                </div>
              ) : (
                /* BACK OF CARD: User answer + Golden Answer + Multi-tone + Psychological Reason */
                <div className="space-y-3 text-right animate-fade-in" onClick={e => e.stopPropagation()}>
                  
                  {/* User's Input if provided */}
                  {userTrialAnswer.trim() && (
                    <div className="p-3 bg-slate-900/90 border border-sky-500/30 rounded-2xl space-y-1">
                      <span className="text-[10px] font-bold text-sky-400 block">
                        💬 پاسخ پیشنهادی شما:
                      </span>
                      <p className="text-xs text-slate-200 font-medium leading-relaxed">
                        «{userTrialAnswer}»
                      </p>
                    </div>
                  )}

                  {/* Golden Answer */}
                  {currentItem.data.bestAnswer && (
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1.5 shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-amber-400 flex items-center gap-1">
                          👑 بهترین پاسخ کاریزماتیک (پاسخ طلایی):
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyAnswer(currentItem.data.bestAnswer)}
                          className="flex items-center gap-1 text-[10px] text-amber-300 hover:text-white bg-amber-500/20 px-2 py-0.5 rounded-lg transition cursor-pointer"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copied ? 'کپی شد' : 'کپی'}</span>
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm font-black text-white leading-relaxed">
                        «{currentItem.data.bestAnswer}»
                      </p>
                    </div>
                  )}

                  {/* Multi-tone Alternatives */}
                  {currentItem.data.answersList.length > 0 && (
                    <div className="text-xs text-slate-200 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl space-y-1.5 max-h-40 overflow-y-auto">
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">
                        🎭 سایر لحن‌های پاسخ در کاریزما سنتر:
                      </span>
                      {currentItem.data.answersList.slice(0, 3).map((ans, idx) => (
                        <p key={idx} className="leading-relaxed text-[11px]">
                          <strong className="text-sky-400">{ans.style}:</strong> «{ans.text}»
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Technique & Psychological Reason */}
                  {currentItem.data.technique && (
                    <div className="text-[11px] text-slate-300 bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-xl leading-relaxed">
                      💡 <strong className="text-emerald-400">تحلیل و علت روانشناختی:</strong> {currentItem.data.technique}
                    </div>
                  )}

                  {/* Body Language */}
                  {currentItem.data.bodyLanguage && (
                    <div className="text-[11px] text-slate-400 bg-slate-950/50 border border-slate-800/60 p-2 rounded-xl leading-relaxed">
                      👁️ <strong className="text-sky-300">زبان بدن و لحن:</strong> {currentItem.data.bodyLanguage}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Tip inside card */}
            <div className="text-center text-[10px] text-slate-500 border-t border-slate-800/60 pt-2">
              برای دیدن {isFlipped ? 'روی دیگر کارت' : 'پاسخ و تحلیل'} روی کادر کلیک کنید
            </div>
          </div>

          {/* 4. Leitner Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleAnswer(false)}
              className="bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-black text-xs py-3.5 rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 shadow-lg shadow-rose-950/20"
            >
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>نیاز به تکرار (بازگشت به ۱)</span>
            </button>

            <button
              type="button"
              onClick={() => handleAnswer(true)}
              className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-black text-xs py-3.5 rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 shadow-lg shadow-emerald-950/20"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>کاملاً مسلط هستم (ارتقاء)</span>
            </button>
          </div>

        </div>
      )}

      {/* Floating Toast Notification */}
      {addedToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#0e1628] border border-amber-500/50 text-amber-300 px-5 py-3 rounded-2xl text-xs font-black shadow-2xl flex items-center gap-2 animate-bounce">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>{addedToast}</span>
        </div>
      )}

      {/* Search & Add Scenario from Bank Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="bg-[#0c101c] border border-amber-500/30 rounded-3xl p-5 sm:p-6 w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">افزودن سناریو از بانک سناریوها</h3>
                  <p className="text-[11px] text-slate-400">موقعیت دلخواه را بنویسید تا پاسخ‌های کاریزماتیک استخراج و به لایتنر افزوده شوند.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setModalResults([]);
                  setModalSearchQuery('');
                  setModalHasSearched(false);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchFromModal} className="space-y-2">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute right-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  placeholder="موقعیت یا جمله مورد نظرتان را بنویسید (مثلاً: بی‌محلی، شوخی زشت در جمع)..."
                  className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-2xl pr-10 pl-24 py-3 text-xs text-white placeholder-slate-500 outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={modalLoading || !modalSearchQuery.trim()}
                  className="absolute left-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer"
                >
                  {modalLoading ? 'جستجو...' : 'جستجو'}
                </button>
              </div>

              {/* Quick Tags */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                <span className="text-slate-500 shrink-0">پیشنهادی:</span>
                {[
                  'دیر جواب دادن پیام',
                  'تیکه انداختن در جمع',
                  'تعریف بیش از حد',
                  'بی‌محلی و سرد بودن',
                  'پرسیدن حقوق یا درآمد'
                ].map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setModalSearchQuery(sug);
                      fetch(`/api/scenarios?search=${encodeURIComponent(sug)}&limit=8`)
                        .then(r => r.json())
                        .then(d => {
                          setModalResults(d.scenarios || []);
                          setModalHasSearched(true);
                        })
                        .catch(() => {});
                    }}
                    className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-300 hover:border-amber-500/30 whitespace-nowrap transition cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </form>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {modalLoading ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                  <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
                  <span className="text-xs text-slate-400">در حال جستجو در بانک سناریوها...</span>
                </div>
              ) : modalResults.length > 0 ? (
                modalResults.map((scenario) => {
                  const extracted = extractCardData(scenario);
                  const isAlreadyInDeck = deck.some(d => d.id === scenario.id || d.data?.id === scenario.id);

                  return (
                    <div 
                      key={scenario.id}
                      className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-3.5 space-y-2.5 transition text-right"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">
                            {extracted.environment}
                          </span>
                          <h4 className="text-xs sm:text-sm font-black text-white mt-1 leading-snug">
                            {extracted.title}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddScenarioToDeck(scenario)}
                          disabled={isAlreadyInDeck}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition cursor-pointer ${
                            isAlreadyInDeck
                              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 opacity-80 cursor-default'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
                          }`}
                        >
                          {isAlreadyInDeck ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>در لایتنر هست</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>افزودن به خانه ۱</span>
                            </>
                          )}
                        </button>
                      </div>

                      {extracted.opponentLine && (
                        <p className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                          <span className="text-sky-400 font-bold ml-1">جمله طرف مقابل:</span>
                          «{extracted.opponentLine}»
                        </p>
                      )}

                      {extracted.bestAnswer && (
                        <p className="text-xs text-amber-200 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                          <span className="text-amber-400 font-bold ml-1">👑 پاسخ طلایی:</span>
                          «{extracted.bestAnswer}»
                        </p>
                      )}
                    </div>
                  );
                })
              ) : modalHasSearched ? (
                <div className="text-center py-8 text-xs text-slate-400 space-y-1">
                  <p>هیچ سناریوی مستقیمی برای این عبارت یافت نشد.</p>
                  <p className="text-[11px] text-slate-500">کلمات کلیدی کوتاه‌تری مثل «تیکه»، «دیر جواب دادن» یا «شوخی» را امتحان کنید.</p>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">
                  موقعیت یا جمله مورد نظر را در کادر بالا بنویسید و جستجو کنید.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-800 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                بستن
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
