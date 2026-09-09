import { CoachScenario, CoachFallbackItem } from './CoachTypes.js';
import { PersonaGenerator } from './PersonaGenerator.js';
import { PersianNormalizer } from './PersianNormalizer.js';

export interface DistributedToneResult {
  charismaticReply: string;
  funnyReply: string;
  confidentReply: string;
  mysteriousReply: string;
  matureReply: string;
  remainingCandidates: string[];
  allCandidates: string[];
  scenarioId: string;
  source: 'canonical_60k' | 'fallback_matrix';
  tips: {
    charismatic: string;
    funny: string;
    confident: string;
    mysterious: string;
    mature: string;
  };
  technique: string;
  nextMove: string;
}

export class ToneDistributor {
  /**
   * System metadata boilerplate strings to exclude if mixed inside raw text
   */
  private static JUNK_PATTERNS = [
    /حاضرجوابی و جذابیت کلامی/,
    /پاسخ هوشمندانه با حفظ فریم/,
    /کنترل فریم گفتگو/,
    /حفظ آرامش، پرستیژ/,
    /زبان بدن باز، قامت/,
    /مکث کوتاه و اجازه/,
    /شیت تست/,
    /عمومی/
  ];

  /**
   * Known synthetic prefix wrappers from legacy build templates
   */
  private static SYNTHETIC_PREFIX_PATTERNS = [
    /^همیشه بخش جذاب‌تر ماجرا همونیه که ناگفته می‌مونه[.:\s…]*/u,
    /^شاید فکر کنی جواب رو می‌دونی، ولی واقعیت ممکنه غافلگیرت کنه[.:;\s…]*/u,
    /^بعضی ناگفته‌ها کشش بیشتری ایجاد می‌کنن[.:;\s…]*/u,
    /^اجازه بده زمان حقیقت ماجرا رو روشن کنه[.:\s…]*/u,
    /^من موضعم رو شفاف و محکم میگم[.:\s…]*/u,
    /^روی اصول و چارچوب خودم ایستادم[.:;\s…]*/u,
    /^با قاطعیت و بدون تردید[.:\s…]*/u,
    /^وقتی پای استانداردهای من وسط باشه، نظرم مشخصه[.:\s…]*/u,
    /^درک متقابل و حفظ احترام بهترین پاسخ است[.:\s…]*/u,
    /^با متانت و بلوغ فکری[.:\s…]*/u,
    /^احترام به دیدگاه طرف مقابل در عین حفظ وقار[.:\s…]*/u,
    /^صبر و سنجش عمیق موقعیت نشان‌دهنده اصالت است[.:\s…]*/u,
    /^با وقار و پرستیژ شخصی[.:\s…]*/u,
    /^خیلی شیک و مجلسی[.:\s…]*/u,
    /^اگه اینقدر جدی باشی باید از دفعه بعد با وکیل مکاتبه کنیم[!\.\s]*/u
  ];

