import { CoachScenario } from './CoachTypes.js';

export class PersonaGenerator {
  /**
   * Generates distinct charismatic, funny, confident, mysterious, and mature variations
   * of a core scenario dialogue when the database record only has 1 response.
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
    const clean = raw
      .replace(/^[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
      .replace(/[«"'"“‘⚡🎈🔹♦•\-–\d\.\s()👧👦👨👩🧔👱‍♂️👱‍♀️:]+/gu, ' ')
      .trim();

    // Check specific intent domains first
    const q = query || '';

    // Domain A: Food / Sweets / Pastil / Treats / Snacks
    if (/پاستیل|شکلات|بستنی|قهوه|کیک|کروسان|چیپس|پیتزا|خوراکی|لواشک/.test(q) || /پاستیل|شکلات|خوراکی|بستنی/.test(scenario?.title || '')) {
      const item = q.includes('پاستیل') ? 'پاستیل' :
                   q.includes('شکلات') ? 'شکلات' :
                   q.includes('لواشک') ? 'لواشک' :
                   q.includes('بستنی') ? 'بستنی' :
                   q.includes('قهوه') ? 'قهوه' : 'خوراکی مورد علاقه‌ت';
      return {
        charismatic: `سلیقه جذاب و خوشمزه‌ایه؛ پس معیار انتخاب کافه‌مون مشخص شد، جایی که بهترین ${item} شهر رو داشته باشه.`,
        funny: `${item}؟ فکر می‌کردم طرفدار استیک و قهوه تلخی، ولی این اعتراف شیرینت باعث شد توقعم ازت بره بالاتر! 😄`,
        confident: `انتخاب فوق‌العاده‌ایه؛ دفعه بعد که دیدمت یه بسته ${item} اعلا مهمون منی.`,
        mysterious: `آدمایی که عاشق ${item} هستن معمولاً یه شیطنت پنهان پشت ظاهر آرومشون دارن... فکر کنم حدسم در موردت درسته.`,
        mature: `توجه به علایق و جزئیات کوچیک قشنگ‌ترین بخش هر ارتباطه؛ خوشحالم که سلیقه‌ت رو باهام در میون گذاشتی.`
      };
    }

    // Domain B: Likes / Confession / Love / 'دوست دارم'
    if (/دوست دارم|عاشقتم|بهت حس دارم|ازت خوشم اومده|کراش دارم/.test(q) || /دوست دارم/.test(clean)) {
      return {
        charismatic: 'شنیدن این حس زیبا از زبون کسی به این جذابی، قشنگ‌ترین اتفاق امروزم بود. مرسی از انرژی نابت.',
        funny: 'چه تفاهم جالبی! اتفاقاً منم خودم رو خیلی دوست دارم، ولی خوشحالم که تو هم سلیقه خوبی داری! 😉',
        confident: 'صداقتت رو تحسین می‌کنم؛ وقتی حست اینقدر شفاف و شجاعانه‌ست، ارزش و احترامت پیش من دوچندان میشه.',
        mysterious: 'حس‌ها زمانی ارزشمندتر میشن که توی عمل و گذر زمان خودشون رو نشون بدن... مشتاقم ببینم ادامه‌ش چطور پیش میره.',
        mature: 'از اینکه احساست رو اینقدر متین و صادقانه ابراز کردی ممنونم؛ برای من و این ارتباط ارزش زیادی داره.'
      };
    }

    // Domain C: General situation transformation based on the base dialogue
    // If base dialogue exists and is meaningful:
    if (clean.length > 5) {
      return {
        charismatic: clean,
        funny: this.makeFunny(clean),
        confident: this.makeConfident(clean),
        mysterious: this.makeMysterious(clean),
        mature: this.makeMature(clean)
      };
    }

    // Generic high-value fallback
    return {
      charismatic: 'انرژی مثبت و بیان سنجیده‌ت توجه من رو جلب کرد؛ خوشحال میشم این گفتگوی جذاب رو با هم جلو ببریم.',
      funny: 'داشتم فکر می‌کردم اگه قرار باشه جایزه خوش‌سلیقه‌ترین دیالوگ امروز رو بدیم، قطعاً به این پیام میرسه!',
      confident: 'موضع و نگاه من همیشه روی اصالت و گفتگوی شفاف استواره؛ دقیقاً همین مسیر رو ادامه میدیم.',
      mysterious: 'همیشه جذاب‌ترین بخش یک داستان همونیه که توی نگاه اول فاش نمیشه؛ بذار زمان قضاوت کنه.',
      mature: 'ارتباط موثر با درک متقابل و احترام شکل می‌گیره؛ قدردان این تبادل نظر هوشمندانه هستم.'
    };
  }

  private static makeFunny(text: string): string {
    if (text.includes('؟')) {
      return text.replace('؟', '، یا اینکه باید برم از داوران مسابقه استعلام بگیرم؟ 😄');
    }
    return `خیلی جدی داری میگی یا اینم بخشی از برنامه دوربین مخفیته؟ 😉 ${text}`;
  }

  private static makeConfident(text: string): string {
    return `من همیشه نگاهم روشنه؛ ${text}`;
  }

  private static makeMysterious(text: string): string {
    return `نکته جالب ماجرا اینجاست که... ${text}`;
  }

  private static makeMature(text: string): string {
    return `درک متقابل در این موقعیت اهمیت زیادی داره؛ ${text}`;
  }
}
