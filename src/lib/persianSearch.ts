/**
 * Smart Persian Search & Deduplication Utilities for Charisma Center
 */

import { ScenarioNode } from '../data/scenarios.js';

/**
 * Normalize Persian/Arabic text for robust matching & comparison
 */
export function normalizePersianText(text: string): string {
  if (!text) return '';
  
  return text
    // Replace Arabic letters with Persian equivalents
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ی')
    // Remove diacritics (َ ُ ِ ّ ً ٍ ٌ ْ)
    .replace(/[\u064B-\u0652]/g, '')
    // Replace half spaces and non-breaking spaces with standard space
    .replace(/[\u200c\u200b\u00a0]/g, ' ')
    // Replace punctuation with spaces
    .replace(/[!؟?.,"':;«»()\-–—_/[\]{}|\\]/g, ' ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Basic Persian Stemmer & Synonym dictionary
 */
const PERSIAN_STEM_MAP: Record<string, string> = {
  // Beauty / Ugly terms
  'زشتی': 'زشت',
  'زشت‌تر': 'زشت',
  'زشت‌ترین': 'زشت',
  'زشتیا': 'زشت',
  'زشتم': 'زشت',
  'زشتن': 'زشت',
  'زشته': 'زشت',
  'بی‌ریخت': 'زشت',
  'بی‌ریختی': 'زشت',
  'قیافه': 'قیافه',
  'قیافت': 'قیافه',
  'قیافتو': 'قیافه',
  'عکسات': 'عکس',
  'عکسای': 'عکس',
  'عکست': 'عکس',
  'خوشگل': 'خوشگل',
  'خوشگلی': 'خوشگل',
  'خوشگلا': 'خوشگل',
  'قشنگ': 'خوشگل',
  'قشنگی': 'خوشگل',
  'جذاب': 'جذاب',
  'جذابی': 'جذاب',

  // Girl terms
  'دختره': 'دختر',
  'دختریا': 'دختر',
  'دخترها': 'دختر',
  'پسر': 'پسر',
  'پسره': 'پسر',

  // Conversation terms
  'چت': 'چت',
  'چتا': 'چت',
  'پیام': 'پیام',
  'پیاما': 'پیام',
  'پاسخ': 'جواب',
  'جوابا': 'جواب',
  'جوابای': 'جواب',
  'حاضرجوابی': 'جواب',
  'سین': 'سین',
  'دیدن': 'سین',
  'آنفالو': 'آنفالو',
  'بلاک': 'بلاک',
  'سرد': 'سرد',
  'سردی': 'سرد',

  // Common verbs / stopwords to loosen or stem
  'میگه': 'گفت',
  'می‌گه': 'گفت',
  'گفت': 'گفت',
  'میگفت': 'گفت',
  'می‌گفت': 'گفت',
  'بگه': 'گفت',
  'بگند': 'گفت',
};

const PERSIAN_STOPWORDS = new Set([
  'در', 'به', 'از', 'که', 'با', 'را', 'رو', 'تا', 'بر', 'برای',
  'من', 'تو', 'او', 'ما', 'شما', 'آنها', 'این', 'آن', 'هم',
  'است', 'هست', 'بود', 'شد', 'شدن', 'کرد', 'کردن', 'یک', 'یکی',
  'چقدر', 'خیلی', 'گفت', 'دختره', 'پسره', 'بهم', 'طرف', 'میگه', 'گفتن',
  'چی', 'بگم', 'چیکار', 'کنم', 'جواب', 'بدم', 'وقتی', 'اگر', 'اگه', 'چطوری'
]);

/**
 * Extract normalized search tokens and stems
 */
export function getSearchTokens(text: string): string[] {
  const normalized = normalizePersianText(text);
  if (!normalized) return [];

  const rawWords = normalized.split(/\s+/).filter(w => w.length > 0);
  const stems: string[] = [];

  for (const word of rawWords) {
    if (PERSIAN_STOPWORDS.has(word) && rawWords.length > 1) {
      continue;
    }
    const stem = PERSIAN_STEM_MAP[word] || word;
    stems.push(stem);
  }

  return stems;
}

/**
 * Smart Search Matching function
 * Returns true if the scenario matches query (using stem matching, normalized string matching, or substring matching)
 */
export function smartSearchMatch(scenario: ScenarioNode, query: string): boolean {
  if (!query || !query.trim()) return true;

  const cleanQuery = normalizePersianText(query);
  const queryTokens = getSearchTokens(query);

  // Searchable text corpus from scenario
  const titleNorm = normalizePersianText(scenario.title);
  const catNorm = normalizePersianText(scenario.category);
  const contextNorm = normalizePersianText(scenario.context);
  const emoNorm = normalizePersianText(scenario.emotion);
  const bestAnsNorm = normalizePersianText(scenario.analysis?.bestAnswer || '');
  const reasonNorm = normalizePersianText(scenario.analysis?.reason || '');
  const answersNorm = (scenario.answers || []).map(a => normalizePersianText(a.text + ' ' + a.style + ' ' + a.goal)).join(' ');

  const fullCorpus = `${titleNorm} ${catNorm} ${contextNorm} ${emoNorm} ${bestAnsNorm} ${reasonNorm} ${answersNorm}`;

  // 1. Direct normalized substring match
  if (fullCorpus.includes(cleanQuery)) {
    return true;
  }

  // 2. Token / Stem matches
  if (queryTokens.length > 0) {
    const matchesAllTokens = queryTokens.every(token => {
      if (fullCorpus.includes(token)) return true;
      // Check if any word in corpus stems to the same token
      const corpusWords = fullCorpus.split(/\s+/);
      return corpusWords.some(w => (PERSIAN_STEM_MAP[w] || w) === token || w.includes(token) || token.includes(w));
    });

    if (matchesAllTokens) return true;

    // If query has 2+ words (e.g. "دختره گفت زشتی") and matches key content tokens like "زشت" or "دختر"
    const keyTokens = queryTokens.filter(t => !PERSIAN_STOPWORDS.has(t) && t !== 'گفت');
    if (keyTokens.length > 0) {
      const matchedKeyCount = keyTokens.filter(kt => fullCorpus.includes(kt)).length;
      if (matchedKeyCount >= Math.ceil(keyTokens.length * 0.6)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Generate a unique fingerprint for a scenario to detect duplicates
 */
export function getScenarioFingerprint(scenario: Partial<ScenarioNode>): string {
  const normTitle = normalizePersianText(scenario.title || '');
  const normContext = normalizePersianText(scenario.context || '');
  
  // If title is short/generic, combine title and context
  const keyStr = normTitle + '||' + normContext;
  return keyStr.replace(/[^a-z0-9\u0600-\u06FF]/g, '');
}

/**
 * Check if a scenario is duplicate against an existing array of scenarios
 */
export function isDuplicateScenario(
  newScenario: Partial<ScenarioNode>,
  existingScenarios: ScenarioNode[]
): boolean {
  const newFingerprint = getScenarioFingerprint(newScenario);
  if (!newFingerprint) return false;

  const newTitleNorm = normalizePersianText(newScenario.title || '');
  const newContextNorm = normalizePersianText(newScenario.context || '');

  return existingScenarios.some(existing => {
    const existingFP = getScenarioFingerprint(existing);
    if (existingFP && existingFP === newFingerprint) return true;

    // Direct title exact normalized match
    const exTitleNorm = normalizePersianText(existing.title || '');
    if (newTitleNorm && exTitleNorm && newTitleNorm === exTitleNorm) return true;

    // Direct context exact normalized match
    const exContextNorm = normalizePersianText(existing.context || '');
    if (newContextNorm && newContextNorm.length > 10 && exContextNorm && newContextNorm === exContextNorm) return true;

    return false;
  });
}
