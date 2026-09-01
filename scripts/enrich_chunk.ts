import fs from 'fs';
import path from 'path';
import { PERSIAN_ARCHETYPES } from '../src/server/coach/PersianArchetypes.js';

interface ScenarioRecord {
  id: string;
  title: string;
  category?: string;
  situation: string;
  context?: string;
  triggers?: string[];
  aliases?: string[];
  keywords?: string[];
  responses: {
    charismatic?: string;
    funny?: string;
    confident?: string;
    mysterious?: string;
    mature?: string;
    direct?: string;
    friendly?: string;
    emotional?: string;
    humorous?: string;
    psychology?: string;
    tone_1?: string;
    tone_2?: string;
    tone_3?: string;
    tone_4?: string;
    tone_5?: string;
    [key: string]: any;
  };
  tips?: string;
  technique?: string;
  bodyLanguage?: string;
  nextMove?: string;
  difficulty?: string;
  likes?: number;
  views?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

function cleanText(t?: string): string {
  if (!t) return '';
  let str = t.trim();
  // Strip nested tone prefixes recursively
  while (/(با وقار و احترام:|اگه بخوام شوخی کنم:|موضع روشن و بدون تعارف:|شاید جواب اصلی این باشه:|از دید منطقی و پخته:)/.test(str)) {
    str = str.replace(/(با وقار و احترام:|اگه بخوام شوخی کنم:|موضع روشن و بدون تعارف:|شاید جواب اصلی این باشه:|از دید منطقی و پخته:)/g, '').trim();
    str = str.replace(/^[«"'"“‘\s]+|[»"'"”’\s]+$/g, '').trim();
  }
  // Strip recurring boilerplate suffixes
  str = str.replace(/همیشه اصل صداقت و برخورد شایسته تقدم داره\./g, '');
  str = str.replace(/ولی بین خودمون بمونه 😉/g, '');
  str = str.replace(/من پای حرف و نظرم می‌ایستم\./g, '');
  str = str.replace(/ولی همیشه لایه‌های عمیق‌تری هم هست\.\.\./g, '');
  str = str.replace(/حفظ تعادل و درک متقابل مهم‌ترین اولویته\./g, '');
  str = str.replace(/^[«"'"“‘\s]+|[»"'"”’\s]+$/g, '').trim();
  return str;
}

/**
 * High-craft generator for 5 distinct Persian conversational tones:
 * 1. charismatic (باکلاس، محترم، جذاب و باوقار)
 * 2. funny (شوخ‌طبع، حاضر‌جواب و کل‌کل رندانه)
 * 3. confident (مقتدر، آلفا، جسور و کنترل‌کننده فریم)
 * 4. mysterious (مرموز، چندپهلو، کنجکاوکننده و حفظ کاریزما)
 * 5. mature (پخته، همدلانه، هوشمند و با درایت روان‌شناختی)
 */
function enrich5Tones(item: ScenarioRecord): {
  charismatic: string;
  funny: string;
  confident: string;
  mysterious: string;
  mature: string;
  technique: string;
  tips: string;
  bodyLanguage: string;
  nextMove: string;
} {
  const situation = cleanText(item.situation || item.title);
  const title = cleanText(item.title);
  const fullText = `${title} ${situation}`.toLowerCase();

  // Extract any existing rich answers
  const existing = item.responses || {};
  const rawList: string[] = [];
  for (const [k, v] of Object.entries(existing)) {
    if (typeof v === 'string' && v.trim().length > 3) {
      const c = cleanText(v);
      if (!rawList.includes(c) && !/حاضرجوابی|پاسخ هوشمندانه/.test(c)) {
        rawList.push(c);
      }
    }
  }

  // Check against archetypes first
  for (const archKey of Object.keys(PERSIAN_ARCHETYPES)) {
    const arch = PERSIAN_ARCHETYPES[archKey];
    if (arch.pattern.test(fullText)) {
      const ts = arch.toneSets[0];
      if (ts) {
        return {
          charismatic: ts.charismatic[0] || 'با وقار و احترام در عین تسلط بر فریم گفتگو.',
          funny: ts.funny[0] || 'با لبخند و کل‌کل شوخ‌طبعانه فضا رو تغییر بده 😉',
          confident: ts.direct[0] || 'من بر تصمیم و حریم شخصیم تسلط کامل دارم.',
          mysterious: ts.emotional[0] || 'همیشه لایه‌های ناگفته جذاب‌تر از حرف‌های روزمره‌ست.',
          mature: ts.friendly[0] || 'ارتباط باکیفیت حاصل احترام متقابل و درک عمیقه.',
          technique: ts.technique || item.technique || 'کنترل فریم و پاسخ روان‌شناختی',
          tips: ts.tips?.charismatic || item.tips || 'حفظ آرامش، پرستیژ و تن صدای رسا.',
          bodyLanguage: 'لبخند ملایم، نگاه نافذ و بدون حالت تدافعی.',
          nextMove: ts.nextMove || 'مکث مطمئن و هدایت مکالمه به نقطه دلخواه.'
        };
      }
    }
  }

  // Context-specific intelligent synthesis for Persian conversational nuances
  let charismatic = '';
  let funny = '';
  let confident = '';
  let mysterious = '';
  let mature = '';
  let technique = item.technique || 'بازتعریف هوشمند فریم (Reframing)';

  // Category 1: Teasing, Gifts, Buying things (شکلات، پاستیل، کادو، خرج، حساب کن)
  if (/شکلات|پاستیل|کادو|بخر|هدیه|حساب کن|مهمون|ناهار|شام|کافه|خرج/.test(fullText)) {
    charismatic = `دستور شیرینی بود! ولی سورپرایزهای خاص همیشه برای هم‌نشینی‌های خاص و باکیفیت رزرو میشن ✨`;
    funny = `شکلات و پاستیل که پیشکشه، فقط نوبت حساب کردن رستوران رو اول کی ثبت میکنه؟ 😉`;
    confident = `پاداش و سورپرایز توی لیست من بر اساس امتیاز رفتار مثبته؛ ببینم تا الان چقدر امتیاز جمع کردی؟`;
    mysterious = `شاید از قبل برنامه‌ش ریخته شده، ولی مزه‌ش به غیرمنتظره بودنشه...`;
    mature = `دیدن ذوق و لبخندت واقعاً حس قشنگی داره؛ توی برنامه قرار بعدیمون حتماً لحاظ میشه.`;
    technique = 'پاسخ بازیگوشانه همراه با حفظ کنترل فریم و پاداش‌محور (Reward Framing)';
  }
  // Category 2: Late replies, ghosting, coldness (دیر جواب دادن، سردی، کجایی، آنلاینی، پیام نمیدی)
  else if (/دیر جواب|کجایی|پیام نمیدی|سرد|آنلاین|سین|جواب نمیدی|تحویل نمیگیری|بی محلی/.test(fullText)) {
    charismatic = `وقت و تمرکز باارزش‌ترین داراییه؛ ترجیح میدم با تمرکز و حضور ذهن کامل هم‌کلام باشیم نه سرسری و عجله‌ای.`;
    funny = `داشتم آماده می‌شدم به پلیس بین‌الملل اعلام مفقودی کنم! خوشبختانه سر وقت رسیدی 😉`;
    confident = `من به گفتگوی عمیق و متمرکز ارزش میدم؛ هر زمان فرصت و انرژی کافی داشتی با آرامش گپ می‌زنیم.`;
    mysterious = `گاهی سکوت و فاصله، جذابیت حرف‌های بعدی رو چند برابر می‌کنه...`;
    mature = `مشغله‌های روزمره طبیعیه؛ امیدوارم روزت آروم و پربار گذشته باشه. هر وقت راحتی در خدمتم.`;
    technique = 'ارزش‌گذاری بر زمان و تمرکز، پرهیز از طلبکاری و نیازمندی (High-Value Presence)';
  }
  // Category 3: Ego, Arrogance, Self-confidence testing (مغرور، به خودت مینازی، خودشیفته، فکر کردی کی هستی)
  else if (/مغرور|غرور|خودشیفته|مینازی|کی هستی|فیس|کلاس میذاری|شاخی/.test(fullText)) {
    charismatic = `غرور نه، اسمش احترام عمیق به زمان و حریم شخصیمه؛ ولی با آدم‌های اصیل بی‌نهایت صمیمیم.`;
    funny = `معمولاً از دور این حس رو میدم، ولی دو دقیقه که هم‌کلام بشی می‌بینی چقدر خاکیم!`;
    confident = `معمولاً افراد خونسردی، وقار و تسلط بر خود رو با غرور اشتباه می‌گیرن.`;
    mysterious = `شاید هنوز به فصل‌های خواندنی‌تر کتاب نرسیدی؛ گذر زمان خیلی چیزها رو روشن می‌کنه.`;
    mature = `شاید در برخورد اول اهل تعارف‌های سطحی نباشم، اما برای ارتباط باکیفیت و اصیل ارزش زیادی قائلم.`;
    technique = 'خنثی‌سازی برچسب منفی با تعریف مجدد وقار و متانت (Reframing Label)';
  }
  // Category 4: Flirting, Teasing, Compliments & Dating Frame (جذاب، خوشتیپ، کراش، هول، مخ زدن، شیطون)
  else if (/کراش|مخ|هول|لاس|شیطون|جذاب|خوشتیپ|خوشگل|دلبری|رل|پارتنر|عاشق/.test(fullText)) {
    charismatic = `سلیقه و نکته‌سنجی شما نشانه هوش بالاتونه؛ هم‌صحبتی با شخصی با این نگاه برام ارزشمنده.`;
    funny = `مواظب باش، جاذبه این مکالمه ممکنه باعث ایجاد اعتیاد بشه 😉`;
    confident = `من پای حسم و کیفیت انتخابم با اطمینان کامل می‌ایستم و نیازی به پنهان‌کاری نیست.`;
    mysterious = `بعضی جذابیت‌ها در نگاه اول کشف نمیشن، باید ذره‌ذره تجربه‌شون کرد...`;
    mature = `انرژی مثبت و حس خوبی که توی کلامت هست، مکالمه رو گرم و دلنشین می‌کنه.`;
    technique = 'جذابیت بازیگوشانه و پذیرش تعارف در کمال فروتنی و وقار (Playful Teasing)';
  }
  // Category 5: Queue, Line, Physical encounter (صف، تو صف، نوبت، سبقت، راه بده)
  else if (/صف|توصف|نوبت|جلو زدی|وایستا|رد شو/.test(fullText)) {
    charismatic = `احترام به نوبت نشانه فرهنگ و پرستیژ هر دو ماست؛ با کمال میل نوبت شما.`;
    funny = `اگه عجله داری پرواز اختصاصی تحویل بدم؟ بفرمایید نوبت با شماست 😉`;
    confident = `نظم و رعایت نوبت حق همه افراده؛ با آرامش کارمون انجام میشه.`;
    mysterious = `همیشه مقصد مهم نیست، گاهی نحوه مسیر و احترامی که میذاریم تعیین‌کننده‌ست.`;
    mature = `اگر عجله دارید با کمال احترام می‌تونید جلوتر برید، مشکلی نیست.`;
    technique = 'مدیریت تضاد در فضاهای عمومی با پرستیژ بالا و قاطعیت مؤدبانه';
  }
  // Category 6: Emotional threats & dramatic lines (دیگه باهات حرف نمیزنم، بلاک، قهرم، میرم، کات)
  else if (/دیگه باهات حرف نمیزنم|حرف نمیزنم|بلاک|قهرم|میرم|کات|تموم|خداحافظ|دیگه به من زنگ نزن|دیگه پیام نده/.test(fullText)) {
    charismatic = `همیشه وقتی اوضاع طبق میلت پیش نمیره تهدید به رفتن می‌کنی یا فقط امروز اینجوریه؟ ✨`;
    funny = `باشه ولی اگه دلت تنگ شد جریمه‌ت اینه که خودت شروع‌کننده مکالمه باشی 😉`;
    confident = `من برای نگه داشتن کسی اصرار یا التماس نمیکنم؛ در برای کسایی که ارزش ارتباط رو میدونن همیشه بازه.`;
    mysterious = `سکوت گاهی حرف‌های بیشتری برای گفتن داره... تا زمانی که آرامش برگرده.`;
    mature = `درک میکنم که الان دلخوری یا ناراحتی؛ هر زمان که آروم‌تر شدی با کمال میل صحبت می‌کنیم.`;
    technique = 'پاسخ به تهدید عاطفی بدون افتادن در فریم نیازمندی یا وحشت (Standing Firm)';
  }
  // Category 7: Caring & Affection shit-tests (مواظب باش، مراقبت کن، رسیدی خبر بده، حواست باشه)
  else if (/مواظب باش|مراقبت کن|رسیدی خبر بده|حواست باشه|مراقب خودت باش/.test(fullText)) {
    charismatic = `تو هم مراقب خودت باش لیدی جون؛ حضور انرژی‌های خوب مثل تو غنیمته ✨`;
    funny = `چشم قربان! دستور دیگه‌ای برای محافظت از خودم صادر نمیشه؟ 😉`;
    confident = `همیشه حواسم به امنیت و چارچوب‌هام هست؛ مرسی از توجه و هوشیاریت.`;
    mysterious = `وقتی کسی مثل تو نگرانمه، خودبه‌خود محتاط‌تر میشم...`;
    mature = `ممنون از توجه و مهربونی قشنگت؛ ان‌شاءالله روز و لحظاتت پر از آرامش باشه.`;
    technique = 'پاسخ گرم و باپرستیژ به محبت و شت‌تست توجه (Affection Validation)';
  }
  // Category 8: Criticism, Complaints, Disagreements (چرا اینجوری شدی، عوض شدی، گیر نده، به تو چه)
  else if (/عوض شدی|گیر نده|به تو چه|ربطی نداره|دخالت|چرا اینجوری|خسته شدم/.test(fullText)) {
    charismatic = `من تغییر نکردم، فقط نگاهم به اولویت‌ها شفاف‌تر و پخته‌تر شده.`;
    funny = `نسخه جدید منتشر شده با باگ‌های کمتر و سرعت پردازش بیشتر! مایل به نصب هستی؟ 😉`;
    confident = `مرزهای شفاف باعث میشه هر دو طرف در آرامش و امنیت با هم گفتگو کنیم.`;
    mysterious = `آدم‌ها تغییر نمیکنن، فقط بخش‌هایی که کمتر دیدی رو بیشتر نشون میدن...`;
    mature = `حق با توئه که احساست رو بگی؛ برام مهمه دقیقاً بشنوم چه چیزی باعث این حس شده.`;
    technique = 'مرزبندی محترمانه و شنود فعال بدون افتادن در دام تدافعی (De-escalation)';
  }
  // Category 9: Relationship status, Ex, Past (اکس، قبلیا، قبلاً رل داشتی، چند بار عاشق شدی)
  else if (/اکس|قبلیا|عاشق شدی|رل داشتی|دوست دختر|دوست پسر|چند نفرو|گذشته/.test(fullText)) {
    charismatic = `گذشته تجربه بوده، ولی جذابیت اصلی همیشه توی زمان حال و فردیه که الان روبرومه.`;
    funny = `رزومه عاطفی من محرمانه‌ست، فقط به متقاضیان واجد شرایط نمایش داده میشه! 😉`;
    confident = `گذشته من هر چی که بوده باعث شده الان این نسخه پخته و قاطع باشم.`;
    mysterious = `هر کتابی فصل‌های خونده‌شده داره، ولی هنر اینه که ببینی فصل جدید چطور پیش میره...`;
    mature = `تجارب گذشته جزئی از مسیر رشد من بودن و بهشون با احترام نگاه می‌کنم.`;
    technique = 'تغییر مسیر هوشمندانه از کنجکاوی‌های گذشته به زمان حال (Present-Moment Reframing)';
  }
  // Category 10: General everyday banter, introductions, social situations & observations
  else {
    const rawAnswer = rawList[0] || '';
    if (rawAnswer && rawAnswer.length > 5) {
      charismatic = `با وقار و احترام: «${rawAnswer}» همیشه اصل صداقت و برخورد شایسته تقدم داره.`;
      funny = `اگه بخوام شوخی کنم: «${rawAnswer}» ولی بین خودمون بمونه 😉`;
      confident = `موضع روشن و بدون تعارف: «${rawAnswer}» من پای حرف و نظرم می‌ایستم.`;
      mysterious = `شاید جواب اصلی این باشه: «${rawAnswer}» ولی همیشه لایه‌های عمیق‌تری هم هست...`;
      mature = `از دید منطقی و پخته: «${rawAnswer}» حفظ تعادل و درک متقابل مهم‌ترین اولویته.`;
    } else {
      charismatic = `آرامش، وقار و بیان شمرده همیشه اثرگذارترین شیوه هدایت هر گفتگوییه.`;
      funny = `جواب‌های مختلفی تو ذهنم بود، ولی ترجیح میدم با یه لبخند رد بشم 😉`;
      confident = `با خونسردی و تسلط کامل، من روی خط فکری و اصول خودم حرکت می‌کنم.`;
      mysterious = `همیشه جذاب‌ترین مکالمات اونایی هستن که بخشی از حقیقت رو به درک طرف مقابل واگذار می‌کنن...`;
      mature = `برای من در هر موقعیتی، حفظ احترام متقابل و درک عمیق اولویت اوله.`;
    }
  }

  // Ensure absolutely no identical tones
  if (charismatic === funny) funny = `با یه لبخند ملیح و زیرکانه فضا رو تلطیف کن 😉`;
  if (confident === charismatic) confident = `با تسلط و قاطعیت کامل از فریم خودت دفاع کن.`;
  if (mysterious === charismatic || mysterious === mature) mysterious = `گاهی ناگفته‌ها صدایی رساتر از هزاران کلمه دارن...`;
  if (mature === confident) mature = `برخورد عاقلانه و در نظر گرفتن ابعاد انسانی موضوع، همیشه بهترین انتخابه.`;

  return {
    charismatic,
    funny,
    confident,
    mysterious,
    mature,
    technique,
    tips: item.tips || 'حفظ آرامش، پرستیژ و تن صدای رسا.',
    bodyLanguage: item.bodyLanguage || 'زبان بدن باز، قامت استوار و لبخند مطمئن.',
    nextMove: item.nextMove || 'مکث کوتاه و اجازه به طرف مقابل برای هضم پیام.'
  };
}

export function enrichChunkFile(chunkIndex: number = 1) {
  const pad = String(chunkIndex).padStart(3, '0');
  const chunkPath = path.join(process.cwd(), `data/chunks/chunk_${pad}.json`);
  
  if (!fs.existsSync(chunkPath)) {
    console.error(`Chunk file not found: ${chunkPath}`);
    process.exit(1);
  }

  console.log(`\n=== ENRICHING CHUNK ${pad} WITH 5 BESPOKE PERSIAN TONES ===`);
  const raw = fs.readFileSync(chunkPath, 'utf8');
  const items: ScenarioRecord[] = JSON.parse(raw);
  console.log(`Loaded ${items.length.toLocaleString()} items from ${chunkPath}`);

  let enrichedCount = 0;
  for (const item of items) {
    const tones = enrich5Tones(item);
    item.responses = {
      charismatic: tones.charismatic,
      funny: tones.funny,
      confident: tones.confident,
      mysterious: tones.mysterious,
      mature: tones.mature,
      // Compatibility mappings
      direct: tones.confident,
      friendly: tones.mature,
      emotional: tones.mysterious,
      humorous: tones.funny,
      psychology: tones.mature,
      tone_1: tones.confident,
      tone_2: tones.funny,
      tone_3: tones.charismatic,
      tone_4: tones.mysterious,
      tone_5: tones.mature
    };
    item.technique = tones.technique;
    item.tips = tones.tips;
    item.bodyLanguage = tones.bodyLanguage;
    item.nextMove = tones.nextMove;
    enrichedCount++;
  }

  // 1. Write updated chunk file
  fs.writeFileSync(chunkPath, JSON.stringify(items, null, 2), 'utf8');
  console.log(`[Success] Written ${enrichedCount.toLocaleString()} 5-tone enriched items to ${chunkPath}`);

  // 2. Synchronize master databases
  console.log(`\n=== SYNCHRONIZING WITH MASTER SCENARIOS DATABASE ===`);
  const masterPath = path.join(process.cwd(), 'data/scenarios.json');
  const coachMasterPath = path.join(process.cwd(), 'data/coach/scenarios.json');
  const prodMasterPath = path.join(process.cwd(), 'data/production/master_base_bank.json');

  let masterList: ScenarioRecord[] = [];
  if (fs.existsSync(masterPath)) {
    masterList = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
  }

  const chunkMap = new Map<string, ScenarioRecord>();
  items.forEach(it => chunkMap.set(it.id, it));

  let mergedCount = 0;
  for (let i = 0; i < masterList.length; i++) {
    const existing = masterList[i];
    if (chunkMap.has(existing.id)) {
      masterList[i] = chunkMap.get(existing.id)!;
      mergedCount++;
    }
  }

  const jsonStr = JSON.stringify(masterList, null, 2);
  fs.writeFileSync(masterPath, jsonStr, 'utf8');
  if (fs.existsSync(path.dirname(coachMasterPath))) {
    fs.writeFileSync(coachMasterPath, jsonStr, 'utf8');
  }
  if (fs.existsSync(path.dirname(prodMasterPath))) {
    fs.writeFileSync(prodMasterPath, jsonStr, 'utf8');
  }

  console.log(`[Master Sync] Updated ${mergedCount.toLocaleString()} items in master database files.`);
  console.log(`=== CHUNK ${pad} ENRICHMENT & SYNCHRONIZATION COMPLETE ===\n`);
}

// Direct CLI execution
const arg = process.argv[2] ? parseInt(process.argv[2], 10) : 1;
enrichChunkFile(arg);
