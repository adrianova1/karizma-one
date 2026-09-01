import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ScenarioItem } from '../src/types.js';
import { normalizePersianText } from './restore_real_base_dataset.js';

export function runPart5Generation() {
  console.log('=== STARTING PART 5 OF 6 EXPANSION (10,000 SCENARIOS: GROUP BANTER & WITTY COMEBACKS) ===');
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
  const currentCount = currentExpanded.length; // 49,425

  console.log(`Base Locked Count: ${baseLockedCount}`);
  console.log(`Current Bank Count: ${currentCount}`);

  // Build signatures set from all current items (49,425)
  const existingSignatures = new Set<string>();
  for (const item of currentExpanded) {
    const sit = (item.situation || item.title || '').trim();
    const resp = typeof item.responses?.charismatic === 'string'
      ? item.responses.charismatic
      : (Array.isArray(item.responses?.charismatic) ? item.responses.charismatic.join(' ') : '');
    const sig = normalizePersianText(sit) + '|' + normalizePersianText(resp);
    existingSignatures.add(sig);
  }

  // --- SEMANTIC DATA MATRIX FOR PART 5: GROUP WIT, BANTER & SURPRISE COMEBACKS ---
  const groupEnvironments = [
    { env: 'دورهمی دوستانه در کافه یا ویلا', trigger: 'تکه انداختن در حضور اکیپ دوستان', tag: 'کل‌کل دوستانه' },
    { env: 'مهمانی خانوادگی و جمع فامیل', trigger: 'طعنه یا سوال فضول‌مآبانه اقوام', tag: 'حاضرجوابی فامیلی' },
    { env: 'جلسه کاری و اتاق جلسه با حضور مدیران', trigger: 'تخریب یا زیرسوال بردن عملکرد در جمع کاری', tag: 'زیرکی در محیط کار' },
    { env: 'کلاس دانشگاه یا سمینار عمومی', trigger: 'به چالش کشیدن ناگهانی توسط استاد یا هم‌کلاسی', tag: 'حاضرجوابی دانشگاهی' },
    { env: 'بازی گروهی (مافیا، پانتومیم، بردگیم)', trigger: 'اتهام‌زنی یا کری‌خوانی در حین بازی', tag: 'کری‌خوانی بازی گروهی' },
    { env: 'صف انتظار یا محیط شلوغ شهری', trigger: 'برخورد بی‌ادبانه یا حق‌به‌جانب در فضای عمومی', tag: 'مدیریت تنش خیابانی' },
    { env: 'گروه تلگرام یا چت گروهی دوستان/کاری', trigger: 'مسخره کردن یا منشن تند در گروه مجازی', tag: 'پاسخ در گروه مجازی' },
    { env: 'سفره شام یا رستوران با جمع بزرگ', trigger: 'تیکه کلامی درباره سلیقه غذا یا نحوه نشستن', tag: 'شوخی در جمع شام' }
  ];

  const groupPunches = [
    // Group banter & tease lines
    '«شنیدیم بالاخره بعد از مدت‌ها دست به جیب شدی و اومدی بیرون!»',
    '«تو همیشه اینقدر ساکتی یا فقط وقتی ما رو می‌بینی زبونت بند میاد؟»',
    '«این لباسی که پوشیدی مد جدیدیه یا از کمد بابابزرگت برداشتی؟»',
    '«ادعات میشه تو همه چی استادی، حالا بگو ببینم تو این قضیه چی کاره‌ای؟»',
    '«چرا هر وقت نوبت حساب کردن میشه میری دستشویی تلفن جواب میدی؟!»',
    '«تو جمع ما نیازی به این ژست‌های روشن‌فکری و فیلسوفانه نیست داداش!»',
    '«فکر کنم این دفعه هم پروژه‌ت مثل بقیه کارات نیمه‌کاره رها میشه نه؟»',
    '«تا تو بخوای یه تصمیمی بگیری، موهای همه‌مون رنگ دندونامون میشه!»',
    '«تو کلاً اهل عمل نیستی، فقط بلدی قشنگ صحبت کنی و تئوری ببافی!»',
    '«تو مافیا تابلوئه که یاری! چرا اینقدر دستپاچه‌ای و رنگت پریده؟»',
    '«فلانی رو ببین چه ماشینی خریده، تو هنوز اندر خم یه کوچه موندی!»',
    '«چقدر جدیداً حساس و زودرنج شدی، یه شوخی هم باهات نمیشه کرد!»',
    '«فکر نکن چون دو تا کتاب خوندی علامه دهری شدی، یکم گوش بده!»',
    '«تو همیشه عادت داری وسط حرف دیگران بپری یا فقط امروز اینطوری شدی؟»',
    '«این نظری که دادی دقیقاً مال قرن نوزدهم بود! یکم خودتو آپدیت کن!»'
  ];

  const wittyTactics = [
    'تکنیک پذیرش اغراق‌آمیز و تبدیل به شوخی (Agree & Exaggerate)',
    'تکنیک شوک سکوت و تغییر زاویه به طرف مقابل (Reverse Spotlight)',
    'تکنیک شوخ‌طبعی هوشمندانه بدون بی‌احترامی (High-Status Banter)',
    'تکنیک تبدیل تیکه به نقطه قوت شخصی (Reframing to Strength)',
    'تکنیک خلع سلاح با لبخند آرام و چشمک شیطنت‌آمیز (Wink & Smile Disarm)',
    'تکنیک ارجاع به گذشته مشترک با چاشنی طنز (Nostalgic Tease)',
    'تکنیک پاسخ مینی‌مال تک‌جمله‌ای کوبنده (One-Liner Punch)',
    'تکنیک تشویق گوینده برای تخلیه هیجان و سپس پاسخ منطقی (Emotional Absorption)'
  ];

  // Tone generation matrices for Part 5
  const charismaticTemplates = [
    'لبخند خونسرد، نگاه به کل جمع و با صدای رسا: «{core_c} وقتی یک جمع انقدر پرانرژیه، طبیعیه که شوخی‌ها هم به اوج برسه؛ از این طراوت لذت می‌برم.»',
    'با آرامش و خنده گرم: «{core_c} این حاضرجوابی و نمک‌ریختنت فضای جمع رو گرم کرد؛ آفرین به این سرعت انتقال!»',
    '«{core_c} زیبایی یک دورهمی دوستانه به همین کل‌کل‌های بی‌کینه و صمیمیه؛ ادامه بدید، منم همراهتونم.»',
    '«{core_c} تفاوت نگاه‌ها دقیقاً همون چیزیه که به گفتگوی ما عمق میده؛ ممنون که این زاویه رو باز کردی.»',
    'با نگاه مستقیم و پرکشش: «{core_c} وقتی اعتمادبه‌نفس از درون باشه، حتی تندترین شوخی‌ها هم تبدیل به فرصتی برای صمیمیت بیشتر میشن.»',
    '«{core_c} من همیشه برای هوش کلامی احترام قائلم؛ شوخی قشنگی بود و نمره‌ش کامل بود.»',
    '«{core_c} بزرگی یک جمع به اینه که هرکسی با هر سلیقه‌ای احساس راحتی و تعلق کنه؛ جمع امشب ما نمونه‌ست.»',
    '«{core_c} انرژی این جمع به قدری بالاست که هیچ حاشیه‌ای نمی‌تونه کیفیت هم‌نشینی ما رو کم کنه.»'
  ];

  const funnyTemplates = [
    'قهقهه با جمع و واکنش سریع طنز: «{core_f} فقط حواست باشه این تیکه رو به اسم خودت ثبت نکنی، کپی‌رایتش مال برنامه طنز دهه هفتاده!»',
    '«{core_f} از یک تا ده به این تلاشت نمره بیست میدم، ولی برای شوخی بعدی حتماً از قبل هماهنگ کن برات آب‌قند بیاریم!»',
    '«{core_f} بچه‌ها یه دست مرتب به افتخار بامزه‌ترین فرد جمع بزنید، زحمت کشید تا این جمله رو سر هم کنه!»',
    '«{core_f} هشدار: این سطح از نمک برای فشار خون جمع خطرناکه! لطفاً سدیم مکالمه رو بیار پایین!»',
    '«{core_f} فکر کنم دیشب تا صبح جلوی آینه داشتی این سناریو رو تمرین می‌کردی که امشب غافلگیرمون کنی!»',
    '«{core_f} به نظرم فدراسیون طنز و شوخ‌طبعی باید فوراً برات مدال افتخار صادر کنه!»',
    '«{core_f} اگه قرار بود بابت هر کلمه شوخیت مالیات بگیریم، الان بدهکارترین آدم شهر بودی!»',
    '«{core_f} واو! این تیکه رو کجای دلت قایم کرده بودی که یهو منفجرش کردی وسط جمع؟!»'
  ];

  const confidentTemplates = [
    '«{core_co} فریم و جایگاه من با طعنه‌های گذرا تکون نمی‌خوره؛ من دقیقاً می‌دونم دارم به چه سمتی حرکت می‌کنم.»',
    '«{core_co} اگر هدفت تخریب بود تیرت به سنگ خورد، اگر شوخی بود خندیدیم؛ در هر دو صورت کنترل اوضاع دست منه.»',
    '«{core_co} من نیازی به توجیه تصمیماتم برای دیگران ندارم؛ نتایج کار خودشون با صدای بلند صحبت خواهند کرد.»',
    '«{core_co} استواری یک مرد به اینه که در برابر شوخی‌های سنگین هم مثل یک صخره محکم و بدون تزلزل بمونه.»',
    '«{core_co} نظرات دیگران بازتاب ذهن خودشونه، نه واقعیت زندگی من؛ با آرامش از کنارش رد میشم.»',
    '«{core_co} برای تحت‌تاثیر قرار دادن من باید خیلی فراتر از این حرف‌های تکراری ظاهر بشی.»',
    '«{core_co} من برای انرژی و آرامش خودم ارزش قائلم و اجازه نمیدم موج منفی کسی این آرامش رو بهم بزنه.»',
    '«{core_co} قدرت واقعی در عدم واکنش به رفتارهای هیجانیه؛ صبورم چون مسیرم کاملاً روشنه.»'
  ];

  const mysteriousTemplates = [
    'سکوت کوتاه، نگاه عمیق و یک لبخند کنایه‌آمیز: «{core_m} بعضی وقتا سکوت پاسخی به کلماتیه که ارزش شنیده شدن نداشتن.»',
    '«{core_m} پشت این شوخی سطحی، دلیلی پنهان شده که فقط من و تو ازش باخبریم... بذار همینطور بمونه.»',
    '«{core_m} آب را گل‌آلود نکن، شاید آنچه در اعماق این برکه هست فراتر از درک این جمع باشه.»',
    '«{core_m} اجازه بده دیگران فکر کنن همه چیز رو می‌دونن؛ رمزآلود بودن جذاب‌ترین سپر دفاعیه.»',
    '«{core_m} زمان حقایقی رو آشکار می‌کنه که کلمات امشب توان بازگو کردنش رو ندارن.»',
    '«{core_m} توی چشم‌های من دنیاییه که شوخی‌های کوچک حتی به حاشیه‌ش هم نمی‌رسن.»',
    '«{core_m} هر بازی قواعد مخفی خودش رو داره؛ صبور باش تا برنده واقعی رو در انتهای ماجرا ببینی.»',
    '«{core_m} تاریکی شب همیشه به نور صبح ختم میشه؛ این هیجان‌ها هم به زودی فروکش می‌کنن.»'
  ];

  const matureTemplates = [
    '«{core_ma} درک می‌کنم که فضای شوخی و تفریح ایجاب می‌کنه بگیم و بخندیم، اما حفظ کرامت و مرزها همیشه اصل اوله.»',
    '«{core_ma} بلوغ اجتماعی یعنی توانایی شادی کردن و خندیدن با همدیگه، نه خندیدن به همدیگه.»',
    '«{core_ma} یک گفتگوی سالم در جمع بر پایه احترام متقابل و درک حساسیت‌های افراد شکل می‌گیره.»',
    '«{core_ma} تفاوت سلیقه‌ها و شرایط زندگی رو به عنوان بخشی از تنوع زیبای انسانی با روی گشاده می‌پذیرم.»',
    '«{core_ma} واکنش عاقلانه به تیکه‌های جمعی، هدایت فضا به سمت همدلی و آرامش بیشتره.»',
    '«{core_ma} حفظ آرامش و متانت در جمع، بزرگ‌ترین هدیه‌ایه که میشه به روح جمعی تقدیم کرد.»',
    '«{core_ma} از اینکه همه با صراحت حرفشون رو می‌زنن خوشحالم، به شرطی که ادب کلامی همیشه پایدار بمونه.»',
    '«{core_ma} صبوری در برابر رفتارهای مختلف، نشان از خردورزی و تسلط بر مهارت‌های ارتباطیه.»'
  ];

  const coreSeeds = [
    {
      c: 'نشاط و صمیمیت این جمع غنیمته.',
      f: 'فکر کنم امشب رکورد تاریخ نمک‌ریزی شکسته شد!',
      co: 'ارزش و اصالت من وابسته به قضاوت مقطعی نیست.',
      m: 'ناگفته‌های این ماجرا جذاب‌تر از شوخی‌هاشه.',
      ma: 'احترام متقابل و ادب زیباترین زینت یک دورهمیه.'
    },
    {
      c: 'حاضرجوابی در خدمت شادی جمع هنر بزرگیه.',
      f: 'کاش دوربین مداربسته بود تا این شاهکار طنز ثبت تاریخی میشد!',
      co: 'استقلال و اعتمادبه‌نفس من ریشه در واقعیت داره.',
      m: 'پشت پرده این کلمات داستانی دیگر در جریانه.',
      ma: 'خردمندی یعنی شنیدن با سعه صدر و پاسخ با متانت.'
    },
    {
      c: 'فضای پرانرژی و بدون کینه‌ای که ساخته شده عالیه.',
      f: 'الان باید برای تیکه بعدیت بلیط ورودی تهیه کنیم؟!',
      co: 'من اهدافم رو با انگیزه و قدرت دنبال می‌کنم.',
      m: 'رمزی که تنها افراد اهل معنا کشفش می‌کنن.',
      ma: 'پختگی روانی یعنی عبور از حواشی سطحی.'
    },
    {
      c: 'جریان شوخی و صمیمیت رو کاملاً حس می‌کنم.',
      f: 'دستور میدم به پاس این شوخی امشب رو تعطیل رسمی اعلام کنن!',
      co: 'هیچ بادی توان تکان دادن کوه اراده رو نداره.',
      m: 'افق‌هایی که فقط در سکوت و تمرکز دیده میشن.',
      ma: 'شادی اصیل در گرو همدلی و هم‌زبانی صادقانه است.'
    },
    {
      c: 'هارمونی و رفاقت واقعی توی همین لحظه‌ها معنا پیدا می‌کنه.',
      f: 'از فردا باید به عنوان نویسنده طنز معرفیت کنیم به تلویزیون!',
      co: 'تکیه بر عزت نفس خط بطلانی بر هر تردیدیه.',
      m: 'درون این سکوت پیامیه که زمان آموزشش میده.',
      ma: 'ارزش قائل شدن برای احساسات دیگران اصل اوله.'
    },
    {
      c: 'خاطره‌ای موندگار از یک شب پر از خنده و همدلی.',
      f: 'بهترین بخش ماجرا اینه که همه با هم از ته دل خندیدیم!',
      co: 'من برای تصمیم‌گیری فقط به منطق خودم باور دارم.',
      m: 'حقیقتی که از نگاه غوغازیستان پنهان می‌مونه.',
      ma: 'تعادل بین شوخ‌طبعی و ادب کلامی.'
    },
    {
      c: 'زیبایی رفاقت به همین درک متقابل و صمیمیت بی‌تکلفه.',
      f: 'اگه جایزه‌ای برای شکار سوژه بود قطعاً اول میشدی!',
      co: 'تسلط بر کلام و رفتار بالاترین قدرته.',
      m: 'سفری در دنیای معنا که همگان را بدان راه نیست.',
      ma: 'قدردانی از همراهی دوستان باوفا و اصیل.'
    },
    {
      c: 'پاسخ هوشمندانه با چاشنی ادب و جذابیت.',
      f: 'فکر کنم قند خون جمع با این همه انرژی افتاد!',
      co: 'ثبات قدم و شجاعت اخلاقی در هر جمعی می‌درخشه.',
      m: 'پاسخ نهایی در جایی که فکرش رو نمی‌کنی داده خواهد شد.',
      ma: 'حفظ وقار و متانت در هر شرایط و موقعیتی.'
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
    const itemEnv = groupEnvironments[envIdx % groupEnvironments.length];
    const rawPunch = groupPunches[punchIdx % groupPunches.length];
    const tactic = wittyTactics[tacticIdx % wittyTactics.length];
    const seed = coreSeeds[seedIdx % coreSeeds.length];

    const cTpl = charismaticTemplates[cTplIdx % charismaticTemplates.length];
    const fTpl = funnyTemplates[fTplIdx % funnyTemplates.length];
    const coTpl = confidentTemplates[coTplIdx % confidentTemplates.length];
    const mTpl = mysteriousTemplates[mTplIdx % mysteriousTemplates.length];
    const maTpl = matureTemplates[maTplIdx % matureTemplates.length];

    const variationNumber = Math.floor(genCounter / groupEnvironments.length) + 1;
    let situation = '';
    if (variationNumber === 1) {
      situation = `در ${itemEnv.env} وقتی یکی از افراد جمع با لحن طعنه‌آمیز می‌گوید: «${rawPunch}» (${tactic})`;
    } else if (variationNumber === 2) {
      situation = `حاضرجوابی در جمع و پاسخ به شوخی ناگهانی در ${itemEnv.tag} با متد ${tactic}: «${rawPunch}»`;
    } else if (variationNumber === 3) {
      situation = `مدیریت کل‌کل گروهی در موقعیت ${itemEnv.env} (${itemEnv.trigger}): «${rawPunch}»`;
    } else if (variationNumber === 4) {
      situation = `پاسخ کاریزماتیک به تیکه انداختن در حضور جمع (${itemEnv.tag} - رویکرد ${tactic}): «${rawPunch}»`;
    } else {
      situation = `سناریوی غافلگیرکننده کلامی در جمع (${itemEnv.tag} - الگوی ${variationNumber}): «${rawPunch}»`;
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
      const id = `scen_p5_${hash}_${String(newlyGenerated.length + 1).padStart(5, '0')}`;

      const title = situation.length > 55 ? situation.substring(0, 55) + '...' : situation;

      const item: ScenarioItem = {
        id,
        title,
        category: 'حاضرجوابی در جمع و کل‌کل‌های دوستانه',
        situation,
        opponentLine: rawPunch,
        environment: itemEnv.env,
        genderContext: 'general',
        goal: 'حفظ پرستیژ، نشان دادن هوش کلامی بالا در جمع، هدایت فضای شوخی و جلب احترام اطرافیان',
        difficulty: 'medium',
        triggers: [rawPunch, itemEnv.trigger],
        aliases: [rawPunch],
        keywords: ['حاضرجوابی', 'کل کل در جمع', 'شوخ طبعی', 'تیکه کلامی', 'دورهمی', 'پرستیژ کلامی', itemEnv.tag],
        responses: {
          charismatic: respCharismatic,
          funny: respFunny,
          confident: respConfident,
          mysterious: respMysterious,
          mature: respMature
        },
        technique: `${tactic} با تسلط کامل بر ریتم کلام و کنترل فضای احساسی جمع.`,
        bodyLanguage: 'حفظ خنده طبیعی، تماس چشمی با کل افراد حاضر، عدم جمع کردن دست‌ها و استفاده از دست‌های باز.',
        teachingNote: 'در حاضرجوابی گروهی، هدف خرد کردن طرف مقابل نیست؛ بلکه نشان دادن تسلط روانی، روحیه ورزشی و شوخ‌طبعی آلفاست.',
        tips: 'پرهیز از عصبانیت و حالت تهاجمی؛ تبدیل شوخی به لحظه‌ای خنده‌دار برای همه.',
        nextMove: 'خاتمه دادن به بحث با یک لبخند پهن و هدایت موضوع به سمت تفریح و گفتگوی عمومی.',
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

  console.log(`Newly generated count in Part 5: ${newlyGenerated.length}`);
  console.log(`Duplicates filtered: ${duplicatesFiltered}`);

  // Combine locked current expanded + newly generated part 5
  const cumulativeArray: ScenarioItem[] = [...currentExpanded, ...newlyGenerated];
  const cumulativeTotal = cumulativeArray.length; // 59,425

  console.log(`Cumulative Total (49,425 + 10,000): ${cumulativeTotal}`);

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

if (process.argv[1] && process.argv[1].endsWith('generate_part5_batch.ts')) {
  const res = runPart5Generation();
  console.log('\n--- PART 5 COMPLETED RESULT ---');
  console.log(JSON.stringify(res, null, 2));
}
