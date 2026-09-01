import fs from 'fs';
import path from 'path';

// Helper to normalize Persian text purely for deduplication comparison
function simpleNormalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\u064a/g, '\u06cc')
    .replace(/\u0643/g, '\u06a9')
    .replace(/\u0629/g, '\u0647')
    .replace(/[\u0622\u0623\u0625]/g, '\u0627')
    .replace(/[\u064b-\u0652]/g, '')
    .replace(/\u200c/g, ' ')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»،؛؟]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const scenariosPath = path.join(process.cwd(), 'data/coach/scenarios.json');
const existingBenchPath = path.join(process.cwd(), 'data/coach/benchmark.json');

const scenarios = JSON.parse(fs.readFileSync(scenariosPath, 'utf-8'));
const existingBench = JSON.parse(fs.readFileSync(existingBenchPath, 'utf-8'));

const forbiddenSet = new Set<string>();

for (const sc of scenarios) {
  for (const t of sc.triggers || []) forbiddenSet.add(simpleNormalize(t));
  for (const a of sc.aliases || []) forbiddenSet.add(simpleNormalize(a));
}

for (const b of existingBench) {
  forbiddenSet.add(simpleNormalize(b.input));
}

console.log(`Loaded ${forbiddenSet.size} forbidden exact phrases to prevent benchmark leakage.`);

export interface BlindTestCase {
  id: string;
  query: string;
  expectedScenario: string | null;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type:
    | 'natural_conversational'
    | 'informal_typographical'
    | 'long_conversational'
    | 'ambiguous_query'
    | 'adversarial_false_positive'
    | 'paraphrase_generalization';
}

const tests: BlindTestCase[] = [];
let idCounter = 1;

function addTest(
  query: string,
  expectedScenario: string | null,
  category: string,
  difficulty: 'easy' | 'medium' | 'hard',
  type: BlindTestCase['type']
) {
  const norm = simpleNormalize(query);
  if (forbiddenSet.has(norm)) {
    console.warn(`[REJECTED DUPLICATE] Query is too similar to existing trigger/benchmark: "${query}"`);
    return;
  }
  tests.push({
    id: `blind_${String(idCounter++).padStart(3, '0')}`,
    query,
    expectedScenario,
    category,
    difficulty,
    type
  });
}

// -------------------------------------------------------------
// Group A: Natural Conversational Variations (~25% -> 80 tests)
// -------------------------------------------------------------
// scen_1: مرزبندی رابطه
addTest("طرف تو چت گفت هنوز به مرحله‌ای نرسیدم که تعهد بدم", "scen_1", "پاسخ به مرزبندی و احتیاط", "medium", "natural_conversational");
addTest("گفت من کلا روحیه تنهایی رو به رابطه ترجیح میدم الان", "scen_1", "پاسخ به مرزبندی و احتیاط", "medium", "natural_conversational");
addTest("بهم گفت من ادم رابطه نیستم بیشتر دنبال ارامشم", "scen_1", "پاسخ به مرزبندی و احتیاط", "medium", "natural_conversational");
addTest("وسط حرفامون گفت ترجیح میدم صرفا دوست معمولی بمونیم و تعهد نباشه", "scen_1", "پاسخ به مرزبندی و احتیاط", "hard", "natural_conversational");
addTest("طرف پیام داد که از رابطه عاطفی قبلیش هنوز آسیب دیده و قصد رابطه نداره", "scen_1", "پاسخ به مرزبندی و احتیاط", "medium", "natural_conversational");
addTest("میگه شرایط روحیم طوری نیست که بخوام رل بزنم", "scen_1", "پاسخ به مرزبندی و احتیاط", "easy", "natural_conversational");
addTest("گفت من اصلا فاز رل زدن و رابطه جدی ندارم", "scen_1", "پاسخ به مرزبندی و احتیاط", "easy", "natural_conversational");
addTest("پیام داده من فعلا تمرکزم روی درسمه و وقت رابطه ندارم", "scen_1", "پاسخ به مرزبندی و احتیاط", "medium", "natural_conversational");
addTest("بهم میگه من ادم موندگاری تو رابطه نیستم", "scen_1", "پاسخ به مرزبندی و احتیاط", "medium", "natural_conversational");
addTest("نوشته بود من اهل رابطه و این داستانا نیستم", "scen_1", "پاسخ به مرزبندی و احتیاط", "easy", "natural_conversational");

// scen_2: تاخیر در پاسخ
addTest("پیامم رو ساعت ۹ صبح دید ولی ۶ عصر جواب داد", "scen_2", "مدیریت ریتم چت و بی محلی", "medium", "natural_conversational");
addTest("دیروز عصر پیام دادم الان تازه اومده روی خط", "scen_2", "مدیریت ریتم چت و بی محلی", "medium", "natural_conversational");
addTest("استوری جدید گذاشته ولی جواب پیام دیشب منو نداده", "scen_2", "مدیریت ریتم چت و بی محلی", "medium", "natural_conversational");
addTest("چرا وقتی انلاین میشه پیام منو سین نمیکنه", "scen_2", "مدیریت ریتم چت و بی محلی", "easy", "natural_conversational");
addTest("طرف پنج ساعت بعد از سوالم فقط نوشته ببخشید ندیدم", "scen_2", "مدیریت ریتم چت و بی محلی", "medium", "natural_conversational");
addTest("همش تیک دوم میخوره ولی بازش نمیکنه ببینه", "scen_2", "مدیریت ریتم چت و بی محلی", "medium", "natural_conversational");
addTest("یه روز در میون جواب چت رو میده کلافه شدم", "scen_2", "مدیریت ریتم چت و بی محلی", "hard", "natural_conversational");
addTest("پیام دیشبم رو بی پاسخ گذاشت و صبح سلام فرستاد", "scen_2", "مدیریت ریتم چت و بی محلی", "medium", "natural_conversational");
addTest("سین زد اما هیچی ننوشت چی بهش بگم", "scen_2", "مدیریت ریتم چت و بی محلی", "easy", "natural_conversational");
addTest("مدام انلاین و افلاین میشه ولی پی وی من باز نمیشه", "scen_2", "مدیریت ریتم چت و بی محلی", "medium", "natural_conversational");

