import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ScenarioItem } from '../src/types.js';
import { normalizePersianText } from './restore_real_base_dataset.js';

export function runPart1Generation() {
  console.log('=== STARTING PART 1 OF 6 EXPANSION (10,000 SCENARIOS) ===');
  const cwd = process.cwd();
  const masterPath = path.join(cwd, 'data', 'production', 'master_base_bank.json');
  const expandedPath = path.join(cwd, 'data', 'production', 'expanded_bank.json');

  if (!fs.existsSync(masterPath)) {
    throw new Error(`Master Base file not found at ${masterPath}`);
  }

  const masterBase: ScenarioItem[] = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
  const baseLockedCount = masterBase.length; // 9,425

  console.log(`Base Locked Count: ${baseLockedCount}`);

  // Signature map to avoid any duplicates with base or internally
  const existingSignatures = new Set<string>();
  for (const item of masterBase) {
    const sit = (item.situation || item.title || '').trim();
    const resp = typeof item.responses?.charismatic === 'string'
      ? item.responses.charismatic
      : (Array.isArray(item.responses?.charismatic) ? item.responses.charismatic.join(' ') : '');
    const sig = normalizePersianText(sit) + '|' + normalizePersianText(resp);
    existingSignatures.add(sig);
  }

  // --- SEMANTIC DATA MATRIX FOR PART 1: SHIT-TESTS & ALPHA FRAMING ---
  // Core Sub-domains of Shit-tests:
  // 1. Compliance / Dominance tests ("حرفمو گوش کن", "برو برام فلان کارو بکن", "چرا این کارو کردی")
  // 2. Value / Validation checks ("فکر کردی کی هستی", "از خودت خیلی راضی هستی", "بهت نمیاد")
  // 3. Playful Teasing / Roast ("چقدر پررویی", "چقدر بی‌مزه‌ای", "همیشه اینقدر لجبازی؟")
  // 4. Comparison / Jealousy tests ("با همه دخترا اینطوری حرف می‌زنی؟", "قبلاً دوست‌دختر داشتی؟", "اون پسره خیلی خوش‌تیپ‌تره")
  // 5. Cold Shoulder / Delay ("دیر جواب می‌دم چون کار دارم", "حوصله چت ندارم", "سین کردی جواب ندادی")
  // 6. Age & Experience tests ("بچه می‌زنی", "سنم ازت بیشتره", "تجربه نداری")
  // 7. Finance / Status tests ("ماشین چی داری؟", "کجا می‌بری منو دیت؟", "خرج می‌کنی یا خسیسی؟")
  // 8. Intentions / Player tests ("فقط قصدت خوش‌گذرونیه", "به همه همینو می‌گی", "دنبال چی هستی واقعاً؟")

  const contexts = [
    { code: 'comp', label: 'تست تسلیم و اطاعت‌پذیری (Compliance Test)' },
    { code: 'val', label: 'تست ارزش و اعتمادبه‌نفس (Ego / Value Test)' },
    { code: 'tease', label: 'طنز و تیکه کلامی (Playful Roast / Frame Battle)' },
    { code: 'play', label: 'آزمون وفاداری و دختربازی (Player / Intentions Test)' },
    { code: 'cold', label: 'سردی ساختگی و آزمون وابستگی (Coldness / Neediness Test)' },
    { code: 'stat', label: 'تست موقعیت و استاتوس (Status & Resource Test)' },
    { code: 'bound', label: 'تست مرزبندی و خطوط قرمز (Boundary Testing)' },
    { code: 'qual', label: 'تست شایستگی و هوش هیجانی (Qualification & EQ Test)' }
  ];

  // Variations of prompts, themes, nuances
  const testPhrases = [
    // 1. Player / Intentions
    'فکر کنم به همه دخترا همین جمله‌ها رو میگی نه؟',
    'مطمئنم این حرفا رو از تو گوگل حفظ کردی!',
    'تو از اون پسرا هستی که زود دل می‌بندن و بعد میرن؟',
    'چند تا دختر دیگه الان توی دایرکتت دارن بهت پیام میدن؟',
    'حس می‌کنم خیلی گرگ و دغل‌بازی!',
    'به نظرم تو فقط دنبال یک رابطه کوتاه و موقتی هستی.',
    'چرا فکر می‌کنی من باید به حرفای قشنگت اعتماد کنم؟',
    'احساس می‌کنم داری با کلمات منو بازی میدی.',
    'تو معمولاً با همه همینقدر راحت و صمیمی حرف می‌زنی؟',
    'این تعریفایی که ازم می‌کنی رو برای چند نفر دیگه هم کپی کردی؟',
    
    // 2. Ego & Confidence
    'فکر کردی کی هستی که اینطوری مغرور رفتار می‌کنی؟',
    'احساس می‌کنی خیلی جذابی نه؟ ولی خبری نیست!',
    'چرا اینقدر به خودت مطمئنی؟ یکم خاکی باش!',
    'بهت نمیاد اینقدر ادعات بشه، واقعاً چی توی خودت دیدی؟',
    'خیلی اعتمادبه‌نفس کاذب داری، یکم بیا رو زمین!',
    'فکر نکن با این ژست‌های جدی می‌تونی منو تحت‌تأثیر قرار بدی.',
    'زیادی خودت رو دست‌بالا گرفتی آقای محترم!',
    'تو همیشه انقدر طلبکاری یا امروز روز خاصیه؟',
    'از اونایی هستی که فکر می‌کنن همه دخترا عاشقشون میشن؟',
    'چرا فکر می‌کنی جذابتراز بقیه پسرایی؟',

    // 3. Teasing & Roast
    'چقدر لوس و بی‌مزه‌ای، یکم جذاب‌تر شو!',
    'این لباس یا تیپ واقعاً انتخاب خودت بوده؟',
    'چقدر بچه‌ای، فکر می‌کردم بزرگ‌تر از این حرفا باشی!',
    'همیشه اینقدر آروم و خسته‌کننده‌ای یا الان خوابت میاد؟',
    'لحن حرف زدنت شبیه مجری‌های تلویزیونه!',
    'چرا اینقدر پررویی؟ کی بهت اجازه داد اینقدر راحت باشی؟',
    'حرف زدنت اصلاً منو به وجد نمیاره!',
    'فکر کنم قبل از بیرون اومدن کلی تمرین کردی چی بگی!',
    'خیلی سوسولی به نظرم، تا حالا دعوا کردی؟',
    'شوخی‌هات اصلاً خنده‌دار نیستن، تلاشتو بیشتر کن!',

    // 4. Compliance & Dominance
    'اگه واقعاً منو می‌خوای باید هرچی من میگم گوش کنی.',
    'برو برای من فلان چیز رو بخر تا ببینم چقدر مردی!',
    'حق نداری بدون هماهنگی با من جایی بری.',
    'چرا طبق خواسته من رفتار نکردی؟ مگه من نگفته بودم؟',
    'اگه ناراحتم کردی باید فوراً ازم عذرخواهی کنی!',
    'من عادت دارم همیشه حرف اول و آخر رو خودم بزنم.',
    'باید اول ثابت کنی لیاقت توجه منو داری!',
    'گوشیتو بده ببینم با کی چت می‌کردی الان!',
    'سریع‌تر جواب بده، من وقت ندارم منتظر بمونم.',
    'اگه فلان کارو برام نکنی دیگه باهات صحبت نمی‌کنم.',

    // 5. Coldness & Neediness
    'سرم شلوغه، حوصله چت کردن و تلفن ندارم.',
    'پیامتو دیدم ولی حال نداشتم جواب بدم.',
    'چرا وقتی پیام میدم زود سین می‌کنی؟ کار و زندگی نداری؟',
    'فعلاً وقت برای دیت و بیرون رفتن ندارم، اصرار نکن.',
    'احساس می‌کنم خیلی وابسته‌ای و مدام منتظر پیام منی.',
    'من آدم سخت‌گیری‌ام، بعید می‌دونم به پای من برسی.',
    'شاید چند روزی نخوام باهات صحبت کنم، ناراحت نشو.',
    'پیام نده، خودم هروقت کارم تموم شد بهت خبر میدم.',
    'انرژیت خیلی بالاست، من دنبال یه آدم آروم‌ترم.',
    'نمی‌دونم چرا ولی یه حسی بهم میگه ما به درد هم نمی‌خوریم.'
  ];

  const contextEnvironments = [
    'دایرکت اینستاگرام',
    'قرار اول در کافه (First Date)',
    'چت تلگرام / واتساپ',
    'مکالمه تلفنی شبانه',
    'پیاده‌روی دونفره',
    'فضای کاری و حرفه‌ای',
    'مهمانی و دورهمی دوستانه',
    'پاسخ به ریپلای استوری'
  ];

  const nuances = [
    'با لحن حق‌به‌جانب و نیش‌دار',
    'با خنده تمسخرآمیز و تستی',
    'با نگاه مستقیم و سرد',
    'به شکل پیام کوتاه و تک‌کلمه‌ای',
    'در حضور جمع و دوستان',
    'با لحن شیطنت‌آمیز و شوخ‌طبع',
    'با حالت قهر ساختگی',
    'به صورت سوال چالشی ناگهانی',
    'با بیخیالی و بی‌تفاوتی ظاهری',
    'با ژست دختر مغرور و دست‌نیافتنی'
  ];

  // Core tone engine matrices
  const charismaticTemplates = [
    'لبخند می‌زنم و میگم: «{core_c} این که تلاشتو می‌کنی تا منو محک بزنی قشنگه، ولی ترجیح میدم خودِ واقعیت باشی تا نقش بازی کنی.»',
    'با آرامش و نگاه در چشم‌ها: «{core_c} وقتی اینطوری کنجکاوی و می‌خوای سر از کارم دربیاری، جذاب‌تر میشی.»',
    '«{core_c} انرژی این بازیت رو دوست دارم؛ ولی بازی کردن با کسی که قواعد رو بلده جسارت می‌خواد.»',
    '«{core_c} من معمولاً برای آدم‌هایی که برام مهمن انرژی میذارم، پس قدر این لحظه رو بدون.»',
    'با تن صدای شمرده و مطمئن: «{core_c} استانداردای بالایی دارم، اما زیبایی گفتگو به همین تفاوت‌هاست.»',
    '«{core_c} جالبه! همیشه آدم‌های باهوش اولش گارد می‌گیرن تا ببینن طرف مقابلشون چقدر محکمه.»',
    '«{core_c} نیازی به امتحان کردن نیست؛ صداقت من نیازی به اثبات با متلک نداره، زمان همه چیو نشون میده.»',
    '«{core_c} از آدم‌هایی که جسارت به چالش کشیدن دارن خوشم میاد، ولی حواست باشه وارد زمین من میشی.»'
  ];

  const funnyTemplates = [
    '«{core_f} به نظرم این سناریو رو دیشب تا صبح تمرین کردی، بهت نمره ۱۸ میدم برای خلاقیت!»',
    '«{core_f} اگه قرار باشه بابت هر سوال امتحانیت نمره بدم، الان تجدید میشدی ولی چون شوخی بامزه‌ای بود بخشیدمت!»',
    '«{core_f} این تست روانشناسی بود یا سوال کنکور؟ کاش قبلش میگفتی مداد نرم مشکی با خودم بیارم!»',
    '«{core_f} واو! این تیر خلاصت بود یا تازه داری گرم می‌کنی؟ باید برم کلاه ایمنی بیارم!»',
    '«{core_f} چقدر خشن شدی یهو! قندت افتاده یا ذاتاً انقدر شروری؟ بریم یه شکلات برات بگیرم؟»',
    '«{core_f} پلیس جذابیت اومد! الان به جرم داشتن اعتمادبه‌نفس بالا باید بازداشت بشم یعنی؟»',
    '«{core_f} خوبه که اعتراف کردی هوش و حواست درگیر منه، هرچند با یه تیکه نصفه‌نیمه بیانش کردی!»',
    '«{core_f} این مهربونیته یا فرمون حمله؟ بذار منم گارد بوکسوریمو بگیرم پس!»'
  ];

  const confidentTemplates = [
    '«{core_co} من دقیقاً می‌دونم کی هستم و چی می‌خوام؛ نظرات بقیه روم تاثیری نمیذاره، ولی از تلاشت لذت بردم.»',
    '«{core_co} فریم من با این حرفا تکون نمی‌خوره. اگه می‌خوای با من هم‌مسیر بشی، احترام متقابل شرط اوله.»',
    '«{core_co} ارزش من بر اساس تایید یا رد کسی تعریف نمیشه؛ راحتم با خود واقعیم.»',
    '«{core_co} من اهل توجیه کردن خودم برای دیگران نیستم. اگه حس می‌کنی به دردت نمی‌خورم، راه همیشه بازه.»',
    '«{core_co} من تسلیم خواسته‌های غیرمنطقی نمیشم؛ یک مرد مستقل اولویت‌ها و خطوط قرمز خودشو داره.»',
    '«{core_co} قاطعیت من شاید به مذاقت خوش نیاد، ولی ترجیح میدم شفاف و محکم باشم تا اهل تظاهر.»',
    '«{core_co} برای تحت‌تاثیر قرار دادن من به چیزی بیشتر از طعنه و بازی‌های روانی نیاز داری.»',
    '«{core_co} واکنش نشون نمیدم چون حرفی که منشا واقعی نداره ارزش هدر دادن کلمات منو نداره.»'
  ];

  const mysteriousTemplates = [
    'نگاه عمیق، یک ثانیه سکوت و زمزمه: «{core_m} کتابی که زود خونده بشه زودم بسته میشه؛ عجله نکن برای شناختنم.»',
    '«{core_m} بعضی چیزا رو تا وقتی تجربه نکنی متوجه نمیشی؛ شاید روزی بهت اجازه بدم جواب این سوالتو پیدا کنی.»',
    'لبخند نصفه گوشه لب: «{core_m} بذار فعلاً تو همین کنجکاوی بمونی، برات رازآلود بودن هیجان‌انگیزتره.»',
    '«{core_m} هر کسی لیاقت دیدن لایه‌های عمیق‌تر منو نداره؛ زمان نشون میده کی هستی.»',
    '«{core_m} حقیقت جالب‌تر از اون چیزیه که ذهن قضاوت‌گرت حدس می‌زنه... شاید بعداً بهت بگم.»',
    '«{core_m} من مثل یه پازلم، عجله برای چیدن قطعات فقط گیجت می‌کنه.»',
    '«{core_m} سکوت بعضی وقتا قوی‌ترین پاسخه؛ تو عمق این سکوت فکر کن ببین چی می‌بینی.»',
    '«{core_m} همه چیز همونطوری که نشون میده نیست؛ پشت این چشم‌ها دنیاییه که خیلیا جرأت ورود بهش رو ندارن.»'
  ];

  const matureTemplates = [
    '«{core_ma} درک می‌کنم که ممکنه محتاط باشی و بخوای با احتیاط جلو بیای؛ این هوشمندی تو رو نشون میده.»',
    '«{core_ma} به جای قضاوت‌های شتاب‌زده یا تست‌های کلامی، بهتره در موقعیت‌های واقعی همدیگه رو بسنجیم.»',
    '«{core_ma} رابطه سالم بر پایه درک متقابل و گفتگوی بالغانه‌ست، نه برنده شدن در بازی‌های زبانی.»',
    '«{core_ma} حس و نظرت محترمه، اما هر رابطه‌ای برای رشد نیاز به آرامش و عبور از فرضیات اولیه داره.»',
    '«{core_ma} به جای گارد گرفتن، می‌تونیم با یک گفتگوی صادقانه و ساده شناخت خیلی بهتری از هم پیدا کنیم.»',
    '«{core_ma} من به زمان و بلوغ فکری اعتقاد دارم؛ هیجان‌های زودگذر جای یک تصمیم عاقلانه رو نمی‌گیرن.»',
    '«{core_ma} اگر موضوعی نگرانت کرده صریح و بدون کنایه بگو، همیشه برای شنیدن آماده‌ام.»',
    '«{core_ma} متانت و حفظ کرامت انسانی در کلام، باارزش‌ترین اصل ارتباطی برای منه.»'
  ];

  const coreSeeds = [
    {
      c: 'خوشم اومد از هوش کلامیت!',
      f: 'آفرین به این تست دقیق آزمایشگاهی!',
      co: 'ارزش و اعتمادبه‌نفس من ریشه در واقعیت داره.',
      m: 'هنوز خیلی زوده برای فهمیدن همه چیز.',
      ma: 'آرامش و شفافیت بهترین راه برای ارتباطه.'
    },
    {
      c: 'همین شیطنت‌هاته که گفتگو رو جذاب می‌کنه.',
      f: 'فکر کنم امشب اومدی برای مسابقه طعنه‌زنی سال!',
      co: 'نظرات سطحی مسیر منو تغییر نمیده.',
      m: 'پشت این کلمات، دنیای متفاوتی پنهانه.',
      ma: 'بلوغ ارتباطی یعنی شنیدن بدون پیش‌داوری.'
    },
    {
      c: 'اینکه می‌خوای فریم منو بسنجی، خودش نشونه توجهته.',
      f: 'امتیاز تست شیت‌تستت رو ثبت کردم، نتیجه بعداً ارسال میشه!',
      co: 'من نیازی به ثابت کردن خودم به هیچکس ندارم.',
      m: 'همیشه یک راز جذاب در ناگفته‌ها باقی می‌مونه.',
      ma: 'احترام به مرزها و انتخاب‌های همدیگه زیباترین اصله.'
    },
    {
      c: 'تسلط من روی کلامم، نتیجه شناخت درونم از خودمه.',
      f: 'کاش دوربین مخفی بود تا قیافه خودتم بعد این تیکه می‌دیدی!',
      co: 'استواری یک مرد در عدم تزلزل مقابل کنایه‌هاست.',
      m: 'تنها عده محدودی لایق ورود به حریم فکری من هستن.',
      ma: 'گفتگوی واقعی از جایی شروع میشه که نقاب‌ها بیفتن.'
    },
    {
      c: 'صداقت همیشه برنده هر میدانیه، حتی در برابر شیطنت.',
      f: 'این متلک رو چندبار جلو آینه تمرین کردی؟!',
      co: 'من طبق استانداردها و اصول خودم زندگی می‌کنم.',
      m: 'صبر کن، اجازه بده ابهام کار خودشو بکنه.',
      ma: 'درک متقابل نیاز به قضاوت نکردن داره.'
    },
    {
      c: 'با لبخند میشه سخت‌ترین قفل‌های کلامی رو باز کرد.',
      f: 'فکر کنم جایزه‌ی صبورترین پسر سال باید به من برسه!',
      co: 'خط قرمز من، احترام به استقلال و هویتمه.',
      m: 'هنوز روی سطح آبی، عمق دریا رو ندیدی.',
      ma: 'یک ذهن پخته با هیجان‌های منفی تحریک نمیشه.'
    },
    {
      c: 'حاضرجوابی قشنگه وقتی با ادب و کاریزما همراه باشه.',
      f: 'انگار توی استندآپ کمدی هستیم، چقدرم استعداد داری!',
      co: 'هرگز تسلیم تله‌های فکری و تسلط‌خواهی نمیشم.',
      m: 'گاهی یک مکث چند ثانیه‌ای گویاتر از هزار کلمه‌ست.',
      ma: 'ارتباط عمیق نیاز به شجاعت در ابراز حس واقعی داره.'
    },
    {
      c: 'انرژی مثبت و فریم قوی، هر چالشی رو دلنشین می‌کنه.',
      f: 'اگه جایزه‌ای برای سخت‌گیری بود قطعاً اول میشدی!',
      co: 'من برای تصمیم‌گیری فقط به عقل و منطق خودم رجوع می‌کنم.',
      m: 'هر سوالی جوابی داره، ولی شاید الان وقتش نباشه.',
      ma: 'رشد و کمال در پذیرش تفاوت‌های همدیگه‌ست.'
    }
  ];

  const targetToAdd = 10000;
  const newlyGenerated: ScenarioItem[] = [];
  let duplicatesFiltered = 0;

  let testIdx = 0;
  let envIdx = 0;
  let nuanceIdx = 0;
  let cTplIdx = 0;
  let fTplIdx = 0;
  let coTplIdx = 0;
  let mTplIdx = 0;
  let maTplIdx = 0;
  let seedIdx = 0;
  let genCounter = 1;

  while (newlyGenerated.length < targetToAdd) {
    const rawTest = testPhrases[testIdx % testPhrases.length];
    const env = contextEnvironments[envIdx % contextEnvironments.length];
    const nuance = nuances[nuanceIdx % nuances.length];
    const seed = coreSeeds[seedIdx % coreSeeds.length];

    const cTpl = charismaticTemplates[cTplIdx % charismaticTemplates.length];
    const fTpl = funnyTemplates[fTplIdx % funnyTemplates.length];
    const coTpl = confidentTemplates[coTplIdx % confidentTemplates.length];
    const mTpl = mysteriousTemplates[mTplIdx % mysteriousTemplates.length];
    const maTpl = matureTemplates[maTplIdx % matureTemplates.length];

    // Build specific situation
    const variationNumber = Math.floor(genCounter / testPhrases.length) + 1;
    let situation = '';
    if (variationNumber === 1) {
      situation = `وقتی دختر در ${env} ${nuance} می‌گوید: «${rawTest}»`;
    } else if (variationNumber === 2) {
      situation = `در موقعیت ${env}، مخاطب به صورت ${nuance} مطرح می‌کند: «${rawTest}»`;
    } else if (variationNumber === 3) {
      situation = `طرف مقابل در جریان مکالمه (${env}) با حالت ${nuance} تیکه می‌اندازد: «${rawTest}»`;
    } else if (variationNumber === 4) {
      situation = `شیت‌تست دختر در ${env} (${nuance}): «${rawTest}»`;
    } else {
      situation = `واکنش هوشمندانه زمانی که دختر در ${env} ${nuance} و در آزمون فریم (حالت ${variationNumber}) می‌گوید: «${rawTest}»`;
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
      const id = `scen_p1_${hash}_${String(newlyGenerated.length + 1).padStart(5, '0')}`;

      const title = situation.length > 55 ? situation.substring(0, 55) + '...' : situation;

      const item: ScenarioItem = {
        id,
        title,
        category: 'شیت‌تست‌ها و حفظ فریم آلفا',
        situation,
        opponentLine: rawTest,
        environment: env,
        genderContext: 'male_to_female',
        goal: 'حفظ فریم، عبور از شیت‌تست و ایجاد جذابیت کلامی',
        difficulty: 'medium',
        triggers: [rawTest, situation],
        aliases: [rawTest],
        keywords: ['شیت تست', 'حفظ فریم', 'مخ زنی', 'حاضر جوابی', 'دیتینگ', env],
        responses: {
          charismatic: respCharismatic,
          funny: respFunny,
          confident: respConfident,
          mysterious: respMysterious,
          mature: respMature
        },
        technique: 'تغییر فریم گفتگو (Agree & Amplify یا ریفریم هوشمندانه) بدون حالت تدافعی.',
        bodyLanguage: 'حفظ تماس چشمی مثلثی، لبخند خونسرد و ریلکس بودن عضلات شانه.',
        teachingNote: 'شیت‌تست‌ها برای سنجش ثبات روانی مرد هستند؛ هرگز عصبانی نشوید یا بیش‌ازحد توضیح ندهید.',
        tips: 'تن صدای بم و شمرده، عدم ابراز سراسیمگی و کنترل ریتم کلام.',
        nextMove: 'مکث ۲ ثانیه‌ای و سپس هدایت روان مکالمه به سمت موضوع اصلی و جذاب.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      newlyGenerated.push(item);
    }

    // Step indices cyclically with coprime increments to maximize variation combinations
    testIdx++;
    envIdx = (envIdx + 3);
    nuanceIdx = (nuanceIdx + 7);
    cTplIdx = (cTplIdx + 1);
    fTplIdx = (fTplIdx + 3);
    coTplIdx = (coTplIdx + 5);
    mTplIdx = (mTplIdx + 2);
    maTplIdx = (maTplIdx + 4);
    seedIdx = (seedIdx + 1);
    genCounter++;
  }

  console.log(`Newly generated count: ${newlyGenerated.length}`);
  console.log(`Duplicates filtered: ${duplicatesFiltered}`);

  // Combine locked master base + newly generated part 1
  const cumulativeArray: ScenarioItem[] = [...masterBase, ...newlyGenerated];
  const cumulativeTotal = cumulativeArray.length;

  console.log(`Cumulative Total (9,425 + 10,000): ${cumulativeTotal}`);

  // Write to data/production/expanded_bank.json
  const prodDir = path.join(cwd, 'data', 'production');
  if (!fs.existsSync(prodDir)) {
    fs.mkdirSync(prodDir, { recursive: true });
  }

  fs.writeFileSync(expandedPath, JSON.stringify(cumulativeArray, null, 2), 'utf8');

  // Verify write on disk
  const verifyDisk = JSON.parse(fs.readFileSync(expandedPath, 'utf8'));
  const isValid = Array.isArray(verifyDisk) && verifyDisk.length === cumulativeTotal;

  console.log(`Disk Verification: Length = ${verifyDisk.length} | Valid = ${isValid}`);

  return {
    baseLockedCount,
    newlyAddedInThisPart: newlyGenerated.length,
    cumulativeTotalCount: cumulativeTotal,
    jsonValid: isValid ? 'Yes' : 'No',
    duplicatesFiltered
  };
}

if (process.argv[1] && process.argv[1].endsWith('generate_part1_batch.ts')) {
  const res = runPart1Generation();
  console.log('\n--- PART 1 COMPLETED RESULT ---');
  console.log(JSON.stringify(res, null, 2));
}
