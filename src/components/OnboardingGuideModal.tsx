import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, MessageSquare, Zap, Target, ArrowRight, X } from 'lucide-react';
import { CoachingMode } from '../types.js';

interface OnboardingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPromptAndMode: (prompt: string, mode: CoachingMode) => void;
}

export default function OnboardingGuideModal({
  isOpen,
  onClose,
  onSelectPromptAndMode
}: OnboardingGuideModalProps) {
  if (!isOpen) return null;

  const quickExamples = [
    {
      title: 'جواب به بی‌محلی یا دیر جواب دادن',
      prompt: 'دختر پیام داده: «سرم شلوغ بود دیر جواب دادم». چطور جذاب و با اعتماد به نفس جواب بدم؟',
      mode: 'reply_generator' as CoachingMode,
      icon: '⚡'
    },
    {
      title: 'شروع صحبت از روی استوری',
      prompt: 'استوری عکس کافه و کتاب گذاشته، چه پیامی برای باز کردن سر صحبت بدم؟',
      mode: 'starter' as CoachingMode,
      icon: '🚀'
    },
    {
      title: 'پاسخ به سوال چالشی (شیت‌تست)',
      prompt: 'پرسید: «با چند نفر همزمان چت میکنی؟» چطور جواب خونسرد و شوخ‌طبع بدم؟',
      mode: 'shit_test' as CoachingMode,
      icon: '🎯'
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm dir-rtl" style={{ direction: 'rtl' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-sm bg-[#0b0f19] border border-slate-800 rounded-3xl p-5 shadow-2xl relative text-right"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>راهنمای سریع شروع کار</span>
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white bg-slate-900 rounded-full transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300 py-3 leading-relaxed">
            یکی از نمونه‌های زیر را انتخاب کن تا دستیار هوشمند بلافاصله ۵ سناریوی پاسخ کاریزماتیک برایت تحلیل کند:
          </p>

          <div className="space-y-2.5">
            {quickExamples.map((ex, idx) => (
              <button
                key={idx}
                onClick={() => onSelectPromptAndMode(ex.prompt, ex.mode)}
                className="w-full text-right p-3 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/40 rounded-2xl transition cursor-pointer flex items-center justify-between gap-2 group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">{ex.icon}</span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white group-hover:text-sky-300 transition truncate">
                      {ex.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {ex.prompt}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 shrink-0" />
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
