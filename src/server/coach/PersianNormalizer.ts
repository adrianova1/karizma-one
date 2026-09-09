export class PersianNormalizer {
  private static PERSIAN_STOP_WORDS = new Set([
    'از', 'به', 'با', 'در', 'تا', 'که', 'و', 'یک', 'این', 'آن', 'برای', 'روی', 'بود', 
    'است', 'شد', 'شدن', 'هست', 'کرد', 'کند', 'کردن', 'ما', 'شما', 'آنها', 'او', 'من', 
    'تو', 'را', 'هم', 'یا', 'اما', 'ولی', 'نیز', 'هر', 'چند', 'آیا', 'خود', 'دیگر', 'ها',
    'رو', 'اگه', 'اگر', 'میشه', 'باشه', 'باید', 'خیلی', 'ادم', 'آدم', 'هستی', 'هستید',
    'شدی', 'بودی', 'چقد', 'چقدر', 'بسیار'
  ]);

  static isStopWord(word: string): boolean {
    return PersianNormalizer.PERSIAN_STOP_WORDS.has(word);
  }

  static readonly GENERIC_CARRIER_PHRASES = new Set([
    'چی بگم',
    'چی بگم بهش',
    'چی بگم به',
    'چی بهش بگم',
    'بهش چی بگم',
    'چی جواب بدم',
    'چی جواب بدم بهش',
    'چی بهش جواب بدم',
    'چه جوابی بدم',
    'چه جوابی بهش بدم',
    'جوابش چی بدم',
    'چی بفرستم',
    'چی بفرستم براش',
    'چی بنویسم',
    'چی بنویسم براش',
    'چی کار کنم',
    'چیکار کنم',
    'چکار کنم',
    'چطور بگم',
    'چطوری بگم',
    'به نظرت',
    'به نظرت چی بگم',
    'بگم بهش',
    'بهش بگم',
    'چی بگیم',
    'چطور بگم بهش',
    'چطوری بگم بهش',
    'چطور رفتار کنم',
    'چطوری رفتار کنم',
    'چطور برخورد کنم',
    'چطوری برخورد کنم',
    'چه واکنشی نشون بدم',
    'واکنش مناسب چیه',
    'واکنش درست چیه',
    'بهترین جواب چیه',
    'بهترین پاسخ چیه',
    'جواب دندان شکن چی بدم',
    'جواب باکلاس چی بدم',
    'پاسخ کاریزماتیک چی بدم',
    'باید چی بگم',
    'چی باید بگم',
    'چی بگم به دختری',
    'چی بگم به پسری',
    'دختره میگه',
    'پسره میگه',
    'طرف میگه',
    'کراشم میگه',
    'دختره نوشته',
    'پسره نوشته',
    'طرف نوشته',
    'پیام داده',
    'پیام داده که',
    'بهم میگه',
    'بهم گفت',
    'بهم پیام داد',
    'راستی چی بگم',
    'آخه چی بگم',
    'یه سوال چی بگم',
    'خدایی چی بگم',
    'دوست دارم',
    'ببین دوست دارم',
    'من دوست دارم'
  ]);

  /**
   * Extracts the situational core of a user query by removing conversational carrier prefixes,
   * trailing question phrases, and modal metadata.
   */
  static extractCoreQuery(rawQuery: string): { coreQuery: string; originalQuery: string } {
    if (!rawQuery || typeof rawQuery !== 'string') {
      return { coreQuery: '', originalQuery: '' };
    }

    let text = rawQuery.trim();

    // 1. If this is an Emergency Coach Modal prompt, extract the partner statement or situation directly
    const emergencyMatch = text.match(/اتفاق\s*\/\s*پیام\s*طرف\s*مقابل:\s*["«']?([^"\n\r»']+)["»']?/);
    if (emergencyMatch && emergencyMatch[1]?.trim().length >= 3) {
      text = emergencyMatch[1].trim();
    } else {
      // Strip bracketed UI metadata
      const { cleanText } = this.stripMetadataTags(text);
      text = cleanText;
    }

    const norm = this.normalize(text);

    // 2. Strip trailing question carrier frames (e.g. "... چی بگم بهش؟", "... چیکار کنم؟")
    let core = norm.replace(/\s*(چی بگم بهش|چی بهش بگم|بهش چی بگم|چی بگم|چی جواب بدم بهش|چی بهش جواب بدم|چی جواب بدم|چه جوابی بدم|جوابش چی بدم|چیکار کنم|چی کار کنم|چکار کنم|چی بنویسم بهش|چی بنویسم|چی بفرستم براش|چی بفرستم|چی ارسال کنم|چطور بگم بهش|چطوری بگم بهش|چطور بگم|چطوری بگم|چطور رفتار کنم|چطوری رفتار کنم|چطور برخورد کنم|چطوری برخورد کنم|چه واکنشی نشون بدم|واکنش مناسب چیه|واکنش درست چیه|بهترین جواب چیه|بهترین پاسخ چیه|جواب دندان شکن چی بدم|جواب باکلاس چی بدم|پاسخ کاریزماتیک چی بدم|باید چی بگم|چی باید بگم|باید چی جواب بدم|چی باید جواب بدم|راهنماییم کن|کمکم کن|یه راهنمایی بکن)\s*$/g, '').trim();

    // 3. Strip leading situational carrier prefaces (e.g. "وقتی یکی میپرسه...", "طرف گفت...", "دختره گفت...")
    core = core.replace(/^(وقتی یکی میپرسه|وقتی یکی میگه|وقتی طرف میگه|وقتی طرف گفت|وقتی ازم میپرسه|وقتی میپرسه|وقتی پرسید|طرف گفت|طرف میگه|طرف پیام داده|طرف نوشت|طرف استوری گذاشته|دختره گفت|دختره میگه|دختره پیام داده|پسره گفت|پسره میگه|پسره پیام داده|کراشم گفت|کراشم میگه|همکارم گفت|همکارم میگه|پارتنرم گفت|پارتنرم میگه|دوستم گفت|دوستم میگه|رفیقم گفت|رفیقم میگه|یکی بهم گفت|یکی گفت|یکی میگه|یه نفر گفت|بهم گفت|بهم میگه|بهم پیام داد|بهم پیام داده|در جواب اینکه|در پاسخ به اینکه|در جواب|در پاسخ به|توی چت گفت|تو چت گفت|تو استوری گفت|تو دایرکت گفت|گفت)\s*/g, '').trim();

    // If core became too short, keep the normalized query
    if (core.length < 3) {
      core = norm;
    }

    return {
      coreQuery: core,
      originalQuery: rawQuery.trim()
    };
  }

  /**
   * Canonicalize tone label (Persian/English variants) to one of the canonical keys
   */
  static canonicalizeTone(input: string | undefined | null): 'charismatic' | 'funny' | 'confident' | 'mysterious' | 'mature' | 'all' {
    if (!input) return 'all';
    const s = String(input).toLowerCase();
    if (/(?:کاریزماتیک|باکلاس|charisma|charismatic)/i.test(s)) return 'charismatic';
    if (/(?:شوخ|طنز|رندانه|funny|humor|humorous|witty)/i.test(s)) return 'funny';
    if (/(?:مقتدر|قاطع|آلفا|direct|confident|alpha)/i.test(s)) return 'confident';
    if (/(?:مرموز|پرکشش|emotional|mysterious|flirty)/i.test(s)) return 'mysterious';
    if (/(?:متین|پخته|diplomatic|mature|deep|psychology)/i.test(s)) return 'mature';
    return 'all';
  }

  /**
   * Strips UI wrapper tags like [حالت کوچینگ: ...] or [لحن انتخابی: ...]
   */
  static stripMetadataTags(rawText: string): { cleanText: string; extractedTone?: 'charismatic' | 'funny' | 'confident' | 'mysterious' | 'mature' } {
    if (!rawText) return { cleanText: '' };
    
    let extractedTone: 'charismatic' | 'funny' | 'confident' | 'mysterious' | 'mature' | undefined = undefined;
    let clean = rawText;

    // Extract tone if present in tag — be tolerant of unclosed bracket (until newline)
    const toneMatch = clean.match(/\[لحن انتخابی:\s*([^\]\n\r]+)/) || clean.match(/\[لحن انتخابی:\s*([^\]]+)\]/);
    if (toneMatch && toneMatch[1]) {
      const toneLabel = toneMatch[1].trim();
      const canonical = this.canonicalizeTone(toneLabel);
      if (canonical !== 'all') {
        extractedTone = canonical;
      }
    }

    // Remove any [لحن انتخابی: ... (possibly unclosed until EOL or closed with ]) explicitly
    clean = clean.replace(/\[لحن انتخابی:[^\]\n\r]*\]?/g, ' ');

    // Strip all other bracketed tags: [حالت کوچینگ: ...], [هر تگ دیگری: ...]
    clean = clean.replace(/\[[^\]]+\]/g, ' ');
    clean = clean.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();

    return { cleanText: clean, extractedTone };
  }

  /**
   * Normalize Persian text
   */
  static normalize(text: string): string {
    if (!text) return '';

    // First strip any bracketed UI metadata
    const { cleanText } = this.stripMetadataTags(text);
    let normalized = cleanText.toLowerCase();

    // Arabic to Persian Character Replacements
    normalized = normalized.replace(/\u064a/g, '\u06cc'); // ي -> ی
    normalized = normalized.replace(/\u0649/g, '\u06cc'); // ى -> ی
    normalized = normalized.replace(/\u0626/g, '\u06cc'); // ئ -> ی
    normalized = normalized.replace(/[\u06d2\u06cd]/g, '\u06cc'); // Urdu/Kashmiri ye -> ی
    normalized = normalized.replace(/\u0643/g, '\u06a9'); // ك -> ک
    normalized = normalized.replace(/\u0629/g, '\u0647'); // ة -> ه
    normalized = normalized.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627'); // آ/أ/إ/ٱ -> ا
    normalized = normalized.replace(/\u0624/g, '\u0648'); // ؤ -> و

    // Strip Kashida / Tatweel (ـ)
    normalized = normalized.replace(/\u0640/g, '');

    // Convert Arabic and Persian numbers to English
    normalized = normalized.replace(/[\u0660-\u0669]/g, (m) => String(m.charCodeAt(0) - 1632));
    normalized = normalized.replace(/[\u06f0-\u06f9]/g, (m) => String(m.charCodeAt(0) - 1776));

    // Strip Arabic/Persian diacritics & vowels (Fatha, Damma, Kasra, Tanwin, Tashdid, Sukun)
    normalized = normalized.replace(/[\u064b-\u0652\u0670]/g, '');

    // Normalize ZWNJ and whitespace
    normalized = normalized.replace(/\u200c/g, ' ');
    normalized = normalized.replace(/\s+/g, ' ');

    // Strip punctuations, emojis & non-word special characters
    normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»،؛؟\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ');
    normalized = normalized.replace(/\s+/g, ' ');

    // Collapse 3 or more repeated identical characters into 1 (e.g. سلامممم -> سلام, but keep 2 letters like ممنون, ببخشید)
    normalized = normalized.replace(/(.)\1{2,}/g, '$1');

    // Safe normalization for common colloquial variations and typos in Persian chat
    normalized = normalized
      .replace(/جوااب/g, 'جواب')
      .replace(/تییکه/g, 'تیکه')
      .replace(/بچه ای/g, 'بچه ای')
      .replace(/بچهای/g, 'بچه ای')
      .replace(/بچهایی/g, 'بچه ای')
      .replace(/بچگونست/g, 'بچگونه')
      .replace(/بچگانه/g, 'بچگونه')
      .replace(/پرویی/g, 'پررو')
      .replace(/پرروی/g, 'پررو')
      .replace(/پررویی/g, 'پررو')
      .replace(/پرو/g, 'پررو')
      .replace(/بی شعور/g, 'بیشعور')
      .replace(/بی شعوری/g, 'بیشعوری')
      .replace(/خوشتیپی/g, 'خوشتیپ')
      .replace(/رابته/g, 'رابطه')
      .replace(/سحبت/g, 'صحبت')
      .replace(/جفاب/g, 'جواب')
      .replace(/عاکس/g, 'عکس')
      .replace(/ریپلای/g, 'ریپلای')
      .replace(/تیک ابی/g, 'تیک ابی')
      .replace(/ابی خورد/g, 'ابی خورد');

    return normalized.trim();
  }

  /**
   * Morphological stemmer for Persian words
   */
  static stem(word: string): string {
    if (!word || word.length < 4) return word;
    let stemmed = word;

    if (stemmed.endsWith('هایی') && stemmed.length >= 6) {
      stemmed = stemmed.slice(0, -4);
    } else if (stemmed.endsWith('های') && stemmed.length >= 5) {
      stemmed = stemmed.slice(0, -3);
    } else if (stemmed.endsWith('شان') && stemmed.length >= 5) {
      stemmed = stemmed.slice(0, -3);
    } else if (stemmed.endsWith('تان') && stemmed.length >= 5) {
      stemmed = stemmed.slice(0, -3);
    } else if (stemmed.endsWith('مان') && stemmed.length >= 5) {
      stemmed = stemmed.slice(0, -3);
    } else if (stemmed.endsWith('ترین') && stemmed.length >= 6) {
      stemmed = stemmed.slice(0, -4);
    } else if (stemmed.endsWith('تر') && stemmed.length >= 4) {
      stemmed = stemmed.slice(0, -2);
    } else if (stemmed.endsWith('ها') && stemmed.length >= 4) {
      stemmed = stemmed.slice(0, -2);
    } else if (stemmed.endsWith('ات') && stemmed.length >= 4) {
      stemmed = stemmed.slice(0, -2);
    } else if (stemmed.endsWith('ست') && stemmed.length >= 4) {
      stemmed = stemmed.slice(0, -2);
    } else if (stemmed.endsWith('ش') && stemmed.length >= 4) {
      stemmed = stemmed.slice(0, -1);
    } else if (stemmed.endsWith('ت') && stemmed.length >= 4) {
      stemmed = stemmed.slice(0, -1);
    } else if (stemmed.endsWith('م') && stemmed.length >= 4) {
      stemmed = stemmed.slice(0, -1);
    } else if (stemmed.endsWith('ی') && stemmed.length >= 4) {
      stemmed = stemmed.slice(0, -1);
    }

    return stemmed;
  }

  /**
   * Tokenize text into normalized words without stop words
   */
  static tokenize(text: string): string[] {
    const normalized = this.normalize(text);
    return normalized
      .split(' ')
      .filter(word => word.length >= 2 && !this.PERSIAN_STOP_WORDS.has(word));
  }

  /**
   * Extract trigrams from a string
   */
  static getTrigrams(str: string): string[] {
    const trigrams: string[] = [];
    if (str.length < 3) {
      if (str.length > 0) trigrams.push(str);
      return trigrams;
    }
    for (let i = 0; i < str.length - 2; i++) {
      trigrams.push(str.substring(i, i + 3));
    }
    return trigrams;
  }

  /**
   * Calculate trigram similarity ratio between two texts (0.0 to 1.0)
   */
  static computeTrigramSimilarity(textA: string, textB: string): number {
    const normA = this.normalize(textA).replace(/\s+/g, '');
    const normB = this.normalize(textB).replace(/\s+/g, '');
    if (!normA || !normB) return 0;

    const trigramsA = this.getTrigrams(normA);
    const trigramsB = this.getTrigrams(normB);

    if (trigramsA.length === 0 || trigramsB.length === 0) return 0;

    const setB = new Set(trigramsB);
    let intersection = 0;
    for (const trig of trigramsA) {
      if (setB.has(trig)) intersection++;
    }

    return (2 * intersection) / (trigramsA.length + trigramsB.length);
  }
}
