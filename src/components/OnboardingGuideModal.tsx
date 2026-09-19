import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, MessagesSquare, Layers, GraduationCap, 
  Crown, X, ChevronRight, ChevronLeft, Check, ArrowRight
} from 'lucide-react';

interface OnboardingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPromptAndMode?: (prompt: string, mode: any) => void;
}

export default function OnboardingGuideModal({
  isOpen,
  onClose
}: OnboardingGuideModalProps) {
  const [activeStep, setActiveStep] = useState(0);

  if (!isOpen) return null;

  const appSections = [
    {
      id: 'coach',
      title: '۱. مربی چت و شبیه‌ساز مکالمه',
      badge: 'هسته هوشمند',
      icon: Sparkles,
      iconColor: 'text-sky-400',
      bgGlow: 'from-sky-500/10 to-indigo-500/10',
      borderColor: 'border-sky-500/30',
      desc: 'در هر موقعیت چالش‌برانگیز، پیام یا حرف طرف مقابل را بنویسید تا بلافاصله ۵ سناریوی کانونیکال دریافت کنید.',
      features: [
        'ارائه همزمان ۵ لحن: کاریزماتیک، شوخ‌طبع، مقتدر، مرموز و متین',
        'تحلیل دقیق روانشناختی و هدف پنهان پشت حرف طرف مقابل',
        'راهنمای فن بیان، تن صدا و زبان بدن اختصاصی برای هر پاسخ'
      ]
    },
    {
      id: 'scenarios',
      title: '۲. بانک جامع سناریوها',
      badge: 'بیش از ۶۰٬۰۰۰ موقعیت',
      icon: MessagesSquare,
      iconColor: 'text-purple-400',
      bgGlow: 'from-purple-500/10 to-pink-500/10',
      borderColor: 'border-purple-500/30',
      desc: 'آرشیو بزرگ سناریوهای واقعی در دسته‌بندی‌های دوستی، کاری، عاطفی، مشاجره و شیت‌تست‌ها.',
      features: [
        'جستجوی آنی با نوشتن موقعیت و استخراج پاسخ‌های طلایی آماده',
        'دسته‌بندی موضوعی دقیق (مهمانی، چت، خانواده، مذاکره)',
        'امکان افزودن مستقیم هر سناریو به جعبه لایتنر با یک کلیک'
      ]
    },
    {
      id: 'leitner',
      title: '۳. جعبه لایتنر ۵ مرحله‌ای',
      badge: 'تثبیت در ناخودآگاه',
      icon: Layers,
      iconColor: 'text-amber-400',
      bgGlow: 'from-amber-500/10 to-orange-500/10',
      borderColor: 'border-amber-500/30',
      desc: 'سیستم مرور فاصله‌دار (Spaced Repetition) برای این‌که در موقعیت‌های واقعی بی‌درنگ و ناخودآگاه حاضر جواب باشید.',
      features: [
        'نمایش موقعیت در روی کارت و بررسی پاسخ‌های طلایی در پشت کارت',
        'امکان تایپ پاسخ خودتان برای سنجش قبل از چرخاندن کارت',
        'انتقال هوشمند کارت بین ۵ خانه تا تسلط کامل ۱۰۰ درصدی'
      ]
    },
    {
      id: 'academy',
      title: '۴. آکادمی و کانال آموزشی VIP',
      badge: 'دوره‌های تخصصی',
      icon: GraduationCap,
      iconColor: 'text-emerald-400',
      bgGlow: 'from-emerald-500/10 to-teal-500/10',
      borderColor: 'border-emerald-500/30',
      desc: 'دوره‌های گام‌به‌گام هوش کلامی، مدیریت تنش، فن بیان جذاب و روانشناسی زبان بدن.',
      features: [
        'آزمون‌های سنجش مهارت با بازخورد آنی و اعطای امتیاز XP',
        'محتواهای صوتی و پادکست‌های تخصصی کاریزما در کانال VIP',
        'پیگیری استریک (روزهای متوالی تمرین) برای استمرار یادگیری'
      ]
    },
    {
      id: 'vip',
      title: '۵. اشتراک و نجات اضطراری',
      badge: 'امکانات ویژه',
      icon: Crown,
      iconColor: 'text-amber-300',
      bgGlow: 'from-amber-500/15 to-yellow-500/10',
      borderColor: 'border-amber-500/40',
      desc: 'دسترسی بدون محدودیت به تمام سناریوها، هوش مصنوعی بدون سقف و مربی اضطراری زنده.',
      features: [
        'مربی اضطراری چت برای پاسخ‌های فوری در کمتر از ۵ ثانیه',
        'پلن‌های نقره‌ای، طلایی و الماس با پشتیبانی اختصاصی',
        'پشتیبانی مستقیم و ثبت تیکت در بخش بیشتر'
      ]
    }
  ];

  const current = appSections[activeStep];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md dir-rtl" style={{ direction: 'rtl' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-md bg-[#090d16] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative text-right flex flex-col max-h-[92vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">راهنمای بخش‌های مرکز کاریزما</h3>
                <span className="text-[10px] text-slate-400">آموزش سریع امکانات و جریان کاربری اپ</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-full transition cursor-pointer"
              title="بستن راهنما"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step Selector Chips */}
          <div className="flex items-center justify-between gap-1.5 py-3 border-b border-slate-800/60 overflow-x-auto no-scrollbar shrink-0">
            {appSections.map((sec, idx) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                  activeStep === idx
                    ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300 shadow-sm'
                    : 'bg-slate-900/60 border border-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>بخش {idx + 1}</span>
              </button>
            ))}
          </div>

          {/* Main Card Content */}
          <div className="py-4 overflow-y-auto space-y-4 flex-1">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`bg-gradient-to-b ${current.bgGlow} border ${current.borderColor} rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-inner`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 ${current.iconColor}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">{current.title}</h4>
                    <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">
                      {current.badge}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {current.desc}
              </p>

              <div className="space-y-2 pt-1 border-t border-white/5">
                <span className="text-[10px] font-bold text-slate-400 block">قابلیت‌های کلیدی این بخش:</span>
                {current.features.map((feat, fIdx) => (
                  <div key={fIdx} className="flex items-start gap-2 text-xs text-slate-200">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                    <span className="leading-relaxed text-[11px]">{feat}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Navigation Controls at bottom */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              {appSections.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    activeStep === i ? 'w-5 bg-sky-400' : 'w-1.5 bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {activeStep > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveStep(prev => prev - 1)}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>قبلی</span>
                </button>
              )}

              {activeStep < appSections.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveStep(prev => prev + 1)}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer shadow-md flex items-center gap-1"
                >
                  <span>بخش بعدی</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer shadow-md flex items-center gap-1"
                >
                  <span>شروع استفاده</span>
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