  /**
   * Known synthetic suffix wrappers from legacy build templates
   */
  private static SYNTHETIC_SUFFIX_PATTERNS = [
    /—\s*البته نسخه آزمایشی بود تا بازخورد بگیریم!?/u,
    /\(البته اگر پای عواقبش بمونیم!?\)/u,
    /\(البته اگر پای عواقبش بمونیم!?/u,
    /،?\s*فقط نمره بد ندین بهمون!?/u
  ];

  /**
   * Cleans a dialogue string removing quotes, boundary markers, emojis and formatting
   */
  static cleanDialogue(s: string): string {
    if (!s || typeof s !== 'string') return '';
    return s
      .replace(/^[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // remove surrogate emojis at start
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]$/g, '') // remove surrogate emojis at end
      .replace(/^[«"'"“‘⚡🎈🔹♦•\-–\d\.\s()👧👦👨👩🧔👱‍♂️👱‍♀️:]+/gu, '')
      .replace(/[»"'"”’()⚡🎈🔹♦•\-–\s:]+$/gu, '')
      .trim();
  }

  /**
   * Strips synthetic prefix & suffix wrappers to reveal the pure authentic dialogue core
   */
  static stripToneWrappers(raw: string): string {
    if (!raw || typeof raw !== 'string') return '';
    let text = raw.trim();

    let changed = true;
    while (changed) {
      changed = false;
      for (const pattern of this.SYNTHETIC_PREFIX_PATTERNS) {
        if (pattern.test(text)) {
          text = text.replace(pattern, '').trim();
          changed = true;
        }
      }
      for (const pattern of this.SYNTHETIC_SUFFIX_PATTERNS) {
        if (pattern.test(text)) {
          text = text.replace(pattern, '').trim();
          changed = true;
        }
      }
    }

    return this.cleanDialogue(text);
  }

  /**
   * Extracts dialogue text safely from a scenario or fallback pool and strips wrappers
   */
  private static KNOWN_BOILERPLATES = [
    'زیبایی و جذابیت واقعی در نگاه و کلام تحسین‌کننده شماست',
    'انرژی مثبت و بیان سنجیده‌ت توجه من رو جلب کرد',
    'گفتگوی حضوری همیشه حس و حال واقعی‌تری داره',
    'کیفیت و تمرکز کامل روی مکالمه برام اولویت داره به سرعت پاسخگویی',
    'سلیقه و نگاه دقیق شما در کلامت کاملاً پیداست',
    'ارتباط با ارزش نیاز به حضور ذهن کامل داره',
    'عمیق بودن گفتگو برام مهم‌تر از شتاب در پاسخ دادنه',
    'پاسخهای متناسب',
    'علت این تست',
    'علت تست',
    'اشتباه بزرگ',
    'مرحله قرار اول به بعد'
  ];

  private static extractToneText(pool: any, rotationIndex: number = 0): string {
    if (!pool) return '';
    if (typeof pool === 'string') {
      const stripped = this.stripToneWrappers(pool);
      for (const bp of this.KNOWN_BOILERPLATES) {
        if (stripped.includes(bp)) return '';
      }
      return stripped;
    }
    if (Array.isArray(pool)) {
      const valid = pool
        .filter(item => typeof item === 'string' && item.trim().length > 0)
        .map(item => this.stripToneWrappers(item))
        .filter(item => !this.KNOWN_BOILERPLATES.some(bp => item.includes(bp)));

      if (valid.length > 0) {
        const idx = Math.abs(rotationIndex) % valid.length;
        return valid[idx];
      }
    }
    return '';
  }

  /**
   * Extracts all candidate dialogue strings strictly isolated to the provided scenario
   */
  static extractAllCandidates(
    scenario: CoachScenario | null,
    fallback: CoachFallbackItem | null
  ): string[] {
    const list: string[] = [];
    const seen = new Set<string>();

    const addCandidate = (raw: string) => {
      if (!raw || typeof raw !== 'string') return;
      const parts = raw
        .split(/🎈|\n[🔹♦•\-–\*\d\.]+|\n{2,}/)
        .map(s => this.stripToneWrappers(s))
        .filter(s => s.length >= 2);

      for (const part of parts) {
        if (part.length >= 2 && !seen.has(part)) {
          seen.add(part);
          list.push(part);
        }
      }
    };

    if (scenario && scenario.responses) {
      const res = scenario.responses as any;
      const keys = ['charismatic', 'funny', 'confident', 'mysterious', 'mature'];
      for (const k of keys) {
        const val = res[k];
        if (typeof val === 'string') addCandidate(val);
        else if (Array.isArray(val)) val.forEach((item: any) => typeof item === 'string' && addCandidate(item));
      }
    } else if (fallback && fallback.responses) {
      const res = fallback.responses as any;
      for (const val of Object.values(res)) {
        if (typeof val === 'string') addCandidate(val);
        else if (Array.isArray(val)) (val as any[]).forEach(item => typeof item === 'string' && addCandidate(item));
      }
    }

    return list;
  }

  /**
   * Strictly extracts the 5 Canonical Tones from the selected scenario.
   * Ensures distinct, authentic tone delivery with persona synthesis fallback for duplicate or missing tones.
   */
  static distribute(
    scenario: CoachScenario | null,
    fallback: CoachFallbackItem | null,
    contextKey: string,
    userQuery?: string,
    rotationIndex: number = 0
  ): DistributedToneResult {
    const isScenario = !!scenario;
    const scenarioId = isScenario ? scenario!.id : (fallback?.topic || 'fallback');
    const source = isScenario ? 'canonical_60k' : 'fallback_matrix';

    let charismaticReply = '';
    let funnyReply = '';
    let confidentReply = '';
    let mysteriousReply = '';
    let matureReply = '';

    let technique = scenario?.technique || fallback?.analysis || 'کنترل فریم کلامی و حفظ ارزش شخصی بدون نیاز به تایید.';
    let nextMove = scenario?.nextMove || 'مکث کوتاه، لبخند خونسرد و واگذاری ادامه مکالمه به طرف مقابل.';

    if (isScenario && scenario!.responses) {
      const res = scenario!.responses;

      // Extract raw tones with wrapper stripping & boilerplate filtering
      charismaticReply = this.extractToneText(res.charismatic, rotationIndex);
      funnyReply = this.extractToneText(res.funny, rotationIndex);
      confidentReply = this.extractToneText(res.confident, rotationIndex);
      mysteriousReply = this.extractToneText(res.mysterious, rotationIndex);
      matureReply = this.extractToneText(res.mature, rotationIndex);

      const baseClean = this.cleanDialogue(
        charismaticReply || confidentReply || funnyReply || mysteriousReply || matureReply || scenario!.situation || scenario!.title
      );

      const variations = PersonaGenerator.generateVariations(baseClean, scenario, userQuery || '', rotationIndex);

      const isDomainSpecific = /قیاف|قیافت|به دلم نمیشین|زشت|لاغر|چاق|قد کوتا|کم\s*حرف|ساکت|چرا حرف نمیزنی|قهر|سرد شده|دلخور|سرسنگین|مسخره|مسخرم|تیکه|بی دست و پا|حقوق|درآمد|چقدر میگیری/.test(userQuery || '');
      const isIdenticalSet = charismaticReply && charismaticReply === funnyReply && charismaticReply === confidentReply;
      const isMemeContent = /خوب شد نیستی|لوله کشی داره|اندازه وقتی که خودمو تو آینه|تریاک|معتادی|شیت تست/.test(charismaticReply);

      // Inspect extracted replies for pairwise similarity and duplicates
      let toneMap: Record<string, string> = {
        charismatic: charismaticReply,
        funny: funnyReply,
        confident: confidentReply,
        mysterious: mysteriousReply,
        mature: matureReply
      };

      if ((isDomainSpecific && (isIdenticalSet || isMemeContent)) || isMemeContent) {
        toneMap = {
          charismatic: variations.charismatic,
          funny: variations.funny,
          confident: variations.confident,
          mysterious: variations.mysterious,
          mature: variations.mature
        };
      } else {
        const toneKeys: Array<keyof typeof toneMap> = ['charismatic', 'funny', 'confident', 'mysterious', 'mature'];
        const seenReplies: string[] = [];

        for (const k of toneKeys) {
          let current = toneMap[k];
          // Only consider invalid if genuinely empty or exact identical duplicate
          let isMissingOrExactDup = !current || current.trim().length < 3;

          if (!isMissingOrExactDup) {
            for (const prev of seenReplies) {
              // Only trigger replacement if virtually identical (> 0.95 similarity)
              const sim = PersianNormalizer.computeTrigramSimilarity(current, prev);
              if (sim >= 0.95 || current.trim() === prev.trim()) {
                isMissingOrExactDup = true;
                break;
              }
            }
          }

          if (isMissingOrExactDup) {
            // Fallback to synthesized persona variation only if original canonical reply was completely missing or duplicate
            toneMap[k] = variations[k];
          }

          seenReplies.push(toneMap[k]);
        }
      }

      charismaticReply = toneMap.charismatic;
      funnyReply = toneMap.funny;
      confidentReply = toneMap.confident;
      mysteriousReply = toneMap.mysterious;
      matureReply = toneMap.mature;
    } else if (fallback && fallback.responses) {
      const res = fallback.responses;
      charismaticReply = this.extractToneText(res.charismatic, rotationIndex);
      funnyReply = this.extractToneText(res.funny, rotationIndex);
      confidentReply = this.extractToneText(res.confident, rotationIndex);
      mysteriousReply = this.extractToneText(res.mysterious, rotationIndex);
      matureReply = this.extractToneText(res.mature, rotationIndex);

      const baseClean = this.cleanDialogue(
        charismaticReply || confidentReply || funnyReply || mysteriousReply || matureReply || 'با وقار و کنترل فریم پاسخ دهید.'
      );
      const variations = PersonaGenerator.generateVariations(baseClean, null, userQuery || '', rotationIndex);

      const toneMap: Record<string, string> = {
        charismatic: charismaticReply,
        funny: funnyReply,
        confident: confidentReply,
        mysterious: mysteriousReply,
        mature: matureReply
      };

      const toneKeys: Array<keyof typeof toneMap> = ['charismatic', 'funny', 'confident', 'mysterious', 'mature'];
      const seenReplies: string[] = [];

      for (const k of toneKeys) {
        let current = toneMap[k];
        let isInvalidOrDup = !current || current.trim().length < 3;

        if (!isInvalidOrDup) {
          for (const prev of seenReplies) {
            const sim = PersianNormalizer.computeTrigramSimilarity(current, prev);
            if (sim >= 0.72) {
              isInvalidOrDup = true;
              break;
            }
          }
        }

        if (isInvalidOrDup) {
          toneMap[k] = variations[k];
        }

        seenReplies.push(toneMap[k]);
      }

      charismaticReply = toneMap.charismatic;
      funnyReply = toneMap.funny;
      confidentReply = toneMap.confident;
      mysteriousReply = toneMap.mysterious;
      matureReply = toneMap.mature;
    }

    const allCandidates = this.extractAllCandidates(scenario, fallback);
    const remainingCandidates = allCandidates.filter(c => 
      c !== charismaticReply && 
      c !== funnyReply && 
      c !== confidentReply && 
      c !== mysteriousReply && 
      c !== matureReply
    );

    const defaultTips = {
      charismatic: 'آرامش کلامی، مکث طلایی سنجیده، نگاه عمیق و زبان بدن مسلط.',
      funny: 'پوزخند خونسرد، شکستن یخ با شوخی هوشمندانه به همراه کنترل شرایط.',
      confident: 'قاطعیت و وقار، صدای شمرده و بدون شتاب‌زدگی یا عذرخواهی بی‌مورد.',
      mysterious: 'برانگیختن کنجکاوی، مکث معنادار و لحن پرکشش و مبهم.',
      mature: 'پاسخ دیپلماتیک و باوقار، رعایت احترام متقابل و حفظ عمق رابطه.'
    };

    return {
      charismaticReply: this.cleanDialogue(charismaticReply),
      funnyReply: this.cleanDialogue(funnyReply),
      confidentReply: this.cleanDialogue(confidentReply),
      mysteriousReply: this.cleanDialogue(mysteriousReply),
      matureReply: this.cleanDialogue(matureReply),
      remainingCandidates,
      allCandidates,
      scenarioId,
      source,
      tips: defaultTips,
      technique,
      nextMove
    };
  }
}