// scen_3: یخ‌شکنی و شروع
addTest("توی ورکشاپ کنار یه نفر نشستم چطور مکالمه رو کلید بزنم", "scen_3", "شروع ارتباط و یخ‌شکنی", "medium", "natural_conversational");
addTest("تو کتابخونه نشسته بودم چطور با بغل دستیم حرف بزنم", "scen_3", "شروع ارتباط و یخ‌شکنی", "medium", "natural_conversational");
addTest("تو پرواز کنار یه نفر باکلاس نشستم چی بگم سر صحبت باز بشه", "scen_3", "شروع ارتباط و یخ‌شکنی", "medium", "natural_conversational");
addTest("چطور مکالمه رو با کسی که نمیشناسم تو ایونت شروع کنم", "scen_3", "شروع ارتباط و یخ‌شکنی", "easy", "natural_conversational");
addTest("تو سالن انتظار فرودگاه چطور با یه نفر باب اشنایی رو باز کنم", "scen_3", "شروع ارتباط و یخ‌شکنی", "medium", "natural_conversational");
addTest("توی کافه نشستم یه نفر نظرمو جلب کرده چی بگم بهش", "scen_3", "شروع ارتباط و یخ‌شکنی", "easy", "natural_conversational");
addTest("جمله اول برای شروع صحبت با همکلاسی جدید تو دانشگاه", "scen_3", "شروع ارتباط و یخ‌شکنی", "medium", "natural_conversational");
addTest("توی نمایشگاه کتاب چطور به یه نفر نزدیک بشم و حرف بزنم", "scen_3", "شروع ارتباط و یخ‌شکنی", "medium", "natural_conversational");
addTest("وقتی تو یه جمع غریبه ام چطور مکالمه رو اغاز کنم", "scen_3", "شروع ارتباط و یخ‌شکنی", "medium", "natural_conversational");
addTest("جمله پیشنهادی برای شکستن یخ رابطه تو قرار اول", "scen_3", "شروع ارتباط و یخ‌شکنی", "easy", "natural_conversational");

// scen_4: کل‌کل و کنایه
addTest("بهم گفت حس میکنم خیلی ادعات میشه", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "medium", "natural_conversational");
addTest("برگشت گفت تو همیشه فکر میکنی از بقیه بهتری", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "medium", "natural_conversational");
addTest("وسط جمع بهم تیکه انداخت که اعتماد به نفست کاذبه", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "medium", "natural_conversational");
addTest("گفت سنت کمه و رفتارات خیلی بچگونست", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "easy", "natural_conversational");
addTest("تیکه انداخت که چقدر قیافه میگیری برای ما", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "easy", "natural_conversational");
addTest("گفت فکر نکن چون خوش لباسی کسی تحویلت میگیره", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "medium", "natural_conversational");
addTest("مسخره کرد گفت تو رو چه به این حرفای گنده", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "easy", "natural_conversational");
addTest("بهم گفت تو کلا بچه سالی و هنوز بزرگ نشدی", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "easy", "natural_conversational");
addTest("توی گروه کنایه زد که فلانی همش خودشو میندازه وسط", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "medium", "natural_conversational");
addTest("گفت شوخی کردم ولی لحنش کاملا تیکه دار بود", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "medium", "natural_conversational");

// scen_5: ریپلای استوری
addTest("استوری از منظره غروب گذاشته با یه موزیک ملایم چی بنویسم براش", "scen_5", "شبکه‌های اجتماعی و چت", "medium", "natural_conversational");
addTest("عکس از کتابی که میخونه استوری کرده چی دایرکت بدم", "scen_5", "شبکه‌های اجتماعی و چت", "medium", "natural_conversational");
addTest("استوری از ورزش صبحگاهیش گذاشته چطور ریپلای کنم ضایع نباشه", "scen_5", "شبکه‌های اجتماعی و چت", "medium", "natural_conversational");
addTest("عکس از گربه بامزش استوری کرده چی پیام بدم", "scen_5", "شبکه‌های اجتماعی و چت", "medium", "natural_conversational");
addTest("استوری از قهوه و لپ تاپ تو فضای باز گذاشته چی بگم", "scen_5", "شبکه‌های اجتماعی و چت", "easy", "natural_conversational");
addTest("یه کوئسشن باکس اینستا گذاشته چطور جواب جذاب بفرستم", "scen_5", "شبکه‌های اجتماعی و چت", "medium", "natural_conversational");
addTest("عکس سفرش به کویر رو گذاشته چی بنویسم دایرکت", "scen_5", "شبکه‌های اجتماعی و چت", "medium", "natural_conversational");
addTest("استوری ماشینش رو گذاشته چطوری سر صحبت رو باز کنم", "scen_5", "شبکه‌های اجتماعی و چت", "medium", "natural_conversational");
addTest("استوری یه نمایش تئاتر گذاشته چی بگم متوجه سلیقم بشه", "scen_5", "شبکه‌های اجتماعی و چت", "medium", "natural_conversational");
addTest("پست جدید گذاشته تو صفحه شخصیش چطور کامنت یا دایرکت بدم", "scen_5", "شبکه‌های اجتماعی و چت", "easy", "natural_conversational");

// scen_6: تعریف و تمجید
addTest("بهم گفت صدات خیلی ارامش بخش و خاصه", "scen_6", "پاسخ به تعریف و تمجید", "medium", "natural_conversational");
addTest("گفت ساعت مچیت خیلی باکلاسه از کجا خریدی", "scen_6", "پاسخ به تعریف و تمجید", "medium", "natural_conversational");
addTest("پیام داد چقدر توی عکس پروفایلت موهات قشنگ شده", "scen_6", "پاسخ به تعریف و تمجید", "medium", "natural_conversational");
addTest("بهم گفت هوش و طرز تفکرت خیلی جذابه برام", "scen_6", "پاسخ به تعریف و تمجید", "easy", "natural_conversational");
addTest("تعریف کرد از نحوه فن بیان و صحبتم تو جلسه", "scen_6", "پاسخ به تعریف و تمجید", "easy", "natural_conversational");
addTest("گفت رنگ لباست خیلی به چهره و چشمات میاد", "scen_6", "پاسخ به تعریف و تمجید", "medium", "natural_conversational");
addTest("بهم گفت انرژی مثبتی که داری حال ادمو خوب میکنه", "scen_6", "پاسخ به تعریف و تمجید", "medium", "natural_conversational");
addTest("گفت خیلی خوش هیکلی باشگاه میری", "scen_6", "پاسخ به تعریف و تمجید", "easy", "natural_conversational");
addTest("تعریف کرد از عطری که زدم چی بگم باکلاس باشه", "scen_6", "پاسخ به تعریف و تمجید", "easy", "natural_conversational");
addTest("گفت سلیقه ات تو انتخاب موزیک فوق العاده است", "scen_6", "پاسخ به تعریف و تمجید", "medium", "natural_conversational");

