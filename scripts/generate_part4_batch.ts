import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ScenarioItem } from '../src/types.js';
import { normalizePersianText } from './restore_real_base_dataset.js';

export function runPart4Generation() {
  console.log('=== STARTING PART 4 OF 6 EXPANSION (10,000 SCENARIOS: AGE GAP & COMPLEX DATING) ===');
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
  const currentCount = currentExpanded.length; // 39,425

  console.log(`Base Locked Count: ${baseLockedCount}`);
  console.log(`Current Bank Count: ${currentCount}`);

  // Build signatures set from all current items (39,425)
  const existingSignatures = new Set<string>();
  for (const item of currentExpanded) {
    const sit = (item.situation || item.title || '').trim();
    const resp = typeof item.responses?.charismatic === 'string'
      ? item.responses.charismatic
      : (Array.isArray(item.responses?.charismatic) ? item.responses.charismatic.join(' ') : '');
    const sig = normalizePersianText(sit) + '|' + normalizePersianText(resp);
    existingSignatures.add(sig);
  }

  // --- SEMANTIC DATA MATRIX FOR PART 4: AGE GAP & COMPLEX RELATIONSHIPS ---
  const complexThemes = [
    // 1. Older woman / Younger man (Cougar / Sugar Mommy dynamic)
    { theme: 'ارتباط با خانم جاافتاده‌تر و بزرگ‌تر از خود (اختلاف سنی معکوس)', trigger: 'اختلاف سنی و تجربه بیشتر خانم', tag: 'اختلاف سنی معکوس' },
    { theme: 'تعیین مرزهای مالی و روانی در روابط با منافع خاص (Sugar dynamic)', trigger: 'بحث بر سر حمایت مالی و استقلال فردی', tag: 'روابط منفعت‌محور' },
    { theme: 'مدیریت جذابیت مردانه مقابل زن موفق و ثروتمند', trigger: 'جایگاه اجتماعی و تمکن مالی بالاتر طرف مقابل', tag: 'جذابیت مقابل زن مستقل' },

    // 2. Older man / Younger woman (Mature Man / Sugar Daddy dynamic)
    { theme: 'ارتباط مرد پخته با دختر جوان‌تر و ایجاد حس امنیت و اقتدار', trigger: 'جلوگیری از حس تسلط‌خواهی و ایجاد تکیه‌گاه عاطفی', tag: 'ارتباط با دختر جوان‌تر' },
    { theme: 'پاسخ به سوالات شک‌برانگیز درباره قصد رابطه با تفاوت سنی بالا', trigger: 'طعنه اطرافیان یا خود فرد درباره اختلاف سنی', tag: 'تفاوت سنی و قضاوت' },

    // 3. Complicated / Taboo / Workplace boundaries
    { theme: 'مدیریت کشش عاطفی با مدیر ارشد یا همکار در محیط کاری', trigger: 'کشش پنهان در سازمان و حفظ پرستیژ شغلی', tag: 'روابط سازمانی و کاری' },
    { theme: 'برخورد با رابطه قبلی مشترک (اکس دوست صمیمی یا رابطه پرپیچ‌وخم)', trigger: 'حساسیت‌های گذشته و روابط هم‌پوشان', tag: 'پیچیدگی‌های گذشته' },
    { theme: 'ارتباط از راه دور (Long Distance) با شرایط خاص و دیدارهای محدود', trigger: 'دلتنگی، فاصله فیزیکی و تردید در ادامه مسیر', tag: 'روابط از راه دور' }
  ];

  const complexSituations = [
    '«سن من ازت خیلی بیشتره، فکر نمی‌کنی بعدها پشیمون بشی از این رابطه؟»',
    '«تو هنوز اول راهی و کلی تجربه نزیسته داری، چطور می‌خوای با دنیای من کنار بیای؟»',
    '«من به استقلال مالیم خیلی وابسته‌ام؛ مردی که کنارمه باید جنم داشته باشه نه اینکه آویزون بشه!»',
    '«نکنه فقط به خاطر موقعیت اجتماعی و رفاه من باهام هم‌کلام شدی؟»',
    '«مردم چی میگن اگه ما رو با این اختلاف سنی با هم ببینن؟»',
    '«توی محل کار نباید کسی متوجه این احساس بشه، می‌تونی حرفه‌ای رفتار کنی؟»',
    '«من حوصله بچه‌بازی و قهر و آشتی‌های تینیجری رو ندارم، اهل رابطه آروم هستی؟»',
    '«تو خیلی جوونی؛ می‌ترسم بعد از اینکه به اهدافت رسیدی منو فراموش کنی!»',
    '«بین پول، پیشرفت و عشق واقعی تو اولویتت چیه وقتی با کسی مثل من هستی؟»',
    '«من قبلاً یه بار شکست خوردم و خیلی سخت به کسی اعتماد می‌کنم، طاقت داری؟»',
    '«فکر می‌کنی بتونی جلوی خانواده‌ت از این انتخاب دفاع کنی یا عقب می‌کشی؟»',
    '«تو اینقدر آزادی داری که هر دختری رو انتخاب کنی، چرا اومدی سراغ من؟»',
    '«اگه رابطه تموم بشه، قول میدی همه‌چیز متمدنانه و بدون حاشیه تموم بشه؟»',
    '«من دوست دارم طرف مقابلم تکیه‌گاه محکمم باشه، نه اینکه خودم همه‌چیز رو مدیریت کنم!»',
    '«فاصله سنی ما ممکنه روی علایق روزمره‌مون اثر بذاره، چطور هندلش می‌کنی؟»'
  ];

  const strategicAngles = [
    'تکنیک تمرکز بر بلوغ هیجانی به جای سن تقویمی (Mental Maturity Over Chronological Age)',
    'تکنیک حفظ کامل عزت نفس مردانه و رد هرگونه وابستگی مالی (Financial & Emotional Sovereignty)',
    'تکنیک اطمینان‌بخشی با رفتار متین و سکوت محکم (Solid Reassurance)',
    'تکنیک شوخ‌طبعی رندانه برای شکستن تابوهای سنتی (De-escalating Taboos)',
    'تکنیک مرزبندی شفاف و تعیین خطوط قرمز اخلاقی (Clear Boundaries)',
    'تکنیک هدایت رابطه به سمت تجربه مشترک لذت‌بخش (Shared Value Framing)',
    'تکنیک خلع سلاح ترس از قضاوت جامعه (Societal Pressure Neutralization)',
    'تکنیک تبدیل تفاوت سنی به یک نقطه قوت و جذابیت دوجانبه (Unique Dynamic Advantage)'
  ];

  // Tone generation matrices for Part 4
  const charismaticTemplates = [
    'با نگاه متین، لبخند پرمعنا و تن صدای بم: «{core_c} سن فقط یک عدد در شناسنامه‌ست؛ چیزی که ما رو به هم وصل می‌کنه عمق درک و هماهنگی روح ماست.»',
    '«{core_c} برای من استقلال و وقار یک زن بالاترین کشش رو داره؛ این تجربه و درک بالاست که زیبایی کلامت رو دوچندان کرده.»',
    '«{core_c} من وارد رابطه میشم برای تبادل ارزش، حس ناب و آرامش؛ هیچ چارچوب کلیشه‌ای نمی‌تونه اصالت این ارتباط رو مخدوش کنه.»',
    '«{core_c} وقتی دو انسان با ذهن‌های پخته به هم می‌رسن، تفاوت‌ها تبدیل به جذاب‌ترین کشف‌های زندگی میشن.»',
    '«{core_c} آرامش و اعتمادی که در حضورت حس میشه، بهای گرانبهایی داره که با هیجان‌های سطحی قابل مقایسه نیست.»',
    '«{core_c} نیازی به نگرانی از آینده نیست؛ مردی که فریم محکم و اصالت داره، همیشه از انتخاب‌هاش با افتخار حمایت می‌کنه.»',
    '«{core_c} قضاوت دیگران متعلق به دنیای کوچیک خودشونه؛ ما دنیای خودمون رو با کیفیت افکارمون می‌سازیم.»',
    '«{core_c} ارزشمندی این دیدار در زلالی و بلوغیه که هر دو طرف روی میز گذاشتن؛ متمایز و ستودنی.»'
  ];

  const funnyTemplates = [
    'خنده رندانه و شیطنت‌آمیز: «{core_f} فقط بگو اگه قرار شد برای تولدم شمع فوت کنیم، کپسول آتش‌نشانی هم آماده بذاریم یا کنترلش می‌کنی؟!»',
    '«{core_f} به نظرم اختلاف سنی ما بهترین بهونه‌ست که هر موقع کاری خراب شد بندازیم تقصیر تفاوت نسل‌ها!»',
    '«{core_f} اگه قرار بود نگران حرف فامیل و همسایه باشم، الان باید تو دهه پنجاه زندگی می‌کردم نه قرن بیست و یکم!»',
    '«{core_f} من از بچگی سلیقه‌م کلاسیک و سطح بالا بوده؛ اینو می‌تونی توی انتخاب اطرافیانم کاملاً ببینی!»',
    '«{core_f} مگه اومدیم فرم استخدامی پر کنیم که انقدر رزومه و سابقه کار رو چک می‌کنی؟ یکم لذت ببر از قهوه‌ت!»',
    '«{core_f} خیالت راحت، من انقدر پرانرژی‌ام که تا چند سال دیگه هم تو رو به دویدن وادار می‌کنم!»',
    '«{core_f} الان یعنی باید بگم "چشم بزرگ‌تر" یا اجازه دارم مثل یه جنتلمن رمانتیک رفتار کنم؟!»',
    '«{core_f} تفاوت سنی فقط یه مزیت داره: یکی‌مون تجربه داره، اون یکی هم انگیزه برای شاد کردن فضا!»'
  ];

  const confidentTemplates = [
    '«{core_co} من تکیه‌ام روی بازو و عقل خودمه؛ هیچ‌کس در این ارتباط بالاتر یا پایین‌تر نیست، ما دو انسان با عزت‌نفس برابریم.»',
    '«{core_co} فریم شخصیتی من به قدری استواره که هیچ حرف یا قضاوتی ذره‌ای از باورم به این انتخاب رو کم نمی‌کنه.»',
    '«{core_co} من برای منافع مادی یا پر کردن تنهایی سراغت نیومدم؛ انگیزه من کشش به ذهن و شخصیت والای توئه.»',
    '«{core_co} مرزهای من در کار و زندگی کاملاً شفافن؛ می‌دونم کِی باید مثل یک صخره محکم باشم و کِی انعطاف نشون بدم.»',
    '«{core_co} اگر دنبال فردی بودی که مدام توجیه کنه یا احساس ضعف داشته باشه اشتباه اومدی؛ من به توانمندی‌های خودم ایمان دارم.»',
    '«{core_co} استقلال و اقتدار درونی چیزی نیست که با گذشت زمان کم بشه؛ این ستون اصلی حضور من در این رابطه‌ست.»',
    '«{core_co} کنترل و تسلط بر احساسات هنریه که در شرایط سخت به دست آوردم؛ نگران آشفتگی نباش.»',
    '«{core_co} من پای تک‌تک تصمیماتم می‌ایستم؛ با افتخار و بدون کوچک‌ترین تردید.»'
  ];

  const mysteriousTemplates = [
    'نگاه ژرف، مکث معنادار و لحن آرام: «{core_m} دنیایی که ما با هم تجربه می‌کنیم رمزیه که هیچ ناظری از بیرون نمی‌تونه رازش رو بفهمه.»',
    '«{core_m} خطوط زمان برای ذهن‌های آگاه محو میشن؛ شاید این اولین بار نباشه که در یک مدار فکری مشترک قرار گرفتیم.»',
    '«{core_m} آنچه در اعماق این نگاه جریان داره، فراتر از نام‌ها، سن‌ها و برچسب‌های مرسوم این دنیاست.»',
    '«{core_m} بگذار دیگران درگیر سایه‌ها باشن؛ حقیقت این ارتباط نوریه که در سکوت می‌درخشه.»',
    '«{core_m} هر رابطه‌ای که از قواعد تکراری جامعه فراتر میره، رازی درون خودش داره که فقط اهلش می‌فهمن.»',
    '«{core_m} من مثل کتابی خطی و کهن با جلدی مدرنم؛ ورق زدن این صفحات صبر و شهود می‌خواد.»',
    '«{core_m} سکوت میان ما گویاتر از هر پاسخی به قضاوت‌های بیرونیه؛ بذار حدس بزنن.»',
    '«{core_m} در پس این آرامش، طوفانی از اراده و شجاعت خوابیده که زمان مقتضی آشکار میشه.»'
  ];

  const matureTemplates = [
    '«{core_ma} درک متقابل، صداقت در نیت و احترام به تجربیات زیسته همدیگه، پایدارترین بستر یک ارتباط بالغانه‌ست.»',
    '«{core_ma} هر انسانی در هر مرحله از زندگی شایسته آرامش، محبت خالصانه و احترام بدون قید و شرطه.»',
    '«{core_ma} ما به جای جنگیدن با واقعیت‌ها یا فرار از تفاوت‌ها، با متانت از اون‌ها پلی برای رشد دوطرفه می‌سازیم.»',
    '«{core_ma} پذیرش متقابل با تمام ابعاد شخصیتی، نشانه خرد و تعالی در درک روابط انسانیه.»',
    '«{core_ma} پایداری یک پیوند عاطفی به توافق عاقلانه بر سر اولویت‌ها و اهداف مشترک برمی‌گرده.»',
    '«{core_ma} حفظ عزت نفس، حریم خصوصی و استقلال فکری طرفین، والاترین اصل در یک رابطه ارزشمنده.»',
    '«{core_ma} زمان بهترین گواه بر اصالت قصد و صداقت قلبیه؛ صبوری و عقلانیت مسیر ما رو روشن می‌کنه.»',
    '«{core_ma} تحسین می‌کنم رویکرد واقع‌بینانه و مسوولانه‌ات رو؛ گفتگو با این سطح از بلوغ همیشه مغتنمه.»'
  ];

  const coreSeeds = [
    {
      c: 'هماهنگی روحی فراتر از هر معیاریه.',
      f: 'کاش به جای سن، میزان هوش رو می‌شمردیم تا برنده مشخص بشه!',
      co: 'عزت نفس و استقلال خط قرمز قطعی منه.',
      m: 'پیوندی که در سطوح عمیق‌تر آگاهی شکل می‌گیره.',
      ma: 'بلوغ و احترام متقابل زیباترین ثروت زندگیه.'
    },
    {
      c: 'اصالت رفتار تو قابل تحسین و اعتماده.',
      f: 'فکر کنم اختلاف سنیمون فقط موقع دیدن کارتون‌های بچگی لو بره!',
      co: 'ارزش واقعی یک انسان در منش و پایبندی به عهدشه.',
      m: 'رمزی که تنها با گذر زمان پرده از اون برداشته میشه.',
      ma: 'آرامش خاطر در گرو تصمیم‌های سنجیده و آگاهانه‌ست.'
    },
    {
      c: 'تلفیق تجربه و انگیزه زیباترین مسیر رو می‌سازه.',
      f: 'اگه قرار بود طبق عرف رفتار کنیم الان اینجا کنار هم نبودیم!',
      co: 'من برای شخصیتت اینجام، نه جایگاه یا دارایی‌هات.',
      m: 'حقیقتی که از چشم ظاهرپنداران پنهان می‌مونه.',
      ma: 'صداقت در بیان دغدغه‌ها شالوده اصلی اعتماده.'
    },
    {
      c: 'کشش کلامی و فکری ما غیرقابل انکاره.',
      f: 'قرارداد این رابطه رو باید با چاشنی خنده امضا کنیم!',
      co: 'قدرت درونی یعنی نترسیدن از انتخاب‌های نامتعارف.',
      m: 'در پس این نگاه، حکمتی نهفته که آرامم می‌کنه.',
      ma: 'پذیرش واقعیت با روی گشاده و منطق محکم.'
    },
    {
      c: 'انرژی متانت و پختگی تو بی‌نظیره.',
      f: 'به قول معروفا: مهم دل آدمه که همیشه جوان و شیطونه!',
      co: 'من خودم معمار زندگی و آینده‌ام هستم.',
      m: 'سکوت ما پاسخی قاطع به هیاهوی جهان پیرامونه.',
      ma: 'ارزش‌گذاری بر کیفیت تعامل انسانی.'
    },
    {
      c: 'گفتگویی سرشار از معنا و عمق روانی.',
      f: 'تنها اختلافی که داریم سر سلیقه موسیقی دهه هفتاده!',
      co: 'هیچ نیرویی توان متزلزل کردن باور من رو نداره.',
      m: 'افق‌هایی که تنها انسان‌های آزاده درکش می‌کنن.',
      ma: 'همدلی و درک نیازهای عاطفی طرف مقابل.'
    },
    {
      c: 'نگاهی سرشار از امید و احترام بی‌دریغ.',
      f: 'بیا به عنوان دو تا قانون‌شکن دوست‌داشتنی این قهوه رو تموم کنیم!',
      co: 'برابری و شرافت در نگاه من اصل اول ارتباطه.',
      m: 'سفری درونی که پایانش آرامش محضه.',
      ma: 'پختگی احساسی یعنی عبور از قضاوت‌های شتاب‌زده.'
    },
    {
      c: 'حس امنیتی که از هم‌کلامی باهات ساطع میشه.',
      f: 'بهترین بخش این رابطه اینه که هیچ‌وقت بحث‌های بچه‌گانه نداریم!',
      co: 'استواری بر موضع حق بدون نیاز به جار و جنجال.',
      m: 'روایتی خاص که در خلوت خودمون ثبت میشه.',
      ma: 'متانت و وقار، گوهر نایاب ارتباطات انسانیه.'
    }
  ];

  const targetToAdd = 10000;
  const newlyGenerated: ScenarioItem[] = [];
  let duplicatesFiltered = 0;

  let themeIdx = 0;
  let sitIdx = 0;
  let angleIdx = 0;
  let cTplIdx = 0;
  let fTplIdx = 0;
  let coTplIdx = 0;
  let mTplIdx = 0;
  let maTplIdx = 0;
  let seedIdx = 0;
  let genCounter = 1;

  while (newlyGenerated.length < targetToAdd) {
    const itemTheme = complexThemes[themeIdx % complexThemes.length];
    const rawSit = complexSituations[sitIdx % complexSituations.length];
    const angle = strategicAngles[angleIdx % strategicAngles.length];
    const seed = coreSeeds[seedIdx % coreSeeds.length];

    const cTpl = charismaticTemplates[cTplIdx % charismaticTemplates.length];
    const fTpl = funnyTemplates[fTplIdx % funnyTemplates.length];
    const coTpl = confidentTemplates[coTplIdx % confidentTemplates.length];
    const mTpl = mysteriousTemplates[mTplIdx % mysteriousTemplates.length];
    const maTpl = matureTemplates[maTplIdx % matureTemplates.length];

    const variationNumber = Math.floor(genCounter / complexThemes.length) + 1;
    let situation = '';
    if (variationNumber === 1) {
      situation = `در موقعیت ${itemTheme.theme}، زمانی که طرف مقابل می‌گوید: «${rawSit}» (${angle})`;
    } else if (variationNumber === 2) {
      situation = `مدیریت چالش در ${itemTheme.tag} با استراتژی ${angle}: «${rawSit}»`;
    } else if (variationNumber === 3) {
      situation = `پاسخ کاریزماتیک به دغدغه یا طعنه در ${itemTheme.theme} (${itemTheme.trigger}): «${rawSit}»`;
    } else if (variationNumber === 4) {
      situation = `سناریوی پیچیده عاطفی (${itemTheme.tag} - رویکرد ${angle}): «${rawSit}»`;
    } else {
      situation = `برخورد پخته با تفاوت سنی یا موقعیتی (${itemTheme.tag} - حالت ${variationNumber}): «${rawSit}»`;
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
      const id = `scen_p4_${hash}_${String(newlyGenerated.length + 1).padStart(5, '0')}`;

      const title = situation.length > 55 ? situation.substring(0, 55) + '...' : situation;

      const item: ScenarioItem = {
        id,
        title,
        category: 'اختلاف سنی و روابط پیچیده',
        situation,
        opponentLine: rawSit,
        environment: 'دیدار حضوری / مکالمه خصوصی و شرایط پیچیده',
        genderContext: 'general',
        goal: 'حفظ اقتدار، رفع نگرانی‌های سنی و مادی، و ایجاد ارتباطی مبتنی بر احترام و جذابیت اصیل',
        difficulty: 'hard',
        triggers: [rawSit, itemTheme.trigger],
        aliases: [rawSit],
        keywords: ['اختلاف سنی', 'شوگر مامی', 'شوگر ددی', 'روابط خاص', 'بلوغ فکری', 'حفظ اقتدار', itemTheme.tag],
        responses: {
          charismatic: respCharismatic,
          funny: respFunny,
          confident: respConfident,
          mysterious: respMysterious,
          mature: respMature
        },
        technique: `${angle} با تکیه بر عزت نفس مطلق و خلع سلاح روانی ترس از قضاوت.`,
        bodyLanguage: 'تن صدای عمیق و بدون شتاب، نگاه نافذ و مستقیم، پرهیز از حرکات اضافه یا دستپاچگی.',
        teachingNote: 'در روابط با تفاوت سنی یا شرایط خاص، هرگز حالت توجیه‌گرانه یا تدافعی نگیرید؛ بلوغ در رفتار مهم‌تر از کلمات است.',
        tips: 'شفافیت در مرزبندی‌های مالی و عاطفی مانع از سوءتفاهم در آینده می‌شود.',
        nextMove: 'تایید احساس مخاطب و دعوت به گفتگوی صمیمانه در فضایی امن و بدون قضاوت.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      newlyGenerated.push(item);
    }

    themeIdx++;
    sitIdx = (sitIdx + 3);
    angleIdx = (angleIdx + 7);
    cTplIdx = (cTplIdx + 1);
    fTplIdx = (fTplIdx + 3);
    coTplIdx = (coTplIdx + 5);
    mTplIdx = (mTplIdx + 2);
    maTplIdx = (maTplIdx + 4);
    seedIdx = (seedIdx + 1);
    genCounter++;
  }

  console.log(`Newly generated count in Part 4: ${newlyGenerated.length}`);
  console.log(`Duplicates filtered: ${duplicatesFiltered}`);

  // Combine locked current expanded + newly generated part 4
  const cumulativeArray: ScenarioItem[] = [...currentExpanded, ...newlyGenerated];
  const cumulativeTotal = cumulativeArray.length; // 49,425

  console.log(`Cumulative Total (39,425 + 10,000): ${cumulativeTotal}`);

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

if (process.argv[1] && process.argv[1].endsWith('generate_part4_batch.ts')) {
  const res = runPart4Generation();
  console.log('\n--- PART 4 COMPLETED RESULT ---');
  console.log(JSON.stringify(res, null, 2));
}
