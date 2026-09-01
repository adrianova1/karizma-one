import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, MessagesSquare, Sparkles, Copy, Check, Heart, 
  Flame, Smile, Brain, Shield, ChevronDown, BookOpen, RefreshCw,
  Layers, ChevronRight, Zap, ShieldAlert, Crown, Send, RotateCw
} from 'lucide-react';
import { ScenarioItem } from '../types.js';
import { parseSafeJson } from '../lib/api.js';

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

  const categories = [
    { id: 'all', title: 'همه موقعیت‌ها', icon: Layers },
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
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
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
          if (append) {
            setScenarios(prev => [...prev, ...(data.scenarios || [])]);
          } else {
            setScenarios(data.scenarios || []);
          }
          setTotalCount(data.total || 0);
          if (data.categoryCounts) {
            setCategoryCounts(data.categoryCounts);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching scenarios:', err);
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
          <div className="relative pt-2">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 absolute right-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در سناریوها، موقعیت‌ها، کلمات کلیدی یا پاسخ‌ها..."
                className="w-full bg-slate-950/90 border border-slate-800 focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20 rounded-2xl pr-12 pl-10 py-3.5 text-xs sm:text-sm text-white placeholder-slate-500 shadow-inner transition outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  title="پاک کردن جستجو"
                >
                  ✕
                </button>
              )}
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
    </div>
  );
}
