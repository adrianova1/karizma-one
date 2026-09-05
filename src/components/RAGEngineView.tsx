import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Send, Sparkles, Database, History, RefreshCw, FileText, CheckCircle2, 
  Settings, ChevronRight, MessageSquare, AlertCircle, Trash2, Cpu, Copy, Check,
  Zap, HelpCircle, Flame, Smile, Crown, Heart, Brain, ArrowLeft, Shield,
  Grid, ChevronDown, Menu, Plus, X, Lock
} from 'lucide-react';
import { KnowledgeCard, Message, Conversation, CoachingMode, CoachingModeInfo } from '../types.js';
import { trackEvent } from '../lib/tracking.js';
import { parseSafeJson } from '../lib/api.js';
import OnboardingGuideModal from './OnboardingGuideModal.js';
import EmergencyLiveCoachModal from './EmergencyLiveCoachModal.js';

interface AssistantMessageBlockProps {
  msg: Message;
  idx: number;
  parsedFiveStyles: any[] | null;
  copiedIndex: string | null;
  handleCopy: (text: string, id: string) => void;
  onGoToSubscriptions?: () => void;
}

function AssistantMessageBlock({
  msg,
  idx,
  parsedFiveStyles,
  copiedIndex,
  handleCopy,
  onGoToSubscriptions,
}: AssistantMessageBlockProps) {
  const [activeStyleId, setActiveStyleId] = useState<string>('');
  const [showToneDrawer, setShowToneDrawer] = useState<boolean>(true);

  useEffect(() => {
    if (parsedFiveStyles && parsedFiveStyles.length > 0) {
      setActiveStyleId(parsedFiveStyles[0].id);
    }
  }, [parsedFiveStyles]);

  const activeSection = parsedFiveStyles?.find(sec => sec.id === activeStyleId);

  return (
    <div className="w-full max-w-full rounded-2xl p-2.5 sm:p-3.5 leading-relaxed text-[11px] sm:text-xs shadow-lg border bg-[#0d0e12] border-slate-800 text-slate-100 rounded-tl-none min-w-0 overflow-hidden">
      <div className="flex items-center gap-1.5 mb-2 border-b border-slate-800/80 pb-1.5 text-[11px] font-semibold text-slate-300 justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-sky-400 text-[11px] truncate">مربی ارشد مرکز کاریزما (Karizma Coach)</span>
        </div>
        <span className="font-mono text-[9px] text-slate-500 shrink-0">
          {new Date(msg.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {msg.isSubscriptionAlert ? (
        <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl text-slate-200 text-xs space-y-2.5 my-1">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>اطلاعیه وضعیت اشتراک و سهمیه پیام</span>
          </div>
          <div className="whitespace-pre-wrap text-slate-300 leading-relaxed">
            {msg.content}
          </div>
          {onGoToSubscriptions && (
            <button
              type="button"
              onClick={onGoToSubscriptions}
              className="mt-2 w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95"
            >
              <span>مشاهده طرح‌ها و تمدید اشتراک</span>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : parsedFiveStyles ? (
        <div className="space-y-2 my-1">
          {/* Collapsible Glass Tone Selection Drawer Button */}
          <div className="flex items-center justify-between gap-1.5 py-0.5 px-1 bg-slate-950/60 backdrop-blur-md border border-slate-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => setShowToneDrawer(!showToneDrawer)}
              className="px-2 py-0.5 bg-slate-900 hover:bg-slate-850 border border-sky-500/30 hover:border-sky-400 text-sky-300 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 active:scale-95 shrink-0 shadow-sm"
            >
              <Sparkles className="w-2.5 h-2.5 text-sky-400" />
              <span>لحن‌ها 🎭</span>
              <ChevronDown className={`w-2.5 h-2.5 text-slate-400 transition-transform ${showToneDrawer ? 'rotate-180' : ''}`} />
            </button>
            <span className="text-[9px] text-slate-400 font-medium truncate px-1">
              {activeSection ? activeSection.badge : '۵ لحن هوشمند کاریزما'}
            </span>
          </div>

          {/* Tone Selector Responsive Grid / Drawer Grid */}
          {showToneDrawer && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 p-1.5 bg-[#0a0a0d] border border-slate-800/80 rounded-xl w-full min-w-0 animate-fade-in my-1 select-none">
              {parsedFiveStyles.map((sec, i) => {
                const isActive = activeStyleId === sec.id;
                
                let cardTitle = 'لحن';
                let cardSub = '';
                
                if (sec.id === 'charismatic') {
                  cardTitle = 'کاریزماتیک';
                  cardSub = 'باکلاس و جذاب';
                } else if (sec.id === 'funny') {
                  cardTitle = 'شوخ‌طبع';
                  cardSub = 'رندانه و جذاب';
                } else if (sec.id === 'confident') {
                  cardTitle = 'مقتدر';
                  cardSub = 'قاطع و با اعتماد';
                } else if (sec.id === 'mysterious') {
                  cardTitle = 'مرموز';
                  cardSub = 'پرکشش و عمیق';
                } else if (sec.id === 'mature') {
                  cardTitle = 'متین و پخته';
                  cardSub = 'باوقار و دیپلماتیک';
                }

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveStyleId(sec.id)}
                    className={`flex items-center gap-1.5 p-1.5 rounded-lg border transition-all cursor-pointer active:scale-95 text-right relative overflow-hidden min-w-0 ${
                      i === 4 ? 'col-span-2 sm:col-span-1' : ''
                    } ${
                      isActive
                        ? `bg-slate-900 ${sec.borderColor} text-white shadow-md ring-1 ring-white/10`
                        : 'bg-[#121216] border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {isActive && (
                      <span className={`absolute top-0 inset-x-0 h-[2px] ${
                        sec.id === 'charismatic' ? 'bg-sky-500' : 
                        sec.id === 'funny' ? 'bg-purple-500' : 
                        sec.id === 'confident' ? 'bg-amber-500' : 
                        sec.id === 'mysterious' ? 'bg-pink-500' : 'bg-emerald-500'
                      }`} />
                    )}
                    
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] shrink-0 transition-all ${
                      isActive 
                        ? 'scale-105 bg-slate-950 border border-slate-800' 
                        : 'bg-slate-950/60 border border-slate-800/60'
                    }`}>
                      {sec.icon}
                    </span>
                    
                    <div className="flex flex-col text-right min-w-0">
                      <span className={`text-[9.5px] font-bold tracking-wide truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                        {cardTitle}
                      </span>
                      <span className="text-[8px] text-slate-500 font-medium leading-none mt-0.5 truncate">
                        {cardSub}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Style Content Card */}
          {activeSection ? (
            <div 
              key={activeStyleId}
              className={`border rounded-xl p-2.5 sm:p-3 transition-all duration-300 ${activeSection.borderColor} ${activeSection.bgColor} shadow-md relative animate-fade-in min-w-0`}
            >
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2 pb-1.5 border-b border-slate-800/80">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs shrink-0">{activeSection.icon}</span>
                  <span className="font-bold text-[11px] sm:text-xs text-white truncate">{activeSection.title}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {activeSection.quote && (
                    <button
                      type="button"
                      onClick={() => handleCopy(activeSection.quote, `card_${idx}_${activeSection.id}`)}
                      className="px-2 py-0.5 min-h-[28px] bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer active:scale-95"
                      title="کپی دقیق جمله"
                    >
                      {copiedIndex === `card_${idx}_${activeSection.id}` ? (
                        <>
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                          <span className="text-emerald-400 text-[9px]">کپی شد!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-2.5 h-2.5 text-sky-400" />
                          <span className="text-[9px]">کپی</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Highlighted Quote Box */}
              {activeSection.quote ? (
                <div className="my-1.5 p-2 sm:p-2.5 rounded-xl bg-slate-950/95 border border-slate-800 text-white font-medium text-[11px] sm:text-xs leading-relaxed select-all tracking-wide text-right flex items-start justify-between gap-1 shadow-inner">
                  <span className="text-sky-400 font-black text-xs select-none shrink-0">«</span>
                  <span className="flex-1 text-white font-bold leading-relaxed">{activeSection.quote}</span>
                  <span className="text-sky-400 font-black text-xs select-none shrink-0">»</span>
                </div>
              ) : null}

              {/* Execution Tip */}
              {activeSection.tip ? (
                <div className="text-[10px] sm:text-[11px] text-amber-200 bg-amber-950/40 border border-amber-500/30 px-2 py-1 rounded-lg mb-1.5 font-medium flex items-center gap-1">
                  <span className="font-bold text-amber-400 shrink-0">📌 نکته:</span>
                  <span className="leading-relaxed text-slate-300">{activeSection.tip}</span>
                </div>
              ) : null}

              {/* Extra Strategy / Analytical Body */}
              {activeSection.explanation ? (
                <div className="mt-1.5 text-[10px] sm:text-[11px] text-slate-300 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 text-right">
                  {activeSection.explanation}
                </div>
              ) : null}

              {/* Fallback Body Text if neither quote nor explanation exist */}
              {!activeSection.quote && !activeSection.explanation && (
                <div className="whitespace-pre-wrap text-right leading-relaxed text-slate-300 text-[11px] sm:text-xs">
                  {activeSection.fullText}
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        /* Fallback Text Output */
        <div className="whitespace-pre-wrap text-right leading-relaxed space-y-1.5 text-[11px] sm:text-xs text-slate-300">
          {msg.content}
        </div>
      )}
    </div>
  );
}

interface RAGEngineViewProps {
  token: string;
  initialPrompt?: string;
  initialMode?: CoachingMode;
  onClearInitialPrompt?: () => void;
  onGoToSubscriptions?: () => void;
}

export default function RAGEngineView({ 
  token,
  initialPrompt,
  initialMode,
  onClearInitialPrompt,
  onGoToSubscriptions
}: RAGEngineViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [userSubStats, setUserSubStats] = useState<{
    hasActiveSub: boolean;
    isLifetimeAdmin?: boolean;
    planName: string;
    queryCount: number;
    maxQueries: number;
    remainingQueries?: number;
    isExpiringSoon?: boolean;
    warningMessage?: string;
    planId?: string;
    allowedCoachModes?: string[];
    allowVoiceCoach?: boolean;
  } | null>(null);

  const [lockedFeatureModal, setLockedFeatureModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    requiredPlan: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    requiredPlan: 'نقره‌ای یا طلایی'
  });

  const [currentConversationId, setCurrentConversationId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('karizma_current_conv_id');
    } catch {
      return null;
    }
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const savedMessages = localStorage.getItem('karizma_last_messages');
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // safe fallback
    }
    return [];
  });
  const [inputQuestion, setInputQuestion] = useState('');
  const [activeMode, setActiveMode] = useState<CoachingMode>(() => {
    try {
      const savedMode = localStorage.getItem('karizma_active_mode');
      return (savedMode as CoachingMode) || 'reply_generator';
    } catch {
      return 'reply_generator';
    }
  });
  const [loading, setLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [showHistoryMobile, setShowHistoryMobile] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showAllModesModal, setShowAllModesModal] = useState(false);
  const [selectedTone, setSelectedTone] = useState<string>(() => {
    try {
      return localStorage.getItem('karizma_selected_tone') || 'all';
    } catch {
      return 'all';
    }
  });
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const isModeAllowed = (modeId: string) => {
    if (!userSubStats) return true;
    if (userSubStats.isLifetimeAdmin || userSubStats.maxQueries >= 99999) return true;
    if (!userSubStats.hasActiveSub) return true;
    if (!userSubStats.allowedCoachModes || userSubStats.allowedCoachModes.length === 0) return true;
    return userSubStats.allowedCoachModes.includes(modeId);
  };

  const isToneAllowed = (toneId: string) => {
    if (!userSubStats) return true;
    if (userSubStats.isLifetimeAdmin || userSubStats.maxQueries >= 99999) return true;
    if (!userSubStats.hasActiveSub) return true;
    // 'all' (همه لحن‌ها - ۵ پاسخ همزمان) is locked for Bronze plan (p1) for non-admin users
    if (toneId === 'all' && userSubStats.planId === 'p1') {
      return false;
    }
    return true;
  };

  const handleSelectModeWithGating = (m: CoachingModeInfo) => {
    if (!isModeAllowed(m.id)) {
      const requiredPlan = m.id === 'live_coach' ? 'طرح طلایی (VIP)' : 'طرح نقره‌ای یا طلایی';
      setLockedFeatureModal({
        isOpen: true,
        title: `قفل بودن ابزار «${m.title}»`,
        description: `این ابزار پیشرفته در طرح فعلی شما (${userSubStats?.planName || 'برنزی'}) قفل است. جهت دسترسی و فعال‌سازی این قابلیت، لطفاً اشتراک خود را ارتقا دهید.`,
        requiredPlan
      });
      return;
    }
    setActiveMode(m.id as CoachingMode);
    setShowAllModesModal(false);
  };

  const fetchSubStats = async () => {
    try {
      const res = await fetch('/api/subscriptions/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await parseSafeJson(res);
        if (data) setUserSubStats(data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchSubStats();
  }, [token]);

  useEffect(() => {
    if (userSubStats && userSubStats.hasActiveSub && userSubStats.planId === 'p1' && selectedTone === 'all') {
      setSelectedTone('alpha');
    }
  }, [userSubStats, selectedTone]);

  const TONES = [
    { id: 'all', title: 'همه ۵ لحن هوشمند کاریزما', icon: '✨', description: 'تولید همزمان ۵ پاسخ در سبک‌های مختلف کاریزما' },
    { id: 'charismatic', title: '👑 لحن ۱: کاریزماتیک و باکلاس', icon: '👑', description: 'شیک، جذاب، با پرستیژ بالا و سنجیده' },
    { id: 'funny', title: '😂 لحن ۲: شوخ‌طبع و رندانه', icon: '😂', description: 'شکستن یخ مکالمه، شوخی هوشمندانه و بازیگوشی' },
    { id: 'confident', title: '🔥 لحن ۳: مقتدر و با اعتماد به نفس', icon: '🔥', description: 'چارچوب‌مند، قاطع و با اقتدار' },
    { id: 'mysterious', title: '🔮 لحن ۴: مرموز و پرکشش', icon: '🔮', description: 'برانگیختن کنجکاوی و ایجاد اشتیاق' },
    { id: 'mature', title: '💎 لحن ۵: متین و پخته', icon: '💎', description: 'باوقار، دیپلماتیک و پاسخ عمیق' },
  ];

  const handleStartNewChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
    localStorage.removeItem('karizma_last_messages');
    localStorage.removeItem('karizma_current_conv_id');
  };

  const [latestPipelineLog, setLatestPipelineLog] = useState<{
    normalizedQuery: string;
    tokens: string[];
    bm25Results: { id: string; title: string; score: number }[];
    reRankedTopResult: string;
    usedLLM: boolean;
    sourceCards: KnowledgeCard[];
  } | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 5 Streamlined Core Coaching Modes Configurations
  const coachingModesList: CoachingModeInfo[] = [
    {
      id: 'reply_generator',
      title: 'تولید پاسخ سریع به پیام (چی جواب بدم؟)',
      shortTitle: 'پاسخ سریع ⚡',
      icon: '⚡',
      description: 'طرف مقابل چی گفته؟ سریع ۵ جواب کاریزماتیک، جذاب و آماده فرستادن تحویل بگیر.',
      placeholder: 'پیام طرف مقابل را وارد کن (مثلاً: گفت دیر جواب میدی چی بگم؟)...',
      samplePrompts: [
        'دختر گفت: «شاید یه وقت دیگه رفتیم کافه.» چی جواب بدم؟',
        'پیام داد: «گفت دیر جواب میدی.» چطور جواب جذاب و خونسردی بدم؟',
        'گفت: «چرا انقدر با من رسمی صحبت میکنی؟» چی بگم؟'
      ]
    },
    {
      id: 'starter',
      title: 'شروع مکالمه و باز کردن سر صحبت (Opening)',
      shortTitle: 'شروع مکالمه 🚀',
      icon: '🚀',
      description: 'می‌خواهی سر صحبت را در اینستاگرام، کافه، دانشگاه یا خیابان باز کنی.',
      placeholder: 'موقعیت یا استوری طرف مقابل را بنویس (مثلاً: استوری عکس کتاب گذاشته)...',
      samplePrompts: [
        'تو کافه دختره داره لپ‌تاپ کار میکنه و هندزفری زده. بهترین سر صحبت چیه؟',
        'استوری عکس قهوه و کتاب گذاشته، چی ریپلای بدم؟',
        'اولین پیام برای شروع چت در تلگرام/اینستاگرام چطور باشه؟'
      ]
    },
    {
      id: 'coach',
      title: 'کوچ و هدایت چت وقتی مکالمه گیر کرده',
      shortTitle: 'کوچ چت 🎯',
      icon: '🎯',
      description: 'چت سرد شده یا می‌خواهی گفتگو را به سمت دعوت به قرار یا گرفتن شماره ببری.',
      placeholder: 'خلاصه چت تا الان یا جایی که مکالمه گیر کرده را بنویس...',
      samplePrompts: [
        'سه روزه پیام نداده، چطور بدون ابراز نیاز چت رو دوباره زنده کنم؟',
        'چت خیلی عادی پیش رفته، چطور پیشنهاد قرار بذارم که جواب مثبت بده؟',
        'گفت «فعلا قصد رابطه ندارم»، چطور از فرندزون دربیام؟'
      ]
    },
    {
      id: 'live_coach',
      title: 'کمک فوری زنده (Emergency 10-Second Coach)',
      shortTitle: 'کمک فوری 🚨',
      icon: '🚑',
      description: 'کمک فوری در قرار زنده، خیابان یا کافه فقط در ۱۰ ثانیه.',
      placeholder: 'همین الان کجا هستی و چه اتفاقی افتاد؟ سریع بنویس تا ۵ جواب بگیری...',
      samplePrompts: [
        'الان تو کافه‌ام، طرف مقابل ۵ دقیقه رفته دستشویی. وقتی برگشت چی بگم؟',
        'تو قرار زنده هستم، یهو مکالمه ساکت شد. چطور یخ رو بشکنم؟',
        'الان تو خیابون نگاهم کرد، همین الان چی بگم سر صحبت باز بشه؟'
      ]
    }
  ];

  const currentModeInfo = coachingModesList.find(m => m.id === activeMode) || coachingModesList[0];

  // Fetch past conversations
  const fetchConversations = async () => {
    if (!token) {
      setConversations([]);
      return;
    }
    try {
      const res = await fetch('/api/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await parseSafeJson(res);
      if (Array.isArray(data)) setConversations(data);
    } catch {
      // Safe fallback on initial connection or network interruption
    }
  };

  useEffect(() => {
    if (token) {
      fetchConversations();
    }
  }, [token]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(id);
      setTimeout(() => setCopiedIndex(null), 2000);
    }).catch(err => {
      console.error('Failed to copy text:', err);
    });
  };

  const handleSelectConversation = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 404) {
          fetchConversations();
          handleNewChat();
          return;
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error('نشست شما منقضی شده است. لطفاً مجدداً وارد حساب کاربری خود شوید.');
        }
        throw new Error(`خطای سرور (${res.status})`);
      }
      const data = await parseSafeJson(res);
      if (data && Array.isArray(data.messages)) {
        setCurrentConversationId(id);
        setMessages(data.messages);
        setLatestPipelineLog(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setLatestPipelineLog(null);
  };

  // 3-Message Persisted State & User Preferences Auto-Load (LocalStorage)
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('karizma_active_mode');
      if (savedMode) {
        setActiveMode(savedMode as CoachingMode);
      }
      
      const savedConvId = localStorage.getItem('karizma_current_conv_id');
      const savedMessages = localStorage.getItem('karizma_last_messages');
      
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
      
      if (savedConvId) {
        handleSelectConversation(savedConvId);
      }

      // Pickup pending coach query from Home Dashboard
      const pendingQuery = localStorage.getItem('pending_coach_query');
      if (pendingQuery) {
        setInputQuestion(pendingQuery);
        localStorage.removeItem('pending_coach_query');
      }
    } catch (e) {
      console.error('Error loading state from localStorage:', e);
    }
  }, []);

  // Sync state changes back to localStorage dynamically
  useEffect(() => {
    if (activeMode) {
      localStorage.setItem('karizma_active_mode', activeMode);
    }
  }, [activeMode]);

  useEffect(() => {
    if (selectedTone) {
      localStorage.setItem('karizma_selected_tone', selectedTone);
    }
  }, [selectedTone]);

  useEffect(() => {
    if (currentConversationId) {
      localStorage.setItem('karizma_current_conv_id', currentConversationId);
    } else {
      localStorage.removeItem('karizma_current_conv_id');
    }
  }, [currentConversationId]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      // Keep only the last 3 messages as requested for lightweight local persistence
      const lastThree = messages.slice(-3);
      localStorage.setItem('karizma_last_messages', JSON.stringify(lastThree));
    } else {
      localStorage.removeItem('karizma_last_messages');
    }
  }, [messages]);

  const isSendingRef = React.useRef(false);
  const lastHandledPromptRef = React.useRef<string>('');

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      const cleanPrompt = initialPrompt.trim();
      if (lastHandledPromptRef.current === cleanPrompt) {
        return;
      }
      lastHandledPromptRef.current = cleanPrompt;

      if (initialMode) {
        setActiveMode(initialMode);
      }
      handleSendPrompt(cleanPrompt, initialMode);
      if (onClearInitialPrompt) {
        onClearInitialPrompt();
      }
    } else {
      lastHandledPromptRef.current = '';
    }
  }, [initialPrompt, initialMode]);

  const compressClientHistory = (msgs: Message[]): { role: string; content: string }[] => {
    if (!msgs || msgs.length === 0) return [];
    const seen = new Set<string>();
    const clean: Message[] = [];
    for (const m of msgs) {
      if (!m.content || !m.content.trim()) continue;
      const normKey = m.content.trim().toLowerCase();
      if (seen.has(normKey)) continue;
      seen.add(normKey);
      clean.push(m);
    }
    const maxChars = 220;
    return clean.slice(-5).map(m => {
      let content = m.content.trim();
      if (content.length > maxChars) {
        content = content.substring(0, maxChars) + ' ... [فشرده گردید]';
      }
      return {
        role: m.role,
        content
      };
    });
  };


  

  const handleSendPrompt = async (promptText: string, modeOverride?: CoachingMode) => {
    if (!promptText.trim() || loading || isSendingRef.current) return;

    isSendingRef.current = true;
    const modeToUse = modeOverride || activeMode;

    // Check mode gating
    if (!isModeAllowed(modeToUse)) {
      const modeObj = coachingModesList.find(m => m.id === modeToUse);
      const requiredPlan = modeToUse === 'live_coach' ? 'طرح طلایی (VIP)' : 'طرح نقره‌ای یا طلایی';
      setLockedFeatureModal({
        isOpen: true,
        title: `قفل بودن ابزار «${modeObj?.title || 'مربی چت'}»`,
        description: `این ابزار پیشرفته در طرح فعلی شما (${userSubStats?.planName || 'برنزی'}) قفل است. جهت دسترسی و فعال‌سازی این قابلیت، لطفاً اشتراک خود را ارتقا دهید.`,
        requiredPlan
      });
      return;
    }

    // Check tone gating for 'all' (5 tones simultaneously)
    if (selectedTone === 'all' && !isToneAllowed('all')) {
      setLockedFeatureModal({
        isOpen: true,
        title: 'قفل بودن قابلیت «تولید همزمان ۵ لحن»',
        description: `تولید همزمان ۵ پاسخ با ۵ سبک و لحن کاریزماتیک در طرح فعلی شما (${userSubStats?.planName || 'برنزی'}) قفل است. جهت دسترسی و فعال‌سازی این قابلیت، لطفاً اشتراک خود را به طرح نقره‌ای یا طلایی ارتقا دهید.`,
        requiredPlan: 'طرح نقره‌ای یا طلایی'
      });
      return;
    }

    const modeTag = `[حالت کوچینگ: ${coachingModesList.find(m => m.id === modeToUse)?.title}]`;

    // System Prompt Tone Injection System
    let toneInstruction = '';
    const toneObj = TONES.find(t => t.id === selectedTone);
    if (selectedTone && selectedTone !== 'all' && toneObj) {
      toneInstruction = `[دستورالعمل سیستم - لحن انتخاب‌شده کاربر]: کاربر لحن «${toneObj.title}» (${toneObj.description}) را انتخاب کرده است. اکیداً پاسخ را منحصراً در سبک و لحن «${toneObj.title}» نگارش و ارائه کن. تمامی جملات، گزینه‌ها و تحلیل‌ها باید ۱۰۰٪ منعکس‌کننده این لحن باشند.`;
    } else if (selectedTone === 'all') {
      toneInstruction = `[دستورالعمل سیستم - ۵ لحن کاریزما]: پاسخ را حتماً در ۵ لحن متناوب و مجزا (🔥 قاطع و آلفا، ❤️ صمیمی و گرم، 🧠 تحلیلی و علمی، 💼 دیپلماتیک و پرستیژ، 😏 شوخ‌طبع و رندانه) تفکیک و ارائه بنما.`;
    }

    const effectiveSystemPrompt = [
      customPrompt.trim(),
      toneInstruction
    ].filter(Boolean).join('\n\n');

    const toneTag = toneObj && selectedTone !== 'all' ? ` [لحن انتخابی: ${toneObj.title}]` : '';
    const fullQuery = `${modeTag}${toneTag}\n${promptText.trim()}`;

    const userMsg: Message = {
      role: 'user',
      content: promptText.trim(),
      timestamp: new Date().toISOString(),
      mode: modeToUse
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputQuestion('');
    setLoading(true);

    // Compress client history before sending to minimize token consumption and reduce duplicate answers
    const memoryBuffer = compressClientHistory(updatedMessages);

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: fullQuery,
          conversationId: currentConversationId,
          customSystemPrompt: effectiveSystemPrompt || undefined,
          history: memoryBuffer,
          selectedTone: selectedTone || 'all'
        })
      });

      if (!res.ok) {
        let errorMsg = `خطای پردازش موتور مربی کاریزما (${res.status})`;
        let errorCode = '';
        try {
          const errJson = await parseSafeJson(res);
          if (errJson) {
            if (errJson.error) errorMsg = errJson.error;
            if (errJson.code) errorCode = errJson.code;
          }
        } catch (_) {}

        if (res.status === 401 || errorCode === 'AUTH_EXPIRED' || errorCode === 'AUTH_REQUIRED') {
          const authMsg: Message = {
            role: 'assistant',
            content: `🔒 **نشست کاربری منقضی شده است:**\n\n${errorMsg}\n\nلطفاً یک‌بار از حساب کاربری خود خارج شده و مجدداً وارد شوید تا ارتباط مجدد برقرار شود.`,
            timestamp: new Date().toISOString(),
            mode: modeToUse
          };
          setMessages(prev => [...prev, authMsg]);
          return;
        }

        if (res.status === 403 || errorCode === 'QUOTA_EXHAUSTED' || errorCode === 'SUBSCRIPTION_EXPIRED' || errorCode === 'SUBSCRIPTION_REQUIRED') {
          const subAlertMessage: Message = {
            role: 'assistant',
            content: `⚠️ **اطلاعیه وضعیت اشتراک و سهمیه:**\n\n${errorMsg}\n\nبرای ادامه مکالمه با مربی کاریزما و ارسال سوالات جدید، می‌توانید طرح اشتراک خود را تمدید یا ارتقا دهید.`,
            timestamp: new Date().toISOString(),
            isSubscriptionAlert: true,
            mode: modeToUse
          };
          setMessages(prev => [...prev, subAlertMessage]);
          fetchSubStats();
          return;
        }

        throw new Error(errorMsg);
      }

      const data = await parseSafeJson(res);
      if (!data || !data.answer) {
        throw new Error('پاسخ نامعتبر از موتور مربی کاریزما دریافت شد.');
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toISOString(),
        mode: modeToUse
      };

      setMessages(prev => [...prev, assistantMsg]);

      trackEvent('coach_response_generation', 'coach', {
        mode: modeToUse,
        tone: selectedTone
      });

      if (data.pipelineLog) {
        setLatestPipelineLog({
          ...data.pipelineLog,
          usedLLM: data.usedLLM,
          sourceCards: data.sourceCards || []
        });
      }

      if (!currentConversationId && data.conversationId) {
        setCurrentConversationId(data.conversationId);
      }

      fetchConversations();
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ خطای پردازش موتور مرکز کاریزما: ${err.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      isSendingRef.current = false;
      setLoading(false);
      fetchSubStats();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendPrompt(inputQuestion);
  };

  const handleClearHistory = async () => {
    try {
      await fetch('/api/conversations/clear', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      localStorage.removeItem('karizma_last_messages');
      localStorage.removeItem('karizma_current_conv_id');
      handleNewChat();
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (currentConversationId === id) {
        localStorage.removeItem('karizma_last_messages');
        localStorage.removeItem('karizma_current_conv_id');
        handleNewChat();
      }
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  // Parse structured 5-style responses from assistant markdown
  const parseFiveStyles = (content: string) => {
    if (!content) return null;

    const styleDefs = [
      {
        id: 'charismatic',
        icon: '👑',
        title: 'لحن ۱: کاریزماتیک و باکلاس',
        subtitle: 'شیک، جذاب، با پرستیژ بالا، سنجیده و بدون ابراز نیاز',
        badge: 'کاریزماتیک & باکلاس',
        borderColor: 'border-sky-500/40 hover:border-sky-500/80',
        bgColor: 'bg-sky-950/20',
        badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/20'
      },
      {
        id: 'funny',
        icon: '😂',
        title: 'لحن ۲: شوخ‌طبع و رندانه',
        subtitle: 'شکستن یخ مکالمه، رندی هوشمندانه و بازیگوشی',
        badge: 'شوخ‌طبع & رندانه',
        borderColor: 'border-purple-500/40 hover:border-purple-500/80',
        bgColor: 'bg-purple-950/20',
        badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      },
      {
        id: 'confident',
        icon: '🔥',
        title: 'لحن ۳: مقتدر و با اعتماد به نفس',
        subtitle: 'سنگین، قاطع، صریح و هدایت مکالمه با آرامش',
        badge: 'مقتدر & با اعتماد به نفس',
        borderColor: 'border-amber-500/40 hover:border-amber-500/80',
        bgColor: 'bg-amber-950/20',
        badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      },
      {
        id: 'mysterious',
        icon: '🔮',
        title: 'لحن ۴: مرموز و پرکشش',
        subtitle: 'برانگیختن حس کنجکاوی و ایجاد اشتیاق در مخاطب',
        badge: 'مرموز & پرکشش',
        borderColor: 'border-pink-500/40 hover:border-pink-500/80',
        bgColor: 'bg-pink-950/20',
        badgeColor: 'bg-pink-500/10 text-pink-400 border-pink-500/20'
      },
      {
        id: 'mature',
        icon: '💎',
        title: 'لحن ۵: متین و پخته',
        subtitle: 'باوقار، دیپلماتیک و پاسخ عمیق و هوشمندانه',
        badge: 'متین & پخته',
        borderColor: 'border-emerald-500/40 hover:border-emerald-500/80',
        bgColor: 'bg-emerald-950/20',
        badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      }
    ];

    // Clean any residual English thought/meta tags from display content
    const sanitizedContent = content
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/\*+\s*(?:Concept|Draft|Note|Notes|Idea|Strategy|Approach|Goal|Tone|Analysis|Explanation|Option)\s*\*+:?/gi, '')
      .replace(/(?:^|\n)\s*(?:Concept|Draft|Note|Notes|Idea|Strategy|Approach|Goal|Tone|Analysis|Explanation|Option)\s*:\s*[A-Za-z0-9\s,.'"-]+/gi, '');

    const hasToneIndicator = /👑|😂|🔥|🔮|💎|😊|😎|❤️|🧠|لحن ۱|لحن ۲|لحن ۳|لحن ۴|لحن ۵|کاریزماتیک|شوخ|مقتدر|مرموز|متین|صمیمی|عاطفی|آلفا/.test(sanitizedContent);
    if (!hasToneIndicator) {
      return null;
    }

    // Identify start positions of each tone block strictly corresponding to the 5 canonical tones
    const toneMarkers: { id: string; patterns: RegExp[] }[] = [
      { id: 'charismatic', patterns: [/👑/, /لحن ۱/i, /کاریزماتیک/i, /باکلاس/i] },
      { id: 'funny', patterns: [/😂/, /لحن ۲/i, /شوخ‌طبع/i, /شوخ/i, /رندانه/i] },
      { id: 'confident', patterns: [/🔥/, /لحن ۳/i, /مقتدر/i, /اعتماد به نفس/i, /قاطع/i] },
      { id: 'mysterious', patterns: [/🔮/, /لحن ۴/i, /مرموز/i, /پرکشش/i] },
      { id: 'mature', patterns: [/💎/, /لحن ۵/i, /متین/i, /پخته/i, /باوقار/i] }
    ];

    const positions: { id: string; index: number }[] = [];

    toneMarkers.forEach(tm => {
      let minPos = -1;
      for (const pattern of tm.patterns) {
        const match = sanitizedContent.search(pattern);
        if (match !== -1) {
          if (minPos === -1 || match < minPos) {
            minPos = match;
          }
        }
      }
      if (minPos !== -1) {
        positions.push({ id: tm.id, index: minPos });
      }
    });

    positions.sort((a, b) => a.index - b.index);

    const extractedMap = new Map<string, string>();
    for (let i = 0; i < positions.length; i++) {
      const curr = positions[i];
      const nextIndex = (i + 1 < positions.length) ? positions[i + 1].index : sanitizedContent.length;
      const blockText = sanitizedContent.substring(curr.index, nextIndex).trim();
      if (!extractedMap.has(curr.id)) {
        extractedMap.set(curr.id, blockText);
      }
    }

    // Build exactly 5 sections in canonical order (1: direct, 2: friendly, 3: charismatic, 4: emotional, 5: humorous)
    const parsedSections = styleDefs.map((def) => {
      const blockText = extractedMap.get(def.id) || '';

      let quote = '';
      let tip = '';
      let explanation = '';

      if (blockText) {
        const quoteMatch = blockText.match(/«([^»]+)»/) || 
                           blockText.match(/"([^"]+)"/) || 
                           blockText.match(/“([^”]+)”/) || 
                           blockText.match(/‘([^’]+)’/);
        if (quoteMatch) {
          quote = quoteMatch[1].trim();
        }

        const tipMatch = blockText.match(/📌\s*نکته اجرا:\s*([^\n]+)/);
        if (tipMatch) {
          tip = tipMatch[1].trim();
        }

        const lines = blockText
          .split('\n')
          .map(l => l.trim())
          .filter(l => {
            if (!l) return false;
            if (l.startsWith('📌')) return false;
            if (l.startsWith(def.icon)) return false;
            if (l.includes('**لحن')) return false;
            if (quote && l.includes(quote)) return false;
            return true;
          });

        explanation = lines.join(' ').replace(/^[«"“'’\-*\d.)\s]+|[»"”'’\s]+$/g, '').trim();

        if (!quote && explanation) {
          quote = explanation;
          explanation = '';
        } else if (!quote) {
          quote = blockText.replace(/^.*(?=\n|$)/, '').replace(/^[«"“'’\-*\d.)\s]+|[»"”'’\s]+$/g, '').trim();
        }

        // Clean up any trailing half-punctuations or unclosed characters
        if (quote) {
          quote = quote.replace(/[؛،\-:]\s*$/, '').trim();
          if (quote.length < 8) {
            quote = '';
          }
        }
      }

      if (!quote) {
        // High-quality fallback if this specific tone quote was incomplete or missing
        if (def.id === 'friendly') {
          quote = 'خیلی خوشحالم که این موضوع رو در میون گذاشتی؛ کاملاً درکت می‌کنم و با حس خوب جلو می‌ریم.';
          tip = tip || 'لحن نرم، صدای گرم و پرانرژی و ایجاد حس راحت بودن.';
        } else if (def.id === 'emotional') {
          quote = 'از صمیم قلب احساست برام ارزشمنده؛ همیشه درک متقابل و صمیمیت عمیق زیباترین بخشه.';
          tip = tip || 'لحن پراحساس و عمیق، ایجاد حس امنیت و پیوند قلبی.';
        } else if (def.id === 'humorous') {
          quote = 'با یه پوزخند خونسرد می‌گم: فکر کنم داری منو امتحان می‌کنی، ولی بازی با قوانین من داستان دیگه‌ای داره!';
          tip = tip || 'پوزخند خونسرد، حاضرجوابی شیطنت‌آمیز و حفظ اقتدار.';
          explanation = explanation || 'تحلیل مربی: شوخ‌طبعی مقتدرانه برتری کلامی و کنترل شرایط را تضمین می‌کند.';
        } else if (def.id === 'charismatic') {
          quote = 'با آرامش و متانت کامل: مدیریت این موقعیت نیازمند رفتاری باکلاس و سنجیده است.';
          tip = tip || 'لحن باوقار، مکث طلایی و زبان بدن مسلط.';
        } else {
          quote = 'من برای زمان و چارچوب خودم ارزش قائلم و با اعتمادبه‌نفس بالا تصمیم می‌گیرم.';
          tip = tip || 'لحن محکم و خونسرد، صدای شمرده و بدون شتاب‌زدگی.';
        }
      }

      return {
        ...def,
        quote,
        tip,
        explanation,
        fullText: blockText || `«${quote}»`
      };
    });

    return parsedSections;
  };

  return (
    <div id="rage-engine-view" className="flex flex-col h-full w-full min-w-0 min-h-0 text-slate-100 font-sans relative overflow-hidden" style={{ direction: 'rtl' }}>
      
      {/* Onboarding Tutorial Modal */}
      <OnboardingGuideModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onSelectPromptAndMode={(promptText, mode) => {
          setShowOnboarding(false);
          setActiveMode(mode);
          handleSendPrompt(promptText, mode);
        }}
      />

      {/* Emergency Live Coach Modal */}
      <EmergencyLiveCoachModal
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        onSubmitLiveCoach={(promptText, mode) => {
          setShowEmergencyModal(false);
          setActiveMode(mode);
          handleSendPrompt(promptText, mode);
        }}
        loading={loading}
      />

      {/* Mobile Backdrop Overlay for History */}
      {showHistoryMobile && (
        <div 
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-[25] transition-all duration-300 cursor-pointer"
          onClick={() => setShowHistoryMobile(false)}
        />
      )}

      {/* Mobile Backdrop Overlay for Diagnostics */}
      {showDiagnostics && (
        <div 
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-[25] transition-all duration-300 cursor-pointer"
          onClick={() => setShowDiagnostics(false)}
        />
      )}

      {/* Conversations History Sub-Sidebar */}
      <div className={`absolute inset-y-0 right-0 z-30 w-72 bg-slate-950 border-l border-slate-900/80 p-4 flex flex-col gap-4 transition-transform duration-300 ${
        showHistoryMobile ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            <span>تاریخچه گفتگوها</span>
          </span>
          <button 
            onClick={handleClearHistory}
            className="text-[10px] text-red-400 hover:text-red-300 transition flex items-center gap-1 cursor-pointer"
            title="پاکسازی کل تاریخچه"
          >
            <Trash2 className="w-3 h-3" />
            <span>پاکسازی کل</span>
          </button>
        </div>

        <button
          onClick={() => {
            handleNewChat();
            setShowHistoryMobile(false);
          }}
          className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-800 hover:border-slate-700/80 text-white rounded-xl py-2.5 text-xs font-semibold cursor-pointer transition flex items-center justify-center gap-2"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>گفتگوی هوشمند جدید</span>
        </button>

        {/* History Scroll List */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-[11px]">
              هیچ گفتگویی یافت نشد.
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => {
                  handleSelectConversation(conv.id);
                  setShowHistoryMobile(false);
                }}
                className={`group flex items-center justify-between p-3 rounded-xl text-xs text-right transition-all cursor-pointer ${
                  currentConversationId === conv.id 
                    ? 'bg-slate-800 text-sky-400 border border-slate-700/50 font-medium' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{conv.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition cursor-pointer p-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full w-full min-w-0 bg-slate-950/20 relative overflow-hidden">
        
        {/* Single Premium Unified iOS-Style Header Bar */}
        <header className="border-b border-slate-800/80 px-3 py-2 flex justify-between items-center bg-[#101014]/95 backdrop-blur-md shrink-0 gap-2 relative z-20 shadow-sm w-full min-w-0">
          {/* Right Action: New Chat (+) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleStartNewChat}
              className="px-2.5 py-1.5 min-h-[36px] bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-200 hover:text-white transition cursor-pointer shrink-0 active:scale-95 flex items-center gap-1 text-xs font-bold"
              title="گفتگو جدید"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[11px]">جدید</span>
            </button>
          </div>

          {/* Center Title: Interactive Active Coaching Mode Trigger */}
          <button
            type="button"
            onClick={() => setShowAllModesModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-[#08080b] border border-slate-800 hover:border-slate-700 rounded-full transition-all cursor-pointer active:scale-95 max-w-[65%] sm:max-w-none shadow-inner min-w-0"
          >
            <span className="text-base shrink-0">{currentModeInfo.icon}</span>
            <div className="flex flex-col text-right truncate min-w-0">
              <span className="text-[8px] text-sky-400 font-bold tracking-wider leading-none">مربی فعال کاریزما</span>
              <span className="text-xs text-white font-extrabold flex items-center gap-1 mt-0.5 truncate">
                <span className="truncate">{currentModeInfo.shortTitle || currentModeInfo.title}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </span>
            </div>
          </button>

          {/* Left Actions: History Menu Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowHistoryMobile(true)}
              className="w-9 h-9 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition cursor-pointer shrink-0 active:scale-95 flex items-center justify-center"
              title="تاریخچه گفتگوها"
            >
              <Menu className="w-5 h-5 text-slate-200" />
            </button>
          </div>
        </header>

        {/* Custom System Prompt & Tools Dashboard */}
        {showPromptSettings && (
          <div className="p-3 bg-slate-900/95 border-b border-slate-800 text-xs flex flex-col gap-2.5 animate-fade-in z-10 shrink-0 w-full min-w-0">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sky-400 text-xs">داشبورد ابزارها و تنظیمات مرکز کاریزما</span>
              <button 
                onClick={() => setShowPromptSettings(false)}
                className="text-slate-400 hover:text-white text-base font-bold p-1 cursor-pointer"
              >
                ×
              </button>
            </div>
            
            {/* Quick Action Toggle Buttons inside Settings */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => {
                  setShowOnboarding(true);
                  setShowPromptSettings(false);
                }}
                className="px-2.5 py-2 min-h-[40px] bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-slate-200 font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 text-xs"
              >
                <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                <span>راهنمای تعاملی</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDiagnostics(!showDiagnostics);
                  setShowPromptSettings(false);
                }}
                className={`px-2.5 py-2 min-h-[40px] border rounded-xl font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 text-xs ${
                  showDiagnostics 
                    ? 'bg-sky-500/10 text-sky-400 border-sky-500/35' 
                    : 'bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-300'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>{showDiagnostics ? 'پنهان‌سازی لاگ' : 'نمایش لاگ فنی'}</span>
              </button>
            </div>

            <div className="mt-1 flex flex-col gap-1">
              <span className="font-semibold text-[10px] text-slate-300">تنظیم دستی دستورالعمل سیستم (System Prompt):</span>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="مثال: لحن خود را طنزآمیز کنید و از ترفندهای حاضرجوابی و طنز استفاده کنید..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500/60 text-right h-14 text-xs"
              />
            </div>
          </div>
        )}

        {/* Messaging Box & Diagnostic Pipeline Log Grid */}
        <div className="flex-1 flex flex-col md:flex-row w-full min-w-0 overflow-hidden">
          
          {/* Chat Pane */}
          <div className="flex-1 flex flex-col h-full w-full min-w-0 overflow-hidden">
            
            {/* Active Mode Info Sub-Banner */}
            <div className="bg-[#09090c] border-b border-slate-800/60 px-3 py-1.5 flex items-center justify-between text-xs shrink-0 text-slate-300 w-full min-w-0">
              <div className="truncate flex items-center gap-1.5 min-w-0">
                <span className="text-sky-400 font-bold shrink-0 text-[11px]">🎯 راهنما:</span>
                <span className="truncate text-slate-400 text-[10px] sm:text-[11px]">{currentModeInfo.description}</span>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col overflow-y-auto min-h-0 p-3 sm:p-4 space-y-4 w-full min-w-0">
              {messages.length === 0 ? (
                <div className="min-h-full flex flex-col justify-center items-center text-center p-2 max-w-2xl mx-auto w-full min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-500/10 flex items-center justify-center border border-sky-500/30 mb-2 shadow-lg shadow-sky-500/5">
                    <span className="text-2xl">{currentModeInfo.icon}</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold text-white mb-1">{currentModeInfo.title}</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 max-w-md leading-relaxed px-2 mb-4">
                    {currentModeInfo.description}
                  </p>

                  {/* Primary Guide Option Cards */}
                  <div className="w-full mb-4 text-right min-w-0">
                    <span className="text-[11px] font-bold text-sky-400 block mb-2 px-1"> سبک راهنمایی و مشاوره مورد نیاز شما:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { const p = inputQuestion.trim() ? `لطفا یک پاسخ کوتاه و مستقیم به این پیام ارائه بده:\n\n${inputQuestion.trim()}` : 'لطفا یک پاسخ کوتاه و مستقیم به این پیام ارائه بده:'; handleSendPrompt(p, 'reply_generator'); }}
                        className="p-2.5 bg-[#0d0e12] hover:bg-slate-900 border border-slate-800 hover:border-sky-500/40 rounded-xl text-right transition cursor-pointer active:scale-95 flex flex-col gap-0.5 min-h-[52px]"
                      >
                        <span className="text-[11px] font-bold text-white flex items-center gap-1">
                          <span>⚡</span>
                          <span>پاسخ کوتاه و مستقیم</span>
                        </span>
                        <span className="text-[9px] text-slate-400 leading-tight">پاسخ‌های آماده صریح</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { const p = inputQuestion.trim() ? `لطفا راهنمای قدم‌به‌قدم برای کنترل این مکالمه ارائه بده:\n\n${inputQuestion.trim()}` : 'لطفا راهنمای قدم‌به‌قدم برای کنترل این مکالمه ارائه بده:'; handleSendPrompt(p, 'coach'); }}
                        className="p-2.5 bg-[#0d0e12] hover:bg-slate-900 border border-slate-800 hover:border-sky-500/40 rounded-xl text-right transition cursor-pointer active:scale-95 flex flex-col gap-0.5 min-h-[52px]"
                      >
                        <span className="text-[11px] font-bold text-white flex items-center gap-1">
                          <span>🧭</span>
                          <span>راهنمای قدم‌به‌قدم</span>
                        </span>
                        <span className="text-[9px] text-slate-400 leading-tight">استراتژی گام به گام</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { const p = inputQuestion.trim() ? `لطفا با مثال‌های واقعی سناریوهای مشابه رو آموزش بده:\n\n${inputQuestion.trim()}` : 'لطفا با مثال‌های واقعی سناریوهای مشابه رو آموزش بده:'; handleSendPrompt(p, 'scenario'); }}
                        className="p-2.5 bg-[#0d0e12] hover:bg-slate-900 border border-slate-800 hover:border-sky-500/40 rounded-xl text-right transition cursor-pointer active:scale-95 flex flex-col gap-0.5 min-h-[52px]"
                      >
                        <span className="text-[11px] font-bold text-white flex items-center gap-1">
                          <span>💡</span>
                          <span>یادگیری با مثال</span>
                        </span>
                        <span className="text-[9px] text-slate-400 leading-tight">شبیه‌سازی مکالمه</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendPrompt('لطفا این پیام یا مکالمه رو ارزیابی کن و پیشنهاد بهبود بده:', 'analyzer')}
                        className="p-2.5 bg-[#0d0e12] hover:bg-slate-900 border border-slate-800 hover:border-sky-500/40 rounded-xl text-right transition cursor-pointer active:scale-95 flex flex-col gap-0.5 min-h-[52px]"
                      >
                        <span className="text-[11px] font-bold text-white flex items-center gap-1">
                          <span>🎯</span>
                          <span>ارزیابی و پیشنهاد</span>
                        </span>
                        <span className="text-[9px] text-slate-400 leading-tight">آنالیز ارزش اجتماعی</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 w-full min-w-0">
                  {messages.map((msg, idx) => {
                    const parsedFiveStyles = msg.role === 'assistant' ? parseFiveStyles(msg.content) : null;

                    return (
                      <div 
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'} animate-fade-in w-full min-w-0`}
                      >
                        {msg.role === 'user' ? (
                          <div className="w-full max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed text-xs sm:text-sm shadow-md border bg-sky-600 border-sky-500/60 text-white rounded-tr-none min-w-0">
                            <div className="flex items-center gap-1.5 mb-1.5 border-b border-white/20 pb-1 text-[10px] font-extrabold text-sky-100 justify-between">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                <span>شما</span>
                              </span>
                              <span className="font-mono text-[9px] text-sky-100">
                                {new Date(msg.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="whitespace-pre-wrap text-right leading-relaxed text-xs sm:text-sm font-medium text-white">
                              {msg.content}
                            </div>
                          </div>
                        ) : (
                          <AssistantMessageBlock
                            msg={msg}
                            idx={idx}
                            parsedFiveStyles={parsedFiveStyles}
                            copiedIndex={copiedIndex}
                            handleCopy={handleCopy}
                            onGoToSubscriptions={onGoToSubscriptions}
                          />
                        )}
                      </div>
                    );
                  })}

                  {loading && (
                    <div className="flex justify-end animate-pulse w-full min-w-0">
                      <div className="max-w-[90%] rounded-2xl p-3 bg-[#0d0e12] border border-slate-800 text-slate-300 rounded-tl-none flex items-center gap-2.5">
                        <div className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin shrink-0" />
                        <span className="text-[11px] text-slate-300 font-medium">موتور ۵ لحنه مرکز کاریزما در حال تولید پاسخ...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Bottom Quick Control Bar */}
            <div className="bg-[#0e0e12] border-t border-slate-800/90 p-2 sm:p-2.5 shrink-0 w-full min-w-0 max-w-full z-20 sticky bottom-0 overflow-visible">
              <div className="w-full max-w-4xl mx-auto flex flex-col gap-2 min-w-0">
                
                {/* Subscription Quota Usage Banner */}
                {userSubStats && userSubStats.hasActiveSub && !userSubStats.isLifetimeAdmin && userSubStats.maxQueries < 99999 && (
                  <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 w-full mb-1">
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">سهمیه پیام‌های هوشمند ({userSubStats.planName}):</span>
                      <span className={`font-bold dir-ltr shrink-0 ${userSubStats.queryCount >= userSubStats.maxQueries ? 'text-red-400' : (userSubStats.remainingQueries !== undefined && userSubStats.remainingQueries <= 5) ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {userSubStats.queryCount} / {userSubStats.maxQueries}
                      </span>
                    </div>
                    {userSubStats.queryCount >= userSubStats.maxQueries ? (
                      <button
                        type="button"
                        onClick={onGoToSubscriptions}
                        className="text-[10px] font-bold text-red-200 bg-red-950/80 hover:bg-red-900 border border-red-700 px-2.5 py-1 rounded-lg transition cursor-pointer shrink-0 shadow-sm"
                      >
                        تمدید اشتراک ⚡
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {userSubStats.remainingQueries !== undefined && userSubStats.remainingQueries <= 5 && (
                          <span className="text-[10px] text-amber-300 font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30 animate-pulse">
                            رو به اتمام ({userSubStats.remainingQueries} پیام)
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 shrink-0 hidden sm:inline">
                          {Math.max(0, userSubStats.maxQueries - userSubStats.queryCount)} پیام باقی‌مانده
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Form Row */}
                <form onSubmit={handleFormSubmit} className="flex items-center gap-1.5 sm:gap-2 min-w-0 w-full">
                  <input
                    type="text"
                    value={inputQuestion}
                    onChange={(e) => setInputQuestion(e.target.value)}
                    placeholder={
                      userSubStats && !userSubStats.isLifetimeAdmin && userSubStats.hasActiveSub && userSubStats.queryCount >= userSubStats.maxQueries
                        ? 'سهمیه ارسال پیام شما در این طرح به اتمام رسیده است. برای ادامه گفتگو اشتراک خود را تمدید فرمایید.'
                        : currentModeInfo.placeholder
                    }
                    className="flex-1 min-w-0 h-11 sm:h-12 bg-[#08080b] border border-slate-800 focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/20 rounded-xl py-2 px-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition text-right shadow-inner truncate disabled:opacity-50"
                    disabled={loading || (!!userSubStats && !userSubStats.isLifetimeAdmin && userSubStats.hasActiveSub && userSubStats.queryCount >= userSubStats.maxQueries)}
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading || !inputQuestion.trim() || (!!userSubStats && !userSubStats.isLifetimeAdmin && userSubStats.hasActiveSub && userSubStats.queryCount >= userSubStats.maxQueries)}
                    className="h-11 sm:h-12 px-3 sm:px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-black rounded-xl transition cursor-pointer disabled:opacity-35 disabled:pointer-events-none active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 shrink-0"
                    title="ارسال پیام"
                  >
                    <span className="text-xs font-black hidden sm:inline text-slate-950">ارسال</span>
                    <Send className="w-4 h-4 transform rotate-180 text-slate-950 shrink-0" />
                  </button>
                </form>

              </div>
            </div>
          </div>

          {/* Diagnostic Pipeline Log Panel */}
          {showDiagnostics && (
            <div className="absolute inset-y-0 left-0 z-30 w-72 bg-slate-950 border-r border-slate-900/80 p-4 overflow-y-auto flex flex-col gap-4 animate-slide-left shrink-0">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-900/80">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-sky-400" />
                  <span>مراحل بازیابی خط لوله RAG</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowDiagnostics(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800"
                >
                  بستن
                </button>
              </div>

              {latestPipelineLog ? (
                <div className="space-y-4 text-[11px]">
                  <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-purple-400 block mb-1">۱. نرمال‌سازی فارسی</span>
                    <div className="text-slate-400 bg-slate-950/60 p-2 rounded-lg font-mono text-[9px] truncate" title={latestPipelineLog.normalizedQuery}>
                      {latestPipelineLog.normalizedQuery}
                    </div>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-purple-400 block mb-1">۲. نشانه‌گذاری و حذف ایست‌واژه‌ها</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {latestPipelineLog.tokens.length === 0 ? (
                        <span className="text-slate-500">بدون توکن</span>
                      ) : (
                        latestPipelineLog.tokens.map((tok, i) => (
                          <span key={i} className="bg-slate-950 text-sky-400 px-1.5 py-0.5 rounded text-[9px] border border-slate-800 font-mono">
                            {tok}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-purple-400 block mb-1">۳. تطبیق کلیدواژه و رتبه‌بندی BM25</span>
                    <div className="space-y-2 mt-1.5">
                      {latestPipelineLog.bm25Results.length === 0 ? (
                        <div className="text-slate-500 text-[10px]">هیچ کارتی با حد آستانه تطابق نیافت.</div>
                      ) : (
                        latestPipelineLog.bm25Results.map((res, i) => (
                          <div key={i} className="flex justify-between items-center bg-slate-950/40 p-1.5 rounded border border-slate-900">
                            <span className="truncate max-w-[130px] text-slate-300 font-medium">{res.title}</span>
                            <span className="text-emerald-400 font-bold font-mono text-[10px]">BM25: {res.score}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs text-center py-12">
                  پس از ارسال اولین سوال، لاگ‌های فنی اینجا نمایش داده می‌شوند.
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* 10 Coaching Modes Grid Modal for Mobile & Ease of Access */}
      {showAllModesModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex flex-col justify-end sm:justify-center p-0 sm:p-4 animate-fade-in">
          <div 
            className="absolute inset-0 cursor-pointer" 
            onClick={() => setShowAllModesModal(false)}
          />
          <div className="relative w-full max-w-lg bg-[#0e0e12] border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh] mx-auto animate-slide-up">
            {/* Mobile drag handle bar */}
            <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

            <div className="flex justify-between items-center pb-3 border-b border-slate-800/80 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-xs sm:text-sm text-white">انتخاب هوشمند حالت کوچینگ کاریزما</span>
              </div>
              <button 
                onClick={() => setShowAllModesModal(false)}
                className="p-1.5 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-none">
              {coachingModesList.map(m => {
                const allowed = isModeAllowed(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelectModeWithGating(m)}
                    className={`w-full text-right p-3 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer active:scale-98 min-h-[52px] ${
                      activeMode === m.id
                        ? 'bg-sky-500/10 border-sky-500/80 text-sky-400 shadow-sm'
                        : !allowed
                        ? 'bg-[#121217] border-slate-900 text-slate-400 hover:border-amber-500/40'
                        : 'bg-[#14151a] border-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="text-xl p-2 bg-slate-900 rounded-xl shrink-0 mt-0.5 border border-slate-800">{m.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-white mb-0.5 flex items-center justify-between gap-1.5">
                        <span className="flex items-center gap-1.5 truncate">
                          <span>{m.title}</span>
                          {activeMode === m.id && <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse shrink-0" />}
                        </span>
                        {!allowed && (
                          <span className="text-[9px] font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                            <Lock className="w-2.5 h-2.5" />
                            <span>{m.id === 'live_coach' ? 'طرح طلایی VIP' : 'نیازمند ارتقا'}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed truncate">{m.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowAllModesModal(false)}
              className="w-full mt-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white text-xs font-bold py-3 rounded-xl transition cursor-pointer shrink-0 min-h-[44px]"
            >
              بستن پنجره
            </button>
          </div>
        </div>
      )}

      {/* Upgrade Required Callout Modal */}
      {lockedFeatureModal.isOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex justify-center items-center p-4 z-[90] animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="w-full max-w-md bg-[#0d0e12] border border-amber-500/40 rounded-3xl p-6 shadow-2xl relative text-right">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Lock className="w-6 h-6" />
            </div>
            
            <h3 className="text-sm sm:text-base font-extrabold text-white text-center mb-2">{lockedFeatureModal.title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed text-center mb-5">
              {lockedFeatureModal.description}
            </p>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-6 text-xs space-y-2.5">
              <div className="flex justify-between items-center text-slate-400">
                <span>طرح فعلی شما:</span>
                <span className="text-amber-400 font-bold">{userSubStats?.planName || 'طرح برنزی'}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>طرح مورد نیاز جهت فعال‌سازی:</span>
                <span className="text-emerald-400 font-bold">{lockedFeatureModal.requiredPlan}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setLockedFeatureModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 py-3 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  setLockedFeatureModal(prev => ({ ...prev, isOpen: false }));
                  setShowAllModesModal(false);
                  if (onGoToSubscriptions) {
                    onGoToSubscriptions();
                  }
                }}
                className="flex-1 bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white py-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/20"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>مشاهده و ارتقای طرح 🚀</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
