import { CoachScenario, CoachFallbackItem } from './CoachTypes.js';

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
   * Cleans a dialogue string removing quotes, boundary markers, and formatting
   */
  static cleanDialogue(s: string): string {
    if (!s || typeof s !== 'string') return '';
    return s
      .replace(/^[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // remove surrogate emojis at start
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]$/g, '') // remove surrogate emojis at end
      .replace(/^[«"'"“‘⚡🎈🔹♦•\-–\d\.\s()👧👦👨👩🧔👱‍♂️👱‍♀️]+/gu, '')
      .replace(/[»"'"”’()⚡🎈🔹♦•\-–\s]+$/gu, '')
      .trim();
  }

  /**
   * Extracts dialogue text safely from a scenario or fallback pool
   */
  private static extractToneText(pool: any): string {
    if (!pool) return '';
    if (typeof pool === 'string') {
      return this.cleanDialogue(pool);
    }
    if (Array.isArray(pool)) {
      for (const item of pool) {
        if (typeof item === 'string' && item.trim().length > 0) {
          return this.cleanDialogue(item);
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
        .map(s => this.cleanDialogue(s))
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

      // Direct 1-to-1 extraction strictly from selected scenario responses
      charismaticReply = this.extractToneText(res.charismatic);
      funnyReply = this.extractToneText(res.funny);
      confidentReply = this.extractToneText(res.confident);
      mysteriousReply = this.extractToneText(res.mysterious);
      matureReply = this.extractToneText(res.mature);

      // If a specific tone was missing from the scenario record, fallback to another tone from the SAME scenario
      const fallbackSameScenario = charismaticReply || confidentReply || funnyReply || mysteriousReply || matureReply || this.cleanDialogue(scenario!.situation || scenario!.title);
      if (!charismaticReply) charismaticReply = fallbackSameScenario;
      if (!funnyReply) funnyReply = fallbackSameScenario;
      if (!confidentReply) confidentReply = fallbackSameScenario;
      if (!mysteriousReply) mysteriousReply = fallbackSameScenario;
      if (!matureReply) matureReply = fallbackSameScenario;
    } else if (fallback && fallback.responses) {
      const res = fallback.responses;
      charismaticReply = this.extractToneText(res.charismatic);
      funnyReply = this.extractToneText(res.funny);
      confidentReply = this.extractToneText(res.confident);
      mysteriousReply = this.extractToneText(res.mysterious);
      matureReply = this.extractToneText(res.mature);

      const fallbackSame = charismaticReply || confidentReply || funnyReply || mysteriousReply || matureReply || 'با وقار و کنترل فریم پاسخ دهید.';
      if (!charismaticReply) charismaticReply = fallbackSame;
      if (!funnyReply) funnyReply = fallbackSame;
      if (!confidentReply) confidentReply = fallbackSame;
      if (!mysteriousReply) mysteriousReply = fallbackSame;
      if (!matureReply) matureReply = fallbackSame;
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
