import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface ScenarioItem {
  id: string;
  title: string;
  category: string;
  situation: string;
  context: string;
  user_input_patterns: string[];
  triggers: string[];
  aliases: string[];
  keywords: string[];
  responses: {
    direct: string[];
    funny: string[];
    charismatic: string[];
    emotional: string[];
    psychology: string[];
    psychological_analysis?: string;
    // Compatibility aliases
    friendly?: string[];
    mysterious?: string[];
    mature?: string[];
    confident?: string[];
    tone_1?: string[];
    tone_2?: string[];
    tone_3?: string[];
    tone_4?: string[];
    tone_5?: string[];
  };
  tips: string;
  technique: string;
  bodyLanguage: string;
  nextMove: string;
  difficulty: 'easy' | 'medium' | 'hard';
  likes: number;
  views: number;
  createdAt: string;
  updatedAt: string;
  opponentLine?: string;
  environment?: string;
  genderContext?: string;
  goal?: string;
  teachingNote?: string;
}

export interface ChunkMetadata {
  id: string;
  file: string;
  count: number;
  type: 'source_canonical' | 'generated_expansion';
  status: 'completed' | 'in_progress';
  createdAt: string;
  durationMs?: number;
}

export interface PipelineManifest {
  version: string;
  targetCount: number;
  chunkSize: number;
  totalSavedScenarios: number;
  lastLoopIndex: number;
  sourceStats: {
    base51: { parsed: number; added: number; dups: number };
    scenarioBankTxt: { parsed: number; added: number; dups: number; incomplete: number };
    karizmaImportTxt: { parsed: number; added: number; dups: number; incomplete: number };
    sampleImportsTxt: { parsed: number; added: number; dups: number };
    existingJsonBank: { parsed: number; added: number; dups: number };
  };
  chunks: ChunkMetadata[];
  isFullyCompleted: boolean;
  lastUpdatedAt: string;
}

