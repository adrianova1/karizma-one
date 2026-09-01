import React from 'react';
import { 
  Sparkles, GraduationCap, MessagesSquare, Zap, 
  Flame, Trophy, Play, Award, Send, FlameKindling,
  Lock, CreditCard, HelpCircle, BookOpen, ChevronLeft
} from 'lucide-react';

interface HomeDashboardViewProps {
  user: { id: string; username: string; role: string } | null;
  subscriptionName: string;
  onChangeTab: (tab: string) => void;
  onOpenEmergencyCoach: () => void;
  onGoToSubscriptions?: () => void;
  onOpenOnboarding?: () => void;
  onOpenKnowledgeCards?: () => void;
  xp?: number;
  streak?: number;
}

export default function HomeDashboardView({ 
  user, 
  subscriptionName, 
  onChangeTab, 
  onOpenEmergencyCoach,
  onGoToSubscriptions,
  onOpenOnboarding,
  onOpenKnowledgeCards,
  xp = 350,
  streak = 0
}: HomeDashboardViewProps) {
  const isNoSub = user?.role !== 'ADMIN' && (!subscriptionName || subscriptionName === 'بدون اشتراک فعال' || subscriptionName === 'بدون اشتراک');

  const handleOpenKnowledge = () => {
    if (onOpenKnowledgeCards) {
      onOpenKnowledgeCards();
    } else {
      onChangeTab('knowledge');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto h-full space-y-4 pb-24 select-none px-4 pt-4">
      
      {/* 1. Header & Quick User Stats Bar */}
      <div className="bg-gradient-to-b from-[#0f172a]/90 to-[#0b0f19]/90 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 space-y-3 shadow-lg shadow-sky-950/20">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] text-sky-400 font-extrabold tracking-widest uppercase block font-mono">
              KARIZMA CENTER
            </span>
            <h1 className="text-base sm:text-lg font-extrabold text-white mt-0.5 flex items-center gap-1.5">
              <span>سلام، {user?.username || 'کاربر عزیز'}</span>
              <span className="animate-bounce inline-block">👋</span>
            </h1>
          </div>
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full text-[11px] font-bold shadow-sm">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>{user?.role === 'ADMIN' ? 'حساب مدیریتی' : (subscriptionName || 'اشتراک ویژه')}</span>
          </div>
        </div>

        {/* Compact Streak & Rank Bar */}
        <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-800/80">
          <div className="flex items-center gap-2.5 bg-[#080d1a]/80 p-2.5 rounded-xl border border-slate-800/80">
            <div className="p-1.5 bg-orange-500/20 text-orange-400 rounded-lg shrink-0 border border-orange-500/30">
              <Flame className="w-4 h-4 fill-orange-400/20" />
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-medium">پیوستگی تمرین</div>
              {streak > 0 ? <div className="text-xs font-black text-white">{streak} روز متوالی 🔥</div> : <div className="text-xs font-black text-slate-400">شروع نشده</div>}
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-[#080d1a]/80 p-2.5 rounded-xl border border-slate-800/80">
            <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 border border-amber-500/30">
              <Trophy className="w-4 h-4 fill-amber-400/20" />
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-medium">امتیاز کاریزما</div>
              <div className="text-xs font-black text-amber-300 font-mono">{xp} XP</div>
            </div>
          </div>
        </div>
      </div>

      {/* Paywall Banner for Unsubscribed Users */}
      {isNoSub && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-purple-500/15 border border-amber-500/40 rounded-2xl p-4 shadow-xl shadow-amber-950/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-300">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <h3 className="text-xs font-black text-white">اشتراک کاربری شما غیرفعال است</h3>
            </div>
            <span className="text-[9px] bg-amber-500/20 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full font-extrabold">
              دسترسی محدود
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            برای باز کردن قفل مربی هوشمند کاریزما، بانک سناریوها، آکادمی تخصصی و دریافت پاسخ‌های فوری چت، لطفاً طرح اشتراک ویژه تهیه کنید.
          </p>
          <button
            onClick={() => onGoToSubscriptions?.()}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs py-2.5 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>مشاهده طرح‌ها و فعال‌سازی اشتراک ویژه</span>
          </button>
        </div>
      )}

      {/* 2. Primary Action: "چی جواب بدم؟" AI Instant Generator */}
      <div className="bg-gradient-to-br from-[#0c1427] via-[#0d162d] to-[#12192e] border border-sky-500/30 rounded-2xl p-4 shadow-xl shadow-sky-950/30 space-y-3 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-sky-500/10 blur-2xl rounded-full pointer-events-none" />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2 text-sky-400">
            <div className="p-1 bg-sky-500/20 rounded-lg border border-sky-500/30">
              <Sparkles className="w-4 h-4 text-sky-300 animate-pulse" />
            </div>
            <h2 className="text-sm font-extrabold text-white">چی جواب بدم؟ (پاسخ فوری)</h2>
          </div>
          <span className="text-[10px] text-sky-300 bg-sky-500/10 border border-sky-500/25 px-2.5 py-0.5 rounded-full font-bold">
            ۵ لحن کاریزماتیک
          </span>
        </div>

        <div className="space-y-2 relative z-10">
          <textarea
            id="quick-home-input"
            rows={2}
            placeholder="پیام یا موقعیت رو بنویس... (مثلاً: گفت دیر جواب میدی چی بگم؟)"
            className="w-full bg-[#070b14]/90 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/20 resize-none transition"
          />
          <button
            onClick={() => {
              const el = document.getElementById('quick-home-input') as HTMLTextAreaElement;
              const val = el?.value || 'چی جواب بدم؟';
              localStorage.setItem('pending_coach_query', val);
              onChangeTab('ai-engine');
            }}
            className="w-full bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-600 hover:from-sky-300 hover:to-purple-500 text-slate-950 font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer shadow-md shadow-sky-500/25"
          >
            <span>دریافت ۵ پاسخ کاریزماتیک فوری</span>
            <Send className="w-3.5 h-3.5 rotate-180 fill-slate-950" />
          </button>
        </div>
      </div>

      {/* 3. Streamlined Main Hub Shortcuts (4 Clean Actions) */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-400 px-1">میانبرهای اصلی</h3>
        <div className="grid grid-cols-2 gap-2.5">
          
          <button
            onClick={() => onChangeTab('ai-engine')}
            className="p-3 bg-gradient-to-b from-[#0f172a]/80 to-[#0b0f19]/80 border border-sky-500/20 hover:border-sky-500/50 rounded-2xl text-right flex items-center gap-2.5 transition cursor-pointer active:scale-95 shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate">مربی چت</h4>
              <span className="text-[10px] text-slate-400 block truncate">۵ پاسخ کاریزماتیک</span>
            </div>
          </button>

          <button
            onClick={() => onChangeTab('scenarios')}
            className="p-3 bg-gradient-to-b from-[#0f172a]/80 to-[#0b0f19]/80 border border-purple-500/20 hover:border-purple-500/50 rounded-2xl text-right flex items-center gap-2.5 transition cursor-pointer active:scale-95 shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
              <MessagesSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate">بانک سناریوها</h4>
              <span className="text-[10px] text-slate-400 block truncate">جستجوی مکالمات</span>
            </div>
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => onChangeTab('academy')}
            className="p-3 bg-gradient-to-b from-[#0f172a]/80 to-[#0b0f19]/80 border border-emerald-500/20 hover:border-emerald-500/50 rounded-2xl text-right flex items-center gap-2.5 transition cursor-pointer active:scale-95 shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate">آکادمی مهارتی</h4>
              <span className="text-[10px] text-slate-400 block truncate">۴ دوره تخصصی</span>
            </div>
          </button>

          <button
            onClick={onOpenEmergencyCoach}
            className="p-3 bg-gradient-to-b from-red-950/30 to-[#0b0f19]/80 border border-red-500/30 hover:border-red-500/60 rounded-2xl text-right flex items-center gap-2.5 transition cursor-pointer active:scale-95 shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 fill-red-400/20" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-red-400 truncate">کوچ اضطراری</h4>
              <span className="text-[10px] text-red-300/80 block truncate">راهنمای زنده قرار</span>
            </div>
          </button>

        </div>
      </div>

      {/* 4. Knowledge Base & Skill Cards Section (کارت‌های مهارتی و دانش) */}
      <div 
        onClick={handleOpenKnowledge}
        className={`bg-gradient-to-br ${
          isNoSub 
            ? 'from-[#0f172a]/90 via-[#181126]/90 to-[#0b0f19]/90 border-amber-500/25 hover:border-amber-500/50' 
            : 'from-[#0f172a]/90 via-[#0d162d]/90 to-[#0b0f19]/90 border-indigo-500/25 hover:border-indigo-500/50'
        } border rounded-2xl p-4 space-y-3 shadow-md transition cursor-pointer group`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl ${
              isNoSub 
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' 
                : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
            } border flex items-center justify-center shrink-0`}>
              {isNoSub ? <Lock className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
            </div>
            <div>
              <h3 className={`text-xs font-bold text-white ${
                isNoSub ? 'group-hover:text-amber-300' : 'group-hover:text-indigo-300'
              } transition-colors flex items-center gap-1.5`}>
                <span>کارت‌های مهارتی و دانش</span>
                {isNoSub ? (
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    <span>اشتراک ویژه</span>
                  </span>
                ) : (
                  <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-mono">
                    Skill Tree
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">اصول و قواعد رفتار غیرکلامی، شوخ‌طبعی و فوت‌وفن کاریزما</p>
            </div>
          </div>
          <ChevronLeft className={`w-4 h-4 text-slate-500 ${
            isNoSub ? 'group-hover:text-amber-400' : 'group-hover:text-indigo-400'
          } group-hover:-translate-x-0.5 transition-all shrink-0`} />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="bg-[#080c16]/80 border border-slate-800/80 rounded-xl p-2 text-center relative overflow-hidden">
            <span className="text-sm block">🚀</span>
            <span className="text-[10px] font-bold text-slate-300 block mt-0.5 truncate">شروع گفتگو</span>
            <span className="text-[8px] text-indigo-400 font-mono">تکنیک‌ها</span>
            {isNoSub && (
              <div className="absolute top-1 right-1">
                <Lock className="w-2.5 h-2.5 text-amber-400/80" />
              </div>
            )}
          </div>
          <div className="bg-[#080c16]/80 border border-slate-800/80 rounded-xl p-2 text-center relative overflow-hidden">
            <span className="text-sm block">😂</span>
            <span className="text-[10px] font-bold text-slate-300 block mt-0.5 truncate">شوخ‌طبعی</span>
            <span className="text-[8px] text-indigo-400 font-mono">حاضرجوابی</span>
            {isNoSub && (
              <div className="absolute top-1 right-1">
                <Lock className="w-2.5 h-2.5 text-amber-400/80" />
              </div>
            )}
          </div>
          <div className="bg-[#080c16]/80 border border-slate-800/80 rounded-xl p-2 text-center relative overflow-hidden">
            <span className="text-sm block">💎</span>
            <span className="text-[10px] font-bold text-slate-300 block mt-0.5 truncate">اعتمادبه‌نفس</span>
            <span className="text-[8px] text-indigo-400 font-mono">زبان بدن</span>
            {isNoSub && (
              <div className="absolute top-1 right-1">
                <Lock className="w-2.5 h-2.5 text-amber-400/80" />
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenKnowledge();
          }}
          className={`w-full ${
            isNoSub
              ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
              : 'bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-200 border-indigo-500/30'
          } border font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95`}
        >
          {isNoSub ? (
            <>
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>بازگشایی و ارتقای اشتراک</span>
            </>
          ) : (
            <>
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>مشاهده و مطالعه کارت‌های مهارتی</span>
            </>
          )}
        </button>
      </div>

      {/* Support / Quick Help & Onboarding Guide Banner */}
      {onOpenOnboarding && (
        <div className="bg-sky-500/5 border border-sky-500/15 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1 text-right min-w-0">
            <h4 className="text-xs font-bold text-sky-400 flex items-center gap-1.5 truncate">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">راهنمای شروع به کار مرکز کاریزما</span>
            </h4>
            <p className="text-[10px] text-slate-400 leading-normal">می‌خواهی بدانی چطور بالاترین کارایی را از شبیه‌ساز گفتگو بگیری؟</p>
          </div>
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-[11px] px-3.5 py-2 rounded-xl transition cursor-pointer shrink-0 shadow-md active:scale-95 whitespace-nowrap"
          >
            مشاهده راهنما
          </button>
        </div>
      )}

    </div>
  );
}
