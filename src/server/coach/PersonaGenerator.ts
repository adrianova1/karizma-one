import { CoachScenario } from './CoachTypes.js';
import { PERSIAN_ARCHETYPES } from './PersianArchetypes.js';
import { PersianNormalizer } from './PersianNormalizer.js';

export class PersonaGenerator {
  /**
   * Generates 5 distinct, standalone, and high-impact Persian replies (Charismatic, Funny, Confident, Mysterious, Mature)
   * without appending formulaic templates, repetitive suffixes, or artificial wrappers.
   */
  static generateVariations(
    baseDialogue: string,
    scenario: CoachScenario | null,
    query: string
  ): {
    charismatic: string;
    funny: string;
    confident: string;
    mysterious: string;
    mature: string;
  } {
    const raw = (baseDialogue || '').trim();
    const clean = this.cleanCoreDialogue(raw);

    const q = (query || '').trim();
    const sTitle = (scenario?.title || '').trim();
    const sSit = (scenario?.situation || '').trim();
    const combinedContext = `${q} ${sTitle} ${sSit} ${clean}`;

    let variations = this.synthesizeVariations(clean, scenario, combinedContext);

    // Post-validate distinctness: check pairwise trigram similarities between generated tones
    variations = this.postValidateDistinctness(variations, clean);

    return variations;
  }

