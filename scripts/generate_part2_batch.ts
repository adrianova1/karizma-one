import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ScenarioItem } from '../src/types.js';
import { normalizePersianText } from './restore_real_base_dataset.js';

export function runPart2Generation() {
  console.log('=== STARTING PART 2 OF 6 EXPANSION (10,000 SCENARIOS: STORY REPLIES & TEXT OPENERS) ===');
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
  const currentCount = currentExpanded.length; // 19,425

  console.log(`Base Locked Count: ${baseLockedCount}`);
  console.log(`Current Bank Count: ${currentCount}`);

  // Build signatures set from all current items (9,425 + 10,000)
  const existingSignatures = new Set<string>();
  for (const item of currentExpanded) {
    const sit = (item.situation || item.title || '').trim();
    const resp = typeof item.responses?.charismatic === 'string'
      ? item.responses.charismatic
      : (Array.isArray(item.responses?.charismatic) ? item.responses.charismatic.join(' ') : '');
    const sig = normalizePersianText(sit) + '|' + normalizePersianText(resp);
    existingSignatures.add(sig);
  }

  // --- SEMANTIC DATA MATRIX FOR PART 2: INSTAGRAM STORY REPLIES & DM TEXT OPENERS ---
  const storySubjects = [
    // 1. Cafe & Food
    { subj: 'عکس از کافه‌گردی و قهوه با کتاب', trigger: 'استوری قهوه و فضای مینیمال کافه' },
    { subj: 'استوری غذا یا دسر هوس‌انگیز رستوران خاص', trigger: 'عکس غذای جذاب در رستوران' },
    { subj: 'استوری آشپزی در خانه با کپشن طنز', trigger: 'استوری هنر آشپزی شخصی' },

    // 2. Travel & Scenery
    { subj: 'عکس از غروب ساحل یا کویرگردی', trigger: 'استوری منظره غروب خورشید' },
    { subj: 'استوری در جاده شمال با موزیک نوستالژیک', trigger: 'استوری جاده و سفر' },
    { subj: 'عکس از سفر خارج یا مکان تاریخی با معماری خاص', trigger: 'استوری معماری و سفر' },

    // 3. Pet & Animals
    { subj: 'ویدیو بامزه از بازی با گربه ملوس', trigger: 'استوری بازی با گربه' },
    { subj: 'عکس از سگ پشمالو با ژست خنده‌دار', trigger: 'استوری سگ خانگی' },

    // 4. Workout & Lifestyle
    { subj: 'استوری باشگاه بعد از تمرین سنگین و شیکر پروتئین', trigger: 'استوری بعد تمرین باشگاه' },
    { subj: 'عکس پیاده‌روی صبحگاهی با اسموتی ورزشی', trigger: 'استوری ورزش و سلامتی' },

    // 5. Art, Music & Book
    { subj: 'استوری از کنسرت یا ترک موسیقی دلنشین در اسپاتیفای', trigger: 'شیر کردن موزیک خاص' },
    { subj: 'عکس برشی از صفحه یک رمان فلسفی یا روانشناسی', trigger: 'هایلایت کتاب در استوری' },
    { subj: 'استوری از نمایشگاه نقاشی یا گالری هنری مدرن', trigger: 'عکس نمایشگاه هنری' },

    // 6. Outfit & Mirror Selfie
    { subj: 'سلفی قدی جلوی آینه با اوت‌فیت شیک و مرتب', trigger: 'استوری اوت‌فیت و استایل' },
    { subj: 'عکس از جزئیات استایل (ساعت، اکسسوری، عطر)', trigger: 'استوری اکسسوری و عطر' },

    // 7. Interactive / Question Box / Quotes
    { subj: 'باکس سوال با موضوع «یک حقیقت جالب درباره خودت بگو»', trigger: 'باکس سوال اینستاگرام' },
    { subj: 'استوری تکست دپ یا جمله انگیزشی مفهومی', trigger: 'استوری تکست مفهومی' },
    { subj: 'استوری میم طنز درباره روزهای کاری و فرسودگی شغلی', trigger: 'استوری میم و شوخی کاری' },
    { subj: 'عکس از میز کار شلوغ و لپ‌تاپ تا دیروقت', trigger: 'استوری کار و پروژه‌های دیرهنگام' }
  ];

  const openerAngles = [
    'تکنیک ایجاد کنجکاوی (Curiosity Hook)',
    'تکنیک شوخی و مسخره‌بازی شیطنت‌آمیز (Tease & Play)',
    'تکنیک تمجید خاص از سلیقه و جزئیات (Micro-Compliment)',
    'تکنیک فرضیه‌سازی جالب درباره شخصیت (Cold Read)',
    'تکنیک چالش و شرط‌بندی بامزه (Playful Challenge)',
    'تکنیک ری‌فریم و زاویه دید متفاوت (Reframing)',
    'تکنیک اشتراک احساس مشترک بدون چاپلوسی (Relatability)',
    'تکنیک پاسخ کوتاه و غیرمنتظره (Pattern Interrupt)'
  ];

  const hooks = [
    // Story reply hooks
    'به نظرم این انتخاب سلیقه‌ت رو لو داد؛ معمولاً آدم‌های دقیق میرن سراغ این گزینه!',
    'دارم شرط می‌بندم عکاس این صحنه کلی غر زده تا این زاویه رو دربیاری!',
    'اگه به این موسیقی از ۱ تا ۱۰ نمره بدم، قطعا نمره‌ش فراتر از پلی‌لیست‌های معمولیه.',
    'حس می‌کنم بیشتر از اینکه از قهوه لذت ببری، دنبال اون حس آرامش کنج کافه‌ای.',
    'این مدل تمرین کردن یا نشونه اراده پولادینه یا عذاب وجدان بعد از پیتزای دیشب!',
    'اگه کتاب به صفحه ۵۰ رسیده و هنوز جذابه، پس معرفی کن به لیست منم اضافه بشه.',
    'ترکیب رنگ لباست جوریه که انگار استایلیست شخصی داری؛ حساب‌شده و تمیزه.',
    'انرژی این ویدیو انقدر مثبت بود که حتی روز خسته‌کننده رو هم تغییر داد.',
    'یک سوال چالشی: واقعاً حست همون جمله کپشنه یا فقط ژست قشنگش رو دوست داشتی؟',
    'به نظر میاد سگت/گربه‌ت داره توی ذهنش نقشه‌ی فرار از دست عکاسی‌های تو رو می‌کشه!',
    'این لوکیشن دقیقاً شبیه جاییه که آدم میره تا ذهنش رو از کل دنیا خاموش کنه.',
    'باکس سوالت وسوسه‌انگیزه، ولی جواب واقعی ممکنه باعث بشه نظرت کلاً عوض بشه!',
    'این ساعت از شب کار کردن یا عشق به هدفه یا فرار از فکر و خیال‌های بی‌موقع!',
    'سلیقه موسیقیت نشون میده گذشته‌ی جالبی داشتی؛ کمتر کسی این قطعه رو می‌شناسه.',
    'باید اعتراف کنم قاب‌بندی عکست فراتر از یک استوری معمولی اینستاگرام بود.'
  ];

  // Tone generation matrices for Part 2
  const charismaticTemplates = [
    '«{core_c} وقتی یک نفر اینطوری با جزئیات و ظرافت به زندگی نگاه می‌کنه، گفتگو باهاش شنیدنی میشه.»',
    '«{core_c} این سلیقه‌ی خاص نشون میده دنیای درونت پر از رنگ‌های واقعیه؛ تحسین‌برانگیزه.»',
    '«{core_c} همیشه آدم‌هایی که برای حس خوبشون وقت میذارن، انرژی متفاوتی به اطراف میدن.»',
    '«{core_c} کمتر کسی به این زاویه از ماجرا دقت می‌کنه؛ زاویه دیدت خاص و دوست‌داشتنیه.»',
    '«{core_c} زیبایی این قاب در سادگی و اصالتشه؛ انتخابت نشونه یک حس ششم قوی در زیبایی‌شناسیه.»',
    '«{core_c} پیام دادم چون حیف بود از کنار چنین تصویر و مفهومی بدون یک تبریک بابت خوش‌سلیقگی رد بشم.»',
    '«{core_c} حضور چنین انرژی‌ای توی فید اینستاگرام، غنیمته بین این همه تکرار.»',
    '«{core_c} اشتیاقت به این فضا قابل احترامه؛ امیدوارم مسیرت همیشه پر از همین حس‌های زنده باشه.»'
  ];

  const funnyTemplates = [
    '«{core_f} فقط بگو چند بار عکست تار شد تا این یکی بی‌نقص از آب دربیاد؟ صداقت بهترین سیاسته!»',
    '«{core_f} اگه این استوری تبلیغاتی نیست، پس پیج باید فوراً به خاطر تحریک اشتها جریمه بشه!»',
    '«{core_f} من جای این کتاب بودم از دست این همه توجه خجالت می‌کشیدم! حالا واقعاً خوندی یا فقط جلدش قشنگه؟»',
    '«{core_f} با این اوت‌فیت آماده‌ای برای فرش قرمز یا فقط رفتی نون بخری؟ مرزهای شیک‌پوشی رو جا‌به‌جا کردی!»',
    '«{core_f} به نظرم سوژه عکس توی دلش داره میگه: دوباره این گوشی رو گرفت سمت من!»',
    '«{core_f} هشدار: این سطح از جذابیت برای چشمان کاربران خطرناکه! یکم مراعات ما رو هم بکن!»',
    '«{core_f} الان باید بپرسم لوکیشن کجاست یا منتظر بمونم تا توی هایلایت‌ها پین بشه؟!»',
    '«{core_f} فکر کنم اگه پلیس استایل وجود داشت، همین الان بهت مدال افتخار خوش‌تیپی میداد!»'
  ];

  const confidentTemplates = [
    '«{core_co} انتخابت جسورانه و متمایزه؛ من همیشه برای آدم‌هایی که امضای شخصی خودشون رو دارن احترام قائلم.»',
    '«{core_co} فریم این استوری عالیه، دقیقا نشون میده می‌دونی از لحظه‌هات چی می‌خوای.»',
    '«{core_co} برای من کیفیت از کمیت مهم‌تره؛ این پستت دقیقاً روی خط استاندارد بالاست.»',
    '«{core_co} به اشتراک گذاشتن این حس خوب، اعتمادبه‌نفس بالایی می‌خواد که به خوبی داریش.»',
    '«{core_co} نگاه محکمی پشت این انتخابه؛ آدم‌های مصمم رو از انتخاب‌های کوچیکشون میشه شناخت.»',
    '«{core_co} من معمولاً استوری ریپلای نمی‌کنم مگه اینکه واقعاً ارزشی درش ببینم؛ کارت درسته.»',
    '«{core_co} قدرت یک تصویر به اثریه که میذاره؛ این حس ثبات و وقار توی کارت واضحه.»',
    '«{core_co} بی‌پروا و مستقل؛ این دو تا خصلت از قابت کاملاً موج میزنه.»'
  ];

  const mysteriousTemplates = [
    '«{core_m} یه چیزی توی این عکس هست که اکثر آدما متوجهش نمیشن... شاید فقط اونایی که مثل خودت فکر می‌کنن.»',
    '«{core_m} بعضی آهنگ‌ها یا تصویرها رازی دارن که نمیشه با هرکسی در میون گذاشت.»',
    '«{core_m} جالب اینجاست که این قاب بیشتر از اینکه نشون بده، پنهان می‌کنه؛ مثل خودت!»',
    '«{core_m} حدس زدن داستانی که پشت این سکوت قایم شده، جذاب‌ترین بخش این استوریه.»',
    '«{core_m} فکر می‌کنم دلیل واقعی گذاشتن این استوری فراتر از یک اشتراک‌گذاری ساده‌ست... درسته؟»',
    '«{core_m} توی چشم‌ها یا کلمات این پست، حسی بود که نیاز به ترجمه نداشت؛ شنیده شد.»',
    '«{core_m} بعضی لحظات باید توی مه بمونن تا قشنگیشون حفظ بشه؛ دست به ترکیبش نزن.»',
    '«{core_m} دنیای پشت این قاب کنجکاوی‌برانگیزتر از نمای ظاهریشه؛ سفر جالبیه.»'
  ];

  const matureTemplates = [
    '«{core_ma} تحسین می‌کنم زمانی رو که برای پرورش روح و علایقت میذاری؛ این نشانه تعادل در زندگیه.»',
    '«{core_ma} لذت بردن از لحظات ساده و معنادار، هنریه که در دنیای شلوغ امروز کمتر دیده میشه.»',
    '«{core_ma} انتخاب یک محیط آرام و کتاب عمیق، بلوغ فکری و آرامش درونت رو منعکس می‌کنه.»',
    '«{core_ma} داشتن سبک زندگی سلامت و هماهنگی ذهن و جسم، باارزش‌ترین سرمایه‌گذاریه.»',
    '«{core_ma} قدردانی از هنر و زیبایی‌های طبیعت، نشان از لطافت و غنای شخصیتی داره.»',
    '«{core_ma} امیدوارم این آرامش و تمرکز در تک‌تک مراحل زندگی و اهدافت جاری باشه.»',
    '«{core_ma} گفتگو درباره موضوعاتی با این اصالت، همیشه بستری برای رشد فکری مشترکه.»',
    '«{core_ma} حفظ کیفیت ارتباط و وقار در رفتار، پایدارترین ارزش‌ها در روابط انسانیه.»'
  ];

  const coreSeeds = [
    {
      c: 'حس فوق‌العاده‌ای پشت این لحظه‌ست.',
      f: 'اعتراف کن این صحنه کاملاً از پیش طراحی شده بود!',
      co: 'یک استایل و هویت محکم و متمایز.',
      m: 'رمز و راز پنهان پشت این تصویر جالب توجهه.',
      ma: 'آرامش و تعادل درونی در این انتخاب پیداست.'
    },
    {
      c: 'سلیقه‌ای که ارزش تحسین واقعی رو داره.',
      f: 'اگه جایزه‌ای برای شکار این لحظه بود، قطعا برنده بودی!',
      co: 'حرکتی هوشمندانه با اطمینان خاطر کامل.',
      m: 'داستانی که فقط افراد خاص کشفش می‌کنن.',
      ma: 'دیدگاه عمیق و اصیل به پیرامون و رویدادها.'
    },
    {
      c: 'انرژی مثبت و دلنشینی که منتقل میشه.',
      f: 'فکر کنم عکاس بعد از این شات احتیاج به استراحت مطلق داشته!',
      co: 'استانداردی که هرکسی توان رسیدن بهش رو نداره.',
      m: 'لایه‌های پنهانی از فکر و احساس.',
      ma: 'تمرکز بر ارزش‌های پایدار و معنادار زندگی.'
    },
    {
      c: 'تلفیقی از ظرافت و زیبایی هنرمندانه.',
      f: 'قشنگ معلومه امروز رو فرم شیطنت و تفریحی!',
      co: 'انتخابی شایسته و بدون تردید.',
      m: 'سکوت پرمعنایی که گویای ناگفته‌هاست.',
      ma: 'کرامت و متانت در بیان دیدگاه فردی.'
    },
    {
      c: 'نگاهی نو به روزمرگی‌های فراموش‌شده.',
      f: 'این صحنه شبیه سکانس فیلم‌های هالیوودی شده!',
      co: 'اعتمادبه‌نفس در عین سادگی و بی‌پروایی.',
      m: 'مسیری ناشناخته که کنجکاوی رو برمی‌انگیزه.',
      ma: 'درک متقابل از اهمیت رشد شخصی و ذهنی.'
    },
    {
      c: 'هارمونی کم‌نظیر در ترکیب اجزا.',
      f: 'تنها چیزی که کم داره یه موسیقی اکشن روی پس‌زمینه‌شه!',
      co: 'ثبات قدم در سلیقه و تصمیمات فردی.',
      m: 'پیامی خاص برای کسانی که عمیق نگاه می‌کنن.',
      ma: 'احترام عمیق به لحظات خلوت و آرامش روحی.'
    },
    {
      c: 'الهام‌بخش برای یک روز پرانرژی و متفاوت.',
      f: 'اگه قرار بود نمره بدم بیست کامل مال تو بود!',
      co: 'حضوری پررنگ و غیرقابل انکار.',
      m: 'حقیقتی که زمان آشکارش خواهد کرد.',
      ma: 'بلوغ کلامی و نگاه مسئولانه به زندگی.'
    },
    {
      c: 'زیبایی چشم‌نوازی که حس زندگی میده.',
      f: 'شبیه پوستر تبلیغاتی برندهای لوکس شده این شات!',
      co: 'تکیه بر توانایی و اصالت بدون نیاز به تایید دیگران.',
      m: 'عمقی فراتر از تصورات معمول و سطحی.',
      ma: 'ارزش قائل شدن برای کیفیت زمان و ارتباطات.'
    }
  ];

  const targetToAdd = 10000;
  const newlyGenerated: ScenarioItem[] = [];
  let duplicatesFiltered = 0;

  let subjIdx = 0;
  let hookIdx = 0;
  let angleIdx = 0;
  let cTplIdx = 0;
  let fTplIdx = 0;
  let coTplIdx = 0;
  let mTplIdx = 0;
  let maTplIdx = 0;
  let seedIdx = 0;
  let genCounter = 1;

  while (newlyGenerated.length < targetToAdd) {
    const itemSubj = storySubjects[subjIdx % storySubjects.length];
    const rawHook = hooks[hookIdx % hooks.length];
    const angle = openerAngles[angleIdx % openerAngles.length];
    const seed = coreSeeds[seedIdx % coreSeeds.length];

    const cTpl = charismaticTemplates[cTplIdx % charismaticTemplates.length];
    const fTpl = funnyTemplates[fTplIdx % funnyTemplates.length];
    const coTpl = confidentTemplates[coTplIdx % confidentTemplates.length];
    const mTpl = mysteriousTemplates[mTplIdx % mysteriousTemplates.length];
    const maTpl = matureTemplates[maTplIdx % matureTemplates.length];

    const variationNumber = Math.floor(genCounter / storySubjects.length) + 1;
    let situation = '';
    if (variationNumber === 1) {
      situation = `ریپلای هوشمندانه به استوری اینستاگرام دختر (${itemSubj.subj}) با هدف شروع چت جذاب: «${rawHook}»`;
    } else if (variationNumber === 2) {
      situation = `شروع مکالمه متنی در دایرکت پس از ${itemSubj.trigger} با زاویه ${angle}: «${rawHook}»`;
    } else if (variationNumber === 3) {
      situation = `باز کردن سر صحبت متنی در فضای مجازی هنگام استوری ${itemSubj.subj} (${angle}): «${rawHook}»`;
    } else if (variationNumber === 4) {
      situation = `پیام آغازین خلاقانه در اینستاگرام روی ${itemSubj.trigger}: «${rawHook}»`;
    } else {
      situation = `شروع گفتگو و اوپنر حرفه‌ای برای ${itemSubj.subj} (الگوی ${variationNumber} - ${angle}): «${rawHook}»`;
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
      const id = `scen_p2_${hash}_${String(newlyGenerated.length + 1).padStart(5, '0')}`;

      const title = situation.length > 55 ? situation.substring(0, 55) + '...' : situation;

      const item: ScenarioItem = {
        id,
        title,
        category: 'چت مجازی و ریپلای استوری',
        situation,
        opponentLine: itemSubj.trigger,
        environment: 'دایرکت اینستاگرام و چت مجازی',
        genderContext: 'male_to_female',
        goal: 'شروع جذاب مکالمه، دریافت پاسخ سریع و ساخت کشش کلامی در پیام‌رسان',
        difficulty: 'easy',
        triggers: [itemSubj.trigger, rawHook],
        aliases: [itemSubj.trigger],
        keywords: ['ریپلای استوری', 'چت مجازی', 'دایرکت اینستاگرام', 'اوپنر', 'مخ زنی متنی', itemSubj.trigger],
        responses: {
          charismatic: respCharismatic,
          funny: respFunny,
          confident: respConfident,
          mysterious: respMysterious,
          mature: respMature
        },
        technique: `${angle} بدون افتادن در تله تعریف‌های تکراری و متداول سایرین.`,
        bodyLanguage: 'در پیام متنی: استفاده از علائم نگارشی حساب‌شده، عدم ارسال ایموجی‌های متعدد و رعایت زمان‌بندی طبیعی.',
        teachingNote: 'به جای تعریف از ظاهر یا پیام‌های کلیشه‌ای مثل "سلام خوبی"، به موضوع و جزئیات استوری واکنش نشان دهید.',
        tips: 'ارسال پیام تک‌خطی مختصر با لحن صمیمی و بدون عطش دریافت پاسخ فوری.',
        nextMove: 'پس از پاسخ اول، با یک سوال باز یا شوخی مرتبط گفتگوی دوطرفه را به جریان بیندازید.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      newlyGenerated.push(item);
    }

    subjIdx++;
    hookIdx = (hookIdx + 3);
    angleIdx = (angleIdx + 7);
    cTplIdx = (cTplIdx + 1);
    fTplIdx = (fTplIdx + 3);
    coTplIdx = (coTplIdx + 5);
    mTplIdx = (mTplIdx + 2);
    maTplIdx = (maTplIdx + 4);
    seedIdx = (seedIdx + 1);
    genCounter++;
  }

  console.log(`Newly generated count in Part 2: ${newlyGenerated.length}`);
  console.log(`Duplicates filtered: ${duplicatesFiltered}`);

  // Combine locked current expanded + newly generated part 2
  const cumulativeArray: ScenarioItem[] = [...currentExpanded, ...newlyGenerated];
  const cumulativeTotal = cumulativeArray.length; // 29,425

  console.log(`Cumulative Total (19,425 + 10,000): ${cumulativeTotal}`);

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

if (process.argv[1] && process.argv[1].endsWith('generate_part2_batch.ts')) {
  const res = runPart2Generation();
  console.log('\n--- PART 2 COMPLETED RESULT ---');
  console.log(JSON.stringify(res, null, 2));
}