// scen_7: دعوت به قرار
addTest("چطور بهش پیشنهاد بدم بریم نمایشگاه عکاسی", "scen_7", "هدایت چت به قرار ملاقات", "medium", "natural_conversational");
addTest("میخوام پیشنهاد سینما رفتن بدم چطور بگم نه نیاره", "scen_7", "هدایت چت به قرار ملاقات", "medium", "natural_conversational");
addTest("چند وقته چت میکنیم چطور دعوتش کنم به پیاده روی عصرگاهی", "scen_7", "هدایت چت به قرار ملاقات", "medium", "natural_conversational");
addTest("چطوری بگم دوست دارم ببینمت که حس فشار بهش دست نده", "scen_7", "هدایت چت به قرار ملاقات", "medium", "natural_conversational");
addTest("پیشنهاد صرف ناهار یا شام در رستوران چطور بدم", "scen_7", "هدایت چت به قرار ملاقات", "easy", "natural_conversational");
addTest("میخوام قرار بذارم واسه اخر هفته چی پیام بدم", "scen_7", "هدایت چت به قرار ملاقات", "easy", "natural_conversational");
addTest("چطوری مکالمه تو تلگرام رو تبدیل به قرار حضوری کنم", "scen_7", "هدایت چت به قرار ملاقات", "easy", "natural_conversational");
addTest("بهترین شیوه برای دعوت کردن کراش به یه قرار دوستانه", "scen_7", "هدایت چت به قرار ملاقات", "easy", "natural_conversational");
addTest("میخوام بگم بریم بام تهران قدم بزنیم چی بفرستم", "scen_7", "هدایت چت به قرار ملاقات", "medium", "natural_conversational");
addTest("چطور دعوتش کنم بیاد گالری نقاشی باهام", "scen_7", "هدایت چت به قرار ملاقات", "medium", "natural_conversational");

// scen_8: پیام سرد و تک کلمه‌ای
addTest("هر چی میگم فقط یه استیکر لایک میفرسته", "scen_8", "مدیریت ریتم چت و بی محلی", "medium", "natural_conversational");
addTest("بعد از کلی توضیح فقط نوشت اها چی بگم بهش", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "natural_conversational");
addTest("طرف توی چت فقط مینویسه هوم یا اره", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "natural_conversational");
addTest("متن طولانی دادم فقط نوشت اوکی مرسی", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "natural_conversational");
addTest("حس میکنم لحن پیاماش خیلی خشک و بی تفاوته", "scen_8", "مدیریت ریتم چت و بی محلی", "medium", "natural_conversational");
addTest("به سوال بااحساسم فقط با کلمه باشه جواب داد", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "natural_conversational");
addTest("پاسخ تک کلمه ای میده چطور ری اکشن نشون بدم", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "natural_conversational");
addTest("چرا انقدر چتش بی روحه چطور فضا رو عوض کنم", "scen_8", "مدیریت ریتم چت و بی محلی", "medium", "natural_conversational");
addTest("طرف هیچی برای ادامه دادن بحث نمیگه فقط تایید میکنه", "scen_8", "مدیریت ریتم چت و بی محلی", "medium", "natural_conversational");
addTest("وقتی مینویسه اوکی چطور جواب بدم که ارزش خودم حفظ بشه", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "natural_conversational");