  private static synthesizeVariations(
    clean: string,
    scenario: CoachScenario | null,
    combinedContext: string
  ): {
    charismatic: string;
    funny: string;
    confident: string;
    mysterious: string;
    mature: string;
  } {

    // 1. Direct Archetype / Pattern Matching across comprehensive conversational categories
    
    // Category 1: Insult / Rudeness / Profanity (بیشعور، خر، احمق، عوضی، نفهم، روانی، اسکل، دیوونه...)
    if (/(?:^|[^\p{L}\p{N}])(بیشعور|بیشعوری|خر|خری|احمق|احمقی|عوضی|نفهم|لاشی|کثافت|روانی|دیوونه|اسکل|پلشت|بی\s*ادب|توهین|فحش|متلک)(?:[^\p{L}\p{N}]|$)/u.test(combinedContext)) {
      return {
        charismatic: 'متانت و آرامش کلامی پاسخی در شأن منه؛ اجازه نمیدم لحن شتاب‌زده شما سطح گفتگو رو پایین بیاره.',
        funny: 'خلاقیتت در انتخاب کلمات خیره‌کننده‌ست، فقط حیف که دایره لغاتت هنوز نیاز به آپدیت اساسی داره!',
        confident: 'ادب و احترام خط قرمز منه؛ اگه نمی‌تونی در چارچوب درست صحبت کنی ادامه مکالمه فایده‌ای نداره.',
        mysterious: 'اصالت آدما توی موقعیت‌های چالش‌برانگیز مشخص میشه؛ من هیچ‌وقت وارد این فضاها نمیشم.',
        mature: 'ترجیح میدم با کسی که برای کلام و شخصیت خودش ارزش قائله هم‌صحبت بشم.'
      };
    }

    // Category 2: Cocky / Arrogant / Sassy (پررو، پرو، خودشیفته، مغرور، قیافه میگیری، کلاس میذاری...)
    if (/پررو|پرو|پررویی|گستاخ|رو داری|مغرور|خودشیفته|غرور|قیافه میگیری|خودتو گرفتی|کلاس میذاری|فکر کردی کی هستی/.test(combinedContext)) {
      return {
        charismatic: 'کسی که شهامت کلامی و اصالت داره ممکنه به چشم خیلی‌ها مغرور بیاد، اما راز کاریزما در ترکیب جسارت با وقاره.',
        funny: 'آدم کم‌رو و خجالتی دوست داری که سرش تو یقه‌ش باشه، یا ترجیح میدی هم‌صحبتت سرزنده و پرانرژی باشه؟',
        confident: 'مرزها و احترام رو خوب بلدم؛ چیزی که می‌بینی اعتمادبه‌نفس واقعی و خودباوریه، نه غرور بی‌جا.',
        mysterious: 'احترام متقابل اصل اول منه؛ ولی جسارت در کلام باعث میشه مکالمه از یکنواختی دربیاد.',
        mature: 'ترجیح میدم شفاف، محکم و باجرئت صحبت کنم تا اینکه پشت تعارفات ساختگی پنهان بشم.'
      };
    }

    // Category 3: Humor / Banter / Sarcasm (خوشمزه، نمک نریز، بانمک، لودگی، دلقک، مسخره...)
    if (/خوشمزه|نمک|نمک نریز|بانمک|شیرین نشو|مسخره|لوده|دلقک بازی|بامزه|لوس بازی/.test(combinedContext)) {
      return {
        charismatic: 'جذابیت معاشرت در اینه که مکالمه همیشه زنده، پرحرارت و غیرقابل‌پیش‌بینی بمونه.',
        funny: 'نوش جان! طنز هوشمندانه چاشنی یک گفتگوی باکلاسه؛ تازه اول ماجراست.',
        confident: 'چاشنی کلام با من همینه؛ حرفی که انرژی و مزه نداشته باشه زود خسته‌کننده میشه.',
        mysterious: 'شوخ‌طبعی سنجیده هوش کلامی رو نشون میده؛ خوشحالم که توجهت جلب شد.',
        mature: 'تعادل بین نشاط کلامی و متانت شخصی همون چیزیه که یک ارتباط رو ماندگار می‌کنه.'
      };
    }

    // Category 4: Sarcastic Praise (بابا خوشتیپ، بابا جذاب، بابا زرنگ، بابا پروفسور...)
    if (/بابا خوشمزه|بابا خوشتیپ|بابا جذاب|بابا زرنگ|بابا ایول|بابا باریکلا|بابا کاردرست|بابا پروفسور|بابا خفن|بابا شیرین/.test(combinedContext)) {
      return {
        charismatic: 'توجه و نگاه هوشمندانه شما نشانه اصالت و سلیقه دقیق‌تونه؛ سپاسگزارم از حس خوبت.',
        funny: 'بابا که نه، فعلاً در نقش استاد ارشد جذابیت کلامی در خدمتتون هستم!',
        confident: 'ممنون از نظرت؛ وقتی استانداردها بالا باشه، کیفیت کار نیازی به ادعا نداره.',
        mysterious: 'تعریف و طعنه هر دو نشانه توجه‌اند و شنیدنش از طرف شخصی با نگاه شما جذابه.',
        mature: 'وقتی تلاشت بر اصالت و کیفیت باشه، بازخوردها خودشون به درستی شکل می‌گیرن.'
      };
    }

    // Category 5: Simp / Thirsty / Eager (هول، هولی، هول بازی، ندید بدید، عجول...)
    if (/هول|هولی|هولم|هول تر|هول بازی|عجول|تشنگی|ذوق زده|ندید بدید/.test(combinedContext)) {
      return {
        charismatic: 'اشتیاق و انرژی مثبت نشانه سرزندگیه؛ البته من همیشه با طمأنینه و آرامش قدم برمی‌دارم.',
        funny: 'کسی که برای صحبت با آدم جذابی مثل تو وقت میذاره اسمش باذوقه، نه عجول!',
        confident: 'من دقیقاً برای چیزی که برام ارزشمنده وقت میذارم؛ نه کمتر و نه بیشتر.',
        mysterious: 'سرعت مهم نیست، مسیر و مقصد ارتباطه که کیفیتش رو تعیین می‌کنه.',
        mature: 'ارتباط واقعی با درک لحظات شکل می‌گیره؛ نه با قضاوت‌های عجولانه.'
      };
    }

    // Category 6: Teasing / Mischief / Flirtatious play (شیطون، کرم داری، فضول، ناقلا، تخس...)
    if (/شیطون|شیطنت|کرم|فضول|ناقلا|تخس|شیطونی|کرم داری|زبون درازی|موش دووندن/.test(combinedContext)) {
      return {
        charismatic: 'یه مقدار شیطنت سنجیده همون نمکیه که مکالمه رو از روزمرگی نجات میده.',
        funny: 'اگه شیطنت من نبود که این مکالمه تا الان شبیه گزارش اداری شده بود!',
        confident: 'بازیگوشی کلامی بخشی از جذابیته؛ البته تا جایی که مرزهای احترام حفظ بشه.',
        mysterious: 'شیطنت من فقط گوشه‌ای از بازی‌های فکریه که برای کشفشون باید صبور باشی.',
        mature: 'شوخی و بازیگوشی وقتی قشنگه که حس صمیمیت و حال خوب دوطرفه ایجاد کنه.'
      };
    }

    // Category 7: Compliment / Beauty / Flirt (خوشگل، قشنگ، جذاب، تیپ، خوشتیپ، چشمات، ماه...)
    if (/خوشگل|قشنگ|جذاب|تیپ|خوشتیپ|چشمات|ماه|خوشگل شدی|خوش صدایی|جذابی/.test(combinedContext)) {
      return {
        charismatic: 'زیبایی و جذابیت واقعی در نگاه و کلام تحسین‌کننده شماست؛ متشکرم از سلیقه نابت.',
        funny: 'مراقب باش زیادی محو نشی که تمرکزت برای ادامه صحبت به هم نریزه!',
        confident: 'خوشحالم که سلیقه و نگاه دقیقی داری؛ همیشه به کیفیت و استایل اهمیت میدم.',
        mysterious: 'شنیدن تحسین از زبان شخصی با پرستیژ شما، لذتش دوچندانه.',
        mature: 'نظر لطفته؛ دیدن انرژی مثبت و قدردانی در کلامت واقعاً ارزشمنده.'
      };
    }

    // Category 8: Love / Confession / Affection (دوست دارم، عاشقتم، بهت حس دارم، دلم برات تنگ شده...)
    if (/دوست دارم|عاشقتم|بهت حس دارم|ازت خوشم اومده|کراش دارم|دلم برات تنگ شده/.test(combinedContext)) {
      return {
        charismatic: 'شنیدن این حس زیبا از زبون کسی به این جذابی، قشنگ‌ترین اتفاق امروزم بود؛ مرسی از انرژی نابت.',
        funny: 'چه سلیقه بی‌نقصی داری! اعتراف می‌کنم منم همیشه طرفدار آدم‌های خوش‌سلیقه مثل تو بودم.',
        confident: 'صداقتت رو تحسین می‌کنم؛ وقتی حست اینقدر شفاف و شجاعانه‌ست، ارزش و احترامت پیش من دوچندان میشه.',
        mysterious: 'حس‌های عمیق زمانی ماندگار میشن که توی رفتار و گذر زمان خودشون رو اثبات کنن.',
        mature: 'از اینکه احساست رو اینقدر متین و صادقانه ابراز کردی ممنونم؛ برای من و این ارتباط ارزش زیادی داره.'
      };
    }

    // Category 9: Late Reply / Seen / Ghosting (دیر جواب میدی، سین زدی، آنلاین بودی، کجایی...)
    if (/سین|دیر جواب|انلاین|آنلاین|کجایی|بی محلی|جواب نمیدی|تیک|چرا پیام نمیدی|دیر سین|سین زدی/.test(combinedContext)) {
      return {
        charismatic: 'کیفیت و تمرکز کامل روی مکالمه برام اولویت داره به سرعت پاسخگویی؛ الان تمام و کمال در خدمتم.',
        funny: 'داشتم میزان اشتیاق و صبوری‌ت رو اندازه می‌گرفتم که خداروشکر امتیاز کامل گرفتی!',
        confident: 'من فقط زمانی پیام میدم که تمرکز و فراغت واقعی داشته باشم، نه با عجله و سطحی.',
        mysterious: 'ارتباط با ارزش نیاز به حضور ذهن کامل داره، نه پیام‌های مقطعی بین کارهای روزمره.',
        mature: 'عمیق بودن گفتگو برام مهم‌تر از شتاب در پاسخ دادنه؛ حالا با خیال راحت در کنارت هستم.'
      };
    }

    // Category 10: Food / Pastil / Treats / Gifts (پاستیل، شکلات، لواشک، بستنی، کادو، خریدن...)
    if (/پاستیل|شکلات|بستنی|قهوه|کیک|کروسان|چیپس|پیتزا|خوراکی|لواشک|کادو|هدیه/.test(combinedContext)) {
      const item = combinedContext.includes('پاستیل') ? 'پاستیل' :
                   combinedContext.includes('شکلات') ? 'شکلات' :
                   combinedContext.includes('لواشک') ? 'لواشک' :
                   combinedContext.includes('بستنی') ? 'بستنی' :
                   combinedContext.includes('قهوه') ? 'قهوه' : 'خوراکی محبوبت';
      return {
        charismatic: `سلیقه جذاب و خوشمزه‌ایه؛ پس معیار انتخاب کافه‌مون مشخص شد، جایی که بهترین ${item} شهر رو داشته باشه.`,
        funny: `${item}؟ فکر می‌کردم طرفدار استیک و قهوه تلخی، ولی این اعتراف شیرینت باعث شد توقعم ازت بره بالاتر!`,
        confident: `انتخاب فوق‌العاده‌ایه؛ دفعه بعد که دیدمت یه بسته ${item} اعلا مهمون منی.`,
        mysterious: `آدمایی که عاشق ${item} هستن معمولاً یه شیطنت پنهان پشت ظاهر آرومشون دارن؛ حدسم در موردت درسته؟`,
        mature: `توجه به علایق و جزئیات کوچیک قشنگ‌ترین بخش هر ارتباطه؛ خوشحالم که سلیقه‌ت رو باهام در میون گذاشتی.`
      };
    }

    // Category 11: Silence / Not Talking (روزه سکوت، نمیخوام حرف بزنم، سکوت، صحبتی ندارم...)
    if (/روزه سکوت|نمیخوام حرف بزنم|حرف نمیزنم|سکوت کردم|صحبتی ندارم|حوصله ندارم/.test(combinedContext)) {
      return {
        charismatic: 'گاهی سکوت قشنگ‌ترین بخش یک ارتباطه؛ هر وقت حس و حال صحبت داشتی با کمال میل می‌شنوم.',
        funny: 'روزه‌ت قبول باشه! فقط ساعت افطار رو اعلام کن تا برای شروع دوباره مکالمه آماده باشم.',
        confident: 'حریم و آرامش شخصی‌ت کاملاً محترمه؛ هر زمان که آماده بودی گفتگو رو ادامه میدیم.',
        mysterious: 'سکوت زبان افراد متفکره؛ ناگفته‌ها همیشه پیام‌های عمیق‌تری در دل خودشون دارن.',
        mature: 'احترام به خلوت و نیاز به آرامش شما در اولویته؛ هر زمان تمایل داشتی در کنارت هستم.'
      };
    }

    // Category 12: Ideas / Creativity / Strategy (ایده داشتی، ایده نداری، نظرت چیه، چیکار کنیم...)
    if (/ایده|خلاقیت|طرح|نظری نداری|ایده ای نداری|نظرت چیه|چیکار کنیم/.test(combinedContext)) {
      return {
        charismatic: 'ایده‌های ناب همیشه در زمان مناسب رونمایی میشن؛ الان مشتاقم اول ایده و زاویه دید تو رو بشنوم.',
        funny: 'ایده‌هام در فاز پردازش فوق‌محرمانه هستن؛ ولی اگه قول بدی قدر بدونی یه گوشه‌ش رو میگم!',
        confident: 'دیدگاه و راهکار من کاملاً روشنه، اما ارزش هم‌صحبتی در اینه که ایده‌های دو طرف مکمل هم باشن.',
        mysterious: 'بهترین ایده‌ها اونایی هستن که اول در عمل دیده میشن، نه پشت پیام؛ منتظر یک غافلگیری باش.',
        mature: 'بررسی جامع و ارائه یک راهکار پخته نیاز به همفکری دقیق داره؛ بیا مرحله‌به‌مرحله جلو بریم.'
      };
    }

    // Category 13: Comparison / Distinction (فرقت با بقیه چیه، چرا با بقیه فرق داری، چه فرقی داری...)
    if (/فرقت با بقیه|چرا با بقیه فرق داری|چه فرقی داری|از بقیه بهتری|خاصیت چیه|برتری داری/.test(combinedContext)) {
      return {
        charismatic: 'تفاوت در کلمات خلاصه نمیشه؛ اصالت و رفتار متین چیزیه که در طول ارتباط خودش رو نشون میده.',
        funny: 'تفاوت اصلیم اینه که به جای کپی‌کردن حرف‌های بقیه، نسخه‌ی کاملاً اصل خودمم!',
        confident: 'من خودم رو با کسی مقایسه نمی‌کنم؛ استانداردهای من روی خودباوری و استقلال شخصیتی بنا شده.',
        mysterious: 'کشف تفاوت‌ها به زمان و توجه نیاز داره؛ کم‌کم خودت به جواب این سوال میرسی.',
        mature: 'هر انسانی دنیای منحصر‌به‌فرد خودشو داره؛ ارزش من در وفاداری به اصول و احترامیه که قائلم.'
      };
    }

    // Category 14: Date / Coffee / Meetup (کافه، قرار، بیرون، دیت، دیدار، ببینیم، دعوت، قهوه...)
    if (/کافه|قرار|بیرون|دیت|دیدار|ببینیم|دعوت|قهوه|رستوران|کی میای|بریم بیرون/.test(combinedContext)) {
      return {
        charismatic: 'گفتگوی حضوری همیشه حس و حال واقعی‌تری داره؛ برای یک دیدار باکیفیت و پرانرژی برنامه‌ریزی می‌کنیم.',
        funny: 'پیشنهاد خوبیه! فقط قهوه با تو، پرداخت صورت‌حساب هم با قرعه‌کشی عادلانه!',
        confident: 'من برای دیدارهای معنادار همیشه وقت باز می‌کنم؛ زمان و مکان مناسب رو هماهنگ خواهیم کرد.',
        mysterious: 'دیدار رو در رو همیشه نکات جالبی رو آشکار می‌کنه که توی پیام مشخص نمیشه.',
        mature: 'دیدار حضوری فرصت خوبی برای شناخت عمیق‌تره؛ با کمال میل در اولین فرصت مناسب هماهنگ می‌شیم.'
      };
    }

    // Category 15: Distance / Relocation (راه دوره، شهر دیگه، فاصله، مهاجرت...)
    if (/شهر من|بیا شهر|راه دوره|راهمون دوره|از راه دور|فاصله|شهر دیگه|مهاجرت|تهران بیا|بیا اینجا/.test(combinedContext)) {
      return {
        charismatic: 'فاصله‌های جغرافیایی با پیوند فکری و صمیمیت واقعی کم‌رنگ میشن؛ کیفیت ارتباط به جغرافیا محدود نیست.',
        funny: 'فاصله شاید زیاد باشه، ولی تکنولوژی و انرژی مثبت ما از هر پروازی سریع‌تره!',
        confident: 'جغرافیا مانع یک ارتباط باارزش نیست؛ اگر هدف و احترام مشترک باشه، راهش پیدا میشه.',
        mysterious: 'فاصله‌ها گاهی جذابیت کشف و اشتیاق دیدار رو چند برابر می‌کنن.',
        mature: 'مدیریت ارتباط از راه دور نیازمند بلوغ، صداقت و درک متقابله که هر دو طرف باید بهش پایبند باشن.'
      };
    }

    // 2. High-value dynamic synthesis for clean dialogue if already rich
    if (clean.length > 10 && !clean.includes('علت تست') && !clean.includes('اشتباه بزرگ')) {
      return {
        charismatic: `درک این موقعیت نیازمند نگاهیه فراتر از معمول؛ ${clean}`,
        funny: `خیلی جالب مطرحش کردی! ولی اگه از زاویه شوخ‌طبعانه نگاه کنی: ${clean}`,
        confident: `موضع من در این مورد کاملاً مشخص و استواره: ${clean}`,
        mysterious: `ابعاد پنهانی در این موضوع هست که با گذشت زمان روشن‌تر میشه: ${clean}`,
        mature: `تحلیل منطقی و اصولی این ماجرا نشون میده که: ${clean}`
      };
    }

    // 3. Universal High-Caliber Persian Fallback
    return {
      charismatic: 'انرژی مثبت و بیان سنجیده‌ت توجه من رو جلب کرد؛ خوشحال میشم این گفتگوی جذاب رو با هم جلو ببریم.',
      funny: 'داشتم فکر می‌کردم اگه قرار باشه جایزه خوش‌سلیقه‌ترین هم‌صحبت امروز رو بدیم، قطعاً به این پیام میرسه!',
      confident: 'موضع و نگاه من همیشه روی اصالت و گفتگوی شفاف استواره؛ دقیقاً در همین مسیر با وقار پیش میریم.',
      mysterious: 'همیشه جذاب‌ترین بخش یک داستان همونیه که توی نگاه اول فاش نمیشه؛ زمان همه چیز رو مشخص می‌کنه.',
      mature: 'ارتباط موثر با درک متقابل و احترام شکل می‌گیره؛ قدردان این تبادل نظر هوشمندانه هستم.'
    };
  }

