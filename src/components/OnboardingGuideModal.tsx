import React, { useState, useEffect } from 'react';
import { 
  Sparkles, MessageSquare, Zap, Target, BookOpen, ShieldCheck, 
  ChevronRight, ChevronLeft, X, Check, Flame, Smile, Crown, Heart, Brain,
  Smartphone, UserCheck, MessageCircle, ArrowLeft, Home, Award, Layers, Save, Phone
} from 'lucide-react';
import { CoachingMode, UserPreferences } from '../types.js';
import { trackEvent } from '../lib/tracking.js';
import { parseSafeJson } from '../lib/api.js';

interface OnboardingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPromptAndMode: (promptText: string, mode: CoachingMode) => void;
}

export default function OnboardingGuideModal({
  isOpen,
  onClose,
  onSelectPromptAndMode
}: OnboardingGuideModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Profile preferences interactive state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'unspecified'>('unspecified');
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load existing preferences on open
  useEffect(() => {
    if (!isOpen) return;

    try {
      const localPrefs = JSON.parse(localStorage.getItem('user_preferences') || '{}');
      if (localPrefs.gender) setGender(localPrefs.gender);
    } catch {}

    const token = localStorage.getItem('karizma_token') || localStorage.getItem('karizma_auth_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(async (res) => {
        if (!res.ok) return null;
        return parseSafeJson(res);
      })
      .then(data => {
        if (data?.user) {
          if (data.user.phoneNumber) setPhoneNumber(data.user.phoneNumber);
          if (data.user.preferences) {
            if (data.user.preferences.gender) setGender(data.user.preferences.gender);
          }
        }
      })
      .catch(() => {});
    }
  }, [isOpen]);

  const handleSavePreferences = async () => {
    setSavingPreferences(true);
    setSaveStatus(null);

    const toEnglishDigits = (str: string) => {
      return str
        .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
    };

    const cleanPhone = toEnglishDigits(phoneNumber.trim()).replace(/[^0-9]/g, '');
    if (cleanPhone && !/^09\d{9}$/.test(cleanPhone)) {
      setSavingPreferences(false);
      setSaveStatus({
        type: 'error',
        message: 'شماره موبایل وارد شده معتبر نیست (باید ۱۱ رقم و با 09 شروع شود).'
      });
      return;
    }

    const updatedPrefs: UserPreferences = {
      gender,
      autoCopy: true
    };

    localStorage.setItem('user_preferences', JSON.stringify(updatedPrefs));

    const token = localStorage.getItem('karizma_token') || localStorage.getItem('karizma_auth_token');
    if (token) {
      try {
        const res = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            phoneNumber: cleanPhone || undefined,
            preferences: updatedPrefs
          })
        });

        if (res.ok) {
          setSaveStatus({
            type: 'success',
            message: 'مشخصات و ترجیحات شما با موفقیت در حساب کاربری ثبت شد!'
          });
        } else {
          setSaveStatus({
            type: 'success',
            message: 'تنظیمات در حافظه دستگاه با موفقیت ذخیره شد!'
          });
        }
      } catch {
        setSaveStatus({
          type: 'success',
          message: 'تنظیمات در حافظه دستگاه ذخیره شد.'
        });
      }
    } else {
      setSaveStatus({
        type: 'success',
        message: 'تنظیمات با موفقیت ذخیره شد!'
      });
    }

    setSavingPreferences(false);
  };

  if (!isOpen) return null;

  const slides = [
    {
      id: 'welcome',
      badge: 'راهنمای جامع اپلیکیشن کاریزما',
      title: 'مربی هوشمند گفتگو و کوچینگ ارتباطی در جیب شما!',
      description: 'کاریزما یک چت‌بات معمولی نیست؛ یک مربی هوشمند و متخصص ارتباطات است که در تمام موقعیت‌های چت، قرار حضوری، شروع مکالمه و پاسخ‌دهی به شما کمک می‌کند.',
      icon: Sparkles,
      color: 'from-sky-500 to-indigo-600',
      content: (
        <div className="space-y-3.5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-300">
            <p className="font-bold text-sky-400 mb-2 text-xs flex items-center gap-1.5">
              <span>💡</span>
              <span>کاریزما چطور کار می‌کند؟ (در ۳ گام خیلی ساده)</span>
            </p>
            <div className="space-y-2 text-[11px] text-slate-200">
              <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center shrink-0 text-[10px]">۱</span>
                <span><strong>موقعیت را بنویسید:</strong> پیام طرف مقابل یا موقعیتی که در آن هستید را وارد کنید.</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0 text-[10px]">۲</span>
                <span><strong>دریافت ۵ پاسخ هوشمند:</strong> کاریزما ۵ پاسخ عالی با سبک‌های مقتدر، صمیمی، کاریزماتیک، عاطفی و شوخ‌طبع تولید می‌کند.</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">۳</span>
                <span><strong>کپی و ارسال:</strong> با یک کلیک بهترین پاسخ متناسب با خط فکری خودتان را کپی و ارسال کنید!</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
              <span className="text-emerald-400 font-bold text-xs block mb-1">⚡ پاسخ سریع به پیام‌ها</span>
              <p className="text-[11px] text-slate-400">طرف مقابل چیزی گفته و نمی‌دانی چی جواب بدی؟ پیامش رو بفرست تا فوری پاسخ آماده بگیری.</p>
            </div>
            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
              <span className="text-sky-400 font-bold text-xs block mb-1">🚀 سر صحبت باز کردن</span>
              <p className="text-[11px] text-slate-400">در کافه، باشگاه، اینستاگرام یا قرار می‌خواهی سر صحبت رو باز کنی؟ جملات شروع‌کننده طبیعی دریافت کن.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'home_dashboard',
      badge: 'بخش اول: خانه و داشبورد',
      title: 'صفحه اصلی و امکانات کلیدی خانه',
      description: 'در صفحه اصلی، تمام ابزارهای مهم و آمار حساب کاربری شما یک‌جا قرار دارد:',
      icon: Home,
      color: 'from-amber-500 to-orange-600',
      content: (
        <div className="space-y-2.5 text-xs">
          <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl">
            <div className="flex items-center gap-2 text-amber-300 font-bold mb-1">
              <Zap className="w-4 h-4 fill-current" />
              <span>کمک فوری ۱۰ ثانیه‌ای (Emergency Coach)</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-normal">
              ویژه موقعیت‌های اضطراری! اگر در چت یا مکالمه زنده گیر کرده‌اید و وقت ندارید، دکمه زرد رنگ بالای داشبورد را بزنید تا در کمتر از ۱۰ ثانیه پاسخ فوق‌سریع دریافت کنید. (فقط در صفحه اصلی قرار دارد)
            </p>
          </div>

          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="font-bold text-sky-400 block mb-1">📊 وضعیت سهمیه و اشتراک</span>
            <p className="text-[11px] text-slate-400">
              تعداد پیام‌های باقی‌مانده و نوع طرح اشتراک شما (برنزی، نقره‌ای، طلایی) در بالای خانه همیشه قابل مشاهده است.
            </p>
          </div>

          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="font-bold text-emerald-400 block mb-1">🎯 میانبرهای دسترسی سریع</span>
            <p className="text-[11px] text-slate-400">
              ورود مستقیم به چت هوشمند، بانک سناریوها، آکادمی آموزشی، فلش‌کارت‌های روزانه و جعبه لایتنر با یک لمس.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'four_modes',
      badge: 'بخش دوم: ۴ حالت کوچینگ',
      title: '۴ ابزار تخصصی در بخش چت کاریزما',
      description: 'در بالای صفحه چت می‌توانید حالت کوچینگ را متناسب با نیازتان تغییر دهید:',
      icon: Target,
      color: 'from-emerald-500 to-teal-600',
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-right">
          {[
            { title: '۱. پاسخ سریع به پیام', desc: 'تولید جواب آماده فوری', icon: '⚡' },
            { title: '۲. شروع مکالمه (استارتر)', desc: 'باز کردن سر صحبت', icon: '🚀' },
            { title: '۳. مربی نجات گفتگو', desc: 'احیای مکالمات سرد شده', icon: '🎯' },
            { title: '۴. کمک فوری ۱۰ ثانیه‌ای', desc: 'پاسخ صاعقه‌ای در اضطرار', icon: '🚑' },
          ].map((m, idx) => (
            <div key={idx} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <span className="text-2xl">{m.icon}</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-200">{m.title}</span>
                <span className="text-[10px] text-slate-400">{m.desc}</span>
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'five_styles',
      badge: 'بخش سوم: ۵ لحن کاریزماتیک',
      title: 'آشنایی با ۵ سبک پاسخ‌دهی مربی',
      description: 'کاریزما برای هر پیام، پاسخ‌هایی با سبک‌های مختلف روانشناسی ارائه می‌دهد تا دقیقا متناسب با اخلاق خودتان انتخاب کنید:',
      icon: Zap,
      color: 'from-purple-500 to-pink-600',
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-right">
          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-amber-500/20">
            <span className="text-amber-400 font-bold text-xs flex items-center gap-1 mb-1">
              <Flame className="w-3.5 h-3.5" />
              <span>🔥 ۱. مقتدر و آلفا</span>
            </span>
            <p className="text-[11px] text-slate-300">سنگین، قاطع، با پرستیژ بالا و بدون ابراز نیاز.</p>
          </div>

          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-emerald-500/20">
            <span className="text-emerald-400 font-bold text-xs flex items-center gap-1 mb-1">
              <Smile className="w-3.5 h-3.5" />
              <span>😊 ۲. صمیمی و دوستانه</span>
            </span>
            <p className="text-[11px] text-slate-300">گرم، خاکی، پرانرژی و ایجاد حس راحت بودن.</p>
          </div>

          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-sky-500/20">
            <span className="text-sky-400 font-bold text-xs flex items-center gap-1 mb-1">
              <Crown className="w-3.5 h-3.5" />
              <span>😎 ۳. باکلاس و کاریزماتیک</span>
            </span>
            <p className="text-[11px] text-slate-300">جذاب، بااحترام، سنجیده و هوشمندانه.</p>
          </div>

          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-pink-500/20">
            <span className="text-pink-400 font-bold text-xs flex items-center gap-1 mb-1">
              <Heart className="w-3.5 h-3.5" />
              <span>❤️ ۴. احساسی و عاطفی</span>
            </span>
            <p className="text-[11px] text-slate-300">ایجاد پیوند قلبی، همدلی و صمیمیت عمیق.</p>
          </div>

          <div className="sm:col-span-2 bg-slate-900/90 p-2.5 rounded-xl border border-purple-500/20">
            <span className="text-purple-400 font-bold text-xs flex items-center gap-1 mb-1">
              <Brain className="w-3.5 h-3.5" />
              <span>😂 ۵. شوخ‌طبع و کل‌کل + تحلیل مربی</span>
            </span>
            <p className="text-[11px] text-slate-300">حاضرجوابی شیطنت‌آمیز همراه با تحلیل روانشناسی انگیزه مخاطب و شیوه کنترل گفتگو.</p>
          </div>
        </div>
      )
    },
    {
      id: 'banks_academy_leitner',
      badge: 'بخش چهارم: مهارت‌ها، بانک‌ها و یادگیری',
      title: 'بانک سناریو، آکادمی و کارت‌های مهارت',
      description: 'برای یادگیری عمیق‌تر و تثبیت تکنیک‌های کاریزماتیک می‌توانید از این بخش‌ها استفاده کنید:',
      icon: BookOpen,
      color: 'from-blue-500 to-cyan-600',
      content: (
        <div className="space-y-2.5 text-xs text-slate-300">
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5">
            <span className="p-1.5 bg-sky-950 text-sky-400 rounded-lg shrink-0">🎭</span>
            <div>
              <span className="font-bold text-sky-300 block mb-0.5">بانک سناریوها و مکالمات:</span>
              <p className="text-[11px] text-slate-400">صدها دیالوگ، تکنیک شوخ‌طبعی و مکالمات آماده با امکان ارسال مستقیم به شبیه‌ساز مربی هوشمند.</p>
            </div>
          </div>

          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5">
            <span className="p-1.5 bg-purple-950 text-purple-400 rounded-lg shrink-0">🧠</span>
            <div>
              <span className="font-bold text-purple-300 block mb-0.5">درخت مهارت‌ها و پایگاه دانش:</span>
              <p className="text-[11px] text-slate-400">نقشه راه کامل یادگیری اصول زبان بدن، هوش کلامی و مهارت‌های ارتباطی در قالب کارت‌های مهارتی طبقه‌بندی شده.</p>
            </div>
          </div>

          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5">
            <span className="p-1.5 bg-amber-950 text-amber-400 rounded-lg shrink-0">🎓</span>
            <div>
              <span className="font-bold text-amber-300 block mb-0.5">آکادمی و کانال آموزشی کاریزما:</span>
              <p className="text-[11px] text-slate-400">دسترسی به دوره‌های آموزشی، فایل‌های صوتی/ویدئویی و تحلیل‌های لایو ارتباطی برای تقویت اعتماد به نفس.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'subscriptions_plans',
      badge: 'بخش پنجم: طرح‌های اشتراک',
      title: 'راهنمای طرح‌های برنزی، نقره‌ای و طلایی',
      description: 'امکانات هر طرح بر اساس نیاز شما به شکل زیر تعریف شده است:',
      icon: Award,
      color: 'from-amber-500 to-yellow-600',
      content: (
        <div className="space-y-2 text-xs">
          <div className="bg-slate-900 p-2.5 rounded-xl border border-amber-800/40">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-amber-400">🥉 طرح برنزی (۷ روزه)</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md font-bold">۱۰۰ پیام • ۹۹,۰۰۰ تومان</span>
            </div>
            <p className="text-[11px] text-slate-400">اعتبار یک هفته کامل! شامل سهمیه ۱۰۰ پیام هوشمند، تولید ۵ لحن همزمان، تمام سناریوها، آکادمی و کمک فوری ۱۰ ثانیه‌ای.</p>
          </div>

          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-400/30">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-200">🥈 طرح نقره‌ای (۱۵ روزه)</span>
              <span className="text-[10px] bg-slate-700 text-slate-200 px-2 py-0.5 rounded-md font-bold">۵۰۰ پیام • ۲۴۹,۰۰۰ تومان</span>
            </div>
            <p className="text-[11px] text-slate-400">محبوب‌ترین طرح نیم‌ماهه! شامل سهمیه ۵۰۰ پیام هوشمند، تولید ۵ لحن همزمان، جعبه لایتنر، آکادمی کامل و سناریوها.</p>
          </div>

          <div className="bg-gradient-to-r from-amber-950/40 via-yellow-900/30 to-amber-950/40 p-2.5 rounded-xl border border-yellow-500/50">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-yellow-300 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                <span>🥇 طرح طلایی (یک ماهه VIP)</span>
              </span>
              <span className="text-[10px] bg-yellow-400 text-slate-950 font-black px-2 py-0.5 rounded-md">۵,۰۰۰ پیام • ۵۹۹,۰۰۰ تومان</span>
            </div>
            <p className="text-[11px] text-slate-300">دسترسی جامع ۳۰ روزه با سهمیه فوق‌العاده ۵,۰۰۰ پیام، پشتیبانی اختصاصی VIP و دسترسی بدون محدودیت به تمامی امکانات اپلیکیشن.</p>
          </div>
        </div>
      )
    },
    {
      id: 'try_samples',
      badge: 'تست زنده!',
      title: 'یک نمونه را انتخاب کنید و عملکرد سیستم را ببینید',
      description: 'روی یکی از سوالات زیر کلیک کنید تا بلافاصله وارد چت هوشمند شوید:',
      icon: ShieldCheck,
      color: 'from-indigo-500 to-purple-600',
      content: (
        <div className="space-y-2">
          {[
            {
              text: 'طرف مقابلم گفت: «شاید یه وقت دیگه رفتیم کافه.» چی بگم که باکلاس و کاریزماتیک باشه؟',
              mode: 'reply_generator' as CoachingMode,
              tag: 'پاسخ سریع (Reply)'
            },
            {
              text: 'تو کافه یا دانشگاه یکی نشسته، چطور کاملاً طبیعی و بی‌استرس سر صحبت رو باز کنم؟',
              mode: 'starter' as CoachingMode,
              tag: 'شروع مکالمه (Starter)'
            },
            {
              text: 'استوری گذاشته از کتاب یا آهنگی که دوست داره، چه ریپلای جذاب و متفاوتی بدم؟',
              mode: 'coach' as CoachingMode,
              tag: 'ریپلای استوری (Story)'
            },
            {
              text: 'مکالمه‌مون یه دفعه سرد شد و پیام کوتاه داد، چطور مکالمه رو دوباره جذاب کنم؟',
              mode: 'coach' as CoachingMode,
              tag: 'نجات گفتگو (Coach)'
            }
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onSelectPromptAndMode(item.text, item.mode);
                onClose();
              }}
              className="w-full text-right p-2.5 bg-slate-900 hover:bg-sky-950/40 border border-slate-800 hover:border-sky-500/50 rounded-xl transition group flex items-center justify-between cursor-pointer"
            >
              <div>
                <span className="text-[10px] text-sky-400 font-mono block mb-0.5">{item.tag}</span>
                <span className="text-xs text-slate-200 font-medium group-hover:text-white">{item.text}</span>
              </div>
              <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:-translate-x-1 transition" />
            </button>
          ))}
        </div>
      )
    },
    {
      id: 'preferences',
      badge: 'تنظیمات شخصی‌سازی',
      title: 'تنظیم ترجیحات گفتگو و پروفایل شما',
      description: 'مشخصات و ترجیحات خود را ثبت کنید تا مربی پاسخ‌ها را دقیق‌تر و هوشمندانه‌تر تولید کند:',
      icon: UserCheck,
      color: 'from-emerald-500 to-teal-600',
      content: (
        <div className="space-y-3.5 text-xs">
          {saveStatus && (
            <div className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2 animate-fade-in ${
              saveStatus.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/50 border-red-500/40 text-red-300'
            }`}>
              {saveStatus.type === 'success' ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <span>⚠️</span>}
              <span>{saveStatus.message}</span>
            </div>
          )}

          {/* Phone input */}
          <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1.5">
            <label className="text-slate-300 font-bold text-xs flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-sky-400" />
              <span>شماره تلفن همراه (اختیاری):</span>
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="مثال: 09123456789"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono text-left dir-ltr"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1.5">جنسیت شما (جهت تنظیم لحن و ضمایر):</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'male', label: 'آقا 🧔‍♂️' },
                { id: 'female', label: 'خانم 👩‍🦰' },
                { id: 'unspecified', label: 'بدون ترجیح ⚡' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setGender(opt.id as any)}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer active:scale-95 text-xs ${
                    gender === opt.id
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleSavePreferences}
              disabled={savingPreferences}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {savingPreferences ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>ثبت و ذخیره تنظیمات</span>
                </>
              )}
            </button>
          </div>
        </div>
      )
    }
  ];

  const current = slides[currentSlide];
  const IconComponent = current.icon;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 font-sans text-slate-100" style={{ direction: 'rtl' }}>
      <div className="w-full max-w-xl bg-[#121216] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className={`p-4 sm:p-5 bg-gradient-to-r ${current.color} flex items-center justify-between relative`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-black/20 rounded-2xl backdrop-blur-sm border border-white/10">
              <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 bg-black/20 px-2 py-0.5 rounded-full border border-white/10">
                {current.badge}
              </span>
              <h3 className="font-bold text-xs sm:text-base text-white mt-1">
                {current.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 scrollbar-none">
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            {current.description}
          </p>

          {current.content}
        </div>

        {/* Footer Navigation */}
        <div className="p-3.5 sm:p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between shrink-0">
          
          {/* Progress Indicators */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentSlide ? 'w-5 sm:w-6 bg-sky-500' : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>

          {/* Prev / Next Buttons */}
          <div className="flex items-center gap-2">
            {currentSlide > 0 && (
              <button
                type="button"
                onClick={() => setCurrentSlide(prev => prev - 1)}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
                <span>قبلی</span>
              </button>
            )}

            {currentSlide < slides.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentSlide(prev => prev + 1)}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer shadow-lg shadow-sky-600/30"
              >
                <span>بعدی</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  trackEvent('onboarding_completed', 'auth');
                  onClose();
                }}
                className="px-4 py-1.5 sm:px-5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer shadow-lg shadow-emerald-600/30"
              >
                <Check className="w-4 h-4" />
                <span>شروع کار با برنامه</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
