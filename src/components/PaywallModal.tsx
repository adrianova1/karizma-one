import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Sparkles, CreditCard, CheckCircle2, ShieldAlert, ArrowLeft, X } from 'lucide-react';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToSubscriptions: () => void;
  featureTitle?: string;
}

export default function PaywallModal({
  isOpen,
  onClose,
  onGoToSubscriptions,
  featureTitle
}: PaywallModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md dir-rtl" style={{ direction: 'rtl' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-sm bg-gradient-to-b from-[#0f172a] via-[#090d16] to-[#050811] border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden text-right"
        >
          {/* Top Decorative Lights */}
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800 rounded-full transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon Header */}
          <div className="flex flex-col items-center text-center space-y-3 mb-5 pt-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-purple-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10 animate-pulse">
              <Lock className="w-8 h-8 text-amber-300" />
            </div>

            <div>
              <span className="text-[10px] font-black text-amber-400 tracking-wider uppercase bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full inline-block mb-1.5">
                نیازمند اشتراک ویژه کاریزما
              </span>
              <h3 className="text-base font-black text-white leading-snug">
                {featureTitle ? `قفل ابزار: ${featureTitle}` : 'ارتقای حساب کاربری و خرید اشتراک'}
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed px-2">
              {featureTitle
                ? `کاربر گرامی، جهت دسترسی به «${featureTitle}» و تمام امکانات هوش مصنوعی و شبیه‌سازهای تخصصی، لطفاً طرح اشتراک خود را فعال کنید.`
                : 'جهت دسترسی به مربی هوشمند کاریزما، بانک سناریوها، آکادمی تخصصی و شبیه‌ساز چت، لطفاً یکی از طرح‌های اشتراک ویژه را فعال کنید.'}
            </p>
          </div>

          {/* Feature Bullets */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-2.5 mb-6 text-xs text-slate-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>پاسخ‌دهی هوشمند مربی کاریزما با ۵ لحن رفتاری</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>دسترسی به بانک سناریوهای کاربردی و فلش‌کارت‌ها</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>مطالعه دوره‌ها و ویدئوهای آکادمی کاریزما</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>پشتیبانی و به‌روزرسانی مداوم داده‌های گفتگو</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            <button
              onClick={() => {
                onClose();
                onGoToSubscriptions();
              }}
              className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-slate-950 font-black text-xs py-3.5 rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>مشاهده و خرید طرح‌های اشتراک</span>
              <ArrowLeft className="w-4 h-4 mr-1" />
            </button>

            <button
              onClick={onClose}
              className="w-full bg-slate-900/80 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
            >
              انصراف و متوجه شدم
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