  private static cleanCoreDialogue(text: string): string {
    if (!text || typeof text !== 'string') return '';
    let s = text;
    if (s.includes('پاسخهای متناسب') || s.includes('پاسخ متناسب') || s.includes('پاسخ پیشنهادی')) {
      const match = s.match(/(?:پاسخهای متناسب|پاسخ متناسب|پاسخ پیشنهادی)[:\s]*(.*?)(?:مرحله|اشتباه بزرگ|نکته|$)/);
      if (match && match[1] && match[1].trim().length > 3) {
        s = match[1].trim();
      }
    }
    s = s.replace(/علت این تست[^\n✔⛔✅]*/g, '');
    s = s.replace(/علت تست[^\n✔⛔✅]*/g, '');
    s = s.replace(/اشتباه بزرگ[^\n✔⛔✅]*/g, '');
    s = s.replace(/مرحله قرار اول به بعد[^\n✔⛔✅]*/g, '');
    s = s.replace(/[«"'"“‘⚡🎈🔹♦•\-–\d\.\s()👧👦👨👩🧔👱‍♂️👱‍♀️:✔⛔✅]+/gu, ' ');
    return s.replace(/\s{2,}/g, ' ').trim();
  }

  /**
   * Post-validate that variations are genuinely distinct (pairwise trigram similarity < 0.85).
   * If any pair is too similar, apply distinct structural adjustments.
   */
  private static postValidateDistinctness(
    vars: { charismatic: string; funny: string; confident: string; mysterious: string; mature: string },
    clean: string
  ): { charismatic: string; funny: string; confident: string; mysterious: string; mature: string } {
    const tones: Array<keyof typeof vars> = ['charismatic', 'funny', 'confident', 'mysterious', 'mature'];
    
    // Check pairwise similarities
    for (let i = 0; i < tones.length; i++) {
      for (let j = i + 1; j < tones.length; j++) {
        const toneA = tones[i];
        const toneB = tones[j];
        const sim = PersianNormalizer.computeTrigramSimilarity(vars[toneA], vars[toneB]);
        
        if (sim >= 0.85) {
          // Differentiate toneB with distinct stylistic tone structure
          if (toneB === 'funny') {
            vars.funny = `خیلی بامزه بود! راستش اگه بخوام بی‌تعارف بگم: ${clean || vars.funny}`;
          } else if (toneB === 'confident') {
            vars.confident = `قاطعانه و مشخص بگم: خطوط قرمز من روشنه، ${clean || vars.confident}`;
          } else if (toneB === 'mysterious') {
            vars.mysterious = `نکته جالب اینجاست که حقیقت همیشه توی نگاه اول مشخص نمیشه؛ ${clean || vars.mysterious}`;
          } else if (toneB === 'mature') {
            vars.mature = `با دیدی منطقی و عمیق به قضیه نگاه کنیم: ${clean || vars.mature}`;
          } else if (toneB === 'charismatic') {
            vars.charismatic = `با وقار و پرستیژ کامل: ترجیح میدم کیفیت صحبت حفظ بشه؛ ${clean || vars.charismatic}`;
          }
        }
      }
    }

    return vars;
  }
}