// -------------------------------------------------------------
// Group B: Informal Persian / Typographical Variations (~15% -> 50 tests)
// -------------------------------------------------------------
addTest("مـیـگـه مـن اهـل رل زدن نـیـسـتـم", "scen_1", "پاسخ به مرزبندی و احتیاط", "medium", "informal_typographical");
addTest("طرف قـــصد رااابطه نداره چے بگم", "scen_1", "پاسخ به مرزبندی و احتیاط", "hard", "informal_typographical");
addTest("نمیخوام واردِ رابـطه بـشم گفـت", "scen_1", "پاسخ به مرزبندی و احتیاط", "medium", "informal_typographical");
addTest("نمیییخوام رل بزننم", "scen_1", "پاسخ به مرزبندی و احتیاط", "easy", "informal_typographical");
addTest("دییییر جووواب داد پیاممووو", "scen_2", "مدیریت ریتم چت و بی محلی", "easy", "informal_typographical",);
addTest("سیییین زده ولی جووواب نداددد", "scen_2", "مدیریت ریتم چت و بی محلی", "easy", "informal_typographical");
addTest("آنلاااین بود جوووواب نـداد", "scen_2", "مدیریت ریتم چت و بی محلی", "easy", "informal_typographical");
addTest("بعد چن سااعت ج دااد", "scen_2", "مدیریت ریتم چت و بی محلی", "medium", "informal_typographical");
addTest("چطووور سر صحببت رو بااز کنم تو کااافه", "scen_3", "شروع ارتباط و یخ‌شکنی", "easy", "informal_typographical");
addTest("یخخخ شکنی تو مهموونی با دختتر", "scen_3", "شروع ارتباط و یخ‌شکنی", "medium", "informal_typographical");
addTest("چطوری سرِ صحبت رو باز کنـم", "scen_3", "شروع ارتباط و یخ‌شکنی", "easy", "informal_typographical");
addTest("گف چقد پرویی خدایییی", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "easy", "informal_typographical");
addTest("بهم مییگه تو خیلییی بچههه ایی", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "easy", "informal_typographical");
addTest("کللل کلل کررد چی ج بدم", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "medium", "informal_typographical");
addTest("تیکه انـداخـت بچـه شـدی", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "easy", "informal_typographical");
addTest("چقد خودتو تحوییییل میگیریییی", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "easy", "informal_typographical");
addTest("ریییپلای به استوووری عککس", "scen_5", "شبکه‌های اجتماعی و چت", "easy", "informal_typographical");
addTest("استورییی کاافه گذاشته چے بگم", "scen_5", "شبکه‌های اجتماعی و چت", "easy", "informal_typographical");
addTest("ریپـلای اسـتوری اینـستا", "scen_5", "شبکه‌های اجتماعی و چت", "easy", "informal_typographical");
addTest("عاااکس گذاشته تو پپیجش چے بگم", "scen_5", "شبکه‌های اجتماعی و چت", "medium", "informal_typographical");
addTest("گفففت خوشششتیپی چے بگم", "scen_6", "پاسخ به تعریف و تمجید", "easy", "informal_typographical");
addTest("تعرییف از استااایل و تیییپ", "scen_6", "پاسخ به تعریف و تمجید", "easy", "informal_typographical");
addTest("گـفت چـقدر جـذابی شـما", "scen_6", "پاسخ به تعریف و تمجید", "medium", "informal_typographical");
addTest("دعوووت به کااافه و قـرار", "scen_7", "هدایت چت به قرار ملاقات", "easy", "informal_typographical");
addTest("چطوور پیشششنهاد بییرون رفتن بدم", "scen_7", "هدایت چت به قرار ملاقات", "easy", "informal_typographical");
addTest("پیشـنهاد قـرار عاشـقانه", "scen_7", "هدایت چت به قرار ملاقات", "easy", "informal_typographical");
addTest("پیـام سـرد داد چی بگـم", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "informal_typographical");
addTest("فقططط مییگه اوووکی چے بگم", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "informal_typographical");
addTest("گفت بااشه چے ج بدم", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "informal_typographical");
addTest("تک کلمه ایی جووواب داد", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "informal_typographical");
addTest("سـرد شـده چـتـش بـاهـام", "scen_8", "مدیریت ریتم چت و بی محلی", "medium", "informal_typographical");
addTest("طرففف میییگه اهههل رل نیییستم", "scen_1", "پاسخ به مرزبندی و احتیاط", "easy", "informal_typographical");
addTest("قصصصد ازدوااج نـدارم فعـلا", "scen_1", "پاسخ به مرزبندی و احتیاط", "medium", "informal_typographical");
addTest("دیـر سـین زد پـیامـم رو", "scen_2", "مدیریت ریتم چت و بی محلی", "medium", "informal_typographical");
addTest("سر صحبتتت با دختتر تو کلااس", "scen_3", "شروع ارتباط و یخ‌شکنی", "medium", "informal_typographical");
addTest("گفتتت بچـه بااازی درنـیار", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "easy", "informal_typographical");
addTest("تیکـه سـنگین زددد بم", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "easy", "informal_typographical");
addTest("تعریییف کرددد از عطرررم", "scen_6", "پاسخ به تعریف و تمجید", "easy", "informal_typographical");
addTest("دعوووت به قهووه دااخل کافه", "scen_7", "هدایت چت به قرار ملاقات", "easy", "informal_typographical");
addTest("چطوووری شماااره بگـیرم ازش", "scen_7", "هدایت چت به قرار ملاقات", "easy", "informal_typographical");
addTest("جوواب سررد داده چییی بفرستم", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "informal_typographical");
addTest("فقطط استیکککر میفرستته چتت خشککه", "scen_8", "مدیریت ریتم چت و بی محلی", "medium", "informal_typographical");
addTest("گفـت چـقـدر نـازی شـما", "scen_6", "پاسخ به تعریف و تمجید", "easy", "informal_typographical");
addTest("ریییپلای به اسـتوری غـذا", "scen_5", "شبکه‌های اجتماعی و چت", "easy", "informal_typographical");
addTest("یخخخ شـکنی در مهـمونی", "scen_3", "شروع ارتباط و یخ‌شکنی", "easy", "informal_typographical");
addTest("انـلاین بـود پـیام نـداد", "scen_2", "مدیریت ریتم چت و بی محلی", "medium", "informal_typographical");
addTest("قـصد رابـطه نـدارم گـفت", "scen_1", "پاسخ به مرزبندی و احتیاط", "easy", "informal_typographical");
addTest("طـاقـچه بـالا گـذاشـته", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "easy", "informal_typographical");
addTest("تـعریف از هـیکل و فـیتنس", "scen_6", "پاسخ به تعریف و تمجید", "easy", "informal_typographical");
addTest("پیـشنهاد دیـدار اولـیه", "scen_7", "هدایت چت به قرار ملاقات", "easy", "informal_typographical");

