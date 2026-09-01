import { CoachScenario, CoachFallbackItem } from './CoachTypes.js';
import { PersonaGenerator } from './PersonaGenerator.js';

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
  private static extractToneText(pool: any): string {
    if (!pool) return '';
    if (typeof pool === 'string') {
      return this.stripToneWrappers(pool);
    }
    if (Array.isArray(pool)) {
      for (const item of pool) {
        if (typeof item === 'string' && item.trim().length > 0) {
          return this.stripToneWrappers(item);
        }
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
   * Strictly extracts the 5 Canonical Tones from the selected scenario
   * WITHOUT cross-scenario mixing, synthetic substitution, or archetype overrides.
   */
  static distribute(
    scenario: CoachScenario | null,
    fallback: CoachFallbackItem | null,
    contextKey: string,
    userQuery?: string
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

      // Direct 1-to-1 extraction strictly from selected scenario responses with wrapper stripping
      charismaticReply = this.extractToneText(res.charismatic);
      funnyReply = this.extractToneText(res.funny);
      confidentReply = this.extractToneText(res.confident);
      mysteriousReply = this.extractToneText(res.mysterious);
      matureReply = this.extractToneText(res.mature);

      // Check if all extracted replies are identical or empty (legacy single-reply scenarios)
      const baseClean = this.cleanDialogue(charismaticReply || confidentReply || funnyReply || mysteriousReply || matureReply || scenario!.situation || scenario!.title);
      const isSingleReplyRecord = 
        (!funnyReply || funnyReply === charismaticReply) &&
        (!confidentReply || confidentReply === charismaticReply) &&
        (!mysteriousReply || mysteriousReply === charismaticReply) &&
        (!matureReply || matureReply === charismaticReply);

      if (isSingleReplyRecord) {
        const variations = PersonaGenerator.generateVariations(baseClean, scenario, userQuery || '');
        charismaticReply = variations.charismatic;
        funnyReply = variations.funny;
        confidentReply = variations.confident;
        mysteriousReply = variations.mysterious;
        matureReply = variations.mature;
      } else {
        const fallbackSameScenario = charismaticReply || confidentReply || funnyReply || mysteriousReply || matureReply || baseClean;
        if (!charismaticReply) charismaticReply = fallbackSameScenario;
        if (!funnyReply) funnyReply = fallbackSameScenario;
        if (!confidentReply) confidentReply = fallbackSameScenario;
        if (!mysteriousReply) mysteriousReply = fallbackSameScenario;
        if (!matureReply) matureReply = fallbackSameScenario;
      }
    } else if (fallback && fallback.responses) {
      const res = fallback.responses;
      charismaticReply = this.extractToneText(res.charismatic);
      funnyReply = this.extractToneText(res.funny);
      confidentReply = this.extractToneText(res.confident);
      mysteriousReply = this.extractToneText(res.mysterious);
      matureReply = this.extractToneText(res.mature);

      const baseClean = this.cleanDialogue(charismaticReply || confidentReply || funnyReply || mysteriousReply || matureReply || 'با وقار و کنترل فریم پاسخ دهید.');
      const isSingleReplyRecord = 
        (!funnyReply || funnyReply === charismaticReply) &&
        (!confidentReply || confidentReply === charismaticReply) &&
        (!mysteriousReply || mysteriousReply === charismaticReply) &&
        (!matureReply || matureReply === charismaticReply);

      if (isSingleReplyRecord) {
        const variations = PersonaGenerator.generateVariations(baseClean, null, userQuery || '');
        charismaticReply = variations.charismatic;
        funnyReply = variations.funny;
        confidentReply = variations.confident;
        mysteriousReply = variations.mysterious;
        matureReply = variations.mature;
      } else {
        if (!charismaticReply) charismaticReply = baseClean;
        if (!funnyReply) funnyReply = baseClean;
        if (!confidentReply) confidentReply = baseClean;
        if (!mysteriousReply) mysteriousReply = baseClean;
        if (!matureReply) matureReply = baseClean;
      }
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
