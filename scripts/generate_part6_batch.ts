import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ScenarioItem } from '../src/types.js';
import { normalizePersianText } from './restore_real_base_dataset.js';

export function runPart6Generation() {
  console.log('=== STARTING PART 6 OF 6 EXPANSION (10,000 SCENARIOS: DEEP CONVERSATIONS, DOUBLE ENTENDRE & ADVANCED INFLUENCE) ===');
  const cwd = process.cwd();
  const masterPath = path.join(cwd, 'data', 'production', 'master_base_bank.json');
  const expandedPath = path.join(cwd, 'data', 'production', 'expanded_bank.json');
  const scenariosPath = path.join(cwd, 'data', 'scenarios.json');
  const coachScenariosPath = path.join(cwd, 'data', 'coach', 'scenarios.json');

  if (!fs.existsSync(masterPath)) {
    throw new Error(`Master Base file not found at ${masterPath}`);
  }
  if (!fs.existsSync(expandedPath)) {
    throw new Error(`Expanded bank file not found at ${expandedPath}`);
  }

  const masterBase: ScenarioItem[] = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
  const currentExpanded: ScenarioItem[] = JSON.parse(fs.readFileSync(expandedPath, 'utf8'));

  const baseLockedCount = masterBase.length; // 9,425
  const currentCount = currentExpanded.length; // 59,425

  console.log(`Base Locked Count: ${baseLockedCount}`);
  console.log(`Current Bank Count: ${currentCount}`);

  // Build signatures set from all current items (59,425)
  const existingSignatures = new Set<string>();
  for (const item of currentExpanded) {
    const sit = (item.situation || item.title || '').trim();
    const resp = typeof item.responses?.charismatic === 'string'
      ? item.responses.charismatic
      : (Array.isArray(item.responses?.charismatic) ? item.responses.charismatic.join(' ') : '');
    const sig = normalizePersianText(sit) + '|' + normalizePersianText(resp);
    existingSignatures.add(sig);
  }

  // --- SEMANTIC DATA MATRIX FOR PART 6: DEEP CONVERSATIONS, DOUBLE ENTENDRE & VERBAL INFLUENCE ---
  const deepEnvironments = [
    { env: 'کافه دنج با نور ملایم در ساعات پایانی شب', trigger: 'سوالی عمیق درباره ماهیت عشق یا تنهایی', tag: 'گفتگوی عمیق شبانه' },
    { env: 'قدم زدن در بام شهر یا ساحل در سکوت شب', trigger: 'شوخی پر از ایهام و دوپهلو با چاشنی جاذبه', tag: 'شوخ‌طبعی دوپهلو' },
    { env: 'گالری هنری یا ایونت فکری-فلسفی', trigger: 'چالش فکری درباره معنای زندگی و هویت شخصی', tag: 'بحث عمیق و فلسفی' },
    { env: 'گفتگوی خصوصی و کاری در لانج یا لابی لوکس', trigger: 'تلاش برای متقاعدسازی و نفوذ روی تصمیم بزرگ', tag: 'نفوذ کلامی پیشرفته' },
    { env: 'تراس یا فضای باز هنگام نوشیدن قهوه', trigger: 'پرسش درباره آسیب‌پذیری و ترس‌های عمیق درونی', tag: 'کالبدشکافی روانی' },
    { env: 'مکالمه طولانی تلفنی یا چت صوتی در نیمه‌شب', trigger: 'ایجاد پیوند عاطفی عمیق و کنجکاوی ذهنی', tag: 'اتصال روانی در چت صوتی' },
    { env: 'جلسه مذاکره یا لابی هتل حین توافق حساس', trigger: 'هدایت زیرپوستی طرف مقابل به سمت پذیرش دیدگاه', tag: 'فریمینگ و کنترل مذاکره' },
    { env: 'فضای صمیمی بعد از یک روز شلوغ و پرماجرا', trigger: 'بررسی لایه‌های ناگفته رابطه و تمایلات پنهان', tag: 'کشف ساب‌تکست رابطه' }
  ];

  const deepPunches = [
    '«واقعاً فکر می‌کنی آدما می‌تونن همدیگه رو همون‌طور که هستن بپذیرن یا همه چی فقط یه بازیه؟»',
    '«این طرز نگاهت خطرناکه... داری سعی می‌کنی ذهن منو بخونی یا هدفت چیز دیگه‌ایه؟»',
    '«به نظرت بزرگ‌ترین اشتباهی که یه آدم می‌تونه تو روابطش مرتکب بشه چیه؟»',
    '«همیشه اینقدر عمیق و مرموزی یا فقط جلوی من این نقاب رو به صورت می‌زنی؟»',
    '«اگه همین الان قرار باشه بدون فکر کردن یه آرزو بکنی، اون آرزو درباره ما چیه؟»',
    '«فکر می‌کنی این کششی که بینمونه تصادفیه یا تو هم از قبل براش برنامه‌ریزی کردی؟»',
    '«ترجیح میدی یه حقیقت تلخ رو بشنوی یا یه دروغ قشنگ که شب راحت بخوابی؟»',
    '«گاهی حس می‌کنم پشت این کلمات بااعتمادبه‌نفست، یه سکوت خیلی سنگین پنهان شده...»',
    '«چرا حس می‌کنم هر بار باهات حرف می‌زنم، کلماتت منو به سمتی می‌برن که خودت می‌خوای؟»',
    '«اگه مجبور بودی بین امنیت کامل و یه هیجان پر از ریسک یکی رو انتخاب کنی، انتخابت چی بود؟»',
    '«تو از اون آدمایی هستی که زود فراموش می‌کنی یا هر لحظه رو تو خاطرت ثبت می‌کنی؟»',
    '«این حرفت خیلی ایهام داشت... دقیقاً منظورت کدوم بعد این قضیه بود؟»',
    '«به نظرت مرز بین مراقبت صادقانه و وابستگی ناسالم کجاست؟»',
    '«حس می‌کنم تو همیشه چند قدم جلوتر از مکالمه رو تو ذهنت شطرنج بازی می‌کنی!»',
    '«چیزی هست که دلت بخواد بگی ولی کلمات مناسبی براش پیدا نکرده باشی؟»'
  ];

  const influenceTactics = [
    'تکنیک ایهام چندلایه و باز گذاشتن تفسیر (Playful Ambiguity & Subtext)',
    'تکنیک پیوند احساسی از طریق آسیب‌پذیری مقتدرانه (Calibrated Vulnerability)',
    'تکنیک تغییر جهت توجه به لایه‌های پنهان ضمیر ناخودآگاه (Subconscious Reframing)',
    'تکنیک لنگراندازی فریم عمیق و هیپنوتیزم کلامی (Frame Anchoring)',
    'تکنیک طنز ظریف و دوپهلو با تماس چشمی عمیق (Subtle Double-Entendre)',
    'تکنیک کشف ارزش‌های بنیادین و هدایت مکالمه به معنا (Core Values Elicitation)',
    'تکنیک مکث استراتژیک قبل از کلمه کلیدی (Pacing & Leading Pause)',
    'تکنیک سوال معکوس برای به عمق بردن مخاطب (Socratic Depth Inversion)'
  ];

  // Tone generation matrices for Part 6
  const charismaticTemplates = [
    'لبخند ملایم با نگاهی نافذ و صدایی گرم و با طمأنینه: «{core_c} گاهی زیباترین لحظات در فضایی خلق میشن که کلمات ساده از پس توصیفش برنمیان؛ حضور تو این عمق رو زنده می‌کنه.»',
    '«{core_c} وقتی دو نفر به یک زبان مشترک فراتر از حرف‌های روزمره می‌رسن، هر سکوتی تبدیل به یک موسیقی دلنشین میشه.»',
    '«{core_c} من همیشه باور دارم اصالت یعنی شجاعت کشف دنیاهای جدید؛ نگاه تو دقیقاً همین جسارت رو داره.»',
    'با طمأنینه و نگاه به عمق چشمان طرف مقابل: «{core_c} جذابیت واقعی در توانایی ایجاد یک تجربه حسی و فکری عمیقه که تا مدت‌ها در ذهن بمونه.»',
    '«{core_c} ایهام کلمات قشنگ‌ترین بازی ذهنی دنیاست، مخصوصاً وقتی هم‌بازی آدم هوش بالایی مثل تو داشته باشه.»',
    '«{core_c} ارتباط اصیل نیازی به اثبات نداره؛ فقط کافیه اجازه بدیم جریان طبیعی اشتیاق کار خودش رو بکنه.»',
    '«{core_c} من زیبایی رو در تلاقی هوش، ظرافت و درک نامحسوس لایه‌های روح می‌بینم؛ دقیقاً مثل امشب ما.»',
    '«{core_c} وقتی با صداقت و جذابیت گفتگو می‌کنی، هر لحظه تبدیل به یک اثر هنری ماندگار میشه.»'
  ];

  const funnyTemplates = [
    'خنده زیرکانه با لحن شیطنت‌آمیز و شوخی ایهام‌دار: «{core_f} اگه قرار باشه این بحث رو اینقدر عمیق ادامه بدیم، باید مجوز غواصی با کپسول اکسیژن صادر کنیم!»',
    '«{core_f} اعتراف کن! این سوال رو از کتاب رازهای مگوی جهان درآوردی تا هوش منو تست کنی یا دلت برای دیالوگ‌های پرهیجان تنگ شده؟!»',
    '«{core_f} هشدار: این سطح از جذابیت فکری همراه با ایهام کلامی نیاز به تاییدیه وزارت بهداشت روانی داره!»',
    '«{core_f} من اگه می‌خواستم ذهن‌خوانی کنم، اول منوی رستوران موردعلاقه‌ت رو رمزگشایی می‌کردم نه رازهای کیهانی رو!»',
    '«{core_f} به نظرم ایهام این شوخی انقدر ظریف بود که مغزم برای لود شدنش به ۱۰ ثانیه ریستارت احتیاج پیدا کرد!»',
    '«{core_f} قرار بود یه قهوه ساده بخوریم، چرا یهو تبدیل شدیم به فیلسوف‌های یونان باستان در حال حل معمای هستی؟!»',
    '«{core_f} هر کی ندونه فکر می‌کنه داریم کد هسته‌ای رد و بدل می‌کنیم با این زیرمتن‌های چندلایه‌ت!»',
    '«{core_f} از یک تا ده، به میزان مرموز بودن این سناریو نمره ۱۰۰ میدم، ولی برای نسخه بعدی یکم زیرنویس فارسی هم بذار!»'
  ];

  const confidentTemplates = [
    '«{core_co} فریم ذهنی و مسیر من کاملاً روشن و محکمه؛ نفوذ کلام من حاصل وضوح هدف و آرامش درونیمه.»',
    '«{core_co} من ترسی از روبرو شدن با سخت‌ترین حقیقت‌ها ندارم، چون حقیقت تنها تکیه‌گاه واقعیه.»',
    '«{core_co} قدرت در تحمیل کلمات نیست؛ قدرت در حضوریه که بدون تقلا، فضا و مسیر مکالمه رو به تعادل می‌رسونه.»',
    '«{core_co} هر کسی ظرفیت لمس این عمق رو نداره؛ اینکه الان اینجایی یعنی معیارها و استانداردهامون در یک تراز قرار داره.»',
    '«{core_co} من بازی‌های روانی رو کنار می‌گذارم و با اعتمادبه‌نفس خالص به اصل ماجرا نگاه می‌کنم.»',
    '«{core_co} تصمیمات من همیشه ریشه در ارزش‌های بنیادینم دارن؛ بادها می‌گذرن اما این پایه‌ها تکون نمی‌خورن.»',
    '«{core_co} نفوذ کلام زمانی رخ میده که حرف، نگاه و عمل انسان در یک راستای بی‌نقص قرار گرفته باشن.»',
    '«{core_co} تسلط بر فضا یعنی هدایت گفتگو بدون تنش و با قاطعیت ملایم اما خدشه‌ناپذیر.»'
  ];

  const mysteriousTemplates = [
    'نگاه ممتد، مکث چند ثانیه‌ای و زمزمه‌ای عمیق: «{core_m} بعضی رازها نباید با کلمات فاش بشن؛ بعضی مفاهیم فقط در نگاه و ارتعاش لحظه ادراک میشن...»',
    '«{core_m} خط باریکی بین آنچه که دیده میشه و آنچه که واقعاً در جریانه وجود داره؛ تو داری به سمت اون خط قدم برمی‌داری.»',
    '«{core_m} پاسخ این سوالت مثل سایه‌ایه در غروب؛ هر چی بیشتر بهش نزدیک بشی، ابعاد جالب‌تری پیدا می‌کنه.»',
    '«{core_m} اجازه بده علامت سوال‌ها باقی بمونن؛ کشف تدریجی همون اکسیریه که اشتیاق رو زنده نگه می‌داره.»',
    '«{core_m} در عمق شب، هر واژه بازتابی از جهان پنهان رو در خود داره که گوش‌های عادی توان شنیدنش رو ندارن.»',
    '«{core_m} همه چیز دقیقاً همون‌طوری پیش میره که باید پیش بره؛ شگفتی در تماشای رمزگشایی این مسیر پنهانه.»',
    '«{core_m} بازی با ایهام و ساب‌تکست مثل قدم زدن در مه غلیظه؛ هیجان‌انگیز، غیرقابل پیش‌بینی و پر از کشف‌های ناگهانی.»',
    '«{core_m} وقتی سکوت معنادارتر از کلمات میشه، یعنی به نقطه عطف ماجرا رسیدیم.»'
  ];

  const matureTemplates = [
    '«{core_ma} پختگی هیجانی یعنی توانایی عبور از سطح و رسیدن به لایه‌های اصیل فهم متقابل بدون پیش‌داوری.»',
    '«{core_ma} در یک گفتگوی عمیق، گوش دادن فعال و همدلانه ارزشمندتر از هر پاسخی برای اثبات خود است.»',
    '«{core_ma} پذیرش تفاوت‌ها و درک پیچیدگی روان انسان، سنگ‌بنای یک ارتباط بالغانه و پایدار محسوب میشه.»',
    '«{core_ma} نفوذ اخلاقی یعنی اثرگذاری بر قلب و ذهن دیگران از طریق صداقت، درستی و سعه صدر.»',
    '«{core_ma} شوخ‌طبعی هوشمندانه و دوپهلو وقتی زیباست که به کرامت طرفین خدشه‌ای وارد نکنه و بر پیوند انسانی بیفزاید.»',
    '«{core_ma} بلوغ ارتباطی به ما یاد میده که به جای تلاش برای کنترل دیگران، فضای امنی برای گفتگو خلق کنیم.»',
    '«{core_ma} کلمات وزن دارند؛ استفاده مسئولانه و آگاهانه از زبان نشان از درایت و وقار شخصیت است.»',
    '«{core_ma} درک متقابل زمانی شکوفا میشه که هر دو طرف شجاعت مواجهه با احساسات عمیق و اصیل رو داشته باشن.»'
  ];

  const coreSeeds = [
    {
      c: 'کشف لایه‌های پنهان یک ارتباط اصیل، زیباترین تجربه انسانیه.',
      f: 'فکر کنم امشب کل معادلات منطقی جهان بازنویسی شد!',
      co: 'اصالت رفتار من بر پایه عزت نفس و شناخت دقیق از خودمه.',
      m: 'رمز این پیوند در ناگفته‌هایی فراتر از زمان پنهانه.',
      ma: 'بلوغ روانی یعنی ایجاد هم‌افزایی و درک عمیق بدون قضاوت.'
    },
    {
      c: 'این هماهنگی فکری و روحی فرصتی کم‌نظیر برای رشد مشترکه.',
      f: 'الان باید برای رمزگشایی این دیالوگ جلسه دفاعیه پایان‌نامه بذاریم!',
      co: 'من برای حریم فکری و استقلال رای خودم ارزش والایی قائلم.',
      m: 'در پس این نگاه دریایی از معانی نهفته است.',
      ma: 'سرمایه‌گذاری روی درک متقابل ارزشمندترین مهارت زندگیه.'
    },
    {
      c: 'طنین کلمات صادقانه همیشه در خاطر باقی می‌مونه.',
      f: 'هشدار شوخ‌طبعی: شدت زیرمتن این مکالمه بالاتر از حد مجازه!',
      co: 'نفوذ من ریشه در ثبات عاطفی و شفافیت در هدف داره.',
      m: 'پاسخ حقیقی در لحظه‌ای غافلگیرکننده آشکار خواهد شد.',
      ma: 'خردمندی یعنی شنیدن ژرف و پاسخ با شایستگی و وقار.'
    },
    {
      c: 'ایجاد پیوند فکری و حسی پایدار هنر افراد اصیله.',
      f: 'فکر کنم باید یه دیکشنری اختصاصی برای ایهام‌هامون چاپ کنیم!',
      co: 'من همواره با تکیه بر حقیقت گام برمی‌دارم و واهمه‌ای ندارم.',
      m: 'در آرامش این شب، رازهایی سخن می‌گویند که ناپیداست.',
      ma: 'ارتباط عمیق انسانی نیازمند احترام به مرزها و صداقته.'
    },
    {
      c: 'درک متقابل در اوج زیبایی و احترام جلوه‌گر میشه.',
      f: 'اگه جایزه نوبل ایهام و شوخ‌طبعی وجود داشت، الان روی طاقچه بود!',
      co: 'قدرت تصمیم‌گیری قاطع بالاترین شاخصه بلوغ شخصیته.',
      m: 'نوری در تاریکی که تنها جویندگان معنا پیدایش می‌کنند.',
      ma: 'پختگی روانی یعنی عبور از سوءتفاهم‌ها با متانت و خرد.'
    },
    {
      c: 'جذابیت کلام در خدمت عمق بخشیدن به رابطه‌ست.',
      f: 'امشب هم مغزمون سوخت و هم از خنده دلمون درد گرفت!',
      co: 'عزت نفس واقعی در آرامش درونی و عدم نیاز به تایید جلوه می‌کنه.',
      m: 'حقیقتی عمیق که در گذر زمان ارزش خود را نشان می‌دهد.',
      ma: 'مسئولیت‌پذیری اخلاقی پایه و اساس هر رابطه موفقه.'
    },
    {
      c: 'شکوه گفتگو در صداقت و ظرافت نگاه طرفینه.',
      f: 'کاش میشد این دیالوگ‌های پرایهام رو با زیرنویس اختصاصی ثبت کرد!',
      co: 'تکیه بر اصول اخلاقی و اراده پولادین راهگشای من بوده.',
      m: 'سلوک در وادی معنا نیاز به سکوت و تمرکز باطنی دارد.',
      ma: 'مهارت در ارتباط موثر والاترین جلوه هوش هیجانیه.'
    },
    {
      c: 'هم‌زبانی در لایه‌های عمیق فکر، والاترین نوع نزدیکیه.',
      f: 'امشب رکورد فلسفه‌بافی طنزآمیز در تاریخ خاورمیانه جابجا شد!',
      co: 'شجاعت در بیان حقیقت و ایستادگی بر موضع حق افتخار منه.',
      m: 'رمزی که گشودن آن نیاز به درک شهودی و قلبی دارد.',
      ma: 'حفظ وقار، محبت بی‌دریغ و انصاف در تمام لحظات زندگی.'
    }
  ];

  const targetToAdd = 10000;
  const newlyGenerated: ScenarioItem[] = [];
  let duplicatesFiltered = 0;

  let envIdx = 0;
  let punchIdx = 0;
  let tacticIdx = 0;
  let cTplIdx = 0;
  let fTplIdx = 0;
  let coTplIdx = 0;
  let mTplIdx = 0;
  let maTplIdx = 0;
  let seedIdx = 0;
  let genCounter = 1;

  while (newlyGenerated.length < targetToAdd) {
    const itemEnv = deepEnvironments[envIdx % deepEnvironments.length];
    const rawPunch = deepPunches[punchIdx % deepPunches.length];
    const tactic = influenceTactics[tacticIdx % influenceTactics.length];
    const seed = coreSeeds[seedIdx % coreSeeds.length];

    const cTpl = charismaticTemplates[cTplIdx % charismaticTemplates.length];
    const fTpl = funnyTemplates[fTplIdx % funnyTemplates.length];
    const coTpl = confidentTemplates[coTplIdx % confidentTemplates.length];
    const mTpl = mysteriousTemplates[mTplIdx % mysteriousTemplates.length];
    const maTpl = matureTemplates[maTplIdx % matureTemplates.length];

    const variationNumber = Math.floor(genCounter / deepEnvironments.length) + 1;
    let situation = '';
    if (variationNumber === 1) {
      situation = `در ${itemEnv.env} حین گفتگوی عمیق وقتی طرف مقابل می‌پرسد: «${rawPunch}» (${tactic})`;
    } else if (variationNumber === 2) {
      situation = `نفوذ کلامی و شوخ‌طبعی دوپهلو در موقعیت ${itemEnv.tag} با اجرای ${tactic}: «${rawPunch}»`;
    } else if (variationNumber === 3) {
      situation = `پاسخ به سوال عمیق و روانشناختی در ${itemEnv.env} (${itemEnv.trigger}): «${rawPunch}»`;
    } else if (variationNumber === 4) {
      situation = `هدایت ساب‌تکست و ایهام مکالمه در ${itemEnv.tag} (روش ${tactic}): «${rawPunch}»`;
    } else {
      situation = `سناریوی مکالمه عمیق و نفوذ کلامی پیشرفته (${itemEnv.tag} - الگوی ${variationNumber}): «${rawPunch}»`;
    }

    const respCharismatic = cTpl.replace('{core_c}', seed.c);
    const respFunny = fTpl.replace('{core_f}', seed.f);
    const respConfident = coTpl.replace('{core_co}', seed.co);
    const respMysterious = mTpl.replace('{core_m}', seed.m);
    const respMature = maTpl.replace('{core_ma}', seed.ma);

    const sig = normalizePersianText(situation) + '|' + normalizePersianText(respCharismatic);

    if (existingSignatures.has(sig)) {
      duplicatesFiltered++;
    } else {
      existingSignatures.add(sig);

      const hash = crypto.createHash('md5').update(sig).digest('hex').substring(0, 10);
      const id = `scen_p6_${hash}_${String(newlyGenerated.length + 1).padStart(5, '0')}`;

      const title = situation.length > 55 ? situation.substring(0, 55) + '...' : situation;

      const item: ScenarioItem = {
        id,
        title,
        category: 'مکالمات عمیق و نفوذ کلامی پیشرفته',
        situation,
        opponentLine: rawPunch,
        environment: itemEnv.env,
        genderContext: 'general',
        goal: 'ایجاد پیوند روانی عمیق، مدیریت ساب‌تکست و ایهام، هدایت نرم مکالمه و نفوذ کلامی با ۵ لحن مقتدرانه',
        difficulty: 'hard',
        triggers: [rawPunch, itemEnv.trigger],
        aliases: [rawPunch],
        keywords: ['مکالمه عمیق', 'نفوذ کلامی', 'شوخ طبعی دوپهلو', 'ایهام', 'ساب تکست', 'اتصال عاطفی', itemEnv.tag],
        responses: {
          charismatic: respCharismatic,
          funny: respFunny,
          confident: respConfident,
          mysterious: respMysterious,
          mature: respMature
        },
        technique: `${tactic} با بهره‌گیری از زیرمتن‌های هوشمندانه، کنترل فریم و لحن پخته و جذاب.`,
        bodyLanguage: 'تماس چشمی عمیق و پایدار، تن صدای آرام و بم، ریتم گفتاری شمرده و بدون شتاب‌زدگی.',
        teachingNote: 'در گفتگوهای عمیق، نفوذ کلام از شنیدن ژرف و ایجاد امنیت روانی ناشی می‌شود، نه از حجم زیاد صحبت کردن.',
        tips: 'استفاده از مکث‌های معنادار، حفظ لبخند ملیح و پرهیز از تدافعی شدن در برابر پرسش‌های پرابهام.',
        nextMove: 'دعوت به کشف بیشتر ابعاد موضوع با یک پرسش باز و نگاه صمیمانه و نافذ.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      newlyGenerated.push(item);
    }

    envIdx++;
    punchIdx = (punchIdx + 3);
    tacticIdx = (tacticIdx + 7);
    cTplIdx = (cTplIdx + 1);
    fTplIdx = (fTplIdx + 3);
    coTplIdx = (coTplIdx + 5);
    mTplIdx = (mTplIdx + 2);
    maTplIdx = (maTplIdx + 4);
    seedIdx = (seedIdx + 1);
    genCounter++;
  }

  console.log(`Newly generated count in Part 6: ${newlyGenerated.length}`);
  console.log(`Duplicates filtered: ${duplicatesFiltered}`);

  // Combine locked current expanded (59,425) + newly generated part 6 (10,000)
  const cumulativeArray: ScenarioItem[] = [...currentExpanded, ...newlyGenerated];
  const cumulativeTotal = cumulativeArray.length; // 69,425

  console.log(`Cumulative Total (59,425 + 10,000): ${cumulativeTotal}`);

  // Write updated cumulative array to data/production/expanded_bank.json
  fs.writeFileSync(expandedPath, JSON.stringify(cumulativeArray, null, 2), 'utf8');

  // Also sync data/scenarios.json and data/coach/scenarios.json
  fs.writeFileSync(scenariosPath, JSON.stringify(cumulativeArray, null, 2), 'utf8');
  if (fs.existsSync(path.dirname(coachScenariosPath))) {
    fs.writeFileSync(coachScenariosPath, JSON.stringify(cumulativeArray, null, 2), 'utf8');
  }

  // Verify write on disk
  const verifyDisk = JSON.parse(fs.readFileSync(expandedPath, 'utf8'));
  const verifyScenarios = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));
  const isValid = Array.isArray(verifyDisk) && 
                  verifyDisk.length === cumulativeTotal &&
                  verifyScenarios.length === cumulativeTotal;

  console.log(`Disk Verification: Length = ${verifyDisk.length} | Valid = ${isValid}`);

  return {
    baseLockedCount,
    newlyAddedInThisPart: newlyGenerated.length,
    cumulativeTotalCount: cumulativeTotal,
    jsonValid: isValid ? 'Yes' : 'No',
    duplicatesFiltered
  };
}

if (process.argv[1] && process.argv[1].endsWith('generate_part6_batch.ts')) {
  const res = runPart6Generation();
  console.log('\n--- PART 6 COMPLETED RESULT ---');
  console.log(JSON.stringify(res, null, 2));
}