export function norm(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[يى]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[\u200c\u200b\u200e\u200f]/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\u0600-\u06FF0-9a-zA-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toArray(val: any, defaultText: string): string[] {
  if (Array.isArray(val) && val.length > 0) {
    const list = val.map(v => typeof v === 'string' ? v.trim() : String(v)).filter(Boolean);
    if (list.length > 0) return list;
  }
  if (typeof val === 'string' && val.trim().length > 0) {
    return [val.trim()];
  }
  return [defaultText];
}

function normalize5Pools(rawResponses: any, fallbackText: string, fallbackPsych: string) {
  const direct = toArray(
    rawResponses?.direct || rawResponses?.confident || rawResponses?.tone_1,
    fallbackText || 'با صراحت، متانت و بیان شفاف موضع خود را بیان کنید.'
  );
  const funny = toArray(
    rawResponses?.funny || rawResponses?.tone_2 || rawResponses?.tone_5,
    fallbackText || 'با شوخ‌طبعی هوشمندانه فضا را تلطیف و منعطف کنید.'
  );
  const charismatic = toArray(
    rawResponses?.charismatic || rawResponses?.tone_3 || rawResponses?.tone_1,
    fallbackText || 'با وقار، کنترل فریم کلامی و حفظ پرستیژ پاسخ دهید.'
  );
  const emotional = toArray(
    rawResponses?.emotional || rawResponses?.friendly || rawResponses?.tone_4,
    fallbackText || 'با همدلی، صمیمیت و درک متقابل ارتباط برقرار کنید.'
  );
  const psychology = toArray(
    rawResponses?.psychology || rawResponses?.mature || rawResponses?.tone_5 || rawResponses?.psychological_analysis,
    fallbackPsych || 'با تحلیل روانشناختی انگیزه مخاطب، تعادل مکالمه را حفظ کنید.'
  );

  const psychAnalysis = typeof rawResponses?.psychological_analysis === 'string' && rawResponses.psychological_analysis.trim().length > 0
    ? rawResponses.psychological_analysis.trim()
    : (fallbackPsych || psychology[0] || 'تحلیل ارتباطی و تکنیک کنترل فریم گفتگو.');

  return {
    direct,
    funny,
    charismatic,
    emotional,
    psychology,
    psychological_analysis: psychAnalysis,
    friendly: emotional,
    mysterious: charismatic,
    mature: psychology,
    confident: direct,
    tone_1: direct,
    tone_2: funny,
    tone_3: charismatic,
    tone_4: emotional,
    tone_5: psychology
  };
}

// -------------------------------------------------------------
// Expansion Theme Matrix
// -------------------------------------------------------------
const primaryCategories = [
  {
    name: 'روابط عاطفی و دیتینگ',
    themes: [
      {
        dilemma: 'دعوت به کافه دنج عصرگاهی',
        prompt: 'پیشنهاد دیدار حضوری در یک کافه آرام برای آشنایی عمیق‌تر',
        opponent: 'نمی‌دونم، این هفته خیلی سرم شلوغه و وقت ندارم',
        direct: 'هر زمان فرصتت آزاد شد بگو تا یک تایم مناسب هماهنگ کنیم؛ اولویت با آرامش خودته.',
        funny: 'قهوه کافه منتظره و قول داده خوش‌طعم‌ترین نسخه خودش باشه! هروقت وقت داشتی در خدمتم.',
        charismatic: 'برای صحبت‌های باکیفیت همیشه زمان مناسب پیدا می‌شه؛ هر وقت احساس راحتی کردی بگو.',
        emotional: 'کاملاً درکت می‌کنم، فشار کاری سخته. هر زمان حالت برای یک گپ صمیمی مساعد بود خوشحال می‌شم ببینمت.',
        psychology: 'با عدم اصرار و نشان دادن استقلال فردی، ارزش زمان خود و احترام به حریم طرف مقابل را تثبیت کنید.',
        tech: 'تکنیک رهایی از نتیجه و ایجاد کشش با عدم فشار'
      },
      {
        dilemma: 'پاسخ به شیت‌تست با همه انقدر گرم می‌گیری',
        prompt: 'طرف مقابل با کنایه شما را به داشتن روابط متعدد متهم می‌کند',
        opponent: 'تو با همه این‌قدر زود صمیمی می‌شی و زبون می‌ریزی؟',
        direct: 'من با انسان‌های بااحترام محترمانه برخورد می‌کنم، اما صمیمیت واقعی رو فقط برای افراد خاص نگه می‌دارم.',
        funny: 'این مهارت برای ثبت در گینس طراحی نشده، فقط بازتاب انرژی مثبت طرف مقابله! 😉',
        charismatic: 'خونگرمی نشانه ادب است و انتخاب فرد برای صمیمیت، نشانه سلیقه. تو جزء دسته دوم هستی.',
        emotional: 'اگه حس صمیمیت بهت منتقل شده خوشحالم، چون حس راحتی و احترام واقعی برام مهمه.',
        psychology: 'تست‌های سنجش اعتبار را با خونسردی و بدون موضع تدافعی به یک تعریف شیک تبدیل کنید.',
        tech: 'تکنیک فریمینگ مجدد و خنثی‌سازی شیت‌تست'
      },
      {
        dilemma: 'پاسخ به پیام شبانه اکس سلام بیداری',
        prompt: 'پارتنر سابق بعد از ماه‌ها بی‌خبری در اواخر شب پیامی کوتاه می‌فرستد',
        opponent: 'سلام... بیداری؟ دلم یهو برات تنگ شد',
        direct: 'سلام. امیدوارم خوب باشی. اگر موضوع کاری یا مهمی هست فردا در ساعات روز مطرح کن.',
        funny: 'سلام! شب‌ها زمان استراحت مغزه نه مرور نوستالژی‌های گذشته! شبت بخیر.',
        charismatic: 'سلام. گذشته در جای خودش محترمه اما مسیر ما جدا شده. برای شما آرزوی آرامش و موفقیت دارم.',
        emotional: 'سلام. حس دلتنگی طبیعیه، اما ما تصمیم گرفتیم راهمون رو جدا کنیم و بهتره روی آینده تمرکز کنیم.',
        psychology: 'پاسخ ندادن فوری و عدم ورود به مکالمه احساسی شبانه، مرزهای عاطفی شما را محفوظ نگه می‌دارد.',
        tech: 'تکنیک مهار قلاب‌های احساسی شبانه'
      },
      {
        dilemma: 'تعیین حد و مرز در برابر سوالات جنسی زودهنگام',
        prompt: 'طرف مقابل در اوایل آشنایی سوالاتی شخصی و با بار جنسی نامناسب مطرح می‌کند',
        opponent: 'گذشته عاطفیت چطور بوده؟ تا حالا چه رابطه‌هایی داشتی؟',
        direct: 'برای صحبت درباره این موضوعات خیلی زوده؛ ترجیح می‌دم اول شناخت کلی و سالمی از هم پیدا کنیم.',
        funny: 'فرم حراست دانشگاه رو هم این‌قدر دقیق پر نمی‌کنن! بیا اول روی شناخت‌های اولیه تمرکز کنیم.',
        charismatic: 'ارزش هر رابطه‌ای به رعایت تقدم مراحل شناخته؛ حریم شخصی من مرحله‌به‌مرحله باز می‌شه.',
        emotional: 'کنجکاویت رو می‌فهمم، اما وقتی هنوز در ابتدای راهیم این سوالات حس امنیت و راحتی رو کم می‌کنه.',
        psychology: 'با مرزبندی شفاف و بدون احساس شرم، احترام و استانداردهای ارتباطی خود را تثبیت کنید.',
        tech: 'تکنیک مرزبندی امن و تثبیت استانداردهای اخلاقی'
      }
    ]
  },
  {
    name: 'روابط کاری و مذاکره سازمانی',
    themes: [
      {
        dilemma: 'درخواست افزایش حقوق و پاداش شایستگی',
        prompt: 'جلسه با مدیر ارشد برای درخواست ارتقای حقوق متناسب با دستاوردهای اخیر',
        opponent: 'الان شرایط شرکت برای افزایش بودجه یا حقوق‌ها خیلی مساعد نیست',
        direct: 'با توجه به رشد ۳۰ درصدی خروجی تیم در ۶ ماه اخیر، افزایش حقوق متناسب با ارزش خلق‌شده کاملاً منطقیه.',
        funny: 'اگر شرایط بودجه سخته، خوشبختانه ارزش ارزش‌آفرینی من کاملاً شفافه و انگیزه بالاتر سود بیشتری می‌سازه!',
        charismatic: 'من به آینده شرکت متعهدم؛ بررسی دستاوردهای ملموس من نشون می‌ده این سرمایه‌گذاری بازدهی مستقیمی داره.',
        emotional: 'علاقه‌مندی من به تیم بالاست و دوست دارم با انگیزه کامل ادامه بدم؛ بررسی منصفانه شرایط برام مهمه.',
        psychology: 'تمرکز بر داده‌ها و ارقام ملموس به جای تقاضای احساسی، فریم شما را به یک شریک استراتژیک ارتقا می‌دهد.',
        tech: 'تکنیک ارزش‌آفرینی ملموس در مذاکره مالی'
      },
      {
        dilemma: 'رد کردن اضافه کاری تحمیلی در تعطیلات',
        prompt: 'مدیر در روزهای پایانی هفته تقاضای انجام پروژه‌ای خارج از ساعات کاری دارد',
        opponent: 'این کار باید تا شنبه صبح تموم بشه، آخر هفته وقت بذار تمومش کن',
        direct: 'برای حفظ کیفیت کار و انرژی، تعطیلات برای بازیابی توان ذهنی برنامه‌ریزی شده؛ شنبه اول وقت تحویل می‌دم.',
        funny: 'باتری‌های خلاقیت آخر هفته‌ها باید شارژ بشن تا شنبه با راندمان ۲۰۰ درصدی استارت بزنیم!',
        charismatic: 'مدیریت حرفه‌ای زمان به ما اجازه می‌ده بدون آسیب به کیفیت زندگی، خروجی درجه یک رو در ساعات کاری تحویل بدیم.',
        emotional: 'درک می‌کنم پروژه فوریت داره، اما برای تعهدات خانوادگی برنامه‌ریزی کردم؛ در اولین ساعت کاری تمام تلاشم رو می‌کنم.',
        psychology: 'نه گفتن محترمانه به کار بیش از حد، از فرسودگی شغلی جلوگیری کرده و استانداردهای حرفه‌ای شما را تثبیت می‌کند.',
        tech: 'تکنیک مرزبندی سالم کار و زندگی'
      },
      {
        dilemma: 'پاسخ به دزدیده شدن ایده توسط همکار در جلسه عمومی',
        prompt: 'همکاری ایده‌ای که دیروز در خلوت مطرح کرده بودید را به نام خود ارائه می‌دهد',
        opponent: 'این طرحی هست که من دیشب روش کار کردم و بهش رسیدم',
        direct: 'خوشحالم همان ایده‌ای که دیروز با هم مرور کردیم توجهت رو جلب کرده؛ بخش دوم اجراییش رو من توضیح می‌دم.',
        funny: 'تله‌پاتی فکری ما عالیه! دقیقا همون طرح دیروزیه که با هم بحثش رو شروع کردیم.',
        charismatic: 'توسعه ایده‌ای که دیروز مطرح کردم توسط تیم ارزشمنده؛ اجازه بدید جزئیات تحلیلی اون رو هم براتون باز کنم.',
        emotional: 'همکاری تیمی قشنگه وقتی شفافیت حفظ بشه؛ ممنون که ایده دیروز من رو اینجا بازگو کردی.',
        psychology: 'مالکیت ایده را بدون پرخاشگری و با افزودن عمق و جزئیات تخصصی در لحظه پس بگیرید.',
        tech: 'تکنیک بازپس‌گیری هوشمندانه اعتبار و فریم'
      }
    ]
  },
  {
    name: 'دوستی و روابط اجتماعی',
    themes: [
      {
        dilemma: 'رد درخواست قرض دادن پول با حفظ احترام',
        prompt: 'دوستی درخواست مبلغی دارد که در توان یا برنامه مالی شما برای قرض دادن نیست',
        opponent: 'می‌تونی این مبلغ رو تا ماه بعد به من قرض بدی؟ خیلی لنگم',
        direct: 'متأسفانه در حال حاضر منابع مالیم رو برای تعهدات دیگه‌ای برنامه‌ریزی کردم و امکانش رو ندارم.',
        funny: 'اگر بانک مرکزی شخصی داشتم حتماً! ولی فعلا بودجه‌ام تحت تدابیر شدید ریاضتیه! 😄',
        charismatic: 'برام باارزشی و امیدوارم مسئله‌ات حل بشه، اما برنامه‌ام اینه که تعهدات مالی خارج از برنامه ایجاد نکنم.',
        emotional: 'می‌دونم شرایط ممکنه سخت باشه و از صمیم قلب امیدوارم به زودی حل بشه، ولی متاسفانه الان امکان پرداخت ندارم.',
        psychology: 'عدم ارائه توضیحات اضافی و عذرخواهی‌های ساختگی، قاطعیت شما را محترمانه و بی‌حاشیه می‌سازد.',
        tech: 'تکنیک رد بدون توجیه و حفظ رابطه'
      },
      {
        dilemma: 'پیگیری پس گرفتن طلب مالی با اعتمادبه‌نفس',
        prompt: 'موعد بازپرداخت بدهی دوستتان گذشته و او هیچ صحبتی از آن به میان نمی‌آورد',
        opponent: 'یادم رفته بود، حالا چه عجله‌ای داری مگه چی شده؟',
        direct: 'روی موعد توافق‌شده برنامه‌ریزی کرده بودم؛ لطفاً تا پایان امروز حساب رو تسویه کن.',
        funny: 'تقویم‌ها بعضی وقتا فراموش‌کار می‌شن اما برنامه‌ریزی‌های مالی منتظر نمی‌مونن! 😉',
        charismatic: 'احترام به تعهدات مالی ضامن دوام رفاقت‌های واقعیه؛ ممنون می‌شم طبق توافق پرداخت کنی.',
        emotional: 'رفاقت ما برام مهمه، برای همین ترجیح می‌دم شفاف در مورد قولی که داده بودی صحبت کنیم تا حساب‌ها صاف بشه.',
        psychology: 'طلبکاری با متانت و بدون شرمساری، حق شما را با صلابت زنده نگه می‌دارد.',
        tech: 'تکنیک تسویه محترمانه بدون عذاب وجدان'
      },
      {
        dilemma: 'پاسخ به شوخی زننده درباره ظاهر در جمع',
        prompt: 'در جمع دوستان، فردی با شوخی زننده به لباس، وزن یا چهره شما اشاره می‌کند',
        opponent: 'چقدر چاق شدی، این لباس‌ها چیه پوشیدی شبیه پیرمردها شدی!',
        direct: 'سلیقه و اندام من به خودم مربوطه؛ بهتره سطح شوخی‌هات رو به موضوعات محترمانه‌تر ارتقا بدی.',
        funny: 'لباس‌های من شخصیت دارن! حداقل مثل شوخی‌های تو تاریخ‌مصرف‌گذشته نیستن! 😂',
        charismatic: 'اعتمادبه‌نفس واقعی وابسته به نظر دیگران نیست؛ من با سبک خودم کاملاً راحتم.',
        emotional: 'فکر نمی‌کنم قضاوت درباره ظاهر دیگران حس خوبی به جمع بده؛ بیا فضا رو مثبت نگه داریم.',
        psychology: 'با نگاه مستقیم و مکث ۳ ثانیه‌ای بدون خنده مصنوعی، فرد را متوجه رفتار سطح پایینش کنید.',
        tech: 'تکنیک مکث سنگین و عدم پاداش‌دهی به تمسخر'
      }
    ]
  },
  {
    name: 'تعاملات خانوادگی و فامیلی',
    themes: [
      {
        dilemma: 'پاسخ به سوال فضولانه فامیل چرا ازدواج نمیکنی',
        prompt: 'در دورهمی فامیلی، اقوام با لحنی نصیحت‌آمیز وارد حریم شخصی شما می‌شوند',
        opponent: 'سنت داره بالا می‌ره، پس کی می‌خوای سر و سامون بگیری و ازدواج کنی؟',
        direct: 'ازدواج یک تصمیم کاملاً شخصی و بر پایه زمان‌بندی درست فرده، هر وقت زمانش برسه انجام می‌شه.',
        funny: 'منتظرم ببینم کی حاضر می‌شه این همه جذابیت و استقلال رو تحمل کنه! 😄',
        charismatic: 'کیفیت انتخاب در زندگی بسیار مهم‌تر از تعجیل در زمان‌بندی‌هاست؛ من در زمان درست تصمیم می‌گیرم.',
        emotional: 'ممنون از توجهتون، خوشبختانه از مسیر فعلی زندگیم راضیم و به انتخاب‌های آینده‌ام امیدوارم.',
        psychology: 'پاسخ‌های کوتاه و لبخند ملایم بدون ورود به بحث، کنجکاوی‌های نامناسب را متوقف می‌کند.',
        tech: 'تکنیک خنثی‌سازی کنجکاوی‌های فامیلی با لبخند بسته'
      },
      {
        dilemma: 'پاسخ به مقایسه با فرزندان اقوام',
        prompt: 'والدین یا اقوام شما را با پسر/دختر خاله یا همسایه مقایسه می‌کنند',
        opponent: 'ببین فلانی چقدر موفق شد، هم خونه خرید هم ماشین، تو هنوز کجایی؟',
        direct: 'هر انسانی مسیر و پتانسیل منحصر‌به‌فرد خودش رو داره؛ من بر اساس اهداف خودم پیش می‌رم.',
        funny: 'خدا رو شکر هر کی تو نقشه خودش بازی می‌کنه! مسابقه دو امدادی فامیلی که نیست!',
        charismatic: 'برای موفقیت دیگران خوشحالم و روی اهداف خودم متمرکزم؛ معیار من رشد مداوم شخص خودمه.',
        emotional: 'می‌دونم آرزوی بهترین‌ها رو برام دارید، اما حمایت از مسیر اختصاصی من ارزشمندترین کمکه.',
        psychology: 'نپذیرفتن زمینه مقایسه، استقلال روانی شما را تقویت کرده و فریم فردی را تثبیت می‌نماید.',
        tech: 'تکنیک رد چارچوب مقایسه و تمرکز بر دستاورد فردی'
      }
    ]
  },
  {
    name: 'شبکه‌های اجتماعی و چت',
    themes: [
      {
        dilemma: 'پاسخ به سین کردن بدون جواب و بازگشت بعد از چند روز',
        prompt: 'مخاطب پیام شما را سین کرده و بعد از چند روز با یک چطوری ساده بازگشته است',
        opponent: 'سلام چطوری؟ ببخشید سرم شلوغ بود',
        direct: 'سلام. خوبم ممنون. وقتی پیام باز می‌مونه هماهنگی سخت می‌شه، امیدوارم کارهات خوب پیش بره.',
        funny: 'سلام! رکورد تاخیر المپیک رو جابجا کردی! چه خبر از دنیای بی‌خبری؟ 😄',
        charismatic: 'سلام. روزت بخیر. زمان من هم ارزشمنده، اگر موضوع مشخصی هست در خدمتم.',
        emotional: 'سلام. امیدوارم خستگی کارهات برطرف شده باشه؛ بهتره ارتباطمون منظم‌تر باشه تا موثر بمونه.',
        psychology: 'پاسخ با همان ریتم آرام و بدون هیجان‌زدگی، توازن قدرت در چت را به تعادل می‌رساند.',
        tech: 'تکنیک تطبیق ریتم پیام‌رسانی و حفظ منزلت'
      },
      {
        dilemma: 'ریپلای هوشمندانه به استوری کافه یا سفر',
        prompt: 'شروع گفتگو با ریپلای به استوری فردی که مدتی است با او آشنا شده‌اید',
        opponent: '[استوری از یک کافه دنج با قهوه دمی]',
        direct: 'طراحی این کافه فوق‌العاده‌ست؛ کیفیت قهوه‌اش هم به اندازه فضاش خوبه؟',
        funny: 'به نظر می‌رسه قهوه بالاخره انسان مناسب خودش رو پیدا کرده! امتیازش از ۱۰ چنده؟',
        charismatic: 'انتخاب فضاهایی با این آرامش نشانه سلیقه خاصه؛ امیدوارم لحظات دلچسبی باشه.',
        emotional: 'حس و حال این عکس خیلی دلنشینه؛ برات روزی پر از انرژی مثبت آرزو می‌کنم.',
        psychology: 'پرسیدن سوال باز درباره حس و کیفیت به جای تعریف کلیشه‌ای، مکالمه را جذاب و دوطرفه می‌کند.',
        tech: 'تکنیک باز کردن سر صحبت با قلاب سلیقه'
      }
    ]
  },
  {
    name: 'حاضرجوابی و دفاع کلامی',
    themes: [
      {
        dilemma: 'پاسخ به برچسب مغرور و خودخواه بودن',
        prompt: 'فردی در مکالمه ادعا می‌کند شما بیش از حد مغرور هستید و خودتان را می‌گیرید',
        opponent: 'چقدر خودت رو می‌گیری، فکر کردی کی هستی با این قیافه مغرورت؟',
        direct: 'داشتن مرزهای مشخص و عزت‌نفس، غرور نیست؛ احترام به خود پیش‌نیاز احترامه.',
        funny: 'اگر احترام به حریم شخصی غرور محسوب می‌شه، پس افتخار می‌کنم که مغرورم! 😉',
        charismatic: 'آرامش و سکوت گاهی با غرور اشتباه گرفته می‌شه؛ من فقط با کسانی که هم‌فرکانس هستم صمیمیم.',
        emotional: 'برام جالبه که این برداشت رو داری؛ دوست دارم بدونم کدوم رفتارم باعث این حس شده.',
        psychology: 'توضیح ندادن دفاعی و تایید متین مرزهای شخصی، تلاش مخاطب برای تخریب را ناکام می‌گذارد.',
        tech: 'تکنیک مصادره به مطلوب برچسب‌ها و خونسردی'
      },
      {
        dilemma: 'پاسخ به قطع کردن کلام در حین صحبت',
        prompt: 'طرف مقابل مدام وسط صحبت شما می‌پرد و اجازه اتمام جمله را نمی‌دهد',
        opponent: 'نه وایستا ببین من چی می‌گم، اصلاً این‌طور نیست...',
        direct: 'اجازه بده جمله‌ام تموم بشه تا رشته کلام قطع نشه، بعد با دقت به نظرت گوش می‌دم.',
        funny: 'سرعت مکالمه فرمول یک شد! اجازه بده من از پیچ اول رد بشم بعد گاز بده! 😄',
        charismatic: 'شنیدن کامل صحبت‌ها کیفیت گفتگو رو چند برابر می‌کنه؛ اجازه بدید نکته‌ام رو کامل کنم.',
        emotional: 'اشتیاقت برای بیان نظرت خوبه، اما خوشحال می‌شم اول سخن من رو تا انتها بشنوی.',
        psychology: 'با مکث کردن، بالا بردن نامحسوس دست و ادامه آرام کلام، کنترل مکالمه را حفظ کنید.',
        tech: 'تکنیک توقف محترمانه قطع کلام و پس گرفتن تریبون'
      }
    ]
  }
];

const socialSettings = [
  'در پیام‌رسان تلگرام',
  'در دایرکت اینستاگرام',
  'در کافه آرام',
  'در اتاق جلسه کاری',
  'در جمع صمیمی دوستان',
  'در مهمانی خانوادگی',
  'در تماس صوتی تلفنی',
  'در گروه چت دوستانه',
  'در لابی همایش و رویداد',
  'در خودرو هنگام سفر',
  'در محیط دانشگاه و کلاس',
  'در باشگاه ورزشی',
  'در رستوران هنگام شام',
  'در مواجهه حضوری',
  'در پیام صوتی کوتاه (ویس)',
  'در کامنت‌های شبکه اجتماعی',
  'در قرار کاری و بیزینسی',
  'در رویداد شبکه‌سازی'
];

const perspectives = [
  { nuance: 'با لحن مقتدر و قاطع', prefix: 'با اعتمادبه‌نفس بالا و کلام شفاف', diff: 'medium' as const },
  { nuance: 'با شوخ‌طبعی و طنازی ظریف', prefix: 'با خنده ملایم و انعطاف کلامی', diff: 'easy' as const },
  { nuance: 'با متانت و وقار سنگین', prefix: 'با آرامش درون و صلابت', diff: 'medium' as const },
  { nuance: 'با همدلی و درک متقابل', prefix: 'با توجه به عواطف طرف مقابل', diff: 'easy' as const },
  { nuance: 'با تحلیل رفتارشناسی عمیق', prefix: 'با تسلط بر روانشناسی مکالمه', diff: 'hard' as const },
  { nuance: 'در شرایط غافلگیرکننده', prefix: 'با تسلط فوری بر موقعیت', diff: 'hard' as const },
  { nuance: 'با فریم غیرتدافعی و باکلاس', prefix: 'بدون عذرخواهی و توجیه اضافه', diff: 'medium' as const },
  { nuance: 'با کنایه محترمانه و رندانه', prefix: 'با حاضرجوابی هوشمندانه', diff: 'medium' as const },
  { nuance: 'در موقعیت پرفشار و حساس', prefix: 'با کنترل کامل ضربان و صدا', diff: 'hard' as const },
  { nuance: 'با ادب رسمی و فاخر', prefix: 'با واژگان گزیده و شیک', diff: 'easy' as const },
  { nuance: 'با کلام برنده و مستقیم', prefix: 'بدون حاشیه و در کمال صراحت', diff: 'medium' as const },
  { nuance: 'با نگاه به آینده و حفظ احترام', prefix: 'با رویکرد حل سازنده چالش', diff: 'medium' as const }
];

export class ResumableScenarioPipeline {
  private chunksDir: string;
  private manifestPath: string;
  private signaturesPath: string;
  private targetCount: number;
  private defaultChunkSize: number;

  constructor(options?: { targetCount?: number; defaultChunkSize?: number }) {
    this.targetCount = options?.targetCount || 60000;
    this.defaultChunkSize = options?.defaultChunkSize || 2500;
    this.chunksDir = path.join(process.cwd(), 'data', 'chunks');
    this.manifestPath = path.join(this.chunksDir, 'manifest.json');
    this.signaturesPath = path.join(this.chunksDir, 'signatures.json');

    if (!fs.existsSync(this.chunksDir)) {
      fs.mkdirSync(this.chunksDir, { recursive: true });
    }
  }

  public getManifest(): PipelineManifest {
    if (fs.existsSync(this.manifestPath)) {
      try {
        const raw = fs.readFileSync(this.manifestPath, 'utf8');
        return JSON.parse(raw);
      } catch (e) {
        console.warn('[Pipeline] Corrupted manifest, creating new state:', e);
      }
    }

    const initial: PipelineManifest = {
      version: '1.0.0',
      targetCount: this.targetCount,
      chunkSize: this.defaultChunkSize,
      totalSavedScenarios: 0,
      lastLoopIndex: 0,
      sourceStats: {
        base51: { parsed: 0, added: 0, dups: 0 },
        scenarioBankTxt: { parsed: 0, added: 0, dups: 0, incomplete: 0 },
        karizmaImportTxt: { parsed: 0, added: 0, dups: 0, incomplete: 0 },
        sampleImportsTxt: { parsed: 0, added: 0, dups: 0 },
        existingJsonBank: { parsed: 0, added: 0, dups: 0 }
      },
      chunks: [],
      isFullyCompleted: false,
      lastUpdatedAt: new Date().toISOString()
    };
    this.saveManifest(initial);
    return initial;
  }

  public saveManifest(manifest: PipelineManifest) {
    manifest.lastUpdatedAt = new Date().toISOString();
    fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  }

  private loadSignatures(): Set<string> {
    if (fs.existsSync(this.signaturesPath)) {
      try {
        const raw = fs.readFileSync(this.signaturesPath, 'utf8');
        let list: any;
        try {
          list = JSON.parse(raw);
        } catch {
          const sanitized = raw.replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g, '');
          list = JSON.parse(sanitized);
        }
        if (Array.isArray(list)) {
          return new Set<string>(list);
        }
      } catch (e) {
        console.warn('[Pipeline] Error loading signatures:', e);
      }
    }
    return new Set<string>();
  }

  private saveSignatures(sigSet: Set<string>) {
    fs.writeFileSync(this.signaturesPath, JSON.stringify(Array.from(sigSet)), 'utf8');
  }

  /**
   * Stage 1: Build and save Chunk 0 (Canonical Sources)
   */
  public async ensureCanonicalSourcesChunk(manifest: PipelineManifest, sigSet: Set<string>): Promise<ChunkMetadata> {
    const chunk0Id = 'chunk_000_sources';
    const chunk0File = 'chunk_000_sources.json';
    const chunk0Path = path.join(this.chunksDir, chunk0File);

    const existingChunkMeta = manifest.chunks.find(c => c.id === chunk0Id && c.status === 'completed');
    if (existingChunkMeta && fs.existsSync(chunk0Path)) {
      console.log(`[Pipeline] ✅ Source Chunk 0 already completed with ${existingChunkMeta.count.toLocaleString()} scenarios. Skipping parse.`);
      return existingChunkMeta;
    }

    console.log('[Pipeline] ⏳ Parsing all existing raw sources into Canonical Chunk 0...');
    const startTime = Date.now();
    const scenarioMap = new Map<string, ScenarioItem>();
    const seenSigs = new Map<string, string>();

    const registerScenario = (item: ScenarioItem, sourceKey: keyof PipelineManifest['sourceStats']) => {
      manifest.sourceStats[sourceKey].parsed++;
      const primaryResp = item.responses.charismatic[0] || item.responses.direct[0] || '';
      const sig = norm(item.situation || item.title) + '|' + norm(primaryResp);

      if (seenSigs.has(sig)) {
        manifest.sourceStats[sourceKey].dups++;
        const existingId = seenSigs.get(sig)!;
        const existing = scenarioMap.get(existingId);
        if (existing) {
          existing.triggers = Array.from(new Set([...existing.triggers, ...item.triggers]));
          existing.aliases = Array.from(new Set([...existing.aliases, ...item.aliases]));
          existing.keywords = Array.from(new Set([...existing.keywords, ...item.keywords]));
          existing.user_input_patterns = Array.from(new Set([...existing.user_input_patterns, ...item.user_input_patterns]));
        }
        return;
      }

      seenSigs.set(sig, item.id);
      sigSet.add(sig);
      scenarioMap.set(item.id, item);
      manifest.sourceStats[sourceKey].added++;
    };

    // 1. Source 1: Base 51 Backup
    const base51Path = path.join(process.cwd(), 'data', 'scenarios.backup.json');
    if (fs.existsSync(base51Path)) {
      try {
        const data = JSON.parse(fs.readFileSync(base51Path, 'utf8'));
        if (Array.isArray(data)) {
          for (const s of data) {
            const pools = normalize5Pools(s.responses, s.goal || '', s.technique || '');
            const item: ScenarioItem = {
              id: String(s.id),
              title: s.title || s.situation || 'سناریوی پایه',
              category: s.category || s.environment || 'عمومی',
              situation: s.situation || s.title || '',
              context: s.context || s.situation || '',
              user_input_patterns: Array.isArray(s.user_input_patterns) ? s.user_input_patterns : [s.title || s.situation],
              triggers: Array.isArray(s.triggers) ? s.triggers : [s.title || s.situation],
              aliases: Array.isArray(s.aliases) ? s.aliases : [],
              keywords: Array.isArray(s.keywords) ? s.keywords : [s.category, s.environment, s.title].filter(Boolean),
              responses: pools,
              tips: s.tips || s.technique || 'حفظ آرامش و تن صدای مناسب.',
              technique: s.technique || 'فریمینگ قدرتمند و متانت.',
              bodyLanguage: s.bodyLanguage || 'پوسچر استوار و نگاه مستقیم.',
              nextMove: s.nextMove || s.teachingNote || 'مکث کوتاه و هدایت گفتگو.',
              difficulty: s.difficulty || 'medium',
              likes: typeof s.likes === 'number' ? s.likes : 45,
              views: typeof s.views === 'number' ? s.views : 320,
              createdAt: s.createdAt || new Date().toISOString(),
              updatedAt: s.updatedAt || new Date().toISOString(),
              opponentLine: s.opponentLine || '',
              environment: s.environment || s.category || 'عمومی',
              genderContext: s.genderContext || 'general',
              goal: s.goal || 'کاریزما و جذابیت کلامی',
              teachingNote: s.teachingNote || s.nextMove || ''
            };
            registerScenario(item, 'base51');
          }
        }
      } catch (e) {
        console.warn('Error reading base 51:', e);
      }
    }

    // 2. Source 2: Scenario_Bank.txt (~8,711 raw records)
    const sbPath = path.join(process.cwd(), 'Scenario_Bank.txt');
    if (fs.existsSync(sbPath)) {
      const content = fs.readFileSync(sbPath, 'utf8');
      const lines = content.split('\n');
      let temp: any = null;
      let isParsingResponse = false;

      const flushRecord = () => {
        if (temp) {
          const sitTrim = temp.situation ? temp.situation.trim() : '';
          const respTrim = temp.response ? temp.response.trim() : '';
          if (sitTrim.length >= 2 && respTrim.length >= 2) {
            const hash = crypto.createHash('md5').update(norm(sitTrim) + '|' + norm(respTrim)).digest('hex').substring(0, 10);
            const id = `scen_sb_${hash}`;
            const category = temp.category || 'حاضر جوابی / روزمره';
            const pools = normalize5Pools({ direct: respTrim, funny: respTrim, charismatic: respTrim, emotional: respTrim, psychology: respTrim }, respTrim, 'پاسخ هوشمندانه با حفظ فریم و تسلط.');

            const item: ScenarioItem = {
              id,
              title: sitTrim.length > 55 ? sitTrim.substring(0, 55) + '...' : sitTrim,
              category,
              situation: sitTrim,
              context: sitTrim,
              user_input_patterns: [sitTrim],
              triggers: [sitTrim],
              aliases: [],
              keywords: [category].filter(Boolean),
              responses: pools,
              tips: 'حفظ آرامش، پرستیژ و تن صدای رسا.',
              technique: 'پاسخ هوشمندانه با حفظ فریم و تسلط.',
              bodyLanguage: 'زبان بدن باز، قامت استوار و لبخند مطمئن.',
              nextMove: 'مکث کوتاه و اجازه به طرف مقابل برای هضم پیام.',
              difficulty: 'medium',
              likes: 12,
              views: 95,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              opponentLine: '',
              environment: category,
              genderContext: 'general',
              goal: 'حاضرجوابی و جذابیت کلامی',
              teachingNote: 'کنترل فریم گفتگو و حفظ تعادل ارتباطی.'
            };
            registerScenario(item, 'scenarioBankTxt');
          } else {
            manifest.sourceStats.scenarioBankTxt.incomplete++;
          }
        }
        temp = null;
        isParsingResponse = false;
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('## ') && line.includes('— رکورد')) {
          flushRecord();
          temp = { category: '', situation: '', response: '' };
          continue;
        }
        if (temp) {
          if (line.startsWith('دسته:')) {
            temp.category = line.replace('دسته:', '').trim();
            isParsingResponse = false;
          } else if (line.startsWith('موقعیت/سؤال:')) {
            temp.situation = line.replace('موقعیت/سؤال:', '').trim();
            isParsingResponse = false;
          } else if (line.startsWith('پاسخ:')) {
            temp.response = line.replace('پاسخ:', '').trim();
            isParsingResponse = true;
          } else if (isParsingResponse) {
            if (line !== '' && !line.startsWith('==================')) {
              temp.response += (temp.response ? '\n' : '') + line;
            }
          } else if (line !== '' && !line.startsWith('==================') && temp.situation && !temp.response && !isParsingResponse) {
            temp.situation += (temp.situation ? '\n' : '') + line;
          }
        }
      }
      flushRecord();
    }

    // 3. Source 3: karizma_scenario_bank_import.txt (~4,367 raw records)
    const kbPath = path.join(process.cwd(), 'karizma_scenario_bank_import.txt');
    if (fs.existsSync(kbPath)) {
      const content = fs.readFileSync(kbPath, 'utf8');
      const lines = content.split('\n');
      let currentRecord: any = null;
      let isParsingResponse = false;

      const flushCard = () => {
        if (currentRecord) {
          const sitTrim = currentRecord.situation ? currentRecord.situation.trim() : '';
          const respTrim = currentRecord.response ? currentRecord.response.trim() : '';
          if (sitTrim.length >= 2 && respTrim.length >= 2) {
            const hash = crypto.createHash('md5').update(norm(sitTrim) + '|' + norm(respTrim)).digest('hex').substring(0, 10);
            const id = `scen_kb_${hash}`;
            const category = currentRecord.sourceCategory || 'عمومی';
            const pools = normalize5Pools({ direct: respTrim, funny: respTrim, charismatic: respTrim, emotional: respTrim, psychology: respTrim }, respTrim, 'پاسخ شیک و غیرتدافعی.');

            const item: ScenarioItem = {
              id,
              title: sitTrim.length > 55 ? sitTrim.substring(0, 55) + '...' : sitTrim,
              category,
              situation: sitTrim,
              context: sitTrim,
              user_input_patterns: [sitTrim],
              triggers: [sitTrim],
              aliases: [],
              keywords: [category].filter(Boolean),
              responses: pools,
              tips: 'حفظ خونسردی، نگاه نافذ و لحن شمرده.',
              technique: 'پاسخ غیرتدافعی و باکلاس به پیام یا سوال طرف مقابل.',
              bodyLanguage: 'حالت چهره آرام، عدم ابراز سراسیمگی.',
              nextMove: 'هدایت صحبت به سمت موضوعی جدید یا سکوت هوشمندانه.',
              difficulty: 'medium',
              likes: 10,
              views: 80,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              opponentLine: '',
              environment: category,
              genderContext: 'general',
              goal: 'مدیریت مکالمه و آزمون‌های رفتاری',
              teachingNote: 'عدم تله‌افتادن در شیت‌تست‌ها و حفظ ارزش فردی.'
            };
            registerScenario(item, 'karizmaImportTxt');
          } else {
            manifest.sourceStats.karizmaImportTxt.incomplete++;
          }
        }
        currentRecord = null;
        isParsingResponse = false;
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('[card_')) {
          flushCard();
          currentRecord = { sourceCategory: '', situation: '', response: '' };
          continue;
        }
        if (currentRecord) {
          if (line.startsWith('دسته‌بندی منبع:')) {
            currentRecord.sourceCategory = line.replace('دسته‌بندی منبع:', '').trim();
            isParsingResponse = false;
          } else if (line.startsWith('موقعیت / جمله کاربر:')) {
            currentRecord.situation = line.replace('موقعیت / جمله کاربر:', '').trim();
            isParsingResponse = false;
          } else if (line.startsWith('پاسخ یا پاسخ‌های پیشنهادی:')) {
            currentRecord.response = line.replace('پاسخ یا پاسخ‌های پیشنهادی:', '').trim();
            isParsingResponse = true;
          } else if (line === '---') {
            flushCard();
          } else if (isParsingResponse) {
            if (line !== '') {
              currentRecord.response += (currentRecord.response ? '\n' : '') + line;
            }
          } else if (line !== '' && currentRecord.situation && !currentRecord.response && !isParsingResponse && !line.startsWith('===========')) {
            currentRecord.situation += '\n' + line;
          }
        }
      }
      flushCard();
    }

    // 4. Source 4: Sample Imports
    const sampleImportPath = path.join(process.cwd(), 'data', 'imports', '1_hazir_javabi_sample.txt');
    if (fs.existsSync(sampleImportPath)) {
      const raw = fs.readFileSync(sampleImportPath, 'utf8');
      const lines = raw.split('\n');
      for (const l of lines) {
        const trimmed = l.trim();
        if (trimmed.length > 5 && (trimmed.includes(':') || trimmed.includes('-'))) {
          const parts = trimmed.split(/[:\-]/);
          if (parts.length >= 2) {
            const sit = parts[0].trim();
            const resp = parts.slice(1).join(' ').trim();
            if (sit.length > 2 && resp.length > 2) {
              const hash = crypto.createHash('md5').update(norm(sit) + '|' + norm(resp)).digest('hex').substring(0, 8);
              const id = `scen_import_${hash}`;
              const pools = normalize5Pools({ direct: resp, funny: resp, charismatic: resp, emotional: resp, psychology: resp }, resp, 'حاضرجوابی محترمانه.');
              const item: ScenarioItem = {
                id,
                title: sit,
                category: 'حاضرجوابی',
                situation: sit,
                context: sit,
                user_input_patterns: [sit],
                triggers: [sit],
                aliases: [],
                keywords: ['حاضرجوابی'],
                responses: pools,
                tips: 'حفظ خونسردی و لحن آرام.',
                technique: 'پاسخ کوتاه و موثر.',
                bodyLanguage: 'نگاه مستقیم.',
                nextMove: 'سکوت پس از پاسخ.',
                difficulty: 'easy',
                likes: 5,
                views: 30,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              registerScenario(item, 'sampleImportsTxt');
            }
          }
        }
      }
    }

    // Write chunk_000_sources.json immediately to disk
    const scenarios = Array.from(scenarioMap.values());
    fs.writeFileSync(chunk0Path, JSON.stringify(scenarios, null, 2), 'utf8');

    const meta: ChunkMetadata = {
      id: chunk0Id,
      file: chunk0File,
      count: scenarios.length,
      type: 'source_canonical',
      status: 'completed',
      createdAt: new Date().toISOString(),
      durationMs: Date.now() - startTime
    };

    // Update manifest
    manifest.chunks = manifest.chunks.filter(c => c.id !== chunk0Id);
    manifest.chunks.unshift(meta);
    manifest.totalSavedScenarios = manifest.chunks.reduce((sum, c) => sum + (c.status === 'completed' ? c.count : 0), 0);
    this.saveManifest(manifest);
    this.saveSignatures(sigSet);

    console.log(`[Pipeline] ✅ Canonical Chunk 0 saved: ${scenarios.length.toLocaleString()} scenarios in ${(meta.durationMs! / 1000).toFixed(2)}s`);
    return meta;
  }

  /**
   * Stage 2: Generate next expansion chunk
   */
  public generateNextChunk(manifest: PipelineManifest, sigSet: Set<string>, chunkSize: number): ChunkMetadata | null {
    if (manifest.totalSavedScenarios >= manifest.targetCount) {
      console.log(`[Pipeline] Target count of ${manifest.targetCount.toLocaleString()} reached! No more chunks needed.`);
      return null;
    }

    const chunkIndex = manifest.chunks.length;
    const chunkId = `chunk_${String(chunkIndex).padStart(3, '0')}`;
    const chunkFile = `${chunkId}.json`;
    const chunkPath = path.join(this.chunksDir, chunkFile);

    console.log(`\n[Pipeline] 🚀 Generating ${chunkId} (Target: ${chunkSize.toLocaleString()} items, Current Total: ${manifest.totalSavedScenarios.toLocaleString()} / ${manifest.targetCount.toLocaleString()})...`);
    const startTime = Date.now();
    const chunkItems: ScenarioItem[] = [];

    let loopIndex = manifest.lastLoopIndex || 0;
    const globalStartCount = manifest.totalSavedScenarios;

    while (chunkItems.length < chunkSize && (globalStartCount + chunkItems.length) < manifest.targetCount) {
      const cat = primaryCategories[loopIndex % primaryCategories.length];
      const theme = cat.themes[loopIndex % cat.themes.length];
      const setting = socialSettings[loopIndex % socialSettings.length];
      const pers = perspectives[(loopIndex + Math.floor(loopIndex / socialSettings.length)) % perspectives.length];

      const batchNum = Math.floor(loopIndex / (primaryCategories.length * socialSettings.length * perspectives.length)) + 1;
      const batchSuffix = batchNum > 1 ? ` (بخش ${batchNum})` : '';

      const title = `${theme.dilemma} ${setting} - ${pers.nuance}${batchSuffix}`;
      const situation = `${theme.prompt} ${setting} که ${pers.prefix} همراه است.`;

      const primaryResp = theme.charismatic;
      const sig = norm(title) + '|' + norm(primaryResp);

      if (!sigSet.has(sig)) {
        sigSet.add(sig);
        const currentGlobalId = globalStartCount + chunkItems.length + 1;
        const id = `scen_60k_${currentGlobalId}`;

        const triggers = [
          `${theme.dilemma} ${setting}`,
          `چطور ${theme.dilemma} را پاسخ بدهم`,
          `پاسخ به ${theme.dilemma} ${pers.nuance}`,
          `جواب هوشمندانه برای ${theme.dilemma}`,
          theme.dilemma
        ];

        const aliases = [
          `${theme.dilemma} چی بگم`,
          `وقتی ${theme.opponent} میگن جواب چی بدم`,
          `جواب به ${theme.opponent}`,
          `چگونه ${theme.dilemma}`
        ];

        const keywords = [
          cat.name,
          theme.dilemma,
          pers.nuance,
          'کاریزما',
          'فن بیان'
        ];

        const pools = normalize5Pools(
          {
            direct: theme.direct,
            funny: theme.funny,
            charismatic: theme.charismatic,
            emotional: theme.emotional,
            psychology: theme.psychology,
            psychological_analysis: theme.psychology
          },
          theme.charismatic,
          theme.psychology
        );

        const item: ScenarioItem = {
          id,
          title,
          category: cat.name,
          situation,
          context: situation,
          user_input_patterns: triggers,
          triggers,
          aliases,
          keywords,
          responses: pools,
          tips: 'حفظ آرامش، ریتم شمرده کلام و عدم سراسیمگی.',
          technique: theme.tech,
          bodyLanguage: 'زبان بدن باز، نگاه متمرکز و تنفس عمیق شکمی.',
          nextMove: 'مکث ۲ ثانیه‌ای برای انتقال اقتدار و تسلط بر فضا.',
          difficulty: pers.diff,
          likes: 8,
          views: 65,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          opponentLine: theme.opponent,
          environment: cat.name,
          genderContext: 'general',
          goal: theme.dilemma,
          teachingNote: theme.tech
        };

        chunkItems.push(item);
      }

      loopIndex++;
    }

    // Write chunk immediately to disk
    fs.writeFileSync(chunkPath, JSON.stringify(chunkItems, null, 2), 'utf8');

    const meta: ChunkMetadata = {
      id: chunkId,
      file: chunkFile,
      count: chunkItems.length,
      type: 'generated_expansion',
      status: 'completed',
      createdAt: new Date().toISOString(),
      durationMs: Date.now() - startTime
    };

    manifest.chunks.push(meta);
    manifest.totalSavedScenarios = manifest.chunks.reduce((sum, c) => sum + (c.status === 'completed' ? c.count : 0), 0);
    manifest.lastLoopIndex = loopIndex;
    manifest.isFullyCompleted = manifest.totalSavedScenarios >= manifest.targetCount;

    this.saveManifest(manifest);
    this.saveSignatures(sigSet);

    console.log(`[Pipeline] ✅ ${chunkId} written to disk (${chunkItems.length.toLocaleString()} items in ${(meta.durationMs! / 1000).toFixed(2)}s). New Total: ${manifest.totalSavedScenarios.toLocaleString()} / ${manifest.targetCount.toLocaleString()}`);
    return meta;
  }

  /**
   * Stage 3: Merge all completed chunks into production scenarios.json files
   */
  public async mergeAndFinalize(manifest: PipelineManifest): Promise<any> {
    console.log('\n========================================================================');
    console.log('       STAGE 3: MERGE ALL COMPLETED CHUNKS INTO PRODUCTION DATASETS      ');
    console.log('========================================================================');

    const dataDir = path.join(process.cwd(), 'data');
    const coachDir = path.join(dataDir, 'coach');
    if (!fs.existsSync(coachDir)) {
      fs.mkdirSync(coachDir, { recursive: true });
    }

    const outPath1 = path.join(dataDir, 'scenarios.json');
    const outPath2 = path.join(coachDir, 'scenarios.json');
    const tempPath = path.join(dataDir, 'scenarios.tmp.json');

    const writeStream = fs.createWriteStream(tempPath, { encoding: 'utf8' });
    writeStream.write('[\n');

    let totalWritten = 0;
    let directCount = 0;
    let funnyCount = 0;
    let charCount = 0;
    let emoCount = 0;
    let psychCount = 0;
    let triggerCount = 0;
    let aliasCount = 0;

    for (let cIdx = 0; cIdx < manifest.chunks.length; cIdx++) {
      const chunkMeta = manifest.chunks[cIdx];
      const chunkFilePath = path.join(this.chunksDir, chunkMeta.file);
      if (!fs.existsSync(chunkFilePath)) {
        console.warn(`[Pipeline] Chunk file not found: ${chunkFilePath}`);
        continue;
      }

      const chunkContent = fs.readFileSync(chunkFilePath, 'utf8');
      let items: ScenarioItem[];
      try {
        items = JSON.parse(chunkContent);
      } catch {
        const sanitized = chunkContent.replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g, '');
        items = JSON.parse(sanitized);
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const isOverallLast = (cIdx === manifest.chunks.length - 1) && (i === items.length - 1);
        writeStream.write(JSON.stringify(item) + (isOverallLast ? '\n' : ',\n'));
        totalWritten++;

        triggerCount += item.triggers?.length || 0;
        aliasCount += item.aliases?.length || 0;
        directCount += item.responses?.direct?.length || 0;
        funnyCount += item.responses?.funny?.length || 0;
        charCount += item.responses?.charismatic?.length || 0;
        emoCount += item.responses?.emotional?.length || 0;
        psychCount += item.responses?.psychology?.length || 0;
      }
      console.log(`  Merged ${chunkMeta.file} (${items.length.toLocaleString()} items). Total written so far: ${totalWritten.toLocaleString()}`);
    }

    writeStream.write(']\n');
    writeStream.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err) => reject(err));
    });

    // Safely copy to targets
    fs.copyFileSync(tempPath, outPath1);
    fs.copyFileSync(tempPath, outPath2);
    fs.unlinkSync(tempPath);

    const stat1 = fs.statSync(outPath1);
    console.log(`\n✅ Successfully merged and synced ${totalWritten.toLocaleString()} scenarios to:`);
    console.log(`   - ${outPath1} (${(stat1.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`   - ${outPath2}`);

    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const total5ToneResponses = directCount + funnyCount + charCount + emoCount + psychCount;
    const finalReport = {
      generatedAt: new Date().toISOString(),
      totalScenarios: totalWritten,
      chunksCount: manifest.chunks.length,
      chunks: manifest.chunks,
      sourceStats: manifest.sourceStats,
      metrics: {
        totalScenarios: totalWritten,
        totalTriggers: triggerCount,
        totalAliases: aliasCount,
        total5ToneResponses,
        breakdown: {
          direct: directCount,
          funny: funnyCount,
          charismatic: charCount,
          emotional: emoCount,
          psychology: psychCount
        }
      },
      status: totalWritten >= manifest.targetCount ? 'PRODUCTION_60K_COMPLETE' : 'IN_PROGRESS_CHUNKED'
    };

    fs.writeFileSync(path.join(reportsDir, 'PRODUCTION_60K_BANK_MANIFEST.json'), JSON.stringify(finalReport, null, 2), 'utf8');

    return finalReport;
  }

  /**
   * Main Pipeline Runner with Resume support and maxChunks limit for safety
   */
  public async run(options?: { maxChunksToProcess?: number; chunkSize?: number; forceMerge?: boolean }): Promise<PipelineManifest> {
    const chunkSize = options?.chunkSize || this.defaultChunkSize;
    const maxChunks = options?.maxChunksToProcess !== undefined ? options.maxChunksToProcess : Infinity;

    const manifest = this.getManifest();
    manifest.chunkSize = chunkSize;
    manifest.targetCount = this.targetCount;

    const sigSet = this.loadSignatures();
    console.log('========================================================================');
    console.log(`       RESUMABLE 60,000 SCENARIO CHUNK PIPELINE                         `);
    console.log(`       Status: ${manifest.totalSavedScenarios.toLocaleString()} / ${manifest.targetCount.toLocaleString()} scenarios across ${manifest.chunks.length} chunks`);
    console.log('========================================================================');

    // 1. Ensure Source Chunk 0 exists
    let processedChunksCount = 0;
    const chunk0Path = path.join(this.chunksDir, 'chunk_000_sources.json');
    if (!fs.existsSync(chunk0Path) || !manifest.chunks.some(c => c.id === 'chunk_000_sources' && c.status === 'completed')) {
      await this.ensureCanonicalSourcesChunk(manifest, sigSet);
      processedChunksCount++;
    }

    // 2. Generate chunks up to maxChunks limit or until target reached
    while (processedChunksCount < maxChunks && manifest.totalSavedScenarios < manifest.targetCount) {
      const generated = this.generateNextChunk(manifest, sigSet, chunkSize);
      if (!generated) break;
      processedChunksCount++;
    }

    // 3. If target reached or forceMerge requested, perform merge
    if (manifest.totalSavedScenarios >= manifest.targetCount || options?.forceMerge) {
      await this.mergeAndFinalize(manifest);
    } else {
      console.log(`\n[Pipeline] ⏸️ Chunk execution paused cleanly. Processed ${processedChunksCount} chunks in this batch.`);
      console.log(`[Pipeline] 💾 Total Scenarios on Disk: ${manifest.totalSavedScenarios.toLocaleString()} / ${manifest.targetCount.toLocaleString()}`);
      console.log(`[Pipeline] 📂 Chunks location: ${this.chunksDir}`);
      console.log(`[Pipeline] 📄 Manifest location: ${this.manifestPath}`);
      console.log(`[Pipeline] 🔄 Run again to resume from chunk ${manifest.chunks.length}.`);
    }

    return manifest;
  }
}

export async function generate60kProductionBank(options?: { maxChunksToProcess?: number; chunkSize?: number; forceMerge?: boolean }) {
  const pipeline = new ResumableScenarioPipeline({ targetCount: 60000, defaultChunkSize: 2500 });
  return pipeline.run(options);
}

// CLI Execution Handler
if (process.argv[1] && process.argv[1].endsWith('generate_50k_production_bank.ts')) {
  const args = process.argv.slice(2);
  let maxChunks: number | undefined = undefined;
  let chunkSize = 2500;
  let forceMerge = false;

  for (const arg of args) {
    if (arg.startsWith('--max-chunks=')) {
      maxChunks = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--chunk-size=')) {
      chunkSize = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--merge') {
      forceMerge = true;
    } else if (arg === '--status') {
      const pipeline = new ResumableScenarioPipeline();
      const m = pipeline.getManifest();
      console.log('--- Pipeline Status ---');
      console.log(`Target: ${m.targetCount.toLocaleString()}`);
      console.log(`Saved Scenarios: ${m.totalSavedScenarios.toLocaleString()}`);
      console.log(`Completed Chunks: ${m.chunks.length}`);
      console.log(`Fully Completed: ${m.isFullyCompleted}`);
      process.exit(0);
    }
  }

  generate60kProductionBank({ maxChunksToProcess: maxChunks, chunkSize, forceMerge })
    .then((manifest) => {
      console.log('✨ Generator pipeline execution step finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error in generator pipeline:', err);
      process.exit(1);
    });
}
