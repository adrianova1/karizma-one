import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, MessagesSquare, Sparkles, Copy, Check, Heart, 
  Flame, Smile, Brain, Shield, ChevronDown, BookOpen, RefreshCw,
  Layers, ChevronRight, Zap, ShieldAlert, Crown, Send, RotateCw
} from 'lucide-react';
import { ScenarioItem } from '../types.js';
import { parseSafeJson } from '../lib/api.js';
import { MASTER_CATEGORIES, PRESEEDED_SCENARIOS, getMasterCategoryTitle } from '../data/scenarios.js';

interface ScenarioBankViewProps {
  token: string | null;
  onSelectScenarioForCoach?: (scenarioText: string) => void;
}

export default function ScenarioBankView({ token, onSelectScenarioForCoach }: ScenarioBankViewProps) {
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [totalCount, setTotalCount] = useState<number>(0);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;
  
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(null);
  const [activeToneTab, setActiveToneTab] = useState<Record<string, 'charismatic' | 'funny' | 'confident' | 'mysterious' | 'mature'>>({});
  const [copiedResponseKey, setCopiedResponseKey] = useState<string | null>(null);
  const [likedScenarioIds, setLikedScenarioIds] = useState<Record<string, boolean>>({});

  // Leitner sync state
  const [leitnerCardIds, setLeitnerCardIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('karizma_leitner_deck_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return new Set(parsed.map((item: any) => item.id || item.data?.id));
        }
      }
    } catch (e) {
      console.warn('Error reading Leitner deck:', e);
    }
    return new Set();
  });
  const [leitnerToast, setLeitnerToast] = useState<string | null>(null);

  const handleToggleLeitner = (scenario: ScenarioItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const saved = localStorage.getItem('karizma_leitner_deck_v3');
      let currentDeck: any[] = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(currentDeck)) currentDeck = [];

      const existsIdx = currentDeck.findIndex((item: any) => item.id === scenario.id || item.data?.id === scenario.id);

      if (existsIdx >= 0) {
        currentDeck.splice(existsIdx, 1);
        localStorage.setItem('karizma_leitner_deck_v3', JSON.stringify(currentDeck));
        setLeitnerCardIds(prev => {
          const next = new Set(prev);
          next.delete(scenario.id);
          return next;
        });
        setLeitnerToast('سناریو از جعبه لایتنر حذف شد.');
      } else {
        const bestAnswer = 
          scenario.responses?.charismatic ||
          scenario.responses?.confident ||
          (scenario.responses ? Object.values(scenario.responses)[0] : '') ||
          '';

        const answersList: { style: string; text: string }[] = [];
        if (scenario.responses) {
          const labels: Record<string, string> = {
            charismatic: 'کاریزماتیک و باکلاس',
            funny: 'شوخ‌طبع و رندانه',
            confident: 'مقتدر و با اعتمادبه‌نفس',
            mysterious: 'مرموز و پرکشش',
            mature: 'متین و پخته'
          };
          for (const [k, v] of Object.entries(scenario.responses)) {
            if (typeof v === 'string' && v.trim()) {
              answersList.push({ style: labels[k] || k, text: v.trim() });
            }
          }
        }

        const newItem = {
          id: scenario.id,
          box: 1,
          reviewCount: 0,
          lastReviewed: new Date().toISOString(),
          data: {
            id: scenario.id,
            title: scenario.title,
            situation: scenario.situation || scenario.title,
            opponentLine: (scenario as any).opponentLine || '',
            environment: scenario.environment || scenario.category || 'سناریوی ارتباطی',
            bestAnswer,
            answersList,
            technique: scenario.technique || '',
            bodyLanguage: scenario.bodyLanguage || '',
            nextMove: scenario.nextMove || scenario.teachingNote || ''
          }
        };

        currentDeck.push(newItem);
        localStorage.setItem('karizma_leitner_deck_v3', JSON.stringify(currentDeck));
        setLeitnerCardIds(prev => new Set(prev).add(scenario.id));
        setLeitnerToast('سناریو به خانه ۱ جعبه لایتنر اضافه شد! 🗃️');
      }
      setTimeout(() => setLeitnerToast(null), 3000);
    } catch (err) {
      console.error('Error modifying Leitner deck:', err);
    }
  };

  const iconMap: Record<string, any> = {
    Zap,
    ShieldAlert,
    Flame,
    Crown,
    Send,
    RotateCw,
    Layers
  };

  const categories = [
    { id: 'all', title: 'همه موقعیت‌ها', icon: Layers },
    ...MASTER_CATEGORIES.map(m => ({
      id: m.id,
      title: m.title,
      icon: iconMap[m.iconName] || Layers
    }))
  ];

  // Debounced search / category change to query database from offset 0
  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(0);
      fetchScenariosFromDB(0, false);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  const fetchScenariosFromDB = async (targetOffset: number, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
        params.append('query', searchQuery.trim());
      }
      if (selectedCategory && selectedCategory !== 'all') {
        const catObj = categories.find(c => c.id === selectedCategory);
        if (catObj) params.append('category', catObj.title);
      }
      params.append('limit', String(LIMIT));
      params.append('offset', String(targetOffset));

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/scenarios?${params.toString()}`, { headers });
      if (res.ok) {
        const data = await parseSafeJson(res);
        if (data) {
          const list = data.scenarios || [];
          if (append) {
            setScenarios(prev => [...prev, ...list]);
          } else {
            if (list.length > 0) {
              setScenarios(list);
            } else if (!searchQuery.trim()) {
              // Graceful fallback to preseeded if initial db load was empty
              const fallbackItems: ScenarioItem[] = PRESEEDED_SCENARIOS.map(s => ({
                id: s.id,
                title: s.title,
                situation: s.context || s.title,
                category: s.category,
                environment: s.category,
                responses: {
                  charismatic: s.analysis?.bestAnswer || s.answers?.[0]?.text || '',
                  funny: s.answers?.find(a => a.style === 'طنز')?.text || '',
                  confident: s.answers?.find(a => a.style === 'سنگین' || a.style === 'کاریزماتیک')?.text || '',
                  mysterious: s.answers?.find(a => a.style === 'مرموز')?.text || '',
                  mature: s.answers?.find(a => a.style === 'خونسرد' || a.style === 'حمایتگر')?.text || ''
                } as any,
                technique: s.analysis?.reason,
                bodyLanguage: s.analysis?.bodyLanguage,
                nextMove: s.analysis?.nextStep
              } as ScenarioItem));
              setScenarios(fallbackItems);
            } else {
              setScenarios([]);
            }
          }
          setTotalCount(data.total || (list.length > 0 ? list.length : PRESEEDED_SCENARIOS.length));
          if (data.categoryCounts) {
            setCategoryCounts(data.categoryCounts);
          }
        }
      } else if (!append && (!scenarios || scenarios.length === 0)) {
        const fallbackItems: ScenarioItem[] = PRESEEDED_SCENARIOS.map(s => ({
          id: s.id,
          title: s.title,
          situation: s.context || s.title,
          category: s.category,
          environment: s.category,
          responses: {
            charismatic: s.analysis?.bestAnswer || s.answers?.[0]?.text || '',
            funny: s.answers?.find(a => a.style === 'طنز')?.text || '',
            confident: s.answers?.find(a => a.style === 'سنگین' || a.style === 'کاریزماتیک')?.text || '',
            mysterious: s.answers?.find(a => a.style === 'مرموز')?.text || '',
            mature: s.answers?.find(a => a.style === 'خونسرد' || a.style === 'حمایتگر')?.text || ''
          } as any,
          technique: s.analysis?.reason,
          bodyLanguage: s.analysis?.bodyLanguage,
          nextMove: s.analysis?.nextStep
        } as ScenarioItem));
        setScenarios(fallbackItems);
      }
    } catch (err) {
      console.error('Error fetching scenarios:', err);
      if (!append && (!scenarios || scenarios.length === 0)) {
        const fallbackItems: ScenarioItem[] = PRESEEDED_SCENARIOS.map(s => ({
          id: s.id,
          title: s.title,
          situation: s.context || s.title,
          category: s.category,
          environment: s.category,
          responses: {
            charismatic: s.analysis?.bestAnswer || s.answers?.[0]?.text || '',
            funny: s.answers?.find(a => a.style === 'طنز')?.text || '',
            confident: s.answers?.find(a => a.style === 'سنگین' || a.style === 'کاریزماتیک')?.text || '',
            mysterious: s.answers?.find(a => a.style === 'مرموز')?.text || '',
            mature: s.answers?.find(a => a.style === 'خونسرد' || a.style === 'حمایتگر')?.text || ''
          } as any,
          technique: s.analysis?.reason,
          bodyLanguage: s.analysis?.bodyLanguage,
          nextMove: s.analysis?.nextStep
        } as ScenarioItem));
        setScenarios(fallbackItems);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    const nextOffset = offset + LIMIT;
    setOffset(nextOffset);
    fetchScenariosFromDB(nextOffset, true);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedResponseKey(key);
    setTimeout(() => {
      setCopiedResponseKey(null);
    }, 2000);
  };

  const handleLike = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (likedScenarioIds[id]) return;

    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch(`/api/scenarios/${id}/like`, {
        method: 'POST',
        headers
      });

      if (res.ok) {
        const data = await parseSafeJson(res);
        if (data) {
          setLikedScenarioIds(prev => ({ ...prev, [id]: true }));
          setScenarios(prev => prev.map(s => s.id === id ? { ...s, likes: data.likes } : s));
        }
      }
    } catch (err) {
      console.error('Error liking scenario:', err);
    }
  };

  const toneConfig = {
    charismatic: { label: 'کاریزماتیک و باکلاس', icon: Crown, color: 'text-sky-400', border: 'border-sky-500/40', bg: 'bg-sky-500/10' },
    funny: { label: 'شوخ‌طبع و رندانه', icon: Smile, color: 'text-purple-400', border: 'border-purple-500/40', bg: 'bg-purple-500/10' },
    confident: { label: 'مقتدر و با اعتماد به نفس', icon: Flame, color: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-500/10' },
    mysterious: { label: 'مرموز و پرکشش', icon: Brain, color: 'text-pink-400', border: 'border-pink-500/40', bg: 'bg-pink-500/10' },
    mature: { label: 'متین و پخته', icon: Shield, color: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10' },
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('fa-IR');
  };

  return (
    <div className="min-h-full pb-28 text-slate-100 font-sans">
      
      {/* 1. Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-900/90 via-[#0c101c] to-[#080b12] border-b border-slate-800/80 px-4 py-6 md:py-8">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold">
                <MessagesSquare className="w-3.5 h-3.5" />
                <span>بانک جامع سناریوها و مکالمات کاربردی</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                پاسخ‌های آماده با ۵ لحن کاریزماتیک
              </h1>
              <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
                مجموعه بزرگ سناریوهای استخراج‌شده، همراه با تحلیل، زبان بدن و پاسخ‌های استاندارد برای هر موقعیت چالش‌برانگیز.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs shadow-inner">
              <span className="text-slate-400">تعداد کل سناریوها:</span>
              <span className="font-black text-sky-400 text-sm tracking-wide">{formatNumber(totalCount)} سناریو</span>
            </div>
          </div>

          {/* 2. Live Database Search Bar */}
          <div className="relative pt-2 space-y-2">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 absolute right-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="موقعیت یا جمله مورد نظرتان را بنویسید (مثلاً: دیر جواب دادن پیام، تیکه انداختن، تعریف)..."
                className="w-full bg-slate-950/90 border border-slate-800 focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20 rounded-2xl pr-12 pl-10 py-3.5 text-xs sm:text-sm text-white placeholder-slate-500 shadow-inner transition outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  title="پاک کردن جستجو"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Situation Suggestions */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
              <span className="text-slate-500 font-bold shrink-0 ml-1">موقعیت‌های پرتکرار:</span>
              {[
                'دیر جواب دادن پیام',
                'تیکه انداختن در جمع',
                'بی‌محلی و سرد شدن',
                'تعریف بیش از حد',
                'پرسیدن سوال شخصی و فضولی',
                'طعنه به ظاهر یا لباس'
              ].map((sug, sIdx) => (
                <button
                  key={sIdx}
                  type="button"
                  onClick={() => setSearchQuery(sug)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-sky-500/15 border border-slate-800 hover:border-sky-500/30 text-slate-300 hover:text-sky-300 transition shrink-0 cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              const count = cat.id === 'all' ? totalCount : (categoryCounts[cat.id] || 0);

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap font-bold transition shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{cat.title}</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-sky-400'
                    }`}>
                      {formatNumber(count)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Main Body Container */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        
        {/* Scenarios Header Counter */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-300">
            نمایش {formatNumber(scenarios.length)} از {formatNumber(totalCount)} سناریو
          </span>
          {(searchQuery || selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="text-xs text-sky-400 hover:underline font-medium cursor-pointer"
            >
              پاکسازی فیلترها
            </button>
          )}
        </div>

        {/* 5. Scenarios List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
            <p className="text-xs text-slate-400">در حال جستجو و بارگذاری سناریوها از دیتابیس...</p>
          </div>
        ) : scenarios.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">سناریویی با این مشخصات یافت نشد</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              عبارت دیگری را جستجو کنید یا دسته‌بندی را تغییر دهید.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              نمایش همه موقعیت‌ها
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {scenarios.map((scenario) => {
              const isExpanded = expandedScenarioId === scenario.id;
              const currentTone = activeToneTab[scenario.id] || 'charismatic';
              const isLiked = likedScenarioIds[scenario.id];

              const rawResp = scenario.responses
                ? scenario.responses[currentTone] || Object.values(scenario.responses).find(v => !!v) || ''
                : '';
              const responseList = Array.isArray(rawResp) ? rawResp : [rawResp].filter(Boolean);
              const previewResponseText = responseList[0] || '';
              const fullCopyText = responseList.join('\n---\n');

              return (
                <div
                  key={scenario.id}
                  className={`bg-gradient-to-b from-[#0e1320] to-[#0a0d16] border rounded-2xl transition-all shadow-sm ${
                    isExpanded ? 'border-sky-500/40 ring-1 ring-sky-500/20' : 'border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Card Header (Always visible) */}
                  <div
                    onClick={() => setExpandedScenarioId(isExpanded ? null : scenario.id)}
                    className="p-4 sm:p-5 cursor-pointer select-none space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400">
                            {scenario.environment || 'سناریوی عمومی'}
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                          {scenario.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Leitner Button */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleLeitner(scenario, e)}
                          className={`p-2 sm:px-3 sm:py-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95 ${
                            leitnerCardIds.has(scenario.id)
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-300 hover:border-amber-500/30'
                          }`}
                          title={leitnerCardIds.has(scenario.id) ? 'در جعبه لایتنر ثبت است (کلیک برای حذف)' : 'افزودن به جعبه لایتنر'}
                        >
                          <Layers className="w-3.5 h-3.5 text-amber-400" />
                          <span className="hidden sm:inline text-[11px]">
                            {leitnerCardIds.has(scenario.id) ? 'در لایتنر ✓' : 'لایتنر'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleLike(scenario.id, e)}
                          className={`p-2 rounded-xl border transition flex items-center gap-1 text-xs cursor-pointer ${
                            isLiked
                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-rose-400 hover:border-slate-700'
                          }`}
                          title="پسندیدن این سناریو"
                        >
                          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                          <span className="text-[11px] font-bold">{formatNumber(scenario.likes || 0)}</span>
                        </button>

                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-sky-400' : ''}`} />
                        </div>
                      </div>
                    </div>

                    {/* Context / Situation Box */}
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 leading-relaxed">
                      <div className="font-semibold text-slate-400 mb-1 flex items-center gap-1.5 text-[11px]">
                        <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                        <span>موقعیت و زمینه مکالمه:</span>
                      </div>
                      <p>{scenario.situation}</p>
                    </div>

                    {/* Quick Preview of Charismatic Response when collapsed */}
                    {!isExpanded && previewResponseText && (
                      <div className="text-xs text-slate-400 flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                        <span className="truncate text-slate-300 font-medium">
                          👑 <strong className="text-sky-400">پاسخ کاریزماتیک:</strong> « {previewResponseText} »
                        </span>
                        <span className="text-[11px] text-sky-400 font-bold shrink-0">
                          مشاهده جزئیات ←
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Expanded Detail Panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 pb-5 sm:px-5 space-y-4 border-t border-slate-800/80 pt-4"
                      >
                        {/* 5 Tone Responses Tab Selector */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              <span>انتخاب لحن پاسخگویی (۵ سبک کاریزماتیک):</span>
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                            {(Object.keys(toneConfig) as (keyof typeof toneConfig)[]).map(toneKey => {
                              const tone = toneConfig[toneKey];
                              const ToneIcon = tone.icon;
                              const isToneActive = currentTone === toneKey;

                              return (
                                <button
                                  key={toneKey}
                                  type="button"
                                  onClick={() => setActiveToneTab(prev => ({ ...prev, [scenario.id]: toneKey }))}
                                  className={`p-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition cursor-pointer ${
                                    isToneActive
                                      ? `${tone.bg} border ${tone.border} ${tone.color} shadow-sm`
                                      : 'bg-slate-900/90 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-300'
                                  }`}
                                >
                                  <ToneIcon className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate text-[11px]">{tone.label}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Response Text Display Card */}
                          <div className="relative bg-slate-950 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-3">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold ${toneConfig[currentTone].color}`}>
                                  {toneConfig[currentTone].label}
                                </span>
                                {responseList.length > 1 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                                    {responseList.length} گزینه پیشنهادی
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleCopy(fullCopyText || previewResponseText, `${scenario.id}_${currentTone}`)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 ${
                                  copiedResponseKey === `${scenario.id}_${currentTone}`
                                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                                    : 'bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300'
                                }`}
                              >
                                {copiedResponseKey === `${scenario.id}_${currentTone}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>کپی شد!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>کپی پاسخ</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {responseList.length > 1 ? (
                              <div className="space-y-2.5 py-1">
                                {responseList.map((resp, rIdx) => (
                                  <div key={rIdx} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 flex items-start justify-between gap-2">
                                    <p className="text-sm sm:text-base text-white font-medium leading-relaxed select-text flex-1">
                                      « {resp} »
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(resp, `${scenario.id}_${currentTone}_${rIdx}`)}
                                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                                      title="کپی این گزینه"
                                    >
                                      {copiedResponseKey === `${scenario.id}_${currentTone}_${rIdx}` ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm sm:text-base text-white font-medium leading-relaxed select-text py-1">
                                « {previewResponseText || 'پاسخی برای این لحن ثبت نشده است.'} »
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Analysis, Psychological Technique & Body Language */}
                        {(scenario.technique || scenario.bodyLanguage || scenario.teachingNote) && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                            {scenario.technique && (
                              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1">
                                <span className="font-bold text-amber-400 block text-[11px]">🧠 تحلیل و تکنیک رفتاری:</span>
                                <p className="text-slate-300 leading-relaxed text-[11px]">{scenario.technique}</p>
                              </div>
                            )}

                            {scenario.bodyLanguage && (
                              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1">
                                <span className="font-bold text-sky-400 block text-[11px]">👁️ زبان بدن و حالت نگاه:</span>
                                <p className="text-slate-300 leading-relaxed text-[11px]">{scenario.bodyLanguage}</p>
                              </div>
                            )}

                            {scenario.teachingNote && (
                              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1">
                                <span className="font-bold text-emerald-400 block text-[11px]">💡 گام بعدی و نکته کلیدی:</span>
                                <p className="text-slate-300 leading-relaxed text-[11px]">{scenario.teachingNote}</p>
                              </div>
                            )}

                            {/* Leitner Action Bar inside expanded view */}
                            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={(e) => handleToggleLeitner(scenario, e)}
                                className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer active:scale-95 ${
                                  leitnerCardIds.has(scenario.id)
                                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                    : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300'
                                }`}
                              >
                                <Layers className="w-4 h-4 text-amber-400" />
                                <span>
                                  {leitnerCardIds.has(scenario.id)
                                    ? 'این سناریو در جعبه لایتنر شماست (کلیک برای حذف)'
                                    : 'افزودن این سناریو به جعبه ۱ لایتنر جهت تمرین و یادگیری'}
                                </span>
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* 6. Load More Button */}
            {scenarios.length < totalCount && (
              <div className="pt-4 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-sky-500/20 flex items-center gap-2 transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>در حال بارگذاری موارد بیشتر...</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      <span>بارگذاری ۵۰ مورد بیشتر (از {formatNumber(totalCount - scenarios.length)} سناریو باقیمانده)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Leitner Toast Notification */}
      <AnimatePresence>
        {leitnerToast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#0e1628] border border-amber-500/50 text-amber-300 px-5 py-3 rounded-2xl text-xs font-black shadow-2xl flex items-center gap-2.5 backdrop-blur-md"
          >
            <Layers className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>{leitnerToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
