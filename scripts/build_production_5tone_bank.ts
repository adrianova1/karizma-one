import fs from 'fs';
import path from 'path';

export interface EnrichedScenarioWithPools {
  id: string;
  title: string;
  category: string;
  situation: string;
  context?: string;
  user_input_patterns?: string[];
  triggers: string[];
  aliases: string[];
  keywords: string[];
  responses: {
    direct: string[];
    funny: string[];
    charismatic: string[];
    emotional: string[];
    psychology: string[];
    // Legacy / Backward compatibility fields
    charismatic_single?: string;
    confident: string[];
    friendly: string[];
    mysterious: string[];
    mature: string[];
    tone_1: string[];
    tone_2: string[];
    tone_3: string[];
    tone_4: string[];
    tone_5: string[];
    psychological_analysis: string;
    [key: string]: any;
  };
  tips?: string;
  technique?: string;
  bodyLanguage?: string;
  nextMove?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  likes?: number;
  views?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

function cleanResponseText(text: string): string {
  if (!text) return '';
  return text
    .replace(/^[⚡💎📌✨🔥🎯»«"\s\-\*•\d\.\:\(\)]+/, '')
    .replace(/[»«"\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Identify semantic cluster of scenario
 */
function getCluster(situation: string, category: string, baseResp: string): string {
  const combined = (situation + ' ' + category + ' ' + baseResp).toLowerCase();

  if (/ترکی|تورکی|ساغول|یاشا|گوزل|جانیم|قارداش/i.test(combined)) return 'turkish';
  if (/ولنتاین|کراش|سینگل|رل|پارتنر|عاشق|دوست داشتن|خواستگار|ازدواج|عقد/i.test(combined)) return 'love_dating';
  if (/اهل رابطه نیستم|رابطه نیستم|کات|فرندزون|دوست معمولی|وقت ندارم|تموم کنیم/i.test(combined)) return 'boundary_rejection';
  if (/دیر جواب|سین کردی|سین کرد|جواب نداد|پیام نداد|آنلاین بود|چرا جواب|بی محلی|سرد شدی|چرا سین|بلاک/i.test(combined)) return 'late_reply_ghosting';
  if (/تو کی هستی|شما|نشناختم|کی بهت شماره|از کجا آوردی|شماره منو|به چه حقی|چرا پیام دادی|اسمت چیه/i.test(combined)) return 'identity_challenge';
  if (/خوشگل|جذاب|خوشتیپ|زبون ریختن|دلبری|چقدر نازی|استایلت|خوش‌تیپ|قشنگ/i.test(combined)) return 'flirting_compliment';
  if (/شیت تست|شت تست|امتحان|تست|کل کل|گیر دادن|زرنگ/i.test(combined)) return 'shit_test';
  if (/توهین|چاق|لاغر|زشت|مسخره|بی ادب|مغرور|پز|پررو|کنایه|تیکه|طعنه|تحقیر|فحش|فضول/i.test(combined)) return 'insult_sarcasm';
  if (/استوری|پست|ریپلای|عکس|پروفایل|اینستا/i.test(combined)) return 'story_reply';
  if (/قرار|کافه|دیدن|بیرون|قهوه|بریم|ملاقات|حضوری|دعوت/i.test(combined)) return 'date_meeting';
  if (/کار|شغل|حقوق|رئیس|اداره|شرکت|همکار|دفتر|محیط کار|پروژه/i.test(combined)) return 'workplace';
  if (/پول|قرض|وام|حساب|دنگ|خرج|کارت به کارت|میلیون|تومان/i.test(combined)) return 'money_finance';
  if (/دانشگاه|استاد|امتحان|نمره|درس|کنکور|کلاس|دانشجو/i.test(combined)) return 'academic';
  if (/فامیل|خاله|عمه|دایی|عمو|مادرشوهر|خواهرشوهر|دخترخاله|پسرعمه/i.test(combined)) return 'family_relatives';

  return 'general_comeback';
}

/**
 * Generate 5 authentic, distinct response pools for a scenario
 */
export function generate5TonePools(
  situation: string,
  category: string,
  baseResponse: string,
  title: string
): {
  direct: string[];
  funny: string[];
  charismatic: string[];
  emotional: string[];
  psychology: string[];
} {
  const base = cleanResponseText(baseResponse);
  const sit = cleanResponseText(situation || title || '');
  const cluster = getCluster(sit, category, base);

  const directList: string[] = [];
  const funnyList: string[] = [];
  const charismaticList: string[] = [];
  const emotionalList: string[] = [];
  const psychologyList: string[] = [];

  // 1. Position authentic base response into most appropriate tone
  if (base && base.length >= 2) {
    if (base.includes('؟') || base.length < 35) {
      charismaticList.push(base);
    } else if (base.includes('!') || /خخخ|😂|شوخی|والا|مگه|باشه/.test(base)) {
      funnyList.push(base);
    } else {
      directList.push(base);
    }
  }

  // 2. Generate specialized, natural, conversational responses per cluster
  switch (cluster) {
    case 'love_dating':
      directList.push('برای من صداقت و هم‌مسیر بودن مهم‌تر از هر تعریف و مناسبتیه.');
      directList.push('ترجیح میدم قدم‌به‌قدم و بر اساس شناخت واقعی جلو بریم.');
      directList.push('مستقیم و شفاف باشیم؛ کیفیت ارتباط وقتی بالا میره که تکلیف مشخص باشه.');

      funnyList.push('خیالت راحت، منم وقت سرخاروندن ندارم چه برسه به قراردادهای سختگیرانه!');
      funnyList.push('پس توافق کردیم که از همین الان سر رنگ پرده‌های خونه آینده دعوا نکنیم!');
      funnyList.push('اگه به هر مکالمه‌ای یه جایزه تعهد میدادن، الان هر دو نفرمون برنده بودیم!');

      charismaticList.push('آدم‌های باارزش عجله‌ای برای نتیجه ندارن؛ مسیر گفتگو رو جذاب طی می‌کنن.');
      charismaticList.push('هم‌صحبتی باکیفیت برام از هر برچسب مرسومی جذاب‌تره.');
      charismaticList.push('وقتی درک متقابل باشه، زمان به نفع هر دو نفر جلو میره.');

      emotionalList.push('حس آرامش و امنیت روانی در کنار یک هم‌صحبت خوب، باارزش‌ترین اتفاقه.');
      emotionalList.push('امیدوارم هر دو نفرمون حس خوبِ درک شدن و احترام رو تجربه کنیم.');
      emotionalList.push('صمیمیت واقعی از توجه به احساسات طرف مقابل سرچشمه می‌گیره.');

      psychologyList.push('روابط ماندگار زمانی شکل می‌گیرن که نیاز به تأییدطلبی با احترام به استقلال جایگزین بشه.');
      psychologyList.push('تعیین مرزهای منعطف در آغاز، فضای امنی برای شناخت اصیل ایجاد می‌کنه.');
      psychologyList.push('رفتار بدون اضطراب و مستقل، بیشترین جذابیت ناخودآگاه رو ایجاد می‌کنه.');
      break;

    case 'boundary_rejection':
      directList.push('منم اهل شروع رابطه بدون شناخت نیستم؛ آشنایی اولیه محترمانه رو ترجیح میدم.');
      directList.push('هدفم برقراری یک گفتگوی سالم و باکیفیته، نه ایجاد تعهد شتاب‌زده.');
      directList.push('خیلی هم عالی؛ شفافیت در آغاز هر تعاملی مانع از سوءتفاهم میشه.');

      funnyList.push('خیالت راحت! منم با فرم استخدام شریک زندگی نیومدم سراغت!');
      funnyList.push('پس خدا رو شکر که قرار نیست سر جزئیات تفاهم‌نامه کل‌کل کنیم!');
      funnyList.push('چه تفاهم جالبی، منم برنامه شلوغی برای پروژه‌هام دارم!');

      charismaticList.push('آدم‌های باهوش قبل از ارزیابی فکری وارد هیچ ارتباطی نمیشن؛ تحسینت می‌کنم.');
      charismaticList.push('ارزش کلامی و فکری هم‌صحبت برای من مهم‌تر از قالب‌های از پیش‌تعیین‌شده‌ست.');
      charismaticList.push('هم‌مسیر شدن نیازمند کشف علایق مشترکه، بدون هیچ اجباری.');

      emotionalList.push('کاملاً احترامت رو دارم؛ شاید تجربیات قبلی باعث شده بااحتیاط جلو بری.');
      emotionalList.push('حق داری مرزهای شخصی خودت رو حفظ کنی؛ آرامش روانی حق هر انسانیه.');
      emotionalList.push('از اینکه بدون تعارف احساست رو بیان کردی ممنونم؛ این نشانه شجاعت توئه.');

      psychologyList.push('اعلام سریع موضع دفاعی نشانه حفاظت از قلمرو شخصی در برابر ناشناخته‌هاست.');
      psychologyList.push('با برداشتن فشار انتظارات، مکالمه به بستر طبیعی و بدون مقاومت بازمی‌گرده.');
      psychologyList.push('پذیرش محترمانه فریم طرف مقابل، مقاومت روانی رو به اعتماد تبدیل می‌کنه.');
      break;

    case 'late_reply_ghosting':
      directList.push('وقت و تمرکز برام مهمه؛ هر زمان فرصت کافی برای مکالمه داشتی ادامه میدیم.');
      directList.push('ترجیح میدم زمانی گفتگو کنیم که حواسمون کامل به پیام‌ها باشه.');
      directList.push('مشکلی نیست، منم درگیر اولویت‌های کاری و روزمره‌ام بودم.');

      funnyList.push('فکر کردم رفتی برای کشف قطب جنوب و تازه برگشتی روی خط!');
      funnyList.push('کبوتر نامه‌برمون توی ترافیک هوایی گیر کرده بود یا موتور سوزوند؟! 😂');
      funnyList.push('رکورد سرعت پاسخگویی سال رو فعلاً جابه‌جا کردی!');

      charismaticList.push('کیفیت حضور و تمرکز همیشه برای من باارزش‌تر از سرعت تایپ کردنه.');
      charismaticList.push('آدم‌های ارزشمند سرشون شلوغه؛ هر وقت روی خط بودی با اشتیاق می‌شنوم.');
      charismaticList.push('سکوت‌های طولانی عیار مکالمه رو روشن می‌کنه؛ خوشحالم برگشتی.');

      emotionalList.push('امیدوارم روز پرمشغله و سختی نبوده باشه و همه‌چیز روبه‌راه پیش رفته باشه.');
      emotionalList.push('می‌دونم خستگی و شلوغی روزمره چقدر انرژی آدم رو می‌گیره؛ خسته نباشی.');
      emotionalList.push('نگران شدم مبادا مسأله‌ای پیش اومده باشه؛ هر وقت راحت بودی در خدمتم.');

      psychologyList.push('تأخیر در پاسخگویی بازتاب اولویت‌بندی ذهنیه؛ عدم واکنش تند، فریم تسلط رو حفظ می‌کنه.');
      psychologyList.push('پاسخ با همان ریتم زمانی و بدون استرس، توازن اجتماعی رو بازمی‌گردونه.');
      psychologyList.push('تثبیت ارزش فردی بدون سرزنش یا گله‌گذاری، جایگاه ارتباطی رو بالا می‌بره.');
      break;

    case 'identity_challenge':
      directList.push('پیام دادم چون موضوع برام جالب بود و خواستم دیدگاهت رو بشنوم.');
      directList.push('کسی که اهل گفتگوی محترمانه است و از آشنایی با افراد فهیم استقبال می‌کنه.');
      directList.push('یه هم‌صحبت جدید؛ اگه تمایل به مکالمه محترمانه داری خوشحال میشم صحبت کنیم.');

      funnyList.push('از سازمان بررسی مکالمات جالب هستم! پرونده‌تون تحت بررسیه!');
      funnyList.push('مامور مخفی هستم ولی متاسفانه یادم رفت کارت شناساییم رو بیارم!');
      funnyList.push('اگه بگم از آینده اومدم تا جلوی یه اشتباه رو بگیرم باور می‌کنی؟');

      charismaticList.push('کسی که ارزش مکالمه باکیفیت رو می‌دونه؛ در طول گفتگو من رو بهتر خواهی شناخت.');
      charismaticList.push('بهترین آشنایی‌ها معمولاً از همین پرسش‌های غافلگیرکننده شکل می‌گیرن.');
      charismaticList.push('تعریف در یک خط جا نمیشه، اما شنونده‌ای دقیق و همراهی صادق هستم.');

      emotionalList.push('طبیعیه که کنجکاو یا محتاط باشی؛ فضای مجازی گاهی حس تردید ایجاد می‌کنه.');
      emotionalList.push('درکت می‌کنم که برات غیرمنتظره بود؛ قصد ایجاد ناراحتی نداشتم.');
      emotionalList.push('حق داری بدونی با چه کسی صحبت می‌کنی؛ امنیت ذهنی اولویت هر ارتباطیه.');

      psychologyList.push('پرسش تند در شروع ارتباط، تلاشی ناخودآگاه برای سنجش مرزها و سطح اعتماد به نفس شماست.');
      psychologyList.push('پاسخ خونسرد و بدون حالت تدافعی، اقتدار شخصیتی رو اثبات می‌کنه.');
      psychologyList.push('هدایت آرام فریم از سوال هویتی به موضوع مشترک، تنش رو برطرف می‌کنه.');
      break;

    case 'insult_sarcasm':
      directList.push('احترام متقابل اصل اول گفتگوی منه؛ با این لحن مایل به ادامه نیستم.');
      directList.push('ترجیح میدم با افرادی که شأن و متانت کلام رو حفظ می‌کنن صحبت کنم.');
      directList.push('مرزهای کلامی من کاملاً مشخصه؛ اجازه بی‌احترامی نمیدم.');

      funnyList.push('انرژی منفی‌ت تخلیه شد یا قراره قسمت دومش هم اکران بشه؟');
      funnyList.push('مشخصه امروز با دنده چپ بیدار شدی! یه نفس عمیق بکش.');
      funnyList.push('حیف این همه خلاقیت و وقت که صرف کنایه زدن شد!');

      charismaticList.push('سکوت و خونسردی در برابر این لحن، بالاترین پاسخ برای حفظ شخصیته.');
      charismaticList.push('کلام هر انسان آینه درون اوست؛ برای شما آرامش و متانت بیشتری آرزو می‌کنم.');
      charismaticList.push('جذابیت واقعی در کنترل رفتار و ادبه، نه در نیش‌زبان زدن.');

      emotionalList.push('انگار چیزی باعث ناراحتی یا عصبانیتت شده؛ امیدوارم آرامشت رو پیدا کنی.');
      emotionalList.push('متاسفم که به جای گفتگو، دلخوری یا خشم با کنایه ابراز شد.');
      emotionalList.push('شاید روز سختی داشتی، اما تخریب دیگران کمکی به حال بهتر نمیکنه.');

      psychologyList.push('کنایه و تهاجم کلامی مکانیزم جبرانی برای پوشش احساس ضعف یا ناکامی درونیه.');
      psychologyList.push('با خنثی ماندن در برابر تحریکات، قدرت تخریبی کلام مهاجم از بین میره.');
      psychologyList.push('ترک صحنه یا تعیین قاطعانه خط قرمز، سالم‌ترین مدیریت فریم در برابر توهینه.');
      break;

    case 'shit_test':
      directList.push('تست کردن آدما بازی جالبیه، ولی با من صریح و شفاف باشی زودتر نتیجه می‌گیری.');
      directList.push('من دقیقاً خودِ واقعیم هستم و نیازی به آزمون‌های پیچیده نیست.');
      directList.push('بازی کلامی قشنگیه؛ حرف اصلی و منظورت رو بشنوم.');

      funnyList.push('نمره این تستی که گرفتی چند شد؟ قبول شدم یا باید تجدیدی بدم؟! 😂');
      funnyList.push('سؤال بعدی لطفاً! این مرحله رو با ۳ ستاره رد کردم.');
      funnyList.push('اتفاقاً توی شیت‌تست‌شناسی مدرک افتخاری دارم!');

      charismaticList.push('از آدم‌هایی که چالش فکری ایجاد می‌کنن خوشم میاد؛ دست‌گرمی خوبی بود.');
      charismaticList.push('وقتی کسی آدم رو محک میزنه یعنی براش جالبی؛ تحسینت می‌کنم.');
      charismaticList.push('فریم من با این حرف‌ها تکون نمی‌خوره؛ به صحبت اصلی برسیم.');

      emotionalList.push('می‌دونم محک زدن برای اطمینان از حس امنیت لازمه؛ خیالت از جانب من راحت باشه.');
      emotionalList.push('کاملاً درک می‌کنم که می‌خوای ببینی چقدر میشه روم حساب کرد.');
      emotionalList.push('طبیعیه که بخوای عیار آدم‌ها رو بسنجی، این نشانه تیزبینی توئه.');

      psychologyList.push('شیت‌تست مکانیزم تکاملی ناخودآگاه برای سنجش اصالت و مقاومت فریم شماست.');
      psychologyList.push('بهترین واکنش به آزمون‌های کلامی، لبخند خونسرد و رد بازی بدون حالت تدافعیه.');
      psychologyList.push('ثبات عاطفی در برابر چالش، نشان‌دهنده امنیت عمیق درونیه.');
      break;

    case 'flirting_compliment':
      directList.push('ممنون از توجه و لطف و انرژی مثبتی که داری.');
      directList.push('خوشحالم که نظرت جلب شده؛ خوش‌سلیقگی خودت رو نشون میده.');
      directList.push('سپاسگزارم؛ همیشه از تعاملات پرانرژی و محترمانه استقبال می‌کنم.');

      funnyList.push('تعریفت انقدر دقیق بود که کم‌کم دارم خودمم باورم میشه!');
      funnyList.push('حواست باشه زیادی هندونه زیر بغلم نذاری، دستم خسته میشه! 😂');
      funnyList.push('چشم‌هات قشنگ می‌بینه، البته سلیقه خوبم هم بی‌تأثیر نیست!');

      charismaticList.push('شنیدن این کلمات از زبان فرد نکته‌سنجی مثل شما جذابیتش دوچندان میشه.');
      charismaticList.push('انرژی کلامت به دل نشست؛ زیبایی در نگاه آدم‌های اصیل جاریه.');
      charismaticList.push('تحسینت رو با احترام می‌پذیرم؛ ارتباط با افراد خوش‌ذوق همیشه دلنشینه.');

      emotionalList.push('حس خیلی خوبی بهم دادی، از صمیم قلب ممنونم.');
      emotionalList.push('چقدر دلنشین و بامحبت صحبت می‌کنی؛ روزم رو زیباتر کردی.');
      emotionalList.push('این حجم از انرژی مثبت و کلام قشنگ واقعاً ارزشمنده.');

      psychologyList.push('پذیرش تحسین با وقار و بدون شکسته‌نفسی افراطی، جذابیت رو دوچندان می‌کنه.');
      psychologyList.push('پاسخگویی با شوخ‌طبعی ملایم و بازگرداندن توجه، تعادل جاذبه رو حفظ می‌کنه.');
      psychologyList.push('ایجاد اتصال قلبی از طریق قدردانی صادقانه، ماندگاری حس خوب رو تضمین می‌کنه.');
      break;

    case 'story_reply':
      directList.push('استوری پرمحتوا و جالبی بود؛ این موضوع همیشه برام جذاب بوده.');
      directList.push('سلیقه خوبی توی انتخاب این تصویر و متن داشتی؛ خوشم اومد.');
      directList.push('نکته جالبی داشت که نظرم رو به خودش جلب کرد.');

      funnyList.push('استوریت انقدر خوب بود که نزدیک بود گوشی از دستم بیفته!');
      funnyList.push('مشکوکم که این سلیقه خودته یا عکاس و ادمین استخدام کردی؟! 😂');
      funnyList.push('اگه به استوری‌ها اسکار میدادن، این یکی قطعاً کاندید میشد.');

      charismaticList.push('زاویه دید خاصی داری؛ کم پیش میاد استوری‌ای این‌طور توجه منو بگیره.');
      charismaticList.push('سلیقه‌ت عیار متفاوتی داره؛ پشت این انتخاب چه ماجراییه؟');
      charismaticList.push('همیشه از محتوایی که حس زندگی، عمق و هنر داره لذت می‌برم.');

      emotionalList.push('انرژی خیلی قشنگی داشت، حس دلنشینی بهم داد؛ ممنون که به اشتراک گذاشتی.');
      emotionalList.push('چقدر این فضا و حس دلنشین بود؛ حال خوبی منتقل کرد.');
      emotionalList.push('خیلی زیبا بود؛ دقیقاً حرف دل خیلی از ماها بود.');

      psychologyList.push('ریپلای به نقطه احساسی یا معنایی استوری، احتمال مکالمه عمیق‌تر رو افزایش میده.');
      psychologyList.push('نشان دادن علاقه به زاویه دید به جای ظاهر، ارتباط فکری متمایزی می‌سازه.');
      psychologyList.push('یک پرسش کوتاه در انتهای نظر، چرخه گفتگو رو به شکلی طبیعی فعال می‌کنه.');
      break;

    case 'date_meeting':
      directList.push('ایده خوبیه؛ برای این هفته برنامه‌م رو چک می‌کنم و بهت خبر میدم.');
      directList.push('از دیدار حضوری در یک محیط آرام و مناسب استقبال می‌کنم.');
      directList.push('باید تایم‌های آزادم رو هماهنگ کنم؛ روز و ساعت پیشنهادی‌ت کیه؟');

      funnyList.push('فقط به شرطی که قهوه مهمون شما باشه تا امتحان حسن‌نیت پس بدی! 😂');
      funnyList.push('امیدوارم توی قرار حضوری هم مثل پیام‌ها همین‌قدر خوش‌صحبت باشی!');
      funnyList.push('برنامه‌ریزی کنیم ببینیم کی قراره دیرتر برسه سر قرار!');

      charismaticList.push('دیدار حضوری بهترین راه برای محک زدن انرژی واقعی مکالمه‌ست؛ هماهنگ می‌کنیم.');
      charismaticList.push('هم‌صحبتی با افراد متفاوت همیشه برای من اولویته؛ تایم مناسبی رو ست می‌کنیم.');
      charismaticList.push('پیشنهاد به‌جایی بود؛ ارتباط واقعی از پشت صفحه گوشی فراتر میره.');

      emotionalList.push('خیلی خوشحال میشم از نزدیک ببینمت و گپ و گفت خوبی داشته باشیم.');
      emotionalList.push('حس دیدن یک دوست خوش‌صحبت همیشه انرژی‌بخشه.');
      emotionalList.push('ممنون از دعوتت؛ امیدوارم گفتگوی پر از آرامش و خاطره‌انگیزی بشه.');

      psychologyList.push('تعیین مکان و زمان مشخص با قاطعیت ملایم، حس رهبری و سازماندهی رو القا می‌کنه.');
      psychologyList.push('پرهیز از در دسترس بودن فوری و تنظیم زمان متناسب، ارزش شخصی رو تثبیت می‌کنه.');
      psychologyList.push('انتخاب محیط‌های عمومی و آرام، سطح راحتی و امنیت روانی رو تضمین می‌کنه.');
      break;

    case 'workplace':
      directList.push('بررسی دقیق انجام میشه و طبق اولویت‌های کاری اقدام خواهد شد.');
      directList.push('برای دستیابی به بهترین نتیجه، شفافیت در جزئیات پروژه الزامیه.');
      directList.push('هماهنگی‌های لازم رو انجام میدم و گزارش نتیجه رو ارسال خواهم کرد.');

      funnyList.push('اگه برای هر کار فورس‌ماژور یه پاداش میدادن، الان سهام‌دار اصلی بودیم!');
      funnyList.push('انرژی رو تقسیم کنیم تا آخر ساعت کاری زنده به مقصد برسیم! 😂');
      funnyList.push('با قهوه دابل اسپرسو این چالش رو هم حل‌وفصل می‌کنیم.');

      charismaticList.push('مدیریت چالش‌های پیچیده فرصتی برای اثبات عیار کار تیمی و تخصصیه.');
      charismaticList.push('کیفیت خروجی و حفظ استانداردهای حرفه‌ای خط قرمز کار ماست.');
      charismaticList.push('با برنامه‌ریزی استراتژیک و تمرکز بالا، اهداف رو به ثمر می‌رسونیم.');

      emotionalList.push('درکت می‌کنم؛ فشار کاری گاهی بالاست ولی با همکاری هم جلو می‌بریم.');
      emotionalList.push('خسته نباشی، زحمات و تلاشت برای این کار واقعاً قابل تقدیره.');
      emotionalList.push('امیدوارم روند پروژه بدون استرس و در نهایت آرامش پیش بره.');

      psychologyList.push('تفکیک احساسات از تصمیمات شغلی، پرستیژ رهبری و تسلط رو تضمین می‌کنه.');
      psychologyList.push('پاسخ با اتکا به آمار و فرآیندها، مقاومت و بحث‌های بی‌ثمر اداری رو حذف می‌کنه.');
      psychologyList.push('حفظ خونسردی در بحران‌های کاری، اعتماد همکاران و مدیران رو جلب می‌کنه.');
      break;

    case 'turkish':
      directList.push('ساغول؛ هر زمان صمیمی و دوطرفه صحبت کنیم بهترین نتیجه رو می‌گیریم.');
      directList.push('یاشا قارداش؛ احترام و صداقت حرف اول رو می‌زنه.');
      directList.push('چوخ گوزل؛ کلامت به دل نشست.');

      funnyList.push('جانیمسان! بگو ببینم دیگه چه شگردی توی آستین داری! 😂');
      funnyList.push('یاشا، زبون‌ریختن در حد لالیگا بود!');
      funnyList.push('ساغول، ولی از ما سریع‌تر هنوز متولد نشده!');

      charismaticList.push('کلام پرانرژی و اصیل نشانه ریشه‌داری و اصالته؛ یاشاسین.');
      charismaticList.push('هم‌صحبتی با انسان‌های خونگرم و ریشه‌دار افتخار ماست.');
      charismaticList.push('ساغول؛ متانت و معرفت در کلامت جاریه.');

      emotionalList.push('قربان محبتت، دلت همیشه شاد و لبت خندون باشه.');
      emotionalList.push('چوخ ساغول جانیم، انرژی قشنگی بهم دادی.');
      emotionalList.push('معرفت و صفای کلامت واقعاً به دل نشست.');

      psychologyList.push('استفاده از تکیه‌کلام‌های بومی صمیمیت ناخودآگاه و همگرایی فرهنگی ایجاد می‌کنه.');
      psychologyList.push('پاسخ با همان گرما و اصالت، دیوار غریبگی رو در چند ثانیه می‌شکنه.');
      psychologyList.push('تطبیق لحن با بافت زبانی طرف مقابل، هوش بین‌فردی بالا رو نشون میده.');
      break;

    default: // general_comeback
      directList.push('صراحت کلام همراه با حفظ احترام همیشه بهترین و شفاف‌ترین مسیره.');
      directList.push('نکته‌سنجی خوبی بود؛ مستقیم و بدون حاشیه جلو رفتن رو ترجیح میدم.');
      directList.push('پیامت رو گرفتم؛ شفافیت دوطرفه کیفیت ارتباط رو تضمین می‌کنه.');

      funnyList.push('حاضرجوابی خوبی بود، ولی من سریع‌تر از این حرفام! 😂');
      funnyList.push('به این میگن شوت در زاویه بسته، ولی من روی خط مهارش کردم!');
      funnyList.push('خلاقیت کلامی‌ت جالب بود، امتیاز این دور برای شما!');

      charismaticList.push('آدم بااعتمادبه‌نفس نیازی به شتاب‌زدگی نداره؛ کلامت باارزش بود.');
      charismaticList.push('کلام دقیق و به‌موقع نشانه هوش اجتماعی بالاست؛ تحسینت می‌کنم.');
      charismaticList.push('کنترل فریم گفتگو با همین متانت و آرامش کلامی شکل می‌گیره.');

      emotionalList.push('حس و حال پشت کلامت قشنگ بود؛ از صمیمیتت ممنونم.');
      emotionalList.push('گاهی یک جمله سنجیده تمام فضای گفتگو رو گرم و دلنشین می‌کنه.');
      emotionalList.push('انرژی مثبتت به دل نشست؛ امیدوارم همیشه همین‌قدر پرانرژی باشی.');

      psychologyList.push('مدیریت مکالمه با کلمات هوشمندانه و بدون هیجان‌زدگی، جایگاه فرد رو تثبیت می‌کنه.');
      psychologyList.push('وقتی بدون خشم یا واکنش تند پاسخ میدی، کنترل ناخودآگاه جهت گفتگو در دست شما می‌مونه.');
      psychologyList.push('تسلط کلامی اصیل زمانیه که سادگی، وقار و عمق هم‌زمان در پیام جاری باشه.');
      break;
  }

  // Deduplicate and filter empty
  const cleanAndDedup = (arr: string[]) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of arr) {
      const c = cleanResponseText(item);
      if (c.length >= 2 && !seen.has(c)) {
        seen.add(c);
        out.push(c);
      }
    }
    return out;
  };

  const finalDirect = cleanAndDedup(directList);
  const finalFunny = cleanAndDedup(funnyList);
  const finalCharismatic = cleanAndDedup(charismaticList);
  const finalEmotional = cleanAndDedup(emotionalList);
  const finalPsychology = cleanAndDedup(psychologyList);

  return {
    direct: finalDirect.length > 0 ? finalDirect : ['پاسخ مستقیم و صریح با حفظ متانت و وقار.'],
    funny: finalFunny.length > 0 ? finalFunny : ['با شوخی خونسرد و به‌موقع تنش را کاهش دهید.'],
    charismatic: finalCharismatic.length > 0 ? finalCharismatic : ['با آرامش، پرستیژ و جذبه شخصی گفتگو را هدایت کنید.'],
    emotional: finalEmotional.length > 0 ? finalEmotional : ['با کلامی گرم و همدلانه حس درک متقابل ایجاد کنید.'],
    psychology: finalPsychology.length > 0 ? finalPsychology : ['تحلیل هوشمندانه رفتار و مدیریت فریم مکالمه.']
  };
}

/**
 * Main function to transform all scenarios into production 5-tone pools
 */
export async function runProductionPoolTransformation(): Promise<{
  totalScenarios: number;
  totalPoolResponses: number;
  avgResponsesPerScenario: number;
}> {
  console.log('--- Starting Production 5-Tone Response Pool Transformation ---');

  const enrichedPath = path.join(process.cwd(), 'data', 'scenarios_enriched.json');
  const canonicalPath = path.join(process.cwd(), 'data', 'scenarios.json');
  const coachPath = path.join(process.cwd(), 'data', 'coach', 'scenarios.json');

  if (!fs.existsSync(enrichedPath)) {
    throw new Error(`Source file not found: ${enrichedPath}`);
  }

  const raw = fs.readFileSync(enrichedPath, 'utf8');
  const scenarios: any[] = JSON.parse(raw);

  let totalPoolResponses = 0;
  const processedScenarios: EnrichedScenarioWithPools[] = [];

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    const baseResp = typeof s.responses?.charismatic === 'string'
      ? s.responses.charismatic
      : Array.isArray(s.responses?.charismatic)
        ? s.responses.charismatic[0]
        : (s.responses?.tone_1 || '');

    const pools = generate5TonePools(s.situation, s.category, baseResp, s.title);

    const scenarioCount = pools.direct.length + pools.funny.length + pools.charismatic.length + pools.emotional.length + pools.psychology.length;
    totalPoolResponses += scenarioCount;

    const enrichedScenario: EnrichedScenarioWithPools = {
      ...s,
      responses: {
        direct: pools.direct,
        funny: pools.funny,
        charismatic: pools.charismatic,
        emotional: pools.emotional,
        psychology: pools.psychology,
        // Legacy aliases for total backward compatibility
        charismatic_single: pools.charismatic[0] || '',
        confident: pools.direct,
        friendly: pools.emotional,
        mysterious: pools.charismatic,
        mature: pools.psychology,
        tone_1: pools.direct,
        tone_2: pools.funny,
        tone_3: pools.charismatic,
        tone_4: pools.emotional,
        tone_5: pools.psychology,
        psychological_analysis: pools.psychology[0] || s.technique || 'تحلیل روانشناختی و مدیریت فریم'
      }
    };

    processedScenarios.push(enrichedScenario);
  }

  const jsonString = JSON.stringify(processedScenarios, null, 2);

  // Write atomically to all three target locations
  fs.writeFileSync(enrichedPath, jsonString, 'utf8');
  fs.writeFileSync(canonicalPath, jsonString, 'utf8');
  if (fs.existsSync(path.dirname(coachPath))) {
    fs.writeFileSync(coachPath, jsonString, 'utf8');
  }

  const report = {
    timestamp: new Date().toISOString(),
    totalScenarios: processedScenarios.length,
    totalPoolResponses,
    avgResponsesPerScenario: (totalPoolResponses / processedScenarios.length).toFixed(2),
    toneDistribution: {
      direct: processedScenarios.reduce((acc, s) => acc + s.responses.direct.length, 0),
      funny: processedScenarios.reduce((acc, s) => acc + s.responses.funny.length, 0),
      charismatic: processedScenarios.reduce((acc, s) => acc + s.responses.charismatic.length, 0),
      emotional: processedScenarios.reduce((acc, s) => acc + s.responses.emotional.length, 0),
      psychology: processedScenarios.reduce((acc, s) => acc + s.responses.psychology.length, 0)
    }
  };

  const reportPath = path.join(process.cwd(), 'reports', 'response_pool_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('Successfully generated Production 5-Tone Pools:');
  console.log(`- Scenarios: ${report.totalScenarios}`);
  console.log(`- Total Pool Items: ${report.totalPoolResponses}`);
  console.log(`- Avg Items/Scenario: ${report.avgResponsesPerScenario}`);
  console.log('Tone Breakdown:', report.toneDistribution);

  return {
    totalScenarios: processedScenarios.length,
    totalPoolResponses,
    avgResponsesPerScenario: parseFloat(report.avgResponsesPerScenario)
  };
}

if (process.argv[1]?.endsWith('build_production_5tone_bank.ts') || process.argv[1]?.endsWith('build_production_5tone_bank.js')) {
  runProductionPoolTransformation().catch(console.error);
}
