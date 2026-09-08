export class PersianNormalizer {
  private static PERSIAN_STOP_WORDS = new Set([
    'از', 'به', 'با', 'در', 'تا', 'که', 'و', 'یک', 'این', 'آن', 'برای', 'روی', 'بود', 
    'است', 'شد', 'شدن', 'هست', 'کرد', 'کند', 'کردن', 'ما', 'شما', 'آنها', 'او', 'من', 
    'تو', 'را', 'هم', 'یا', 'اما', 'ولی', 'نیز', 'هر', 'چند', 'آیا', 'خود', 'دیگر', 'ها',
    'رو', 'اگه', 'اگر', 'میشه', 'باشه', 'باید', 'خیلی', 'ادم', 'آدم', 'هستی', 'هستید',
    'شدی', 'بودی', 'چقد', 'چقدر', 'بسیار'
  ]);

  static readonly GENERIC_CARRIER_PHRASES = new Set([
    'چی بگم',
    'چی بگم بهش',
    'چی بگم به',
    'چی جواب بدم',
    'چی بفرستم',
    'چی بنویسم',
    'چی کار کنم',
    'چیکار کنم',
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
    'چی بگم به دختری',
    'چی بگم به پسری',
    'چی بهش بگم',
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
    'دوست دارم',
    'ببین دوست دارم',
    'من دوست دارم'
  ]);

  /**
   * Canonicalize tone string/label to one of the 5 core keys: charismatic, funny, confident, mysterious, mature, or 'all'
   */
  static canonicalizeTone(input?: string): 'charismatic' | 'funny' | 'confident' | 'mysterious' | 'mature' | 'all' {
    if (!input || typeof input !== 'string') return 'all';
    const s = input.trim().toLowerCase();
    if (s === 'all' || s === 'همه' || s === 'هر_پنج_لحن' || s === '5tones' || s === '5_tones') return 'all';
    if (/(?:کاریزماتیک|باکلاس|جذاب|charisma|charismatic)/i.test(s)) return 'charismatic';
    if (/(?:شوخ|طنز|رندانه|کل‌کل|کل_کل|funny|humor|playful)/i.test(s)) return 'funny';
    if (/(?:مقتدر|قاطع|آلفا|اعتماد|مستقیم|direct|confident|alpha)/i.test(s)) return 'confident';
    if (/(?:مرموز|پرکشش|چندلایه|تحلیل|عاطفی|emotional|mysterious|deep_attraction)/i.test(s)) return 'mysterious';
    if (/(?:متین|پخته|بالغ|سنگین|دیپلماتیک|روانشناختی|diplomatic|mature|deep|psychology)/i.test(s)) return 'mature';
    return 'all';
  }

  /**
   * Strips UI wrapper tags like [حالت کوچینگ: ...] or [لحن انتخابی: ...]
   * Highly tolerant parsing supporting both closed tags and unclosed tags trailing to line end.
   */
  static stripMetadataTags(rawText: string): { cleanText: string; extractedTone?: 'charismatic' | 'funny' | 'confident' | 'mysterious' | 'mature' } {
    if (!rawText || typeof rawText !== 'string') return { cleanText: '' };
    
    let extractedTone: 'charismatic' | 'funny' | 'confident' | 'mysterious' | 'mature' | undefined = undefined;
    let clean = rawText;

    // Tolerant regex match: either bracketed tag [لحن انتخابی: ...] or unclosed up to newline
    const toneMatch = clean.match(/\[لحن انتخابی:\s*([^\]\r\n]+)\]?/) || clean.match(/\[لحن انتخابی:\s*([^\]]+)\]/);
    if (toneMatch && toneMatch[1]) {
      const canonical = this.canonicalizeTone(toneMatch[1].trim());
      if (canonical !== 'all') {
        extractedTone = canonical;
      }
    }

    // Strip bracketed tags or unclosed bracketed lines
    clean = clean.replace(/\[[^\]\r\n]+\]?/g, ' ');
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