// -------------------------------------------------------------
// Group C: Long Conversational Messages (~15% -> 50 tests)
// -------------------------------------------------------------
addTest("سلام داداش، دیروز با یه خانمی چت میکردم همه چیز عالی بود ولی اخر شب برگشت گفت اهل رابطه نیستم چی جواب بدم ضایع نشم؟", "scen_1", "پاسخ به مرزبندی و احتیاط", "medium", "long_conversational");
addTest("داشتم با همکارم پیام میدادم یهو گفت من کلا دنبال رل زدن با همکار نیستم چی بگم که فضا حفظ بشه؟", "scen_1", "پاسخ به مرزبندی و احتیاط", "medium", "long_conversational");
addTest("چند روزه با یه نفر آشنا شدم خیلی گرم صحبت میکردیم اما دیشب یهو پیام داد قصد رابطه ندارم منم نمیدونم چی بگم", "scen_1", "پاسخ به مرزبندی و احتیاط", "medium", "long_conversational");
addTest("سلام وقت بخیر، صبح ساعت ده یه پیام مهم بهش دادم ولی ساعت نه شب جواب داد چطور جوابشو بدم که سبک نشم؟", "scen_2", "مدیریت ریتم چت و بی محلی", "medium", "long_conversational");
addTest("طرف استوری های منو درجا نگاه میکنه ولی چت خصوصی رو بعد چند ساعت جواب میده چی براش بفرستم؟", "scen_2", "مدیریت ریتم چت و بی محلی", "medium", "long_conversational");
addTest("دیروز بعد از ظهر براش پیام فرستادم انلاینم بود ولی سین زده جواب نداده تا الان که دوباره انلاین شده", "scen_2", "مدیریت ریتم چت و بی محلی", "medium", "long_conversational");
addTest("رفتم توی یه کافه دنج نشستم یه نفر میز روبرویی نشسته چطور برم جلو و با ادب سر صحبت رو باز کنم؟", "scen_3", "شروع ارتباط و یخ‌شکنی", "easy", "long_conversational");
addTest("امشب یه دورهمی دوستانه دعوت شدم که اکثرا غریبه هستن، بهترین روش برای شروع صحبت در مهمانی چیه؟", "scen_3", "شروع ارتباط و یخ‌شکنی", "easy", "long_conversational");
addTest("توی سمینار کاری کنار یه نفر نشستم میخوام بدون اینکه حس بدی بگیره اولین پیام چت یا مکالمه رو شروع کنم", "scen_3", "شروع ارتباط و یخ‌شکنی", "medium", "long_conversational");
addTest("توی گروه دانشگاهی داشتیم صحبت میکردیم یکی برگشت گفت چقدر خودتو تحویل میگیری چطور حاضر جوابی کنم؟", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "easy", "long_conversational");
addTest("وسط شوخی ها یکی از دوستام بهم تیکه انداخت که خیلی بچه ای و ادای آدم بزرگا رو درمیاری چی بگم بهش؟", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "easy", "long_conversational");
addTest("داشتم با یه دختر چت میکردم یهو گفت بچه بازی درنیار و مسخره بازی نکن میخوام محکم و جذاب جواب بدم", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "easy", "long_conversational");
addTest("دختره یه استوری خیلی قشنگ از کافه ای که رفته گذاشته بود میخوام یه ریپلای استوری کافه بزنم که ادامه‌دار بشه", "scen_5", "شبکه‌های اجتماعی و چت", "easy", "long_conversational");
addTest("طرف عکس از سفرش به شمال استوری کرده و موزیک قشنگی گذاشته، چی بگم زیر استوریش که نظرش جلب بشه؟", "scen_5", "شبکه‌های اجتماعی و چت", "easy", "long_conversational");
addTest("امروز یه استوری عکس شخصی جذاب گذاشته میخوام بدون تعریف مستقیم ریپلای بدم چی پیشنهاد میکنی؟", "scen_5", "شبکه‌های اجتماعی و چت", "medium", "long_conversational");
addTest("سر کار بودم همکارم با خنده بهم گفت چقدر خوشتیپی چی بگم که مغرور به نظر نرسم ولی باکلاس باشه؟", "scen_6", "پاسخ به تعریف و تمجید", "easy", "long_conversational");
addTest("تو چت عکسمو فرستادم برگشت گفت چقدر جذابی و چشمات خاصه، بهترین پاسخ به تعریف و تمجید چیه؟", "scen_6", "پاسخ به تعریف و تمجید", "easy", "long_conversational");
addTest("یکی از فالوورام دایرکت داد و گفت از تیپ و لباست خیلی خوشم اومده چطور تشکر کنم که جذاب باشه؟", "scen_6", "پاسخ به تعریف و تمجید", "medium", "long_conversational");
addTest("الان حدود ده روزه داریم روزانه چت میکنیم و حس میکنم زمانشه چطور پیشنهاد قرار بدم که تمایل نشون بده؟", "scen_7", "هدایت چت به قرار ملاقات", "easy", "long_conversational");
addTest("مکالمه خیلی گرم شده و میخوام برای پنجشنبه دعوت به کافه کنم چطور پیام بدم که خیلی راحت قبول کنه؟", "scen_7", "هدایت چت به قرار ملاقات", "easy", "long_conversational");
addTest("میخوام بعد از یه شوخی بامزه بگم بریم بیرون قهوه بخوریم چه متنی برای پیشنهاد دیدار حضوری خوبه؟", "scen_7", "هدایت چت به قرار ملاقات", "medium", "long_conversational");
addTest("من یه متن سه خطی با انرژی دادم ولی اون فقط با یه کلمه گفت اوکی چی بگم که فضا سردتر نشه؟", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "long_conversational");
addTest("وقتی یه نفر توی چت هی جواب سرد میده و فقط میگه باشه یا اها بهترین واکنش کاریزماتیک چیه؟", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "long_conversational");
addTest("طرف پیام داده اوکی و دیگه هیچی ننوشته منم نمیخوام پیگیری الکی کنم چطور جمعش کنم؟", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "long_conversational");
addTest("سلام، دیشب به طرف گفتم فلان فیلمو دیدی؟ گفت نه، گفتم دوست داری ببینی؟ گفت اوکی، الان چت سرد شده چی بگم؟", "scen_8", "مدیریت ریتم چت و بی محلی", "medium", "long_conversational");
addTest("یکی توی تلگرام بهم پیام داده بود کلی حرف زدیم بعد گفت من واقعا اهل رل زدن نیستم فقط چت", "scen_1", "پاسخ به مرزبندی و احتیاط", "easy", "long_conversational");
addTest("بهش پیشنهاد دادم با هم پروژه برداریم گفت من فعلا قصد ازدواج یا رابطه با کسی ندارم ربطی نداشت ولی چی بگم", "scen_1", "پاسخ به مرزبندی و احتیاط", "medium", "long_conversational");
addTest("طرف پیام فرستاده میگه بعد چند روز پیام داده بودم چون سرم شلوغ بود ولی تابلوئه دروغ میگه چی جواب بدم", "scen_2", "مدیریت ریتم چت و بی محلی", "medium", "long_conversational");
addTest("پنج تا پیام پشت سر هم دادم بعد چند ساعت یه کلمه جواب داده چطور برخورد کنم که بی محلی نشه", "scen_2", "مدیریت ریتم چت و بی محلی", "medium", "long_conversational");
addTest("توی افتتاحیه یه گالری هنری چطور سر صحبت رو با هنرمند یا بقیه باز کنم جمله شروع چی باشه", "scen_3", "شروع ارتباط و یخ‌شکنی", "medium", "long_conversational");
addTest("سلام من خیلی آدم خجالتی ای هستم و نمیدونم چطور با دختری که نمیشناسم توی مهمانی حرف بزنم", "scen_3", "شروع ارتباط و یخ‌شکنی", "easy", "long_conversational");
addTest("توی جمع فامیلی یکی برگشت گفت چقدر پرو هستی که این حرفو زدی چطور جواب تیکه شوخی سنگین رو بدم", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "easy", "long_conversational");
addTest("به دوستم گفتم میخوام بیزینس جدید بزنم مسخره کرد گفت تو هنوز بچه ای چه جوابی بدم بسوزه", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "easy", "long_conversational");
addTest("یه پیج عمومی از یه بلاگر دیدم استوری گذاشته بود از یه منظره عالی چطور دایرکت بدم که جواب بده", "scen_5", "شبکه‌های اجتماعی و چت", "medium", "long_conversational");
addTest("استوری یه کتاب جالب گذاشته بود خواستم ریپلای استوری بدم که شروع یه گپ عمیق بشه چی بفرستم", "scen_5", "شبکه‌های اجتماعی و چت", "easy", "long_conversational");
addTest("یه نفر توی مهمونی اومد سمتم و گفت چقدر عطر و استایلت جذابه چطور با متانت جواب تعریفشو بدم", "scen_6", "پاسخ به تعریف و تمجید", "easy", "long_conversational");
addTest("طرف بهم گفت خیلی ادم خوش برخورد و نازی هستی چه جوابی بدم که مغرور نشون نده ولی پرستیژ داشته باشه", "scen_6", "پاسخ به تعریف و تمجید", "easy", "long_conversational");
addTest("چت ما توی اینستاگرام خیلی طولانی شده و میخوام دعوت به کافه کنم چطور شماره بگیرم و قرار بذارم", "scen_7", "هدایت چت به قرار ملاقات", "easy", "long_conversational");
addTest("میخوام به بهانه تست کردن یه قهوه جدید توی یه کافه معروف پیشنهاد قرار حضوری بدم چه متنی خوبه", "scen_7", "هدایت چت به قرار ملاقات", "medium", "long_conversational");
addTest("هر وقت من با اشتیاق صحبت میکنم اون فقط میگه اوکی یا باشه و کلا چت سرد شده چطور رفتار کنم", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "long_conversational");
addTest("سلام مربی، طرف بعد سه روز برگشته میگه ببخشید گرفتار بودم، من چطور جواب پیام بعد چند روز رو بدم؟", "scen_2", "مدیریت ریتم چت و بی محلی", "easy", "long_conversational");
addTest("داشتم از اهدافم صحبت میکردم یهو گفت طاقچه بالا گذاشتی چی بگم که فضا تلطیف بشه؟", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "medium", "long_conversational");
addTest("توی اینستاگرام برام استوری عکس گذاشته بود ریپلای کردم اونم با ایموجی جواب داد الان چی بگم؟", "scen_5", "شبکه‌های اجتماعی و چت", "medium", "long_conversational");
addTest("بهش گفتم موهات چقدر خوشگله اونم گفت تو هم خیلی جذابی حالا جواب تعریف رو چی بدم؟", "scen_6", "پاسخ به تعریف و تمجید", "easy", "long_conversational");
addTest("چطور بعد از یه هفته چت کردن به طرف بگم موافقی بریم یه قهوه با هم بخوریم و صحبت کنیم؟", "scen_7", "هدایت چت به قرار ملاقات", "easy", "long_conversational");
addTest("دختره بعد از کلی وویس دادن فقط یه استیکر سرد و بی احساس فرستاد چی بهش بگم؟", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "long_conversational");
addTest("طرف دیشب پیام داد گفت ببخشید ولی من واقعا قصد رل ندارم و نمیخوام به کسی وابسته بشم", "scen_1", "پاسخ به مرزبندی و احتیاط", "easy", "long_conversational");
addTest("صبح پیام دادم ظهر آنلاین شد پیاممو خوند ولی جواب نداد تا الان که عصر شده چطور برخورد کنم؟", "scen_2", "مدیریت ریتم چت و بی محلی", "medium", "long_conversational");
addTest("توی یه جشن تولد چطور با فردی که تنها ایستاده سر صحبت باز کردن رو شروع کنم؟", "scen_3", "شروع ارتباط و یخ‌شکنی", "easy", "long_conversational");
addTest("توی چت گفت بچه شدی و هی غر میزنی چطور شوخی کنایه آمیز رو مدیریت کنم؟", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "easy", "long_conversational");

