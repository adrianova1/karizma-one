import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Trash2, Edit3, Eye, FileText, Tags, FolderOpen,
  X, Check, HelpCircle, Sparkles, Send, Zap, CheckCircle2, AlertCircle, MessageSquare, Bot, ArrowLeft
} from 'lucide-react';
import { KnowledgeCard, Role } from '../types.js';
import { parseSafeJson } from '../lib/api.js';

interface KnowledgeBaseViewProps {
  token: string;
  userRole: string;
  onChangeTab?: (tab: string) => void;
}

export default function KnowledgeBaseView({ token, userRole, onChangeTab }: KnowledgeBaseViewProps) {
  const [activeTab, setActiveTab] = useState<'skills' | 'rag_docs'>('skills');
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedSkillCategory, setSelectedSkillCategory] = useState<string>('all');
  const [activePracticeModal, setActivePracticeModal] = useState<any | null>(null);
  const [selectedPracticeOption, setSelectedPracticeOption] = useState<number | null>(null);
  const [userPracticeInput, setUserPracticeInput] = useState('');

  // Skill Tree Data
  const skillCategories = [
    {
      id: 'openers',
      title: 'شروع گفتگو',
      level: 'سطح ۱: مبتدی تا متوسط',
      progress: 75,
      icon: '🚀',
      description: 'تکنیک‌های شکستن یخ اولیه، عبور از جملات کلیشه‌ای و ایجاد شروع‌های غیرمنتظره جذاب.',
      examples: ['تکنیک "مشاهده محیطی": به جای سلام خشک، درباره یکی از جزئیات عجیب محیط نظر بده.', 'تکنیک "سوال معکوس": به جای "چطوری؟"، بپرس "امروز سخت‌ترین کاری که انجام دادی چی بود؟"'],
      relatedScenarios: ['آشنایی در کافه', 'پیام اول در اینستاگرام', 'شروع صحبت در همایش']
    },
    {
      id: 'humor',
      title: 'شوخ طبعی',
      level: 'سطح ۲: متوسط',
      progress: 60,
      icon: '😂',
      description: 'روش‌های بازی با کلمات، شوخی با خود (Self-deprecation کنترل‌شده)، و طنز ظریف کاریزماتیک.',
      examples: ['تکنیک "بزرگ‌نمایی خنده‌دار": مسئله‌ای کوچک را با اغراق منطقی به یک بحران بزرگ کمدی تبدیل کن.', 'تکنیک "وارونه‌سازی": طوری رفتار کن که انگار طرف مقابل قصد دارد مخ تو را بزند!'],
      relatedScenarios: ['پاسخ به سوالات شخصی', 'رفع صمیمانه سوءتفاهم', 'شوخی با کنایه‌ها']
    },
    {
      id: 'confidence',
      title: 'اعتماد به نفس',
      level: 'سطح ۳: پیشرفته',
      progress: 85,
      icon: '💎',
      description: 'حفظ آرامش در موقعیت‌های پرفشار، کنترل لحن صدا، و عدم شتاب‌زدگی در پاسخ‌دهی.',
      examples: ['تکنیک "مکث ۲ ثانیه‌ای": قبل از پاسخ به سوالات مهم، ۲ ثانیه مکث کن و لبخند بزن.', 'عدم نیاز به تایید: حرفت را زدی نیازی نیست بلافاصله بپرسی "نظرت چیه؟"'],
      relatedScenarios: ['پاسخ به کل‌کل و تیکه', 'مذاکره مالی یا کاری', 'ثبت حد و مرز صریح']
    },
    {
      id: 'storytelling',
      title: 'داستان گویی',
      level: 'سطح ۲: متوسط',
      progress: 50,
      icon: '📖',
      description: 'ساختار دادن به خاطرات روزمره با تکنیک قلاب، گره داستانی و فرود هیجان‌انگیز.',
      examples: ['تکنیک "قلاب اولیه": داستان را با انتهای هیجان‌انگیز شروع کن ("امروز نزدیک بود دستگیر بشم!")', 'استفاده از حواس پنج‌گانه: بوی قهوه و صدای باران را توصیف کن نه فقط وقایع را.'],
      relatedScenarios: ['تعریف خاطره در قرار', 'صحبت در جمع دوستانه', 'معرفی خود در مصاحبه']
    },
    {
      id: 'eq',
      title: 'هوش هیجانی',
      level: 'سطح ۳: پیشرفته',
      progress: 70,
      icon: '🧠',
      description: 'تشخیص احساسات پنهان طرف مقابل و معتبرسازی حس او پیش از ارائه راهکار.',
      examples: ['تکنیک "بازتاب احساس": "می‌فهمم چقدر اون لحظه حس بلاتکلیفی داشتی."', 'تکنیک "عدم قضاوت سریع": اجازه بده طرف مقابل تمام هیجان منفی‌اش را خالی کند.'],
      relatedScenarios: ['دلداری دادن به دوست', 'مدیریت خشم طرف مقابل', 'گفتگوی عاطفی عمیق']
    },
    {
      id: 'body_language',
      title: 'زبان بدن',
      level: 'سطح ۱: مبتدی',
      progress: 90,
      icon: '👁️',
      description: 'ارتباط چشمی مثلثی، وضعیت بدن باز (Open Posture) و ژست‌های دست متقاعدکننده.',
      examples: ['ارتباط چشمی ۶۰/۴۰: ۶۰ درصد زمان سخن گفتن و ۸۰ درصد زمان شنیدن نگاه کن.', 'دست‌های آزاد: هرگز دست‌ها را در جیب یا گره‌خورده روی سینه نگه‌ندار.'],
      relatedScenarios: ['حضور در قرار اول', 'سخنرانی و ارائه', 'زبان بدن در زبان کاری']
    },
    {
      id: 'social_charisma',
      title: 'جذابیت اجتماعی',
      level: 'سطح ۳: پیشرفته',
      progress: 40,
      icon: '✨',
      description: 'تکنیک‌های ارزشمندی بالا، رازآلودگی کنترل‌شده و ایجاد حس نایاب بودن.',
      examples: ['تکنیک "پاسخ ناقص دست‌نخورده": همه‌چیز را در جلسه اول رو نکن، بگذار کنجکاو بماند.', 'تکنیک "تعریف از شخص ثالث": از دوستانش در غیابشان تمجید کن.'],
      relatedScenarios: ['مدیریت دایرکت اینستاگرام', 'حفظ جاذبه در رابطه بلندمدت', 'ارتقای پرستیژ اجتماعی']
    },
    {
      id: 'conversation_mgmt',
      title: 'مدیریت گفتگو',
      level: 'سطح ۲: متوسط',
      progress: 65,
      icon: '🎙️',
      description: 'تغییر ریل گفتگوی خسته‌کننده، هدایت بحث به سمت موضوعات عمیق و گوش دادن فعال.',
      examples: ['تکنیک "پل ارتباطی": "این منو یاد اون اتفاقی می‌اندازه که..."', 'سوالات باز: به جای "روزت خوب بود؟" بپرس "امروز جالب‌ترین اتفاقی که افتاد چی بود؟"'],
      relatedScenarios: ['هدایت مکالمه سرد', 'خروج از صحبت‌های تکراری', 'ارتباط با آدم‌های کم‌حرف']
    }
  ];

  const getScenarioForSkill = (skillId: string) => {
    switch (skillId) {
      case 'openers':
        return 'در یک همایش یا کافه، شخص مقابل کتاب خاصی در دست دارد یا چیدمان ویژه‌ای دورش چیده است. چطور گفتگو را بدون سلام خشک و تکراری شروع می‌کنید؟';
      case 'humor':
        return 'در جمع، یک نفر به شوخی به شما می‌گوید: «تو همیشه دیر می‌رسی، انگار وزیر و وکیلی!» چطور با طنز کاریزماتیک پاسخ می‌دهید؟';
      case 'confidence':
        return 'در یک جمع یا جلسه کاری، کسی یک سوال سخت یا با نیت سنجش و کل‌کل از شما می‌پرسد. واکنش کاریزماتیک شما چیست؟';
      case 'storytelling':
        return 'می‌خواهید خاطره‌ی خراب شدن ماشین در سفر را برای دوستان تعریف کنید. چطور قلاب اولیه هیجان‌انگیز را می‌اندازید؟';
      case 'eq':
        return 'دوست شما با عصبانیت می‌گوید: «رئیسم امروز جلوی همه بی‌دلیل به من گیر داد، خیلی کلافه‌ام!» بهترین پاسخ هوش هیجانی چیست؟';
      case 'body_language':
        return 'وارد یک قرار اول یا مهمانی جدید می‌شوید. برای نشان دادن اعتماد به نفس و پرستیژ عالی، چه وضعیت زبان بدنی می‌گیرید؟';
      case 'social_charisma':
        return 'شخصی از شما می‌پرسد: «رمز اصلی موفقیت یا جذابیتت چیه؟» چطور با رازآلودگی بالا پاسخ می‌دهید؟';
      case 'conversation_mgmt':
        return 'مکالمه به سمت ناله و اخبار منفی کشیده شده است. چطور با تکنیک پل ارتباطی ریل گفتگو را تغییر می‌دهید؟';
      default:
        return 'شخص مقابل سوالی می‌پرسد و می‌خواهید با کاریزمای بالا و تاثیرگذار پاسخ دهید.';
    }
  };

  const getPracticeOptionsForSkill = (skillId: string) => {
    switch (skillId) {
      case 'openers':
        return [
          {
            text: 'سلام ببخشید، اسم کتابتون چیه؟ قشنگه؟',
            isBest: false,
            isMedium: false,
            feedback: 'این سوال کلیشه‌ای و متداول است و معمولاً با پاسخ کوتاهی مثل «بله بد نیست» بسته می‌شود.'
          },
          {
            text: 'به نظر میاد انتخاب کتابت نشون میده تو این شلوغی کافه ترجیح میدی دنیای خودتو داشته باشی!',
            isBest: true,
            isMedium: false,
            feedback: 'عالی! تکنیک مشاهده محیطی + تحلیلی درباره شخصیت او که کنجکاوی و تمایل به گفتگو ایجاد می‌کند.'
          },
          {
            text: 'چطوری؟ امروز هوا خیلی گرم شده مگه نه؟',
            isBest: false,
            isMedium: true,
            feedback: 'گفتگو درباره هوا خسته‌کننده است اما حداقل حس منفی ایجاد نمی‌کند.'
          }
        ];
      case 'humor':
        return [
          {
            text: 'نه بابا ترافیک بود، تقصیر من چیه آخه!',
            isBest: false,
            isMedium: false,
            feedback: 'دفاعی شدن سریع نشان‌دهنده گارد گرفتن و عدم نفوذناپذیری کاریزماتیک است.'
          },
          {
            text: 'آره راستش داشتم تو هیئت دولت مصوبات رو امضا می‌کردم تا بالاخره افتخار بدم بیام پیش شما!',
            isBest: true,
            isMedium: false,
            feedback: 'فوق‌العاده! بزرگ‌نمایی خنده‌دار و طنز همراه با اعتماد به نفس عالی که جمع را خندان می‌سازد.'
          },
          {
            text: 'خودت هم دیروز دیر اومده بودی، کاری نکن بگم!',
            isBest: false,
            isMedium: true,
            feedback: 'کل‌کل متقابل ممکن است فضا را جدی و تقابلی کند.'
          }
        ];
      case 'confidence':
        return [
          {
            text: 'بلافاصله و با سرعت زیاد شروع به توضیح دادن کامل موضوع می‌کنید.',
            isBest: false,
            isMedium: true,
            feedback: 'سرعت زیاد در پاسخ‌دهی، شتاب‌زدگی و حس استرس پنهان را منتقل می‌کند.'
          },
          {
            text: '۲ ثانیه مکث با لبخند آرام می‌کنید، ارتباط چشمی مستقیم برقرار کرده و شمرده پاسخ می‌دهید.',
            isBest: true,
            isMedium: false,
            feedback: 'شاهکار! مکث ۲ ثانیه‌ای و وقار در کلام، نشان‌دهنده تسلط و پرستیژ بالاست.'
          },
          {
            text: 'نمی‌دونم والا، هرچی شما بگی درسته.',
            isBest: false,
            isMedium: false,
            feedback: 'تسلیم شدن سریع، ارزش کلامی شما را کاهش می‌دهد.'
          }
        ];
      default:
        return [
          {
            text: 'پاسخ مستقیم و بدون استفاده از تکنیک خاص',
            isBest: false,
            isMedium: true,
            feedback: 'پاسخ معمولی است.'
          },
          {
            text: 'استفاده هوشمندانه از فوت‌وفن کاریزماتیک و زبان بدن مثبت',
            isBest: true,
            isMedium: false,
            feedback: 'عالی! این پاسخ بیشترین تاثیرگذاری کاریزماتیک را بر مخاطب دارد.'
          },
          {
            text: 'سکوت یا پاسخ کوتاه انفعالی',
            isBest: false,
            isMedium: false,
            feedback: 'انفعال، پرستیژ اجتماعی شما را زیر سوال می‌برد.'
          }
        ];
    }
  };

  // Modal control states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('view');
  const [editingCard, setEditingCard] = useState<KnowledgeCard | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('عمومی');
  const [keywords, setKeywords] = useState('');
  const [tags, setTags] = useState('');
  const [formError, setFormError] = useState('');

  const canEdit = userRole === Role.ADMIN || userRole === Role.MODERATOR;
  const canDelete = userRole === Role.ADMIN;

  const [planLimitsInfo, setPlanLimitsInfo] = useState<{ allowedCards?: number; totalInDb?: number; hasActiveSub?: boolean }>({});

  const fetchCards = async () => {
    setLoading(true);
    try {
      let url = '/api/knowledge-cards';
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await parseSafeJson(res);
      if (Array.isArray(data)) {
        setCards(data);
        
        // Extract unique categories for filter
        const uniqueCats = Array.from(new Set(data.map((c: KnowledgeCard) => c.category))) as string[];
        setCategories(uniqueCats);
      } else if (data && Array.isArray(data.cards)) {
        setCards(data.cards);
        setPlanLimitsInfo({
          allowedCards: data.allowedCards,
          totalInDb: data.totalInDb,
          hasActiveSub: data.hasActiveSub
        });
        const uniqueCats = Array.from(new Set(data.cards.map((c: KnowledgeCard) => c.category))) as string[];
        setCategories(uniqueCats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, [searchQuery, selectedCategory]);

  const handleOpenModal = (mode: 'create' | 'edit' | 'view', card?: KnowledgeCard) => {
    setFormError('');
    setModalMode(mode);
    if (card) {
      setEditingCard(card);
      setTitle(card.title);
      setContent(card.content);
      setCategory(card.category);
      setKeywords(card.keywords.join(', '));
      setTags(card.tags.join(', '));
    } else {
      setEditingCard(null);
      setTitle('');
      setContent('');
      setCategory('عمومی');
      setKeywords('');
      setTags('');
    }
    setIsModalOpen(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setFormError('لطفا فیلدهای عنوان و متن سند را تکمیل کنید.');
      return;
    }

    const payload = {
      title: title.trim(),
      content: content.trim(),
      category: category.trim(),
      keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean)
    };

    try {
      const url = modalMode === 'create' ? '/api/knowledge-cards' : `/api/knowledge-cards/${editingCard?.id}`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await parseSafeJson(res);
        throw new Error(errData?.error || 'خطایی رخ داد.');
      }

      setIsModalOpen(false);
      fetchCards();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!window.confirm('آیا مطمئن هستید که می‌خواهید این کارت دانش را از سامانه برای همیشه حذف کنید؟')) return;

    try {
      const res = await fetch(`/api/knowledge-cards/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await parseSafeJson(res);
        throw new Error(errData?.error || 'خطا در حذف سند.');
      }

      fetchCards();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-4 md:p-8 text-slate-100 font-sans space-y-6" style={{ direction: 'rtl' }}>
      
      {/* Top Header & Tab Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#121218] border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          {onChangeTab && (
            <button
              onClick={() => onChangeTab('home')}
              className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>درخت مهارت‌ها و پایگاه دانش هوش کلامی</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              نقشه راه کامل تسلط بر ارتباطات، اصول زبان بدن و اسناد مرجع RAG
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-2xl shrink-0 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('skills')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'skills' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            درخت مهارت‌ها (Skill Tree)
          </button>
          {(userRole === Role.ADMIN || userRole === Role.MODERATOR || userRole === 'admin' || userRole === 'moderator') && (
            <button
              onClick={() => setActiveTab('rag_docs')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'rag_docs' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              اسناد مرجع RAG ({cards.length})
            </button>
          )}
        </div>
      </div>

      {/* 1. SKILL TREE TAB */}
      {activeTab === 'skills' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {skillCategories.map((sk) => (
              <div 
                key={sk.id}
                className="bg-[#121218] border border-slate-800 hover:border-sky-500/40 rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-sky-500/10 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl p-2 bg-slate-900 border border-slate-800 rounded-2xl group-hover:scale-110 transition duration-300">
                      {sk.icon}
                    </span>
                    <span className="text-[10px] font-bold text-sky-400 bg-sky-950/60 border border-sky-500/30 px-2.5 py-1 rounded-full font-mono">
                      {sk.level}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1.5">{sk.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">{sk.description}</p>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">میزان تسلط کاربر:</span>
                      <span className="font-bold text-sky-400 font-mono">{sk.progress}٪</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${sk.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Examples box */}
                  <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3 space-y-2 mb-4">
                    <span className="text-[10px] font-bold text-amber-400 block">نمونه تکنیک‌های عملی:</span>
                    {sk.examples.map((ex, i) => (
                      <p key={i} className="text-[11px] text-slate-300 leading-normal">
                        • {ex}
                      </p>
                    ))}
                  </div>

                  {/* Related Scenarios Tags */}
                  <div className="mb-4">
                    <span className="text-[10px] text-slate-500 block mb-1.5">سناریوهای مرتبط:</span>
                    <div className="flex flex-wrap gap-1">
                      {sk.relatedScenarios.map((sc, i) => (
                        <span key={i} className="text-[9px] bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded-lg">
                          #{sc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActivePracticeModal(sk);
                    setSelectedPracticeOption(null);
                    setUserPracticeInput('');
                  }}
                  className="w-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 hover:from-sky-300 hover:to-indigo-500 text-slate-950 font-black text-xs py-2.5 rounded-2xl transition cursor-pointer shadow-md shadow-sky-500/20 active:scale-98 mt-2 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-slate-950 shrink-0" />
                  <span>تمرین تعاملی این مهارت ←</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. RAG DOCUMENTS TAB */}
      {activeTab === 'rag_docs' && (
        <div className="space-y-6">
          {/* View Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-base font-bold text-white">مدیریت کارت‌های پایگاه دانش RAG</h2>
              <p className="text-xs text-slate-400">فهرست کل اسناد مرجع استفاده شده در موتور پاسخ‌گویی هوشمند کاریزما</p>
            </div>

            {canEdit && (
              <button
                onClick={() => handleOpenModal('create')}
                className="bg-gradient-to-r from-sky-500 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>ایجاد کارت دانش جدید</span>
              </button>
            )}
          </div>

          {planLimitsInfo.allowedCards !== undefined && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-200">
              <div className="flex items-center gap-2">
                <span className="text-base">📇</span>
                <span>
                  نمایش <strong className="text-amber-300 font-bold">{cards.length} کارت طلایی رابطه</strong> فعال (بر اساس سهمیه تا {planLimitsInfo.allowedCards} کارت در طرح شما از کل {planLimitsInfo.totalInDb || cards.length} کارت داتابیس).
                </span>
              </div>
            </div>
          )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Search */}
        <div className="md:col-span-2 relative">
          <input
            type="text"
            placeholder="جستجو در عنوان، متن یا کلیدواژه‌های اسناد..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/40 border border-slate-800/80 rounded-xl py-3 pl-4 pr-10 text-xs focus:outline-none focus:border-sky-500/40 text-right text-white"
          />
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-900/40 border border-slate-800/80 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-sky-500/40 text-right text-slate-300 appearance-none cursor-pointer"
          >
            <option value="">همه‌ی دسته‌بندی‌ها</option>
            {categories.map((cat, i) => (
              <option key={i} value={cat}>{cat}</option>
            ))}
          </select>
          <Filter className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Cards Scroll Grid */}
      {loading && cards.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <span className="text-xs text-slate-400">در حال دریافت و رتبه‌بندی اسناد...</span>
        </div>
      ) : cards.length === 0 ? (
        <div className="glass-panel rounded-2xl py-16 text-center border border-slate-800">
          <FolderOpen className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400 mb-1">هیچ کارت دانشی یافت نشد</p>
          <p className="text-xs text-slate-500">می‌توانید کلمه کلیدی را تغییر دهید یا سند جدیدی بارگذاری نمایید.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map(card => (
            <div 
              key={card.id}
              className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-slate-700/80 transition-all shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-md font-semibold">
                    {card.category}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    بازدید: {card.views || 0}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mb-2 text-right hover:text-sky-300 transition cursor-pointer" onClick={() => handleOpenModal('view', card)}>
                  {card.title}
                </h3>
                
                <p className="text-xs text-slate-400 leading-relaxed text-right line-clamp-3 mb-4">
                  {card.content}
                </p>
              </div>

              <div className="border-t border-slate-800/60 pt-4 mt-auto flex justify-between items-center">
                {/* tags */}
                <span className="text-[10px] text-slate-500 truncate max-w-[120px]" title={card.tags.join(', ')}>
                  برچسب: {card.tags.join('، ') || 'ندارد'}
                </span>

                {/* Operations */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenModal('view', card)}
                    className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800/40 rounded-lg transition cursor-pointer"
                    title="مشاهده جزئیات"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {canEdit && (
                    <button
                      onClick={() => handleOpenModal('edit', card)}
                      className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800/40 rounded-lg transition cursor-pointer"
                      title="ویرایش سند"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800/40 rounded-lg transition cursor-pointer"
                      title="حذف سند"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
        </div>
      )}

      {/* Pop-up Modals for View / Edit / Create */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex justify-center items-center p-4 pb-24 sm:pb-28 z-[60] animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl p-5 md:p-7 shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-5">
              <h2 className="text-lg font-bold text-white">
                {modalMode === 'create' ? 'ایجاد کارت دانش جدید' :
                 modalMode === 'edit' ? 'ویرایش کارت دانش پایگاه' : 'مشاهده کارت دانش'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl text-right shrink-0">
                {formError}
              </div>
            )}

            {modalMode === 'view' && editingCard ? (
              // View Only Mode
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-right">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">عنوان سند</span>
                  <h3 className="text-base font-bold text-white">{editingCard.title}</h3>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">محتوا / متن</span>
                  <p className="text-xs text-slate-300 bg-slate-900/60 p-4 border border-slate-800 rounded-xl leading-relaxed whitespace-pre-wrap">{editingCard.content}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">دسته‌بندی</span>
                    <span className="font-semibold text-slate-300">{editingCard.category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">تعداد بازدید موتور RAG</span>
                    <span className="font-semibold text-slate-300">{editingCard.views || 0}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">کلیدواژه‌های ایندکس</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {editingCard.keywords.map((kw, i) => (
                      <span key={i} className="bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded text-[10px]">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Create / Edit Form Mode
              <form onSubmit={handleSaveCard} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-right">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">عنوان کارت دانش</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: روش‌های شروع مکالمه با افراد غریبه"
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500/40 text-right"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">متن کامل سند مرجع</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="متن خام حاوی قوانین، توضیحات کامل فرآیند یا مفاهیم..."
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500/40 text-right h-40"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">دسته‌بندی</label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">کلیدواژه‌ها (با ویرگول جدا کنید)</label>
                    <input
                      type="text"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="مکالمه، زبان بدن، حاضرجوابی"
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">برچسب‌ها (با ویرگول جدا کنید)</label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="مقدماتی، کاریزما"
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-5 py-2.5 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-sky-500 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition cursor-pointer"
                  >
                    ثبت نهایی تغییرات
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Interactive Skill Practice Simulator Modal */}
      {activePracticeModal && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-md overflow-y-auto p-4 pt-8 pb-24 sm:pb-28">
          <div className="bg-[#0c1220] border border-sky-500/30 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative text-right dir-rtl animate-in fade-in zoom-in-95 duration-200 mx-auto mt-4 mb-10">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-xl shrink-0">
                  {activePracticeModal.icon || '🚀'}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>تمرین تعاملی {activePracticeModal.title}</span>
                  </h3>
                  <span className="text-[11px] text-sky-400 font-medium">{activePracticeModal.level}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActivePracticeModal(null);
                  setSelectedPracticeOption(null);
                  setUserPracticeInput('');
                }}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Objective Description */}
            <div className="mb-4 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3.5 text-xs text-slate-300 leading-relaxed">
              <p className="font-semibold text-slate-200 mb-1">🎯 هدف و اصول کلیدی تکنیک:</p>
              <p>{activePracticeModal.description}</p>
            </div>

            {/* Interactive Scenario */}
            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-300">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>سناریوی شبیه‌سازی شده تمرین:</span>
              </div>
              <div className="bg-sky-950/30 border border-sky-500/20 rounded-2xl p-3.5 text-xs text-sky-100 leading-relaxed">
                {getScenarioForSkill(activePracticeModal.id)}
              </div>

              {/* Options Analysis */}
              <div className="space-y-2 mt-3">
                <span className="text-[11px] font-bold text-slate-400 block">انتخاب خود را امتحان کنید:</span>
                {getPracticeOptionsForSkill(activePracticeModal.id).map((opt, idx) => {
                  const isSelected = selectedPracticeOption === idx;
                  return (
                    <div key={idx} className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedPracticeOption(idx)}
                        className={`w-full text-right p-3 rounded-2xl border text-xs font-medium transition cursor-pointer flex items-start gap-2.5 ${
                          isSelected
                            ? opt.isBest
                              ? 'bg-emerald-950/50 border-emerald-500/70 text-emerald-100 shadow-sm shadow-emerald-500/20'
                              : opt.isMedium
                              ? 'bg-amber-950/50 border-amber-500/70 text-amber-100 shadow-sm shadow-amber-500/20'
                              : 'bg-red-950/50 border-red-500/70 text-red-100 shadow-sm shadow-red-500/20'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850/80'
                        }`}
                      >
                        <span className="font-black text-sky-400 shrink-0 mt-0.5">
                          {idx === 0 ? 'الف)' : idx === 1 ? 'ب)' : 'ج)'}
                        </span>
                        <span className="flex-1 leading-relaxed">{opt.text}</span>
                        <span className="shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-slate-950/80 border border-slate-800">
                          {opt.isBest ? '🌟 عالی' : opt.isMedium ? '⚠️ متوسط' : '❌ ضعیف'}
                        </span>
                      </button>
                      {isSelected && (
                        <div className="mr-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 leading-relaxed animate-in fade-in duration-150">
                          <span className="font-bold text-sky-400 block mb-1">💡 تحلیل تخصصی کاریزما:</span>
                          <p>{opt.feedback}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Custom Input Option */}
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                  سناریو یا گفتگوی دلخواه خود را بنویسید:
                </label>
                <textarea
                  rows={2}
                  value={userPracticeInput}
                  onChange={(e) => setUserPracticeInput(e.target.value)}
                  placeholder="سناریوی مدنظر خود را اینجا بنویسید..."
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/20 resize-none transition"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <button
                type="button"
                onClick={() => {
                  const customPart = userPracticeInput.trim() ? `\nسناریو و متن دلخواه من برای تمرین: "${userPracticeInput.trim()}"` : '';
                  const prompt = `تمرین عملی و شبیه‌سازی زنده تکنیک «${activePracticeModal.title}»: ${activePracticeModal.description}.${customPart}\nلطفاً یک سناریوی شبیه‌سازی شده زنده با من شروع کن تا پاسخ بدم و تحلیلم کنی.`;
                  localStorage.setItem('pending_coach_query', prompt);
                  setActivePracticeModal(null);
                  if (onChangeTab) {
                    onChangeTab('ai-engine');
                  } else {
                    window.dispatchEvent(new CustomEvent('change_app_tab', { detail: 'ai-engine' }));
                  }
                }}
                className="w-full bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-600 hover:from-sky-300 hover:to-purple-500 text-slate-950 font-black text-xs py-3 rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-sky-500/20 active:scale-98"
              >
                <Sparkles className="w-4 h-4 fill-slate-950 shrink-0" />
                <span>ارسال سناریو به مربی هوشمند جهت تمرین زنده 🚀</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActivePracticeModal(null);
                  setSelectedPracticeOption(null);
                  setUserPracticeInput('');
                }}
                className="w-full bg-slate-900 hover:bg-slate-850 text-slate-400 text-xs py-2 rounded-xl transition cursor-pointer border border-slate-800/80"
              >
                بستن و ادامه تمرین‌ها
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
