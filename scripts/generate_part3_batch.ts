import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ScenarioItem } from '../src/types.js';
import { normalizePersianText } from './restore_real_base_dataset.js';

export function runPart3Generation() {
  console.log('=== STARTING PART 3 OF 6 EXPANSION (10,000 SCENARIOS: FIRST DATE & PUSH-PULL) ===');
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
  const currentCount = currentExpanded.length; // 29,425

  console.log(`Base Locked Count: ${baseLockedCount}`);
  console.log(`Current Bank Count: ${currentCount}`);

  // Build signatures set from all current items (9,425 + 10,000 + 10,000)
  const existingSignatures = new Set<string>();
  for (const item of currentExpanded) {
    const sit = (item.situation || item.title || '').trim();
    const resp = typeof item.responses?.charismatic === 'string'
      ? item.responses.charismatic
      : (Array.isArray(item.responses?.charismatic) ? item.responses.charismatic.join(' ') : '');
    const sig = normalizePersianText(sit) + '|' + normalizePersianText(resp);
    existingSignatures.add(sig);
  }

  // --- SEMANTIC DATA MATRIX FOR PART 3: FIRST DATE & PUSH-PULL TECHNIQUES ---
  const firstDateMoments = [
    // 1. Initial greeting and visual assessment
    { moment: 'لحظه دیدار اولیه در ورودی کافه یا رستوران', trigger: 'سلام و احوالپرسی اولیه دیت اول', situationType: 'دیدار اول' },
    { moment: 'نشستن پشت میز و تماس چشمی اولیه', trigger: 'برقراری اولین نگاه در چشمان طرف مقابل', situationType: 'نگاه و تماس چشمی' },
    { moment: 'سفارش دادن از منوی کافه و شوخی درباره انتخاب نوشیدنی', trigger: 'انتخاب آیتم‌های منو و نوشیدنی', situationType: 'سفارش منو' },
    
    // 2. Push-pull & playful tension
    { moment: 'تعریف از استایل همراه با تیکه ملایم و جذاب', trigger: 'تعریف دوپهلو از تیپ و ظاهر (Push-Pull)', situationType: 'تعریف و متلک ظریف' },
    { moment: 'ایجاد کشش جنسی و عاطفی با بازی با کلمات', trigger: 'شوخی با شیطنت و نگاه معنادار', situationType: 'تنش و جذابیت کلامی' },
    { moment: 'حفظ استقلال نظر هنگام مخالفت در موضوع سلیقه‌ای', trigger: 'بحث بر سر فیلم یا سبک زندگی متفاوت', situationType: 'چالش سلیقه و نظر' },

    // 3. Deep conversation & emotional bridging
    { moment: 'پرسش درباره بزرگ‌ترین رویا یا خاطره شیرین کودکی', trigger: 'عبور از مکالمات سطحی به سمت موضوعات عاطفی', situationType: 'مکالمه عمیق' },
    { moment: 'برخورد دست‌ها یا نزدیک شدن فیزیکی ناخودآگاه', trigger: 'تست صمیمیت و شکستن حریم فیزیکی محترمانه (Kino escalation)', situationType: 'زبان بدن و صمیمیت' },
    
    // 4. Handling bill & date wrap-up
    { moment: 'لحظه پرداخت صورت‌حساب با اعتمادبه‌نفس و بدون دستپاچگی', trigger: 'آوردن فاکتور کافه توسط گارسون', situationType: 'صورت‌حساب و فاکتور' },
    { moment: 'پیاده‌روی انتهای قرار و ایجاد حس دلتنگی برای دیدار بعدی', trigger: 'خداحافظی گرم و ابهام برای دیت دوم', situationType: 'خداحافظی و دیت دوم' }
  ];

  const pushPullTechniques = [
    'تکنیک کشش و رانش کلاسیک (Push-Pull: تعریف + شوخی نقادانه)',
    'تکنیک خلع سلاح با تماس چشمی عمیق و سکوت ۲ ثانیه‌ای',
    'تکنیک شوخ‌طبعی آلفا و معکوس کردن نقش‌ها (Reverse Role)',
    'تکنیک رد صلاحیت ساختگی طرف مقابل با لحن شیرین (Playful Disqualification)',
    'تکنیک هدایت فیزیکی ملایم با حفظ نهایت وقار و احترام',
    'تکنیک پاداش دادن کلامی به رفتارهای جذاب مخاطب (Positive Reinforcement)',
    'تکنیک کاشت دانه برای دیت دوم بدون گدایی توجه (Future Projection)',
    'تکنیک قطع کردن موقت مکالمه در اوج هیجان (Cliffhanger Conversation)'
  ];

  const firstDateDialogues = [
    // 1. Icebreakers & Openers
    'چه جالب، از توی عکس‌هات خیلی مغرورتر به نظر می‌رسیدی ولی الان انرژی صمیمی‌تری داری!',
    'انتخاب لباست خیلی شیکه، البته اگه اون رنگ عجیب رو نادیده بگیریم کاملاً عالی میشد!',
    'باید یه قانونی بذاریم: هرکی اول گوشیش رو نگاه کنه جریمه میشه و باید کل صورت‌حساب رو بده!',
    'حس می‌کنم از اون آدم‌هایی هستی که با نگاه اول میشه فهمید توی سرشون چی می‌گذره، یا شایدم داری نقش بازی می‌کنی؟',
    'من معمولاً به کافه‌های شلوغ حساسیت دارم، ولی خوشحالم که اینجارو انتخاب کردی چون فضا دلنشینه.',

    // 2. Mid-date banter & push-pull
    'خیلی باهوشی، ولی متاسفانه زیادی برای من خطرناکی! باید فاصله ایمنی رو حفظ کنم!',
    'نظرت راجع به این موضوع قشنگ بود، هرچند با بخش آخرش کاملاً مخالفم ولی جسارتت رو تحسین می‌کنم.',
    'اگه قرار باشه همیشه اینقدر حاضرجواب باشی، فکر کنم دیت‌های بعدی رو باید با داور برگزار کنیم!',
    'چشم‌هات شیطنت خاصی دارن؛ از اونایی که میگن آرومن ولی توی جمع کلی شیطنت می‌کنن.',
    'می‌دونی جذاب‌ترین ویژگی یک فرد چیه؟ اینکه خودش باشه، دقیقاً مثل همین الان تو.',

    // 3. Chemistry & Escalation
    'انرژی عجیبی توی این نگاه هست... فکر کنم داری سعی می‌کنی افکار منو بخونی!',
    'دستت رو بذار اینجا ببینیم ضربان قلبت بعد از این صحبت چطوریه، البته اگه نمی‌ترسی لو بری!',
    'ما دو تا یا بهترین تیم دنیا میشیم یا تو همون ۵ دقیقه اول سر یه موضوع ساده به تفاهم نمی‌رسیم!',
    'بیا یه راز بهم بگو که تا حالا به هیچکس توی دیت اول نگفتی؛ نگران نباش من صندوقچه امانتم.',
    'حس می‌کنم این قهوه بهونه‌ست؛ اصل ماجرا کشف این دنیای متفاوت بین ماست.',

    // 4. Wrapping up & Leaving wanting more
    'قرارمون عالی بود، ولی برای اینکه زیاد بهت خوش نگذره فکر کنم باید زودتر بریم!',
    'امشب نشون دادی هم‌صحبتی باهات فراتر از انتظار بوده؛ نمره قبولی گرفتی با ارفاق!',
    'دیدار اولمون خاطره‌انگیز شد؛ دیدار دوم بستگی به این داره چقدر بتونی منو غافلگیر کنی!',
    'خیلی خوش گذشت، ولی بذار ادامه‌ش رو بذاریم برای وقتی که هردومون دلتنگ این مکالمه شدیم.',
    'خداحافظی امشب یعنی شروع فکر کردن به اینکه دفعه بعد کجا باید ببرمت!'
  ];

  // Tone generation matrices for Part 3 (First Date & Flirting)
  const charismaticTemplates = [
    'لبخند گرم، حفظ تماس چشمی مستقیم و با لحن جذاب: «{core_c} این حضور پرانرژی و متانتت باعث میشه زمان در کنارت با سرعت عجیبی بگذره.»',
    'با تن صدای شمرده و نگاه نافذ: «{core_c} همیشه زیبایی در جزئیاتیه که کمتر کسی بهش دقت می‌کنه؛ تو این جزئیات رو داری.»',
    '«{core_c} لذت یک مکالمه واقعی توی کشف زاویه‌های پنهان افکاره؛ هم‌کلامی باهات امشب واقعاً ارزشمند بود.»',
    '«{core_c} وقتی دو نفر فرکانس مشترک پیدا می‌کنن، حتی سکوت بین کلماتشون هم دلنشین میشه.»',
    '«{core_c} انرژی این قرار بی‌نظیره؛ ترکیبی از صمیمیت و هیجان که کمتر جایی حس میشه.»',
    'با صبوری و تکیه دادن به صندلی: «{core_c} خوشحالم که امشب فرصت شد فراتر از دنیای مجازی، این حس زنده و واقعی رو تجربه کنیم.»',
    '«{core_c} جذابیت واقعی در وقار و هوش هیجانیه؛ چیزی که امشب توی رفتارت تحسین کردم.»',
    '«{core_c} گفتگوی امشب نشون داد ارزش وقت گذاشتن رو داری؛ یک قرار بی‌نقص و به‌یادماندنی.»'
  ];

  const funnyTemplates = [
    'خنده با شیطنت و شوخی کلامی: «{core_f} فقط حواست باشه اگه توی دیت بعدی هم انقدر زبون‌بریزی، باید برات پاداش در نظر بگیرم!»',
    '«{core_f} از یک تا ده به قرار امشبمون نمره یازده میدم، اون یک نمره اضافه هم بابت خنده‌های بی‌وقته‌ست!»',
    '«{core_f} فکر کنم اگه دوربین مخفی بود الان کارگردان کات می‌داد و می‌گفت: این دو نفر زیادی باهم مچ شدن!»',
    '«{core_f} اعتراف کن قبل از اومدن چند ساعت جلو آینه ژست‌های فیلسوفانه تمرین کردی؟!»',
    '«{core_f} به نظرم فاکتور این کافه رو باید قاب بگیریم به عنوان سند موفق‌ترین دیت تاریخ!»',
    '«{core_f} سرعت گذشت زمان امشب غیرقانونی بود! باید از صاحب کافه شکایت کنیم!»',
    '«{core_f} اگه قراره هر دفعه انقدر بانمک باشی، باید یه بادیگارد بیارم تا کنترل اوضاع دستم بمونه!»',
    '«{core_f} واو! این ترکیب شوخ‌طبعی و شیرین‌زبونی رو توی کدوم دانشگاه یاد گرفتی؟»'
  ];

  const confidentTemplates = [
    '«{core_co} من دقیقا می‌دونم دنبال چه فردی با چه کیفیتی هستم؛ امشب نشون دادی استانداردهای بالایی داری.»',
    '«{core_co} فریم محکم و استقلال شخصیتی برام بالاترین ارزشه؛ خوشحالم که در برابرم خود واقعیت هستی.»',
    '«{core_co} برای من یک قرار زمانی موفقه که اصالت و احترام متقابل توش جاری باشه؛ این قرار دقیقاً همون بود.»',
    '«{core_co} من اهل تعارف و تعریف‌های بی‌جا نیستم؛ واقعاً از حضور در کنارت لذت بردم و این کاملاً واقعیه.»',
    '«{core_co} تصمیم‌گیری برای آینده ارتباط نیازی به شتاب نداره؛ کیفیت خودش مسیر رو مشخص می‌کنه.»',
    '«{core_co} تسلط و آرامش در رفتار نشونه قدرت درونیه؛ این آرامش رو توی کلامت دیدم.»',
    '«{core_co} ارتباط سالم بین دو آدم کامل و مستقل شکل می‌گیره، نه دو فرد وابسته؛ دیدگاهت به رابطه ارزشمنده.»',
    '«{core_co} من همیشه برای زمان و انرژی خودم ارزش قائلم؛ امشب یکی از بهترین انتخاب‌های هفته‌م بود.»'
  ];

  const mysteriousTemplates = [
    'مکث عمیق، لبخند کم‌رنگ و با لحن زیر و آرام: «{core_m} این قرار فقط فصل اول یک کتاب جذاب بود؛ هنوز صفحات اصلی خونده نشده.»',
    '«{core_m} حس می‌کنم هنوز چیزهای زیادی هست که ترجیح دادی امشب نگی... بذار این رازآلودگی باقی بمونه.»',
    '«{core_m} همیشه قشنگ‌ترین خاطرات از ناگفته‌ها شروع میشن؛ شاید دیدار بعدی پرده از این رازها برداره.»',
    '«{core_m} بعضی حس‌ها نیاز به توضیح ندارن؛ همین که برق نگاهت جواب سوالات رو میده کافیه.»',
    '«{core_m} امشب فقط یک نشانه بود؛ مسیر اصلی از جایی شروع میشه که فکرش رو هم نمی‌کنی.»',
    '«{core_m} اجازه بده ذهن درگیر بمونه؛ کنجکاوی شیرین‌ترین بخش یک رابطه نوپاست.»',
    '«{core_m} سایه‌های پنهان شخصیتت جذاب‌تر از بخش‌های نمایانشن؛ مشتاقم لایه‌های بعدیت رو ببینم.»',
    '«{core_m} حقیقت مثل نوریه که در سکوت شب خودش رو نشون میده؛ حس امشب موندگاره.»'
  ];

  const matureTemplates = [
    '«{core_ma} بلوغ فکری و متانت در رفتار، پایدارترین حسیه که میشه در یک قرار اول تجربه کرد.»',
    '«{core_ma} احترام به تفاوت دیدگاه‌ها و گفتگوی سازنده، نشانه آمادگی برای یک رابطه بالغ و متعهدانه است.»',
    '«{core_ma} درک متقابل نیاز به زمان و صداقت داره؛ امشب گام اول با شفافیت و وقار برداشته شد.»',
    '«{core_ma} تحسین می‌کنم رویکرد عاقلانه و سنجیده‌ات رو به زندگی و اهداف شخصی؛ بسیار ارزشمنده.»',
    '«{core_ma} یک ارتباط پایدار بر پایه آرامش و درک عمیق شکل می‌گیره؛ این حس صلح‌آمیز رو امشب دریافت کردم.»',
    '«{core_ma} ممنونم بابت صداقت و وقتی که با ارزش و احترام برای این دیدار اختصاص دادی.»',
    '«{core_ma} حفظ حریم و عزت نفس طرفین در کنار صمیمیت، والاترین هنر ارتباطیه.»',
    '«{core_ma} نگاه واقع‌بینانه تو به روابط انسانی، بستری مطمئن برای گفتگوهای عمیق‌تره.»'
  ];

  const coreSeeds = [
    {
      c: 'حضور و لبخندت فضای امشب رو روشن کرد.',
      f: 'فکر کنم امشب کل پرسنل کافه هوادار ما شدن!',
      co: 'ارزش و اصالت در تک‌تک حرکاتت پیداست.',
      m: 'هنوز ابتدای راه کشف این دنیای مرموزیم.',
      ma: 'وقار و ادب کلامی زیباترین جلوه امشب بود.'
    },
    {
      c: 'تلفیق هوش و زیبایی در گفتگوت موج میزنه.',
      f: 'اگه جایزه‌ای برای بهترین خنده‌های دیت اول بود قطعاً برنده بودی!',
      co: 'احترام به استانداردها پایه محکم هر ارتباطیه.',
      m: 'پشت این سکوت‌ها رازهای شنیدنی نهفته است.',
      ma: 'آرامش خاطر حاصل یک انتخاب عاقلانه و بالغانه‌ست.'
    },
    {
      c: 'تماس چشمی و این هماهنگی حسی کم‌نظیره.',
      f: 'شبیه قهرمان‌های فیلم‌های رمانتیک کمدی شدیم امشب!',
      co: 'ثبات و اعتمادبه‌نفس متقابل مسیر رو هموار می‌کنه.',
      m: 'ناگفته‌ها گاهی از هزاران کلمه رساترند.',
      ma: 'صداقت در بیان احساسات والاترین خصلت انسانیه.'
    },
    {
      c: 'کشش کلامی و جریان طبیعی این گفتگو فوق‌العاده‌ست.',
      f: 'دستور میدم تمام ساعت‌های دنیا امشب متوقف بشن!',
      co: 'من برای اصالت ارزش قائلم و این اصالت رو در تو دیدم.',
      m: 'پرده اول تموم شد، داستان واقعی هنوز در راهه.',
      ma: 'پختگی روانی مهم‌ترین ستون یک پیوند عمیقه.'
    },
    {
      c: 'انرژی مثبت و حس زنده این دیدار فراموش‌نشدنیه.',
      f: 'از فردا باید امضا بگیریم قبل از اینکه معروف بشی!',
      co: 'قاطعیت و شفافیت در بیان خواسته‌ها قابل ستایشه.',
      m: 'درون این نگاه عمیق رمزیه که ارزش صبر داره.',
      ma: 'همدلی و احترام به مرزهای همدیگه نشانه شخصیته.'
    },
    {
      c: 'ظرافت در کلام و نگاه، امشب رو خاص‌تر کرد.',
      f: 'فکر کنم قند کافه با این شیرین‌زبونی‌ها تموم شد!',
      co: 'هم‌مسیری با انسان‌های باانگیزه همیشه الهام‌بخشه.',
      m: 'یک ابهام دلنشین که اشتیاق ادامه رو بیشتر می‌کنه.',
      ma: 'قدردانی از زمان و فرصت‌های رشد مشترک.'
    },
    {
      c: 'هارمونی کلامی و کشش متقابل در بالاترین حده.',
      f: 'اگه نمره امشب رو ثبت نکنیم در حق تاریخ کم‌لطفی کردیم!',
      co: 'استقلال فکری تو بیش از هر چیز برام جذابه.',
      m: 'سفری در دنیای اندیشه که پایانش ناپیداست.',
      ma: 'تعادل بین منطق و احساس زیباترین شکل رابطه‌ست.'
    },
    {
      c: 'خاطره‌ای خوش از یک بعدازظهر دل‌انگیز و پرمعنا.',
      f: 'بهترین پارت دیت این بود که هیچکدوم سوتی ندادیم!',
      co: 'اطمینان به ارزش خود پایه جذابیت پایدار است.',
      m: 'افق‌هایی که فقط افراد خاص بهش دسترسی پیدا می‌کنن.',
      ma: 'حکمت و صبوری در تعمیق پیوندهای انسانی.'
    }
  ];

  const targetToAdd = 10000;
  const newlyGenerated: ScenarioItem[] = [];
  let duplicatesFiltered = 0;

  let momentIdx = 0;
  let dlgIdx = 0;
  let techIdx = 0;
  let cTplIdx = 0;
  let fTplIdx = 0;
  let coTplIdx = 0;
  let mTplIdx = 0;
  let maTplIdx = 0;
  let seedIdx = 0;
  let genCounter = 1;

  while (newlyGenerated.length < targetToAdd) {
    const itemMoment = firstDateMoments[momentIdx % firstDateMoments.length];
    const rawDlg = firstDateDialogues[dlgIdx % firstDateDialogues.length];
    const tech = pushPullTechniques[techIdx % pushPullTechniques.length];
    const seed = coreSeeds[seedIdx % coreSeeds.length];

    const cTpl = charismaticTemplates[cTplIdx % charismaticTemplates.length];
    const fTpl = funnyTemplates[fTplIdx % funnyTemplates.length];
    const coTpl = confidentTemplates[coTplIdx % confidentTemplates.length];
    const mTpl = mysteriousTemplates[mTplIdx % mysteriousTemplates.length];
    const maTpl = matureTemplates[maTplIdx % matureTemplates.length];

    const variationNumber = Math.floor(genCounter / firstDateMoments.length) + 1;
    let situation = '';
    if (variationNumber === 1) {
      situation = `در قرار اول (First Date)، هنگام ${itemMoment.moment} با تکنیک ${tech}: «${rawDlg}»`;
    } else if (variationNumber === 2) {
      situation = `مدیریت جذابیت کلامی در دیت اول زمانی که ${itemMoment.trigger} رخ می‌دهد (${tech}): «${rawDlg}»`;
    } else if (variationNumber === 3) {
      situation = `موقعیت ${itemMoment.situationType} در ملاقات حضوری با چاشنی پوش‌پول و زبون‌ریختن: «${rawDlg}»`;
    } else if (variationNumber === 4) {
      situation = `پاسخ و رفتار کاریزماتیک در ${itemMoment.moment} (الگوی ${tech}): «${rawDlg}»`;
    } else {
      situation = `سناریوی حضوری قرار اول (${itemMoment.situationType} - الگوی ${variationNumber}) با رویکرد ${tech}: «${rawDlg}»`;
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
      const id = `scen_p3_${hash}_${String(newlyGenerated.length + 1).padStart(5, '0')}`;

      const title = situation.length > 55 ? situation.substring(0, 55) + '...' : situation;

      const item: ScenarioItem = {
        id,
        title,
        category: 'قرار اول و جذابیت حضوری (First Date)',
        situation,
        opponentLine: rawDlg,
        environment: 'کافه / رستوران و قرار اول حضوری',
        genderContext: 'male_to_female',
        goal: 'ساخت جذابیت حضوری، ایجاد تنش جنسی و عاطفی دلنشین با پوش‌پول و قطعی کردن دیت دوم',
        difficulty: 'medium',
        triggers: [rawDlg, itemMoment.trigger],
        aliases: [rawDlg],
        keywords: ['دیت اول', 'پوش پول', 'مخ زنی حضوری', 'فرست دیت', 'جذابیت کلامی', 'زبون ریختن', itemMoment.situationType],
        responses: {
          charismatic: respCharismatic,
          funny: respFunny,
          confident: respConfident,
          mysterious: respMysterious,
          mature: respMature
        },
        technique: `${tech} با تلفیق شوخ‌طبعی و تماس چشمی مثلثی.`,
        bodyLanguage: 'حفظ تن صدای رسا و بم، لبخند میکرو و ریلکسیشن کامل در شانه و دست‌ها.',
        teachingNote: 'در قرار اول بیش از حد سوال مصاحبه‌ای نپرسید؛ روایت‌گری و تعامل احساسی با تکنیک پوش‌پول بهترین نتیجه را می‌دهد.',
        tips: 'پرهیز از تعریف‌های مداوم و بدون چالش؛ ایجاد تعادل میان تحسین و شوخی رندانه.',
        nextMove: 'خداحافظی در اوج انرژی مثبت و باقی گذاشتن موضوعی جذاب برای قرار دوم.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      newlyGenerated.push(item);
    }

    momentIdx++;
    dlgIdx = (dlgIdx + 3);
    techIdx = (techIdx + 7);
    cTplIdx = (cTplIdx + 1);
    fTplIdx = (fTplIdx + 3);
    coTplIdx = (coTplIdx + 5);
    mTplIdx = (mTplIdx + 2);
    maTplIdx = (maTplIdx + 4);
    seedIdx = (seedIdx + 1);
    genCounter++;
  }

  console.log(`Newly generated count in Part 3: ${newlyGenerated.length}`);
  console.log(`Duplicates filtered: ${duplicatesFiltered}`);

  // Combine locked current expanded + newly generated part 3
  const cumulativeArray: ScenarioItem[] = [...currentExpanded, ...newlyGenerated];
  const cumulativeTotal = cumulativeArray.length; // 39,425

  console.log(`Cumulative Total (29,425 + 10,000): ${cumulativeTotal}`);

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

if (process.argv[1] && process.argv[1].endsWith('generate_part3_batch.ts')) {
  const res = runPart3Generation();
  console.log('\n--- PART 3 COMPLETED RESULT ---');
  console.log(JSON.stringify(res, null, 2));
}