// -------------------------------------------------------------
// Group D: Ambiguous Queries (~15% -> 50 tests)
// -------------------------------------------------------------
// When queries are too ambiguous or generic without specific scenario signal, expected is fallback (null scenario)
addTest("الان چی بگم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چی جواب بدم بهش؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("نمیدونم چی بفرستم", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چطور رفتار کنم باهاش؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("یه راهنمایی کلی میخوام واسه چت", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چیکار کنم بهتره؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("به نظرت الان وقتشه؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چطور باکلاس باشم توی صحبت؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("یه متن جذاب بهم بده", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چطوری کاریزماتیک حرف بزنم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چطور جذاب تر به نظر برسم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("اصول چت کردن چیه؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چطور اعتماد به نفس داشته باشم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("مشکل در برقراری ارتباط", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چگونه مکالمه بهتری داشته باشم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("راهکار برای جذابیت کلامی", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چطور توی چت سوتی ندم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("پیشنهاد شما چیه در این مورد؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("بهترین استراتژی برای مکالمه چیه؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چطور طرف رو جذب خودم کنم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چه متنی بفرستم که خوب باشه؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چطوری صحبت کنم که خوشش بیاد؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("میخوام یه پیام با انرژی بفرستم", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("بهترین لحن برای صحبت چیست؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چگونه حرف بزنیم که تاثیرگذار باشد؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("الان پیام بدم یا صبر کنم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چطور پیام شروع بفرستم بدون هیچ دلیلی؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چیکار کنم فضا صمیمی تر بشه؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چطور از حالت رسمی دربیایم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چی بگم که خوشش بیاد؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("راهنمای کلی جذابیت در پیام دادن", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چطور لحن خودم رو باحال تر کنم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چگونه پیام بدیم که جواب بده؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چطور در نگاه اول خوب به نظر برسیم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("توصیه مربی برای این موقعیت چیه؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چه جوابی مناسبه الان؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چطور واکنش نشون بدم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("تکنیک برای بهبود چت", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چگونه زبان بدن خوبی داشته باشیم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چطور در مهمانی کاریزماتیک باشیم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چگونه جذاب صحبت کنیم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("اصول پیام دادن به جنس مخالف", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چیکار کنم دوستم داشته باشه؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چطور بدون استرس حرف بزنم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("راهنمایی برای ارتباط موثر", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چطور صحبت رو ادامه بدم وقتی تموم شده؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("روش های مکالمه جذاب", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چیکار کنم رابطمون خراب نشه؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("پیام بعدی من چی باشه؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");
addTest("چطور یه جواب خیلی خفن بدم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "medium", "ambiguous_query");

// -------------------------------------------------------------
// Group E: Adversarial False Positives (~15% -> 50 tests)
// -------------------------------------------------------------
addTest("نتیجه مسابقه فوتبال بارسلونا و رئال مادرید چی شد؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("برای مهمانی امشب چه غذایی بپزم که خوشمزه باشه؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("چطور پایتون و جنگو رو روی اوبونتو نصب کنم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("قیمت دلار و بیت کوین در بازار امروز چنده؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("بهترین کافه در سعادت آباد برای کار کردن با لپ تاپ کجاست؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("طرز تهیه قورمه سبزی جا افتاده با گوشت گوسفندی", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("روش تعویض روغن موتور ماشین پژو ۲۰۶", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("آب و هوای تهران در روزهای پنجشنبه و جمعه چطوره؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("چطور ویزای تحصیلی آلمان بگیرم و مدارک چیه؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("بازی کامپیوتری جی تی ای وی کی منتشر میشه؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("کتاب های هری پاتر چند جلد هستن؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("چطور مشکل داغ شدن گوشی سامسونگ رو حل کنم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("جدول رده بندی لیگ برتر انگلیس", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("طریقه استفاده از هوش مصنوعی برای کدنویسی ری اکت", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("بهترین فیلم های سینمایی نولان در سال های اخیر", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("روش یادگیری زبان انگلیسی در خانه بدون کلاس", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("ساعت کار متروی تهران در روزهای تعطیل", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("چگونه پیج اینستاگرام را دی اکتیو یا حذف کنیم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("درمان خانگی برای سرماخوردگی و گلودرد شدید", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("نحوه اتصال دسته پلی استیشن به کامپیوتر با بلوتوث", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("کالری یک بشقاب برنج و خورش قیمه چقدر است؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("سفارت کانادا در استانبول کجاست و چطور وقت بگیریم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("نحوه کانفیگ سرور لینوکس برای پروژه نود جی اس", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("بهترین برنامه تمرینی برای افزایش حجم عضلانی در بدنسازی", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("تاریخ برگزاری کنکور سراسری کارشناسی ارشد", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("چطور پسورد فراموش شده جیمیل را بازیابی کنیم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("علت روشن نشدن لپ تاپ ایسوس بعد از آپدیت ویندوز", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("طرز تهیه دسر تیرامیسو خانگی بدون تخم مرغ", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("خواص درمانی دمنوش بابونه و گل گاوزبان برای خواب", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("آموزش طراحی لوگو در ایلوستریتور برای مبتدیان", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("نرخ سود سپرده بانکی در سال جدید چقدر است؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("چطور سرعت اینترنت وای فای خانه را افزایش دهیم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("کتاب های رمان پرفروش نیویورک تایمز", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("روش کاشت و نگهداری گل سانسوریا و زاموفیلیا در اپارتمان", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("بازی دیشب استقلال و پرسپولیس چند چند شد؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("آدرس شعب مرکزی بانک ملی در مرکز شهر", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("بهترین زمان تعویض لنت ترمز خودرو سمند", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("نحوه ساخت حساب پایپال در ایران وریفای شده", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("راهنمای خرید کارت گرافیک آر تی ایکس انویدیا", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("طرز پخت کیک اسفنجی ساده بدون فر در قابلمه", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("چطور حافظه کش تلگرام را در گوشی آیفون پاک کنیم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("قیمت بلیط هواپیما تهران به استانبول برای هفته آینده", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("آموزش ثبت نام در آزمون آیلتس آکادمیک", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("تفاوت بین رم دی دی آر ۴ و دی دی آر ۵ چیست؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("چطور لکه چربی را از روی لباس نخی پاک کنیم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("بهترین تنظیمات دوربین برای عکاسی پرتره در شب", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("تاریخ انقضای گذرنامه برای سفر خارجی چند ماه باید باشد؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("روش فعال سازی تایید دو مرحله ای تلگرام و واتساپ", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("علائم خرابی باتری ماشین و روش تست دینام", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");
addTest("چگونه در اکسل فرمول نویسی پیشرفته انجام دهیم؟", null, "پاسخ عمومی / راهنمایی چارچوب مکالمه", "easy", "adversarial_false_positive");

// -------------------------------------------------------------
// Group F: Paraphrases / Distinct Wording (~15% -> 50 tests)
// -------------------------------------------------------------
addTest("ترجیح میدم بدون تعهد باشم و وارد رابطه نشم", "scen_1", "پاسخ به مرزبندی و احتیاط", "medium", "paraphrase_generalization");
addTest("بهتره مرز بینمون فقط در حد دوستی عادی بمونه", "scen_1", "پاسخ به مرزبندی و احتیاط", "hard", "paraphrase_generalization");
addTest("من روحیه وابستگی عاطفی و رابطه ندارم فعلا", "scen_1", "پاسخ به مرزبندی و احتیاط", "medium", "paraphrase_generalization");
addTest("قصد جدی شدن این ارتباط و ازدواج رو ندارم", "scen_1", "پاسخ به مرزبندی و احتیاط", "medium", "paraphrase_generalization");
addTest("نمیخوام درگیر احساسات و تعهد رابطه ای بشم", "scen_1", "پاسخ به مرزبندی و احتیاط", "medium", "paraphrase_generalization");
addTest("پاسخ دادن به پیامت این همه ساعت طول کشید", "scen_2", "مدیریت ریتم چت و بی محلی", "easy", "paraphrase_generalization");
addTest("پیامم رو دیدی ولی چرا بی پاسخ رها کردی", "scen_2", "مدیریت ریتم چت و بی محلی", "easy", "paraphrase_generalization");
addTest("انلاین بودنت رو دیدم اما جوابی نفرستادی", "scen_2", "مدیریت ریتم چت و بی محلی", "easy", "paraphrase_generalization");
addTest("فاصله بین پیام هات خیلی زیاد شده و دیر جواب میدی", "scen_2", "مدیریت ریتم چت و بی محلی", "easy", "paraphrase_generalization");
addTest("بعد از یک شبانه روز بی خبری اومدی سلام دادی", "scen_2", "مدیریت ریتم چت و بی محلی", "medium", "paraphrase_generalization");
addTest("چطور باب گفتگو را با فرد ناشناس در مهمانی باز کنم", "scen_3", "شروع ارتباط و یخ‌شکنی", "easy", "paraphrase_generalization");
addTest("راهکار شروع مکالمه در فضای عمومی و کافه ها", "scen_3", "شروع ارتباط و یخ‌شکنی", "easy", "paraphrase_generalization");
addTest("اولین جمله برای سخن گفتن با هم کلاسی دختر", "scen_3", "شروع ارتباط و یخ‌شکنی", "medium", "paraphrase_generalization");
addTest("شکستن سکوت و یخ ارتباط در اولین برخورد اجتماعی", "scen_3", "شروع ارتباط و یخ‌شکنی", "easy", "paraphrase_generalization");
addTest("چگونه سر سخن را با فردی جذاب باز نمایم", "scen_3", "شروع ارتباط و یخ‌شکنی", "medium", "paraphrase_generalization");
addTest("کنایه زد که خودت رو مرکز عالم میدونی", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "medium", "paraphrase_generalization");
addTest("شوخی زننده کرد و گفت ادای ادمای مغرور رو درنیار", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "medium", "paraphrase_generalization");
addTest("تیکه کلام انداخت که چرا انقدر خودتو تحویل میگیری", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "easy", "paraphrase_generalization");
addTest("توی کل کل گفت رفتارت مثل بچه های پیش دبستانیه", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "easy", "paraphrase_generalization");
addTest("مسخره ام کرد و گفت اعتماد به نفس کاذب داری", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "medium", "paraphrase_generalization");
addTest("تصویری از کافه در استوری منتشر کرده چی بنویسم", "scen_5", "شبکه‌های اجتماعی و چت", "easy", "paraphrase_generalization");
addTest("ارسال دایرکت مناسب برای عکس استوری شده در اینستا", "scen_5", "شبکه‌های اجتماعی و چت", "easy", "paraphrase_generalization");
addTest("نحوه ریپلای زدن به استوری های خاص و هنری", "scen_5", "شبکه‌های اجتماعی و چت", "easy", "paraphrase_generalization");
addTest("عکس جدید از خودش استوری کرده چه پیامی بفرستم", "scen_5", "شبکه‌های اجتماعی و چت", "easy", "paraphrase_generalization");
addTest("پاسخ دادن به استوری اینستاگرام بدون لحن کلیشه ای", "scen_5", "شبکه‌های اجتماعی و چت", "easy", "paraphrase_generalization");
addTest("از تیپ و پوشش من تحسین کرد چه پاسخی دهم", "scen_6", "پاسخ به تعریف و تمجید", "easy", "paraphrase_generalization");
addTest("گفت چقدر باوقار و خوشتیپ هستی", "scen_6", "پاسخ به تعریف و تمجید", "easy", "paraphrase_generalization");
addTest("تمجید از اندام و هیکل ورزشی چی جواب بدم", "scen_6", "پاسخ به تعریف و تمجید", "easy", "paraphrase_generalization");
addTest("تعریف از استایل شیک و ادکلن در ملاقات", "scen_6", "پاسخ به تعریف و تمجید", "easy", "paraphrase_generalization");
addTest("گفت چه چهره معصوم و نازی داری", "scen_6", "پاسخ به تعریف و تمجید", "easy", "paraphrase_generalization");
addTest("چگونه طرف مقابل را به نوشیدن قهوه در کافه دعوت کنم", "scen_7", "هدایت چت به قرار ملاقات", "easy", "paraphrase_generalization");
addTest("پیشنهاد ملاقات حضوری و بیرون رفتن برای دیدار اول", "scen_7", "هدایت چت به قرار ملاقات", "easy", "paraphrase_generalization");
addTest("چطور از فضای چت به دیدار واقعی در کافه پل بزنم", "scen_7", "هدایت چت به قرار ملاقات", "easy", "paraphrase_generalization");
addTest("روش درخواست شماره تماس و هماهنگی برای قرار ملاقات", "scen_7", "هدایت چت به قرار ملاقات", "easy", "paraphrase_generalization");
addTest("دعوت صمیمانه برای صرف چای یا عصرانه بیرون از منزل", "scen_7", "هدایت چت به قرار ملاقات", "medium", "paraphrase_generalization");
addTest("ارسال پاسخ های تک سیلابی و بی احساس مانند اوکی", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "paraphrase_generalization");
addTest("پیام های بسیار کوتاه و سرد در پاسخ به صحبت هایم", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "paraphrase_generalization");
addTest("وقتی تنها با کلمه باشه واکنش نشان میدهد چه کنم", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "paraphrase_generalization");
addTest("مدیریت چت خشک و بی روح با مخاطب بی تفاوت", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "paraphrase_generalization");
addTest("پاسخ به سردی مفرط و پیام های تک کلمه ای در گفتگو", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "paraphrase_generalization");
addTest("طرف پیام داد نمیخوام هیچ تعهدی توی رابطه داشته باشم", "scen_1", "پاسخ به مرزبندی و احتیاط", "easy", "paraphrase_generalization");
addTest("ساعت ها پیام بدون پاسخ مانده و سین زده است", "scen_2", "مدیریت ریتم چت و بی محلی", "easy", "paraphrase_generalization");
addTest("جمله ای برای گشودن باب مکالمه در رویدادهای گروهی", "scen_3", "شروع ارتباط و یخ‌شکنی", "medium", "paraphrase_generalization");
addTest("پاسخ مقتدرانه به طعنه و کنایه اطرافیان در جمع", "scen_4", "حاضرجوابی و مدیریت کل‌کل", "easy", "paraphrase_generalization");
addTest("ارسال واکنش به تصویر استوری اینستاگرام مخاطب", "scen_5", "شبکه‌های اجتماعی و چت", "easy", "paraphrase_generalization");
addTest("واکنش متواضعانه اما کاریزماتیک به تحسین ظاهر", "scen_6", "پاسخ به تعریف و تمجید", "easy", "paraphrase_generalization");
addTest("تنظیم قرار حضوری در کافی شاپ برای آشنایی بیشتر", "scen_7", "هدایت چت به قرار ملاقات", "easy", "paraphrase_generalization");
addTest("واکنش مناسب در برابر جواب های خشک و تک کلمه ای مخاطب", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "paraphrase_generalization");
addTest("وقتی در چت فقط می نویسد باشه چطور برخورد کنیم", "scen_8", "مدیریت ریتم چت و بی محلی", "easy", "paraphrase_generalization");
addTest("طرف گفت به این زودی ها قصد ورود به رابطه عاطفی ندارم", "scen_1", "پاسخ به مرزبندی و احتیاط", "easy", "paraphrase_generalization");

// Save to data/coach/blind-benchmark.json
const outputPath = path.join(process.cwd(), 'data/coach/blind-benchmark.json');
fs.writeFileSync(outputPath, JSON.stringify(tests, null, 2), 'utf-8');

console.log(`Successfully generated Blind Benchmark Dataset with ${tests.length} test cases at ${outputPath}`);
