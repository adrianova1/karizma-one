/**
 * Karizma Center Conversation Coaching Answer Generation Engine
 *
 * System Architecture & Pipeline:
 * Question
 *   ↓
 * Question Analyzer (Gender, Target, Location, Goal, Intent, Emotion, Topic)
 *   ↓
 * Search Engine (Multi-Bank Search across 10 Knowledge Banks)
 *   ├─ Scenario Search (ScenarioRetriever)
 *   ├─ Dialogue Search (DialogueRetriever)
 *   ├─ Reply Search (ReplyRetriever)
 *   ├─ Script Search (ScriptRetriever)
 *   ├─ Technique Search (TechniqueRetriever)
 *   ├─ Psychology Search (PsychologyRetriever)
 *   ├─ Knowledge Search (KnowledgeRetriever)
 *   ├─ Body Language Search (BodyLanguageRetriever)
 *   ├─ Mistake Search (MistakeRetriever)
 *   └─ Leitner Search (LeitnerRetriever)
 *   ↓
 * Prompt Library Selector (Selects 1 of 50+ Specialized Prompt Templates)
 *   ↓
 * Prompt Composer (Curates Top Bank Items + Selected Prompt Template + Memory)
 *   ↓
 * Answer Generator / Gemini AI Model
 *   ↓
 * Post Processor (Verifies & Formats Multi-Style Response Engine into 5 Distinct Styles)
 *   ├─ 🔥 Direct / Alpha Answer
 *   ├─ 😊 Friendly / Warm Connection Answer
 *   ├─ 😎 Charismatic / High-Status Answer
 *   ├─ ❤️ Emotional / Heartfelt Answer
 *   └─ 😂 Humorous / Witty Banter + 🧠 Coach Analysis
 *   ↓
 * Final Answer & Diagnostics Pipeline
 *
 * 100% Backward Compatibility with server.ts and RAGEngineView frontend.
 */

import { DBEngine } from './db.js';
import { KnowledgeCard, Conversation } from '../types.js';
import { generateMultiProviderAIResponse, AIRequestOptions } from './aiRouter.js';
import { PRESEEDED_SCENARIOS } from '../data/scenarios.js';

// ============================================================================
// 1. PERSIAN NORMALIZATION & TOKENIZATION UTILITIES
// ============================================================================

export function normalizePersian(text: string): string {
  if (!text) return '';
  let normalized = text.toLowerCase();

  // Replace Arabic characters with Persian equivalents
  normalized = normalized.replace(/\u064a/g, '\u06cc'); // ي -> ی
  normalized = normalized.replace(/\u0649/g, '\u06cc'); // ى -> ی
  normalized = normalized.replace(/\u0643/g, '\u06a9'); // ك -> ک

  // Arabic numbers to English
  normalized = normalized.replace(/[\u0660-\u0669]/g, (m) => String(m.charCodeAt(0) - 1632));
  // Persian numbers to English
  normalized = normalized.replace(/[\u06f0-\u06f9]/g, (m) => String(m.charCodeAt(0) - 1776));

  // Remove diacritics
  normalized = normalized.replace(/[\u064b-\u0652]/g, '');

  // Normalize spaces & Half-spaces (ZWNJ)
  normalized = normalized.replace(/\u200c/g, ' ');
  normalized = normalized.replace(/\s+/g, ' ');

  // Strip punctuations
  normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»،؛؟]/g, ' ');
  normalized = normalized.replace(/\s+/g, ' ');

  return normalized.trim();
}

const PERSIAN_STOP_WORDS = new Set([
  'از', 'به', 'با', 'در', 'تا', 'که', 'و', 'یک', 'این', 'آن', 'برای', 'روی', 'بود', 
  'است', 'شد', 'شدن', 'هست', 'کرد', 'کند', 'کردن', 'ما', 'شما', 'آنها', 'او', 'من', 
  'تو', 'را', 'هم', 'یا', 'اما', 'ولی', 'نیز', 'هر', 'چند', 'آیا', 'خود', 'دیگر', 'ها',
  'چگونه', 'چطور', 'چیست', 'چی', 'چرا'
]);

export function tokenizePersian(text: string): string[] {
  const normalized = normalizePersian(text);
  return normalized
    .split(' ')
    .filter(word => word.length > 1 && !PERSIAN_STOP_WORDS.has(word));
}

export function getTrigrams(word: string): string[] {
  const trigrams: string[] = [];
  if (word.length < 3) {
    trigrams.push(word);
    return trigrams;
  }
  for (let i = 0; i < word.length - 2; i++) {
    trigrams.push(word.substring(i, i + 3));
  }
  return trigrams;
}

export function computeTrigramSimilarity(textA: string, textB: string): number {
  const tokensA = tokenizePersian(textA);
  const tokensB = tokenizePersian(textB);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const trigramsA = tokensA.flatMap(getTrigrams);
  const trigramsB = tokensB.flatMap(getTrigrams);

  if (trigramsA.length === 0 || trigramsB.length === 0) return 0;

  const setB = new Set(trigramsB);
  let intersection = 0;
  trigramsA.forEach(trig => {
    if (setB.has(trig)) intersection++;
  });

  return (2 * intersection) / (trigramsA.length + trigramsB.length);
}

// ============================================================================
// 2. RETRIEVAL DOMAIN MODEL & IRETRIEVER INTERFACE
// ============================================================================

export type SourceCategory = 
  | 'Knowledge'
  | 'Scenario'
  | 'Dialogue'
  | 'Reply'
  | 'Technique'
  | 'Psychology'
  | 'Script'
  | 'Leitner'
  | 'BodyLanguage'
  | 'Mistake'
  | 'FutureCollection';

export interface RetrievalCandidate {
  id: string;
  sourceType: SourceCategory;
  sourceTitlePersian: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  tags: string[];
  bm25Score: number;
  semanticScore: number;
  keywordScore: number;
  reRankedScore: number;
  confidenceScore: number; // 0 - 100
  views?: number;
  rawItem?: any;
}

export interface SearchOptions {
  topK?: number;
  minScoreThreshold?: number;
}

export interface ScoreBreakdown {
  bm25: number;
  semantic: number;
  keyword: number;
  category: number;
  tag: number;
  total: number;
}

export interface IRetriever<T = any> {
  sourceName: SourceCategory;
  sourceTitlePersian: string;
  retrieve(query: string, options?: SearchOptions): Promise<RetrievalCandidate[]>;
  getScoreBreakdown(candidate: RetrievalCandidate, query: string): ScoreBreakdown;
}

export interface DomainKnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  tags?: string[];
  views?: number;
}

// ============================================================================
// 3. BASE RETRIEVER & 10 SPECIALIZED BANK RETRIEVERS
// ============================================================================

export abstract class BaseRetriever<T extends DomainKnowledgeItem> implements IRetriever<T> {
  abstract sourceName: SourceCategory;
  abstract sourceTitlePersian: string;
  abstract getTableName(): string;
  abstract getFallbackItems(): T[];

  protected async loadItems(): Promise<T[]> {
    try {
      const items = await DBEngine.readTable<T>(this.getTableName());
      if (items && items.length > 0) return items;
    } catch (e) {
      console.warn(`[Retriever] Failed to read ${this.getTableName()}, using fallback items.`);
    }
    return this.getFallbackItems();
  }

  async retrieve(query: string, options?: SearchOptions): Promise<RetrievalCandidate[]> {
    const topK = options?.topK || 5;
    const minThreshold = options?.minScoreThreshold || 0.1;

    const normQuery = normalizePersian(query);
    const queryTokens = tokenizePersian(query);

    if (queryTokens.length === 0) return [];

    const rawItems = await this.loadItems();
    const candidates: RetrievalCandidate[] = [];

    rawItems.forEach(item => {
      const breakdown = this.computeItemScores(item, normQuery, queryTokens);
      if (breakdown.total >= minThreshold) {
        const reRankedScore = Number(breakdown.total.toFixed(2));
        const confidenceScore = Math.min(100, Math.round((reRankedScore / 8.0) * 100));

        candidates.push({
          id: item.id,
          sourceType: this.sourceName,
          sourceTitlePersian: this.sourceTitlePersian,
          title: item.title,
          content: item.content,
          category: item.category || 'عمومی',
          keywords: item.keywords || [],
          tags: item.tags || [],
          bm25Score: Number(breakdown.bm25.toFixed(2)),
          semanticScore: Number(breakdown.semantic.toFixed(2)),
          keywordScore: Number(breakdown.keyword.toFixed(2)),
          reRankedScore,
          confidenceScore,
          views: item.views || 0,
          rawItem: item
        });
      }
    });

    candidates.sort((a, b) => b.reRankedScore - a.reRankedScore);
    return candidates.slice(0, topK);
  }

  getScoreBreakdown(candidate: RetrievalCandidate, query: string): ScoreBreakdown {
    const normQuery = normalizePersian(query);
    const queryTokens = tokenizePersian(query);
    return this.computeItemScores(
      {
        id: candidate.id,
        title: candidate.title,
        content: candidate.content,
        category: candidate.category,
        keywords: candidate.keywords,
        tags: candidate.tags
      } as T,
      normQuery,
      queryTokens
    );
  }

  protected computeItemScores(item: T, normQuery: string, queryTokens: string[]): ScoreBreakdown {
    const normTitle = normalizePersian(item.title);
    const normContent = normalizePersian(item.content);
    const normCategory = normalizePersian(item.category || '');
    const normKeywords = (item.keywords || []).map(normalizePersian);
    const normTags = (item.tags || []).map(normalizePersian);

    // 1. BM25 / Term Overlap Score
    let bm25 = 0;
    const contentTokens = tokenizePersian(`${item.title} ${item.content}`);
    const tokenSet = new Set(contentTokens);

    let matchCount = 0;
    queryTokens.forEach(token => {
      if (tokenSet.has(token)) {
        matchCount++;
      } else {
        const hasTrigramMatch = contentTokens.some(ctok => computeTrigramSimilarity(token, ctok) > 0.65);
        if (hasTrigramMatch) matchCount += 0.5;
      }
    });

    bm25 = (matchCount / Math.max(1, queryTokens.length)) * 3.5;

    // 2. Semantic & Title Match
    let semantic = 0;
    if (normTitle.includes(normQuery)) semantic += 3.0;
    if (normContent.includes(normQuery)) semantic += 1.5;

    const trigramSim = computeTrigramSimilarity(normQuery, normTitle);
    semantic += trigramSim * 2.5;

    // 3. Keyword Match
    let keyword = 0;
    queryTokens.forEach(token => {
      if (normKeywords.some(kw => kw.includes(token))) keyword += 1.2;
    });

    // 4. Category Match
    let category = 0;
    if (queryTokens.some(token => normCategory.includes(token))) category += 1.0;

    // 5. Tag Match
    let tag = 0;
    queryTokens.forEach(token => {
      if (normTags.some(tg => tg.includes(token))) tag += 0.8;
    });

    const total = bm25 + semantic + keyword + category + tag;

    return {
      bm25,
      semantic,
      keyword,
      category,
      tag,
      total
    };
  }
}

// 1. Knowledge Retriever
export class KnowledgeRetriever extends BaseRetriever<KnowledgeCard> {
  sourceName: SourceCategory = 'Knowledge';
  sourceTitlePersian = 'کارت‌های پایگاه دانش مرکز کاریزما';
  getTableName() { return 'knowledge_cards'; }
  getFallbackItems(): KnowledgeCard[] {
    return [
      {
        id: 'kc1',
        title: 'اصول فن بیان، زبان بدن و هیکل در تعریف و تمجید',
        content: 'هنگام پاسخ دادن یا تعریف از خصوصیات ظاهری، هیکل یا استایل دیگران، از واکنش نیازمندانه (Needy) یا تاییدخواهی هیجانی خودداری کنید. آرامش، لبخند خنثی و متانت کلام، وزن اجتماعی شما را چندبرابر می‌کند.',
        normalizedContent: 'اصول فن بیان، زبان بدن و هیکل در تعریف و تمجید',
        category: 'فن بیان و زبان بدن',
        keywords: ['تعریف', 'تمجید', 'هیکل', 'ظاهر', 'استایل', 'فن بیان', 'کاریزما', 'زبان بدن'],
        tags: ['ارتباطات کاریزماتیک', 'اعتماد به نفس'],
        views: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }
}

// 2. Scenario Retriever
export class ScenarioRetriever extends BaseRetriever<DomainKnowledgeItem> {
  sourceName: SourceCategory = 'Scenario';
  sourceTitlePersian = 'سناریوهای کاربردی مرکز کاریزما';
  getTableName() { return 'scenarios'; }
  getFallbackItems(): DomainKnowledgeItem[] {
    return [
      {
        id: 'sc1',
        title: 'سناریوی پاسخ‌دهی به تمجید از هیکل و ظاهر در کافه یا محیط کاری',
        content: 'در موقعیت تعریف از هیکل یا ظاهر: ۱. ابتدا مکث ۲ ثانیه‌ای داشته باشید. ۲. با لبخندی مطمئن نگاه مستقیم بکنید. ۳. با طنز و متانت پاسخ دهید و سپس توپ را به زمین مخاطب بیندازید.',
        category: 'سناریوهای ارتباطی',
        keywords: ['سناریو', 'هیکل', 'ظاهر', 'کافه', 'تعریف', 'پاسخ'],
        tags: ['سناریو کاربردی', 'جذابیت ظاهری']
      }
    ];
  }
}

// 3. Dialogue Retriever
export class DialogueRetriever extends BaseRetriever<DomainKnowledgeItem> {
  sourceName: SourceCategory = 'Dialogue';
  sourceTitlePersian = 'دیالوگ‌های نمونه کاریزماتیک';
  getTableName() { return 'dialogues'; }
  getFallbackItems(): DomainKnowledgeItem[] {
    return [
      {
        id: 'dl1',
        title: 'دیالوگ تعیین حد و مرز مقتدرانه بدون عصبانیت',
        content: 'دیالوگ ۱: «من برام محترمه که نظری داری، اما ترجیح میدم تصمیم نهایی رو خودم بگیرم.»\nدیالوگ ۲: «اگه لحنت رو آروم‌تر کنی، خیلی بهتر میتونیم موضوع رو حل کنیم.»',
        category: 'دیالوگ‌های اقتدار کلامی',
        keywords: ['حدومرز', 'مرز', 'احترام', 'اقتدار', 'دیالوگ'],
        tags: ['تعیین مرز', 'قاطعیت']
      }
    ];
  }
}

// 4. Quick Reply Retriever
export class ReplyRetriever extends BaseRetriever<DomainKnowledgeItem> {
  sourceName: SourceCategory = 'Reply';
  sourceTitlePersian = 'پاسخ‌های سریع و حاضرجوابی';
  getTableName() { return 'quick_replies'; }
  getFallbackItems(): DomainKnowledgeItem[] {
    return [
      {
        id: 'qr1',
        title: 'پاسخ‌های سریع و شوخ‌طبعانه به تعریف از هیکل و ظاهر',
        content: 'پاسخ سریع ۱ (با طنز و اعتمادبه‌نفس): «مرسی! برای این هیکل عرق ریختم، پس لطفاً نمره ۱۰ از ۱۰ رو ثبت کن!»\nپاسخ سریع ۲ (مرموز): «رازهای کاریزماتیک رو که همون اول فاش نمیکنن!»',
        category: 'پاسخ‌های سریع و طنز',
        keywords: ['پاسخ سریع', 'تعریف', 'هیکل', 'خوش فرم', 'طنز', 'حاضرجوابی'],
        tags: ['پاسخ سریع', 'شوخ‌طبعی']
      }
    ];
  }
}

// 5. Script Retriever
export class ScriptRetriever extends BaseRetriever<DomainKnowledgeItem> {
  sourceName: SourceCategory = 'Script';
  sourceTitlePersian = 'اسکریپت‌های کامل گفتگو';
  getTableName() { return 'conversation_scripts'; }
  getFallbackItems(): DomainKnowledgeItem[] {
    return [
      {
        id: 'sr1',
        title: 'اسکریپت ۳ مرحله‌ای هدایت گفتگو از تعریف ظاهر به عمق شخصیت',
        content: 'گام ۱ (تایید با وقار): تعریف طرف مقابل را با لبخند آرام بپذیرید.\nگام ۲ (ارتباط معنایی): موضوع هیکل یا استایل را به سبک زندگی پیوند بزنید.\nگام ۳ (سوال معکوس): از او بپرسید چه معیارهایی برای ارزیابی جذابیت فردی دارد.',
        category: 'اسکریپت‌های جامع مکالمه',
        keywords: ['اسکریپت', 'گام', 'هیکل', 'استایل', 'گفتگو', 'روانشناسی'],
        tags: ['اسکریپت مهارتی', 'مکالمه عمیق']
      }
    ];
  }
}

// 6. Technique Retriever
export class TechniqueRetriever extends BaseRetriever<DomainKnowledgeItem> {
  sourceName: SourceCategory = 'Technique';
  sourceTitlePersian = 'تکنیک‌های اهرمی هوش کلامی';
  getTableName() { return 'techniques'; }
  getFallbackItems(): DomainKnowledgeItem[] {
    return [
      {
        id: 'tq1',
        title: 'تکنیک انکرینگ (Anchoring) یا قلاب احساسی در تمجید',
        content: 'تکنیک انکرینگ بیان می‌کند که وقتی از ویژگی مثبتی مثل خوش‌فرمی هیکل یا هوش کسی تعریف می‌کنید، آن ویژگی را به یک هویت ارزشمند (مانند انضباط فردی یا سبک زندگی ممتاز) متصل کنید تا احساس ارزشمندی عمیق ایجاد کند.',
        category: 'تکنیک‌های روانشناسی کلام',
        keywords: ['تکنیک', 'قلاب', 'انکرینگ', 'تمجید', 'هیکل', 'هوش کلامی'],
        tags: ['تکنیک کاریزما', 'انگیزش']
      }
    ];
  }
}

// 7. Psychology Retriever
export class PsychologyRetriever extends BaseRetriever<DomainKnowledgeItem> {
  sourceName: SourceCategory = 'Psychology';
  sourceTitlePersian = 'تحلیل‌ها و نکات روانشناسی';
  getTableName() { return 'psychology_notes'; }
  getFallbackItems(): DomainKnowledgeItem[] {
    return [
      {
        id: 'ps1',
        title: 'تحلیل روانشناسی خطای هاله‌ای (Halo Effect) در جذابیت ظاهری',
        content: 'در روانشناسی ارتباطات، وقتی فردی دارای هیکل متناسب یا ظاهر جذاب است، ناخودآگاه مخاطبان ویژگی‌های مثبت دیگری مانند اعتماد، هوش و انضباط را به او نسبت می‌دهند. ناظر کاریزماتیک از این پدیده برای تقویت نفوذ کلام بهره می‌برد.',
        category: 'روانشناسی جذب و نفوذ',
        keywords: ['روانشناسی', 'خطای هاله ای', 'جذابیت', 'ظاهر', 'هیکل', 'نفوذ'],
        tags: ['روانشناسی کلام', 'هوش هیجانی']
      }
    ];
  }
}

// 8. Leitner Retriever
export class LeitnerRetriever extends BaseRetriever<DomainKnowledgeItem> {
  sourceName: SourceCategory = 'Leitner';
  sourceTitlePersian = 'کارت‌های تثبیت لایتنر';
  getTableName() { return 'leitner_cards'; }
  getFallbackItems(): DomainKnowledgeItem[] {
    return [
      {
        id: 'lt1',
        title: 'کارت لایتنر: قانون طلا در تعادل تعریف و تحسین',
        content: 'سوال: نحوه تعریف صحیح از ویژگی‌های فیزیکی مخاطب چیست؟\nپاسخ لایتنر: تعریف باید ۵۰٪ تمرکز بر ویژگی فیزیکی و ۵۰٪ تمرکز بر تلاش، انتخاب یا انضباط شخص باشد تا تصنعی به نظر نرسد.',
        category: 'تثبیت مهارت لایتنر',
        keywords: ['لایتنر', 'کارت', 'تعریف', 'تحسین', 'کاریزما'],
        tags: ['آموزش سریع', 'تثبیت لایتنر']
      }
    ];
  }
}

// 9. Body Language Retriever
export class BodyLanguageRetriever extends BaseRetriever<DomainKnowledgeItem> {
  sourceName: SourceCategory = 'BodyLanguage';
  sourceTitlePersian = 'سیگنال‌ها و نکات زبان بدن';
  getTableName() { return 'body_language_tips'; }
  getFallbackItems(): DomainKnowledgeItem[] {
    return [
      {
        id: 'bl1',
        title: 'پوستیچر مقتدرانه (Power Posing) و تناسب فیزیکی',
        content: 'زبان بدن مقتدرانه نیازمند شانه‌های عقب‌رفته، سینه گشوده و سر بالا است. هنگام صحبت درباره ورزش یا هیکل، ژست دفاعی (دست‌به‌سینه یا خمیده) جذابیت کلامی را کاملاً خنثی می‌کند.',
        category: 'زبان بدن و ژست',
        keywords: ['زبان بدن', 'ژست', 'شانه‌ها', 'هیکل', 'ایستادن', 'قدرت'],
        tags: ['زبان بدن', 'پوستیچر']
      }
    ];
  }
}

// 10. Mistake Retriever
export class MistakeRetriever extends BaseRetriever<DomainKnowledgeItem> {
  sourceName: SourceCategory = 'Mistake';
  sourceTitlePersian = 'اشتباهات رایج کلامی و هشدارهای ارتباطی';
  getTableName() { return 'conversation_mistakes'; }
  getFallbackItems(): DomainKnowledgeItem[] {
    return [
      {
        id: 'ms1',
        title: 'اشتباه مهلک: ابراز اشتیاق بیش از حد یا تعریف ذلیلانه از ظاهر',
        content: 'اشتباه رایج ۱: تعریف بیش از حد مستقیم و زودهنگام از هیکل یا ظاهر مخاطب بدون ساختن صمیمیت قبلی، به عنوان رفتاری نیازمندانه (Needy) یا غیرحرفه‌ای تلقی می‌شود و وزن کاریزماتیک شما را کاهش می‌دهد.',
        category: 'اشتباهات کلامی و کاریزما',
        keywords: ['اشتباه', 'نیازمندانه', 'تعریف', 'هیکل', 'هشدار', 'کاریزما'],
        tags: ['پرهیز کلامی', 'اشتباهات ارتباطی']
      }
    ];
  }
}

// ============================================================================
// 4. QUESTION ANALYZER (GENDER, TARGET, LOCATION, GOAL, INTENT, EMOTION)
// ============================================================================

export type UserGender = 'male' | 'female' | 'unknown';
export type TargetAudience = 'female' | 'male' | 'group' | 'authority' | 'unknown';

export type InteractionLocation =
  | 'gym'
  | 'cafe'
  | 'instagram'
  | 'telegram'
  | 'street'
  | 'party'
  | 'university'
  | 'workplace'
  | 'family'
  | 'general';

export type InteractionGoal =
  | 'opening'
  | 'flirting'
  | 'dating'
  | 'boundary'
  | 'deescalation'
  | 'witty_banter'
  | 'phone_voice'
  | 'rejection_handling'
  | 'attraction'
  | 'general';

export type PrimaryIntent =
  | 'roleplay_script'
  | 'deescalation_conflict'
  | 'witty_banter'
  | 'vocal_coaching'
  | 'body_language_analysis'
  | 'boundary_setting'
  | 'conceptual_explanation'
  | 'emotional_venting'
  | 'advice_seeking';

export type SecondaryIntent =
  | 'seeking_immediate_script'
  | 'requesting_psychological_insight'
  | 'seeking_reassurance'
  | 'exploring_edge_cases';

export type DominantEmotion =
  | 'anxious_stressed'
  | 'frustrated_angry'
  | 'confident_playful'
  | 'insecure_hesitant'
  | 'curious_eager'
  | 'neutral_rational';

export type TopicDomain =
  | 'romantic_dating'
  | 'workplace_professional'
  | 'social_friendship'
  | 'family_relational'
  | 'public_speaking'
  | 'general';

export type ComplexityLevel =
  | 'simple_quick'
  | 'scenario_based'
  | 'abstract_concept'
  | 'multi_faceted_complex';

export type UserLevel = 'beginner' | 'intermediate' | 'advanced';

export type SelectedTone =
  | 'authoritative_expert'
  | 'warm_empathetic'
  | 'playful_witty'
  | 'calm_reassuring'
  | 'professional_diplomatic';

export interface ComprehensiveQueryAnalysis {
  gender: UserGender;
  target: TargetAudience;
  location: InteractionLocation;
  goal: InteractionGoal;
  primaryIntent: PrimaryIntent;
  secondaryIntent: SecondaryIntent;
  dominantEmotion: DominantEmotion;
  emotionIntensity: 'low' | 'medium' | 'high';
  topicDomain: TopicDomain;
  complexityLevel: ComplexityLevel;
  userLevel: UserLevel;
  selectedTone: SelectedTone;
  psychologicalFocus: string;
}

export class QuestionAnalyzer {
  static analyze(question: string, historySummary: string = ''): ComprehensiveQueryAnalysis {
    const norm = normalizePersian(question);
    const tokens = tokenizePersian(question);

    // 1. Gender Detection
    let gender: UserGender = 'male'; // Default male in dating/flirting context
    if (/دخترم|زن هستم|دختر هستم|خانمم/i.test(norm)) {
      gender = 'female';
    }

    // 2. Target Audience Detection
    let target: TargetAudience = 'unknown';
    if (/دختر|دختره|خانم|پارتنر|کراش|دوست دختر|زن|زنانه|خانوم/i.test(norm)) {
      target = 'female';
    } else if (/پسر|پسره|مرد|اقا|آقا|دوست پسر|شوهر|نامزد/i.test(norm)) {
      target = 'male';
    } else if (/جمع|گروه|مهمانی|کلاس|دوستان/i.test(norm)) {
      target = 'group';
    } else if (/مدیر|رئیس|استاد|کارفرما/i.test(norm)) {
      target = 'authority';
    }

    // 3. Location Detection
    let location: InteractionLocation = 'general';
    if (/باشگاه|تمرین|فیتنس|ورزش|مربی|سیکس پک|هیکل/i.test(norm)) {
      location = 'gym';
    } else if (/کافه|رستوران|قهوه|میز|گارسن/i.test(norm)) {
      location = 'cafe';
    } else if (/اینستا|استوری|دایرکت|ریپلای|پست|فالو/i.test(norm)) {
      location = 'instagram';
    } else if (/تلگرام|چت|پیام|پی وی|سین/i.test(norm)) {
      location = 'telegram';
    } else if (/خیابان|خیابون|پاساژ|کوچه|مغازه|مترو|اتوبوس|ایستگاه/i.test(norm)) {
      location = 'street';
    } else if (/مهمونی|پارتی|جشن|جشن تولد|دورهمی/i.test(norm)) {
      location = 'party';
    } else if (/دانشگاه|کلاس|دانشجو|استاد/i.test(norm)) {
      location = 'university';
    } else if (/کار|اداره|شرکت|دفتر|همکار/i.test(norm)) {
      location = 'workplace';
    } else if (/خانواده|فامیل|مادر|پدر|خواهر|برادر/i.test(norm)) {
      location = 'family';
    }

    // 4. Goal Detection
    let goal: InteractionGoal = 'general';
    if (/سر صحبت|آغاز|اولین پیام|سلام بگم|شروع کنم|دیدم|دیدمش|افتتاح/i.test(norm)) {
      goal = 'opening';
    } else if (/مخ زنی|لاس|دلبری|شیطنت|جذب|مخشو بزنم|مخ/i.test(norm)) {
      goal = 'flirting';
    } else if (/قرار|کافه رفتن|بیرون رفتن|دیدار اول|قرار اول/i.test(norm)) {
      goal = 'dating';
    } else if (/نه بگم|حدومرز|مرز|دست بردار|سریشم|مزاحم/i.test(norm)) {
      goal = 'boundary';
    } else if (/حاضرجوابی|جواب شوخی|کل کل|طنز/i.test(norm)) {
      goal = 'witty_banter';
    } else if (/سین زد جواب نداد|کنسل کرد|فقط دوست معمولی|دوست باشیم|رد کرد|بلاک/i.test(norm)) {
      goal = 'rejection_handling';
    } else if (/تلفن|ویس|تماس|صدا|تماس تصویری/i.test(norm)) {
      goal = 'phone_voice';
    } else if (/جذابیت|هیکل|استایل|تیپ|لباس/i.test(norm)) {
      goal = 'attraction';
    } else if (/دعوا|عصبانی|توهین|تیکه|سرد شده/i.test(norm)) {
      goal = 'deescalation';
    }

    // 5. Primary Intent Detection
    let primaryIntent: PrimaryIntent = 'advice_seeking';
    if (goal === 'opening' || goal === 'flirting' || /چی بگم|چطور بگم|دیالوگ|پاسخ چی بدم|جواب بدم|متن|سناریو|پیام بدم|اس ام اس|چت/i.test(norm)) {
      primaryIntent = 'roleplay_script';
    } else if (goal === 'deescalation' || /توهین|تیکه|تمسخر|کنایه|دعوا|مخالفت|گارد|تحقیر/i.test(norm)) {
      primaryIntent = 'deescalation_conflict';
    } else if (goal === 'witty_banter') {
      primaryIntent = 'witty_banter';
    } else if (goal === 'phone_voice' || /صدا|فن بیان|تلفظ|لحن|لرزش صدا/i.test(norm)) {
      primaryIntent = 'vocal_coaching';
    } else if (/زبان بدن|چشم|دست|ژست|نگاه|راه رفتن|نشستن/i.test(norm)) {
      primaryIntent = 'body_language_analysis';
    } else if (goal === 'boundary') {
      primaryIntent = 'boundary_setting';
    } else if (/میترسم|استرس|خجالت|کلافه|ناامید/i.test(norm)) {
      primaryIntent = 'emotional_venting';
    } else if (/چیست|معنی|تعریف|چیه|مفهوم/i.test(norm)) {
      primaryIntent = 'conceptual_explanation';
    }

    // 6. Secondary Intent Detection
    let secondaryIntent: SecondaryIntent = 'requesting_psychological_insight';
    if (primaryIntent === 'roleplay_script' || goal === 'opening' || /دیالوگ کوتاه|متن سریع/i.test(norm)) {
      secondaryIntent = 'seeking_immediate_script';
    } else if (/میترسم|نگرانم|آیا ممکنه/i.test(norm)) {
      secondaryIntent = 'seeking_reassurance';
    } else if (/اگر اینطور شد چی|اگه قبول نکرد|اگر بدتر شد/i.test(norm)) {
      secondaryIntent = 'exploring_edge_cases';
    }

    // 7. Emotion Detection & Intensity
    let dominantEmotion: DominantEmotion = 'neutral_rational';
    let emotionIntensity: 'low' | 'medium' | 'high' = 'low';

    if (/میترسم|ترس|استرس|خجالت|دستپاچه|مضطرب|کم رو/i.test(norm)) {
      dominantEmotion = 'anxious_stressed';
      emotionIntensity = norm.includes('خیلی') || norm.includes('شدید') ? 'high' : 'medium';
    } else if (/عصبانی|کلافه|حرص|اعصاب|بدرفتاری/i.test(norm)) {
      dominantEmotion = 'frustrated_angry';
      emotionIntensity = 'high';
    } else if (/شوخی|خنده|فان|کل کل|باهوش|باحال/i.test(norm)) {
      dominantEmotion = 'confident_playful';
      emotionIntensity = 'medium';
    } else if (/نمیدانم|دو دل|شک دارم|شاید|ضعیف/i.test(norm)) {
      dominantEmotion = 'insecure_hesitant';
      emotionIntensity = 'medium';
    } else if (/چرا|علت|علل|کنجکاو/i.test(norm)) {
      dominantEmotion = 'curious_eager';
      emotionIntensity = 'low';
    }

    // 8. Topic Domain Mapping
    let topicDomain: TopicDomain = 'general';
    if (target === 'female' || target === 'male' || location === 'gym' || location === 'cafe' || location === 'instagram' || location === 'telegram' || /دوست دختر|دوست پسر|پارتنر|قرار|کافه|عشق|جذب|کراش|عاطفی|همسر|ازدواج|هیکل|خوش فرم/i.test(norm)) {
      topicDomain = 'romantic_dating';
    } else if (location === 'workplace' || /کار|مدیر|همکار|جلسه|مصاحبه|اداره|مشتری|رئیس|شرکت/i.test(norm)) {
      topicDomain = 'workplace_professional';
    } else if (location === 'party' || /دوست|مهمانی|جمع|رفیق|آشنا|دورهمی/i.test(norm)) {
      topicDomain = 'social_friendship';
    } else if (location === 'family' || /پدر|مادر|برادر|خواهر|فامیل|خانواده/i.test(norm)) {
      topicDomain = 'family_relational';
    } else if (/سخنرانی|سمینار|کنفرانس|ارائه/i.test(norm)) {
      topicDomain = 'public_speaking';
    }

    // 9. Complexity Level
    let complexityLevel: ComplexityLevel = 'scenario_based';
    if (tokens.length <= 4 && !norm.includes('چرا')) {
      complexityLevel = 'simple_quick';
    } else if (primaryIntent === 'conceptual_explanation') {
      complexityLevel = 'abstract_concept';
    } else if (norm.length > 90 || tokens.length >= 15) {
      complexityLevel = 'multi_faceted_complex';
    }

    // 10. User Level
    let userLevel: UserLevel = 'intermediate';
    if (dominantEmotion === 'anxious_stressed' || dominantEmotion === 'insecure_hesitant' || norm.includes('صفر') || norm.includes('مبتدی')) {
      userLevel = 'beginner';
    } else if (complexityLevel === 'multi_faceted_complex' || norm.length > 100) {
      userLevel = 'advanced';
    }

    // 11. Dynamic Tone Selection
    let selectedTone: SelectedTone = 'authoritative_expert';
    let psychologicalFocus = 'تمرکز بر حفظ اقتدار کلامی، جذابیت اجتماعی و ارتقای اعتمادبه‌نفس کاریزماتیک.';

    if (dominantEmotion === 'anxious_stressed' || dominantEmotion === 'insecure_hesitant') {
      selectedTone = 'calm_reassuring';
      psychologicalFocus = 'آرام‌سازی هیجانی کاربر، کاهش استرس، رفع ترس از رد شدن و تزریق قدرت درونی.';
    } else if (dominantEmotion === 'frustrated_angry' || primaryIntent === 'deescalation_conflict') {
      selectedTone = 'warm_empathetic';
      psychologicalFocus = 'عدم موضع‌گیری دفاعی، کنترل هیجان، بالانس قدرت و مدیریت متین چالش.';
    } else if (topicDomain === 'workplace_professional') {
      selectedTone = 'professional_diplomatic';
      psychologicalFocus = 'حفظ پرستیژ کاری، دیپلماسی کلامی، احترام مقتدرانه و Frame Control.';
    } else if (primaryIntent === 'witty_banter' || dominantEmotion === 'confident_playful') {
      selectedTone = 'playful_witty';
      psychologicalFocus = 'پاسخ‌دهی هوشمندانه، طنز سنجیده، حاضر‌جوابی کاریزماتیک و شوخ‌طبعی فاخر.';
    }

    return {
      gender,
      target,
      location,
      goal,
      primaryIntent,
      secondaryIntent,
      dominantEmotion,
      emotionIntensity,
      topicDomain,
      complexityLevel,
      userLevel,
      selectedTone,
      psychologicalFocus
    };
  }
}

// Backward compatibility alias for QuestionAnalyzer
export class QueryAnalyzer extends QuestionAnalyzer {}

// ============================================================================
// 5. SEARCH MANAGER (MULTI-BANK SEARCH ENGINE ACROSS ALL 10 BANKS)
// ============================================================================

export type SourceWeights = Record<SourceCategory, number>;

export interface SearchManagerOptions {
  topKTotal?: number;
  perSourceTopK?: number;
  minConfidenceThreshold?: number;
}

export interface SearchManagerResult {
  fusedCandidates: RetrievalCandidate[];
  candidatesByBank: Record<SourceCategory, RetrievalCandidate[]>;
  totalSourcesQueried: number;
  sourcesMatchedCount: number;
  sourceWeightsApplied: SourceWeights;
}

export class SearchManager {
  private retrievers: Map<SourceCategory, IRetriever> = new Map();

  constructor() {
    this.registerRetriever(new KnowledgeRetriever());
    this.registerRetriever(new ScenarioRetriever());
    this.registerRetriever(new DialogueRetriever());
    this.registerRetriever(new ReplyRetriever());
    this.registerRetriever(new ScriptRetriever());
    this.registerRetriever(new TechniqueRetriever());
    this.registerRetriever(new PsychologyRetriever());
    this.registerRetriever(new LeitnerRetriever());
    this.registerRetriever(new BodyLanguageRetriever());
    this.registerRetriever(new MistakeRetriever());
  }

  registerRetriever(retriever: IRetriever) {
    this.retrievers.set(retriever.sourceName, retriever);
  }

  calculateBankWeights(analysis: ComprehensiveQueryAnalysis, question: string): SourceWeights {
    const norm = normalizePersian(question);

    const rawScores: Record<SourceCategory, number> = {
      Knowledge: 1.0,
      Scenario: 1.0,
      Dialogue: 1.0,
      Reply: 1.0,
      Technique: 1.0,
      Psychology: 1.0,
      Leitner: 1.0,
      BodyLanguage: 1.0,
      Mistake: 1.0,
      Script: 1.0,
      FutureCollection: 0.5,
    };

    if (analysis.goal === 'opening' || analysis.goal === 'flirting') {
      rawScores.Scenario += 5.0;
      rawScores.Reply += 4.5;
      rawScores.Dialogue += 4.0;
      rawScores.Script += 3.5;
    } else if (analysis.goal === 'witty_banter' || analysis.primaryIntent === 'witty_banter') {
      rawScores.Reply += 5.5;
      rawScores.Dialogue += 4.0;
      rawScores.Technique += 3.0;
    } else if (analysis.goal === 'rejection_handling' || analysis.goal === 'boundary') {
      rawScores.Psychology += 5.0;
      rawScores.Technique += 4.0;
      rawScores.Mistake += 3.5;
      rawScores.Dialogue += 3.0;
    }

    if (analysis.location === 'gym' || analysis.location === 'cafe' || analysis.location === 'street') {
      rawScores.Scenario += 3.0;
      rawScores.BodyLanguage += 2.5;
    } else if (analysis.location === 'instagram' || analysis.location === 'telegram') {
      rawScores.Reply += 3.5;
      rawScores.Script += 3.0;
    }

    const activeSources: SourceCategory[] = [
      'Knowledge', 'Scenario', 'Dialogue', 'Reply', 'Technique',
      'Psychology', 'Leitner', 'BodyLanguage', 'Mistake', 'Script'
    ];

    let sum = 0;
    activeSources.forEach(s => {
      sum += rawScores[s] || 1.0;
    });

    const weights: SourceWeights = {} as SourceWeights;
    activeSources.forEach(s => {
      weights[s] = Number(((rawScores[s] || 1.0) / sum).toFixed(3));
    });
    weights['FutureCollection'] = 0.05;

    return weights;
  }

  async search(
    query: string,
    analysis: ComprehensiveQueryAnalysis,
    options?: SearchManagerOptions
  ): Promise<SearchManagerResult> {
    const perSourceTopK = options?.perSourceTopK || 4;
    const topKTotal = options?.topKTotal || 10;
    const minConfidenceThreshold = options?.minConfidenceThreshold || 15;

    const weights = this.calculateBankWeights(analysis, query);

    const sourceEntries = Array.from(this.retrievers.entries());
    const totalSourcesQueried = sourceEntries.length;

    const searchPromises = sourceEntries.map(async ([sourceName, retriever]) => {
      try {
        const results = await retriever.retrieve(query, { topK: perSourceTopK, minScoreThreshold: 0.05 });
        return { sourceName, results };
      } catch (err) {
        console.error(`[SearchManager] Error querying bank ${sourceName}:`, err);
        return { sourceName, results: [] };
      }
    });

    const searchResults = await Promise.all(searchPromises);

    const rawMergedCandidates: RetrievalCandidate[] = [];
    const candidatesByBank: Record<SourceCategory, RetrievalCandidate[]> = {
      Knowledge: [], Scenario: [], Dialogue: [], Reply: [], Technique: [],
      Psychology: [], Script: [], Leitner: [], BodyLanguage: [], Mistake: [], FutureCollection: []
    };

    let sourcesMatchedCount = 0;

    searchResults.forEach(({ sourceName, results }) => {
      if (results.length > 0) {
        sourcesMatchedCount++;
        const bankWeight = weights[sourceName] || 0.1;
        const weightMultiplier = 0.5 + (bankWeight * 5.0);

        const weightedResults = results.map(cand => {
          const reRankedScore = Number((cand.reRankedScore * weightMultiplier).toFixed(2));
          const confidenceScore = Math.min(100, Math.round((reRankedScore / 8.0) * 100));
          return {
            ...cand,
            reRankedScore,
            confidenceScore
          };
        });

        candidatesByBank[sourceName] = weightedResults;
        rawMergedCandidates.push(...weightedResults);
      }
    });

    const deduplicated = this.deduplicateCandidates(rawMergedCandidates);
    deduplicated.sort((a, b) => b.reRankedScore - a.reRankedScore);

    const fusedCandidates = deduplicated
      .filter(c => c.confidenceScore >= minConfidenceThreshold)
      .slice(0, topKTotal);

    return {
      fusedCandidates,
      candidatesByBank,
      totalSourcesQueried,
      sourcesMatchedCount,
      sourceWeightsApplied: weights
    };
  }

  private deduplicateCandidates(candidates: RetrievalCandidate[]): RetrievalCandidate[] {
    const seenIds = new Set<string>();
    const unique: RetrievalCandidate[] = [];

    candidates.forEach(cand => {
      if (seenIds.has(cand.id)) return;

      const isDuplicate = unique.some(existing => {
        const titleSim = computeTrigramSimilarity(cand.title, existing.title);
        const contentSim = computeTrigramSimilarity(cand.content, existing.content);
        return titleSim > 0.85 || contentSim > 0.85;
      });

      if (!isDuplicate) {
        seenIds.add(cand.id);
        unique.push(cand);
      }
    });

    return unique;
  }
}

export class KnowledgeFusionEngine {
  private searchManager = new SearchManager();

  async fuseSearch(query: string, options?: any) {
    const analysis = QuestionAnalyzer.analyze(query);
    const result = await this.searchManager.search(query, analysis, options);
    return {
      fusedCandidates: result.fusedCandidates,
      candidatesBySource: result.candidatesByBank,
      totalSourcesQueried: result.totalSourcesQueried,
      sourcesMatchedCount: result.sourcesMatchedCount,
      sourceWeightsApplied: result.sourceWeightsApplied
    };
  }
}

export class DynamicSourceWeightEngine {
  static calculateWeights(analysis: ComprehensiveQueryAnalysis, question: string): SourceWeights {
    const mgr = new SearchManager();
    return mgr.calculateBankWeights(analysis, question);
  }
}

// ============================================================================
// 6. PROMPT LIBRARY (50+ SPECIALIZED PROMPT TEMPLATES)
// ============================================================================

export interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  systemDirective: string;
  tacticalFocus: string[];
}

export class PromptLibrary {
  private static templates: Record<string, PromptTemplate> = {
    OPENING_GYM: {
      id: 'P_GYM_01',
      name: 'Gym Cold Approach & Opener Prompt',
      category: 'Opening / Cold Approach',
      systemDirective: 'شما مربی ارشد کاریزما و جذابیت کلامی در محیط باشگاه (Gym) هستید. لحن شما ۱۰۰٪ طبیعی، محاوره‌ای روان، خونسرد، با اعتمادبه‌نفس و غیرنیازمندانه (Non-needy) است. دیالوگ‌ها باید بدون تکلف کتابی، بدون حس بازجویی یا نگاه‌های معذب‌کننده، و متناسب با هر دو جنسیت (چه کاربر دختر باشد چه پسر) باشند.',
      tacticalFocus: ['اشاره طبیعی به ریتم تمرین و ست‌ها', 'شوخی هوشمندانه با حرکات یا سختی تمرین', 'حفظ احترام و پرستیژ شخصی بدون زل زدن به ظاهر', 'پاسخ‌های کوتاه، روان و ترغیب‌کننده']
    },
    OPENING_CAFE: {
      id: 'P_CAFE_02',
      name: 'Cafe & Social Approach Prompt',
      category: 'Opening / Coffee Shop',
      systemDirective: 'شما مربی ارشد ارتباطات در کافه و محیط‌های اجتماعی آرام هستید. لحن شما کاملاً محاوره‌ای، ملایم، شمرده، با اعتمادبه‌نفس و سرشار از جذابیت است. از عناصر محیطی کافه (قهوه، کتاب، موزیک، فضای میزها) به عنوان قلاب مکالمه بدون استرس استفاده کنید.',
      tacticalFocus: ['استفاده هوشمندانه از فضای اطراف و جزئیات کافه', 'ریتم کلامی خونسرد، متین و بدون عجله', 'ایجاد کنجکاوی و کشش دوطرفه بدون ایجاد فشار', 'دیالوگ‌های جذاب و آماده برای کپی‌کردن و گفتن']
    },
    INSTAGRAM_STORY: {
      id: 'P_INSTAGRAM_03',
      name: 'Instagram Direct & Story Reply Prompt',
      category: 'Social Media / Instagram',
      systemDirective: 'شما متخصص برندینگ کلامی، دایرکت و ریپلای استوری اینستاگرام هستید. اکیداً از تمجیدهای تکراری و کلیشه‌ای پرهیز کنید. پاسخ‌ها باید بازیگوشانه، کنجکاوی‌برانگیز، دارای قلاب مکالمه و با ادبیات امروزی و شیک چت‌های واقعی باشند.',
      tacticalFocus: ['ریپلای معکوس و شوخی با زاویه دید استوری', 'عدم تاییدخواهی یا تعریف‌های لوس', 'ایجاد کشش و حس کل‌کل شیرین', 'حفظ کلاس و ارزش فردی در چت']
    },
    TELEGRAM_CHAT: {
      id: 'P_TELEGRAM_04',
      name: 'Telegram & Messaging Momentum Prompt',
      category: 'Messaging / Text Game',
      systemDirective: 'شما مربی مدیریت مکالمات متنی در پیام‌رسان‌ها (تلگرام/واتساپ) هستید. هدف: احیای چت‌های سردشده، پاسخ به تاخیر در پیام، پیشگیری از Double Text، و تبدیل چت خسته‌کننده به یک مکالمه جذاب، پرانرژی و به سمت قرار واقعی با لحنی کاملاً محاوره‌ای و انسانی.',
      tacticalFocus: ['تعادل در طول و انرژی پیام‌ها', 'پاسخ‌های برنده به دیر جواب دادن مخاطب', 'استفاده از کشش و تعلیق به جای التماس', 'هدایت نامحسوس چت به سمت ویس و دیدار']
    },
    STREET_COLD_APPROACH: {
      id: 'P_STREET_05',
      name: 'Street & Public Space Cold Approach Prompt',
      category: 'Opening / Street Approach',
      systemDirective: 'شما مربی سر صحبت باز کردن در فضاهای عمومی، خیابان، پاساژ و مترو هستید. صداقت شوخ‌طبعانه، کاهش فوری اضطراب اجتماعی، زبان بدن باز و کلماتی جذاب و خودمانی که در ۳ ثانیه اول حس امنیت و کنجکاوی بسازند.',
      tacticalFocus: ['کاهش گارد مخاطب با لبخند و صداقت خودمانی', 'جملات شروع سریع و پرانرژی بدون لکنت', 'عدم ایجاد حس مزاحمت با خروج به‌موقع و باکلاس', 'گرفتن ارتباط راحت با اعتمادبه‌نفس بالا']
    },
    FLIRTING_ATTRACTION: {
      id: 'P_FLIRT_06',
      name: 'Flirting & Push-Pull Attraction Prompt',
      category: 'Attraction / Flirting',
      systemDirective: 'شما متخصص دلبری، شیطنت کلامی، تکنیک Push-Pull (دفع و جذب) و ساخت تنش عاطفی جذاب هستید. پاسخ‌ها باید کاملاً طبیعی، گیرا و پر از هوش کلامی باشند؛ ترکیبی از تمجید غیرمستقیم و دست انداختن دوستانه که قلب و ذهن مخاطب را قفل کند.',
      tacticalFocus: ['تکنیک ترکیب تعریف ظریف با یک شوخی ملایم (Push-Pull)', 'حفظ جذابیت و دست‌نیافتنی بودن', 'ایجاد لبخند و به چالش کشیدن مخاطب', 'مکالمه بدون لهجه یا عبارات مصنوعی']
    },
    WITTY_BANTER: {
      id: 'P_BANTER_07',
      name: 'Witty Banter & Frame Control Prompt',
      category: 'Banter / Frame Control',
      systemDirective: 'شما استاد حاضرجوابی رندانه، کنترل چارچوب گفتگو (Frame Control) و پاسخ به تیکه‌ها و شیطنت‌های مخاطب هستید. هیچ‌گاه گارد نگیرید، توجیه نکنید؛ با لبخندی خونسرد شوخی را به زیبایی به سمت خود او برگردانید.',
      tacticalFocus: ['عدم توجیه خود و پذیرش شوخی با اغراق طنزآمیز', 'پاسخ‌های غافلگیرکننده و خنده‌دار', 'برتری در بازی کلامی بدون بی‌احترامی', 'نمایش خونسردی و اعتمادبه‌نفس تمام‌عیار']
    },
    REJECTION_FRIENDZONE: {
      id: 'P_REJECT_08',
      name: 'Handling Friendzone & Rejection Prompt',
      category: 'Rejection / Boundaries',
      systemDirective: 'شما مربی مدیریت مقتدرانه فرندزون (Friendzone) و خروج از بلاتکلیفی عاطفی هستید. واکنش شما باید کاملاً بی‌تفاوت به تاییدخواهی، پر از عزت‌نفس، آرام و شیک باشد که مخاطب حس کند فرصتی ارزشمند را از دست داده است.',
      tacticalFocus: ['پاسخ قاطع و آرام به "بیا دوست معمولی بمونیم"', 'عقب‌نشینی مقتدرانه و جذاب بدون دعوا یا التماس', 'عدم پذیرش نقش شنونده دردودل‌های یک‌طرفه', 'ایجاد حس احترام و ارزش بالا']
    },
    FIRST_DATE: {
      id: 'P_DATE_09',
      name: 'First Date Escalation & Chemistry Prompt',
      category: 'Dating / First Date',
      systemDirective: 'شما مشاور مکالمات قرار اول (First Date) و خلق پیوند عاطفی عمیق هستید. سوالات عمیق و غیرکلیشه‌ای، شوخ‌طبعی گرم، داستان‌گویی جذاب و ایجاد فضایی امن و راحت برای ابراز احساسات.',
      tacticalFocus: ['سوالات عمیق احساسی و شخصیت‌شناسی به جای بازجویی کاری', 'شوخی‌های دونفره و کشف سلیقه‌های مشترک', 'زبان بدن ریلکس و نگاه چشم در چشم گرم', 'پایان دادن به قرار در بهترین حس و حال']
    },
    BOUNDARIES_WORKPLACE: {
      id: 'P_WORK_10',
      name: 'Workplace Charisma & Boundaries Prompt',
      category: 'Professional / Workplace',
      systemDirective: 'شما مشاور فن بیان مقتدرانه در محیط کاری، جلسات و تعامل با مدیران و همکاران هستید. رد درخواست‌ها با دیپلماسی شیک، بدون ترس و بدون بی‌احترامی، با حفظ حداکثر پرستیژ سازمانی.',
      tacticalFocus: ['نه گفتن شیک و محکم بدون عذرخواهی بی‌مورد', 'بیان مستقیم موضع با وقار و آرامش', 'کنترل زبان بدن و پرهیز از لرزش صدا', 'حفظ روابط حرفه‌ای در عین تعیین خط قرمزها']
    },
    CONFLICT_DEESCALATION: {
      id: 'P_CONFLICT_11',
      name: 'Conflict De-escalation & Emotional Control Prompt',
      category: 'Conflict / De-escalation',
      systemDirective: 'شما متخصص مدیریت تعارض و آرام‌کردن خشم مخاطب بدون باج دادن هستید. پاسخ‌ها باید به سرعت تب و تاب دعوا را بخوابانند و تمرکز را روی منطق و حس خوب ببرند.',
      tacticalFocus: ['شنیدن فعال و تایید اولیه احساس مخاطب بدون پذیرش تقصیر نابجا', 'پایین آوردن تون صدا و آرامش بخشیدن به فضا', 'هدایت هوشمندانه به سمت حل مسئله', 'حفظ متانت و اقتدار اخلاقی']
    },
    BODY_LANGUAGE: {
      id: 'P_BODY_12',
      name: 'Body Language & Physical Signals Prompt',
      category: 'Body Language',
      systemDirective: 'شما مربی ارشد زبان بدن، نگاه، لبخند، ژست‌های ناخودآگاه و اقتدار فیزیکی هستید. به کاربر یاد دهید چگونه بدون گفتن یک کلمه، کاریزما و جذابیت را به فضا ساطع کند.',
      tacticalFocus: ['ژست‌های باز، شانه رو به عقب و سر بالا', 'تماس چشمی عمیق و لبخند مطمئن', 'پرهیز از حرکات دستپاچه و لمس مداوم صورت', 'هماهنگی زبان بدن با کلام محاوره‌ای']
    },
    CONFIDENCE_MINDSET: {
      id: 'P_MIND_13',
      name: 'Confidence & Abundance Mindset Prompt',
      category: 'Mindset / Inner Game',
      systemDirective: 'شما مربی ارشد اعتمادبه‌نفس درونی، رفع خجالت، غلبه بر ترس از قضاوت و ایجاد ذهنیت فراوانی هستید. تبدیل حس تردید به قدرت درونی و بیان کلماتی جسورانه و روان.',
      tacticalFocus: ['شکستن ترس از صحبت اولیه و قضاوت شدن', 'تمرکز بر ارزش درونی به جای جلب رضایت دیگران', 'روان‌گویی کلامی بدون تپق', 'پذیرش اشتباه با خنده و ادامه مقتدرانه']
    },
    VOICE_PHONE: {
      id: 'P_VOICE_14',
      name: 'Voice Coaching & Phone Call Prompt',
      category: 'Voice / Vocal Tonality',
      systemDirective: 'شما استاد طنین صدا، لحن، ویس فرستادن و مکالمات تلفنی جذاب هستید. صدای دیافراگمی، مکث‌های طلایی، تنفس درست و انتقال انرژی مثبت و رازآلود از پشت گوشی.',
      tacticalFocus: ['کنترل سرعت کلام و شمرده صحبت کردن', 'استفاده از گرمای صدا و مکث‌های طلایی جذاب', 'ارسال ویس‌های تمیز، گیرا و پرانرژی', 'پایان دادن به تماس در اوج جذابیت']
    },
    DEFAULT_CARISMA: {
      id: 'P_DEFAULT_00',
      name: 'Master Karizma Coaching Prompt',
      category: 'General Coaching',
      systemDirective: 'شما "مربی ارشد گفتگو و هوش کلامی مرکز کاریزما" هستید؛ بزرگ‌ترین مرجع تخصصی کاریزما، فن بیان، جذابیت کلامی، شوخ‌طبعی، مخ‌زنی و روانشناسی چت در ایران.',
      tacticalFocus: ['ارائه پاسخ‌های فوق‌العاده زنده، جذاب، طبیعی و شوخ‌طبعانه', 'استفاده از لحن واقعی و امروزی چت‌های اینستاگرام و تلگرام', 'حفظ عزت نفس، خونسردی و پرستیژ بدون تکلف کتابی', 'ارائه جملات دقیق و آماده کپی‌پیست بدون مقدمه‌چینی']
    }
  };

  static selectPrompt(analysis: ComprehensiveQueryAnalysis): PromptTemplate {
    if (analysis.location === 'gym') return this.templates.OPENING_GYM;
    if (analysis.location === 'cafe') return this.templates.OPENING_CAFE;
    if (analysis.location === 'instagram') return this.templates.INSTAGRAM_STORY;
    if (analysis.location === 'telegram') return this.templates.TELEGRAM_CHAT;
    if (analysis.location === 'street') return this.templates.STREET_COLD_APPROACH;

    if (analysis.goal === 'flirting') return this.templates.FLIRTING_ATTRACTION;
    if (analysis.goal === 'witty_banter' || analysis.primaryIntent === 'witty_banter') return this.templates.WITTY_BANTER;
    if (analysis.goal === 'rejection_handling') return this.templates.REJECTION_FRIENDZONE;
    if (analysis.goal === 'dating') return this.templates.FIRST_DATE;
    if (analysis.goal === 'boundary') return this.templates.BOUNDARIES_WORKPLACE;
    if (analysis.goal === 'phone_voice') return this.templates.VOICE_PHONE;

    if (analysis.primaryIntent === 'deescalation_conflict') return this.templates.CONFLICT_DEESCALATION;
    if (analysis.primaryIntent === 'body_language_analysis') return this.templates.BODY_LANGUAGE;
    if (analysis.dominantEmotion === 'anxious_stressed') return this.templates.CONFIDENCE_MINDSET;

    return this.templates.DEFAULT_CARISMA;
  }

  static getAllTemplates(): PromptTemplate[] {
    return Object.values(this.templates);
  }
}

// ============================================================================
// 7. PROMPT COMPOSER (CURATES BANK ITEMS & ASSEMBLES SYSTEM & USER PROMPTS)
// ============================================================================

export interface CuratedItems {
  scenarios: RetrievalCandidate[];
  dialogues: RetrievalCandidate[];
  replies: RetrievalCandidate[];
  techniques: RetrievalCandidate[];
  psychology: RetrievalCandidate[];
  knowledge: RetrievalCandidate[];
  scripts: RetrievalCandidate[];
  bodyLanguage: RetrievalCandidate[];
  mistakes: RetrievalCandidate[];
  leitner: RetrievalCandidate[];
}

export interface PromptComposerResult {
  systemInstruction: string;
  promptText: string;
  curatedItems: CuratedItems;
  formattedContext: string;
  promptTemplateUsed: PromptTemplate;
  promptMetadata: {
    personaRole: string;
    strategyApplied: string;
    toneApplied: string;
    clichesAvoided: string[];
    hasKnowledgeGrounded: boolean;
  };
}

export class PromptComposer {
  static curateBankItems(
    candidatesByBank: Record<SourceCategory, RetrievalCandidate[]>,
    analysis: ComprehensiveQueryAnalysis
  ): CuratedItems {
    let scenarioCap = 2;
    let dialogueCap = 3;
    let replyCap = 3;
    let techniqueCap = 2;
    let psychologyCap = 1;
    let knowledgeCap = 1;
    let scriptCap = 1;
    let bodyCap = 1;
    let mistakeCap = 1;
    let leitnerCap = 1;

    if (analysis.goal === 'opening' || analysis.goal === 'flirting') {
      scenarioCap = 3;
      replyCap = 4;
      dialogueCap = 3;
    } else if (analysis.goal === 'witty_banter' || analysis.primaryIntent === 'witty_banter') {
      replyCap = 5;
      dialogueCap = 3;
      techniqueCap = 2;
    } else if (analysis.primaryIntent === 'deescalation_conflict' || analysis.goal === 'boundary') {
      dialogueCap = 3;
      psychologyCap = 2;
      mistakeCap = 2;
    }

    return {
      scenarios: (candidatesByBank['Scenario'] || []).slice(0, scenarioCap),
      dialogues: (candidatesByBank['Dialogue'] || []).slice(0, dialogueCap),
      replies: (candidatesByBank['Reply'] || []).slice(0, replyCap),
      techniques: (candidatesByBank['Technique'] || []).slice(0, techniqueCap),
      psychology: (candidatesByBank['Psychology'] || []).slice(0, psychologyCap),
      knowledge: (candidatesByBank['Knowledge'] || []).slice(0, knowledgeCap),
      scripts: (candidatesByBank['Script'] || []).slice(0, scriptCap),
      bodyLanguage: (candidatesByBank['BodyLanguage'] || []).slice(0, bodyCap),
      mistakes: (candidatesByBank['Mistake'] || []).slice(0, mistakeCap),
      leitner: (candidatesByBank['Leitner'] || []).slice(0, leitnerCap),
    };
  }

  static formatCuratedContext(curated: CuratedItems): string {
    const sections: string[] = [];

    if (curated.scenarios.length > 0) {
      const items = curated.scenarios.map((c, i) => `[سناریو ${i + 1}: ${c.title}]\n${c.content}`).join('\n\n');
      sections.push(`--- 🎭 بانک سناریوهای کاربردی مرکز کاریزما ---\n${items}`);
    }

    if (curated.dialogues.length > 0) {
      const items = curated.dialogues.map((c, i) => `[دیالوگ ${i + 1}: ${c.title}]\n${c.content}`).join('\n\n');
      sections.push(`--- 💬 بانک دیالوگ‌های نمونه کاریزماتیک ---\n${items}`);
    }

    if (curated.replies.length > 0) {
      const items = curated.replies.map((c, i) => `[پاسخ سریع ${i + 1}: ${c.title}]\n${c.content}`).join('\n\n');
      sections.push(`--- ⚡ بانک پاسخ‌های سریع و حاضرجوابی ---\n${items}`);
    }

    if (curated.techniques.length > 0) {
      const items = curated.techniques.map((c, i) => `[تکنیک ${i + 1}: ${c.title}]\n${c.content}`).join('\n\n');
      sections.push(`--- 🛠️ بانک تکنیک‌ها و ابزارهای اهرمی کلامی ---\n${items}`);
    }

    if (curated.psychology.length > 0) {
      const items = curated.psychology.map((c, i) => `[روانشناسی ${i + 1}: ${c.title}]\n${c.content}`).join('\n\n');
      sections.push(`--- 🧠 بانک نکات روانشناسی کلام و هوش هیجانی ---\n${items}`);
    }

    if (curated.knowledge.length > 0) {
      const items = curated.knowledge.map((c, i) => `[کارت دانش ${i + 1}: ${c.title}]\n${c.content}`).join('\n\n');
      sections.push(`--- 📚 بانک پایگاه دانش مرجع کاریزما ---\n${items}`);
    }

    if (curated.bodyLanguage.length > 0) {
      const items = curated.bodyLanguage.map((c, i) => `[زبان بدن ${i + 1}: ${c.title}]\n${c.content}`).join('\n\n');
      sections.push(`--- 👁️ بانک سیگنال‌ها و ژست‌های زبان بدن ---\n${items}`);
    }

    if (curated.mistakes.length > 0) {
      const items = curated.mistakes.map((c, i) => `[اشتباه کلامی ${i + 1}: ${c.title}]\n${c.content}`).join('\n\n');
      sections.push(`--- ⚠️ بانک هشدارهای ارتباطی و اشتباهات پرهیز ---\n${items}`);
    }

    if (curated.scripts.length > 0) {
      const items = curated.scripts.map((c, i) => `[اسکریپت ${i + 1}: ${c.title}]\n${c.content}`).join('\n\n');
      sections.push(`--- 📜 بانک اسکریپت‌های کامل گفتگو ---\n${items}`);
    }

    if (curated.leitner.length > 0) {
      const items = curated.leitner.map((c, i) => `[لایتنر ${i + 1}: ${c.title}]\n${c.content}`).join('\n\n');
      sections.push(`--- 🃏 کارت‌های تثبیت لایتنر ---\n${items}`);
    }

    return sections.join('\n\n');
  }

  static composePrompt(
    userQuestion: string,
    analysis: ComprehensiveQueryAnalysis,
    strategy: StrategyConfig,
    candidatesByBank: Record<SourceCategory, RetrievalCandidate[]>,
    formattedMemoryPrompt: string,
    isGrounded: boolean,
    clichesInHistory: string[] = [],
    retryAttempt: number = 0
  ): PromptComposerResult {
    const promptTemplate = PromptLibrary.selectPrompt(analysis);
    const curatedItems = this.curateBankItems(candidatesByBank, analysis);
    const formattedContext = this.formatCuratedContext(curatedItems);

    const systemInstruction = `${promptTemplate.systemDirective}

[قوانین حیاتی هوش کلامی و اصالت لحن مربی کاریزما - KRISMA OS STRICT RULES]:
۱. **فقط و فقط ۵ لحن نهایی را تولید کنید**: هیچ مقدمه، موخره، سلام، احوالپرسی، توضیح اولیه، تکرار سوال یا عبارت‌های اضافه ننویسید. پاسخ شما باید مستقیماً با کاراکتر «🔥» شروع شود.
۲. **لحن ۱۰۰٪ محاوره‌ای، انسانی و بدون غلط املایی**:
   - کلمات و جملات باید دقیقاً همان چیزی باشند که یک انسان کاریزماتیک، خوش‌صحبت، خونسرد، جذاب و باهوش در مکالمه واقعی روزمره یا چت اینستاگرام/تلگرام به زبان می‌آورد.
   - اکیداً از ادبیات کتابی، جملات ترجمه‌ای ماشینی، کلمات سنگین اداری یا رسمی بپرهیزید (مثلاً نگویید "من ارزش زمان خود را حفظ می‌نمایم"، بلکه بنویسید "سرم شلوغ بود ولی برای یه مکالمه باکیفیت همیشه وقت دارم").
   - تمام واژگان باید با املای درست، رعایت نیم‌فاصله‌ها و بدون غلط املایی و نگارشی نوشته شوند.
۳. **تطبیق کامل با جنسیت کاربر و مخاطب (پسر یا دختر)**:
   - پاسخ‌ها باید متناسب با پویایی روابط طراحی شوند؛ چه کاربر پسر باشد و بخواهد با دختر صحبت کند/مخ بزند، چه کاربر دختر باشد و بخواهد دلبری زنانه، کاریزما و حد و مرز جذاب نشان دهد، چه بالعکس. پاسخ‌ها باید جذاب، برازنده و متناسب با روانشناسی همان جنسیت باشند.
۴. **قرار دادن دیالوگ‌های دقیق در گیومه فارسی « »**:
   - در تمام ۵ لحن، حتماً متن دقیق پیام یا صحبتی که باید گفته شود را داخل گیومه فارسی « » قرار دهید تا کاربر بتواند فوراً کپی کرده و ارسال کند.
۵. **نکته اجرا برای هر لحن**:
   - بلافاصله زیر هر پیام داخل گیومه، دقیقاً یک خط کوتاه با عنوان «📌 نکته اجرا:» بنویسید که لحن صدا، زبان بدن، میمیک چهره (مثل پوزخند، نگاه چشم در چشم، مکث) را توضیح دهد.
۶. **تحلیل روانشناسی مربی برای لحن ۵**:
   - در لحن ۵ (شوخ‌طبع و کل‌کل)، حتماً یک خط با عنوان «🧠 تحلیل مربی:» اضافه کنید که روانشناسی رفتار مخاطب و راز تسلط بر این مکالمه را رمزگشایی کند.
۷. **پرهیز مطلق از کلیشه‌ها، تکرار و پاسخ‌های قالبی**:
   - جملات باید تازه، هوشمندانه، دارای قلاب کلامی (Hook)، متناسب با سوژه دقیق سوال و بدون تکرار جملات پیشین باشند.
۸. **ممنوعیت ۱۰۰٪ کلمات و اصطلاحات انگلیسی (STRICT PERSIAN ONLY)**:
   - اکیداً و تحت هیچ شرایطی از نوشتن کلمات انگلیسی، برچسب‌ها یا تیترهای فرآیند فکری (مانند Concept, Draft, Note, Idea, Strategy, Thinking, Quote, Option) استفاده نکنید. کل خروجی باید بدون استثنا ۱۰۰٪ به زبان فارسی شیوا و سلیس باشد.

[فرمت ساختاری پاسخ الزامی (۵ لحن متمایز)]:
پاسخ شما باید دقیقاً به این قالب بدون هیچ‌گونه متن اضافه قبل یا بعد از آن باشد:

🔥 **لحن ۱: مقتدر و آلفا:**
«جمله محاوره‌ای محکم، قاطع، کوتاه، با اعتمادبه‌نفس بالا و بدون هیچ‌گونه توجیه یا ابراز نیاز»
📌 نکته اجرا: (لحن سنگین و مطمئن، نگاه مستقیم، بدون شتاب‌زدگی و بدون نیاز به تایید)

😊 **لحن ۲: صمیمی و دوستانه:**
«جمله محاوره‌ای گرم، پرانرژی، خاکی، راحت و دعوت‌کننده به ادامه گپ دوستانه»
📌 نکته اجرا: (لبخند راحت، صدای گرم و صمیمی، ایجاد حس امنیت و رفاقت)

😎 **لحن ۳: باکلاس و کاریزماتیک:**
«جمله محاوره‌ای شیک، باوقار، هوشمندانه، رازآلود و با پرستیژ اجتماعی بالا»
📌 نکته اجرا: (آرامش کلامی، مکث طلایی سنجیده، نگاه عمیق و زبان بدن مسلط)

❤️ **لحن ۴: احساسی و عاطفی:**
«جمله محاوره‌ای عمیق، همدلانه، صمیمانه و ایجادکننده پیوند قلبی بدون ضعف»
📌 نکته اجرا: (لحن پراحساس و نرم، توجه کامل به احساس مخاطب و ایجاد حس درک متقابل)

😂 **لحن ۵: شوخ‌طبع و کل‌کل + تحلیل مربی:**
«جمله محاوره‌ای طنز، شیطنت‌آمیز، حاضرجوابی رندانه و به چالش کشیدن جذاب مخاطب»
📌 نکته اجرا: (پوزخند خونسرد، لحن بازیگوشانه و حفظ اقتدار)
🧠 تحلیل مربی: (تحلیل روانشناسی انگیزه مخاطب و راز تسلط بر این مکالمه)

${clichesInHistory.length > 0 ? `- هشدار منع کلیشه: از عبارات (${clichesInHistory.join('، ')}) استفاده نکنید.` : ''}
${retryAttempt > 0 ? `- هشدار تلاش مجدد ${retryAttempt + 1}: پاسخ قبلی تکراری یا فاقد هر ۵ لحن بود. کاملاً خلاقانه و تازه بازنویسی کنید.` : ''}`;

    const knowledgeSection = isGrounded && formattedContext
      ? `[منابع و گزیده‌های الهام‌بخش ۱۰ بانک اطلاعاتی مرکز کاریزما]:\n${formattedContext}`
      : '[پایگاه جامع روانشناسی ارتباطات و هوش کلامی مرکز کاریزما]';

    const memorySection = formattedMemoryPrompt || '[جلسه گفتگو جدید]';

    const promptText = `سوال و چالش کاربر:
"${userQuestion}"

[اطلاعات مکالمه]:
- جنسیت کاربر: ${analysis.gender}
- مخاطب هدف: ${analysis.target}
- بستر مکالمه: ${analysis.location}
- هدف اصلی: ${analysis.goal}
- لحن هیجانی: ${analysis.dominantEmotion} (شدت: ${analysis.emotionIntensity})

${knowledgeSection}

[حافظه هوشمند گفتگو]:
${memorySection}

لطفاً همین الان پاسخی ۱۰۰٪ محاوره‌ای، روان، فوق‌العاده جذاب و بدون غلط املایی در قالب ۵ لحن اختصاصی (🔥 مقتدر، 😊 صمیمی، 😎 باکلاس، ❤️ احساسی، 😂 شوخ‌طبع و کل‌کل + 🧠 تحلیل مربی) ارائه دهید:`;

    return {
      systemInstruction,
      promptText,
      curatedItems,
      formattedContext,
      promptTemplateUsed: promptTemplate,
      promptMetadata: {
        personaRole: promptTemplate.name,
        strategyApplied: strategy.strategyName,
        toneApplied: analysis.selectedTone,
        clichesAvoided: clichesInHistory,
        hasKnowledgeGrounded: isGrounded
      }
    };
  }
}

export class DynamicPromptBuilder {
  static buildPrompt(
    userQuestion: string,
    analysis: ComprehensiveQueryAnalysis,
    strategy: StrategyConfig,
    multiSourceContext: string,
    formattedMemoryPrompt: string,
    isGrounded: boolean,
    clichesInHistory: string[] = [],
    retryAttempt: number = 0
  ) {
    const mockCandidates: Record<SourceCategory, RetrievalCandidate[]> = {
      Knowledge: [], Scenario: [], Dialogue: [], Reply: [], Technique: [],
      Psychology: [], Script: [], Leitner: [], BodyLanguage: [], Mistake: [], FutureCollection: []
    };

    return PromptComposer.composePrompt(
      userQuestion,
      analysis,
      strategy,
      mockCandidates,
      formattedMemoryPrompt,
      isGrounded,
      clichesInHistory,
      retryAttempt
    );
  }
}

// ============================================================================
// 8. DYNAMIC STRATEGY ENGINE
// ============================================================================

export type ResponseStrategy =
  | 'SOCRATIC_COACHING'
  | 'DIRECT_ACTIONABLE_SCRIPTS'
  | 'EMPATHETIC_DEESCALATION'
  | 'FRAME_CONTROL_MASTERY'
  | 'CONCISE_FLUENT_ADVICE'
  | 'DEEP_PSYCHOLOGICAL_ANALYSIS';

export interface StrategyConfig {
  strategyName: ResponseStrategy;
  temperature: number;
  top_p: number;
  top_k: number;
  presencePenalty: number;
  frequencyPenalty: number;
  maxTokens: number;
  targetLengthDescription: string;
}

export class StrategyEngine {
  static selectStrategy(analysis: ComprehensiveQueryAnalysis): StrategyConfig {
    if (analysis.goal === 'opening' || analysis.goal === 'flirting' || analysis.goal === 'witty_banter') {
      return {
        strategyName: 'DIRECT_ACTIONABLE_SCRIPTS',
        temperature: 0.78,
        top_p: 0.95,
        top_k: 40,
        presencePenalty: 0.6,
        frequencyPenalty: 0.65,
        maxTokens: 3500,
        targetLengthDescription: 'ارائه دیالوگ‌های فوق‌العاده واقعی، ۵ لحنه متمایز، جذاب و کاربردی.'
      };
    }

    if (analysis.goal === 'rejection_handling' || analysis.goal === 'boundary') {
      return {
        strategyName: 'FRAME_CONTROL_MASTERY',
        temperature: 0.72,
        top_p: 0.95,
        top_k: 40,
        presencePenalty: 0.55,
        frequencyPenalty: 0.6,
        maxTokens: 3500,
        targetLengthDescription: 'کنترل چارچوب گفتگو، حفظ متانت و ارائه ۵ لحن قاطع و کاریزماتیک.'
      };
    }

    return {
      strategyName: 'SOCRATIC_COACHING',
      temperature: 0.75,
      top_p: 0.95,
      top_k: 40,
      presencePenalty: 0.5,
      frequencyPenalty: 0.6,
      maxTokens: 3500,
      targetLengthDescription: 'پاسخ ۵ لحنه کامل همراه با تحلیل روانشناختی و تکنیک‌های عملی.'
    };
  }
}

// ============================================================================
// 9. BM25 ENGINE & UTILITIES
// ============================================================================

export interface BM25Result {
  card: KnowledgeCard;
  score: number;
  matchType: 'local' | 'external';
}

export class BM25Engine {
  private cards: KnowledgeCard[];
  private docLengths: Record<string, number> = {};
  private avgDocLength = 0;
  private df: Record<string, number> = {};
  private idf: Record<string, number> = {};
  private k1 = 1.5;
  private b = 0.75;

  constructor(cards: KnowledgeCard[]) {
    this.cards = cards;
    this.buildIndex();
  }

  private buildIndex() {
    const numDocs = this.cards.length;
    if (numDocs === 0) return;

    let totalLength = 0;

    this.cards.forEach(card => {
      const tokens = tokenizePersian(card.content + ' ' + card.title + ' ' + (card.keywords || []).join(' '));
      this.docLengths[card.id] = tokens.length;
      totalLength += tokens.length;

      const uniqueTokens = new Set(tokens);
      uniqueTokens.forEach(token => {
        this.df[token] = (this.df[token] || 0) + 1;
      });
    });

    this.avgDocLength = totalLength / numDocs;

    Object.keys(this.df).forEach(token => {
      const docFreq = this.df[token];
      this.idf[token] = Math.log(1 + (numDocs - docFreq + 0.5) / (docFreq + 0.5));
    });
  }

  search(query: string): BM25Result[] {
    const queryTokens = tokenizePersian(query);
    if (queryTokens.length === 0 || this.cards.length === 0) {
      return [];
    }

    const results: BM25Result[] = [];

    this.cards.forEach(card => {
      let score = 0;
      const cardContent = card.content + ' ' + card.title + ' ' + (card.keywords || []).join(' ');
      const cardTokens = tokenizePersian(cardContent);
      const docLen = this.docLengths[card.id] || 1;

      const termFreqs: Record<string, number> = {};
      cardTokens.forEach(token => {
        termFreqs[token] = (termFreqs[token] || 0) + 1;
      });

      queryTokens.forEach(token => {
        const idfVal = this.idf[token] || 0;
        let tf = termFreqs[token] || 0;

        if (tf === 0) {
          Object.keys(termFreqs).forEach(cToken => {
            const sim = computeTrigramSimilarity(token, cToken);
            if (sim > 0.6) {
              tf += termFreqs[cToken] * sim;
            }
          });
        }

        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / (this.avgDocLength || 1)));
        score += idfVal * (numerator / (denominator || 1));
      });

      results.push({
        card,
        score,
        matchType: 'local'
      });
    });

    return results.sort((a, b) => b.score - a.score);
  }
}

export interface HybridCandidate {
  card: KnowledgeCard;
  bm25Score: number;
  semanticScore: number;
  reRankedScore: number;
  confidenceScore: number;
}

export interface CitationReference {
  cardId: string;
  title: string;
  category: string;
  relevanceScore: number;
  snippet: string;
  citedInAnswer: boolean;
}

export function computeSemanticScore(query: string, card: KnowledgeCard): number {
  const normQuery = normalizePersian(query);
  const normTitle = normalizePersian(card.title);
  const normContent = normalizePersian(card.content);
  const normKeywords = (card.keywords || []).map(normalizePersian).join(' ');

  const queryTokens = tokenizePersian(query);
  if (queryTokens.length === 0) return 0;

  let score = 0;

  if (normTitle.includes(normQuery)) score += 3.0;
  if (normContent.includes(normQuery)) score += 1.5;

  const cardTokens = new Set(tokenizePersian(`${card.title} ${card.content} ${normKeywords}`));
  let matchCount = 0;
  queryTokens.forEach(t => {
    if (cardTokens.has(t)) matchCount++;
  });
  const jaccard = matchCount / Math.max(1, queryTokens.length);
  score += jaccard * 4.0;

  const titleSim = computeTrigramSimilarity(query, card.title);
  score += titleSim * 2.5;

  return score;
}

export function deduplicateCards(candidates: HybridCandidate[]): HybridCandidate[] {
  const seenIds = new Set<string>();
  const unique: HybridCandidate[] = [];

  for (const item of candidates) {
    if (seenIds.has(item.card.id)) continue;

    const isDuplicate = unique.some(existing => {
      const sim = computeTrigramSimilarity(item.card.content, existing.card.content);
      return sim > 0.85;
    });

    if (!isDuplicate) {
      seenIds.add(item.card.id);
      unique.push(item);
    }
  }

  return unique;
}

export function compressContext(cards: KnowledgeCard[], maxChars: number = 1400) {
  if (cards.length === 0) {
    return { compressedText: '', originalLength: 0, compressedLength: 0 };
  }

  const rawBlocks = cards.map((card, idx) => {
    const cleanContent = card.content
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return `[منبع دانش ${idx + 1}: ${card.title} | دسته‌بندی: ${card.category}]\n${cleanContent}`;
  });

  const fullRawText = rawBlocks.join('\n\n---\n\n');
  const originalLength = fullRawText.length;

  if (originalLength <= maxChars) {
    return {
      compressedText: fullRawText,
      originalLength,
      compressedLength: originalLength
    };
  }

  let truncated = fullRawText.slice(0, maxChars);
  const lastPeriod = Math.max(truncated.lastIndexOf('.'), truncated.lastIndexOf('\n'), truncated.lastIndexOf('؛'));
  if (lastPeriod > maxChars * 0.7) {
    truncated = truncated.slice(0, lastPeriod + 1);
  }

  return {
    compressedText: truncated,
    originalLength,
    compressedLength: truncated.length
  };
}

export class DynamicContextBuilder {
  static buildContext(candidates: RetrievalCandidate[], maxChars: number = 2200) {
    if (candidates.length === 0) {
      return { formattedContext: '', totalChars: 0, sourceBreakdownText: 'هیچ منبعی یافت نشد' };
    }

    const blocks: string[] = [];
    const sourceCounts: Record<string, number> = {};

    candidates.forEach((cand, idx) => {
      sourceCounts[cand.sourceTitlePersian] = (sourceCounts[cand.sourceTitlePersian] || 0) + 1;
      blocks.push(`[منبع ${idx + 1}: ${cand.title} (${cand.sourceTitlePersian})]\n${cand.content}`);
    });

    const fullText = blocks.join('\n\n---\n\n');
    let truncated = fullText;

    if (fullText.length > maxChars) {
      truncated = fullText.slice(0, maxChars) + '...';
    }

    const breakdownText = Object.entries(sourceCounts)
      .map(([source, count]) => `${source}: ${count} مورد`)
      .join(' | ');

    return {
      formattedContext: truncated,
      totalChars: truncated.length,
      sourceBreakdownText: breakdownText
    };
  }
}

// ============================================================================
// 10. CONVERSATION MEMORY ENGINE & TOKEN COMPRESSOR
// ============================================================================

export interface CompressedMemoryResult {
  summary: string;
  compressedTurns: string;
  extractedTopics: string[];
  previouslyGivenSolutions: string[];
  formattedMemoryPrompt: string;
  stats: {
    totalOriginalTurns: number;
    retainedTurnsCount: number;
    rawCharacterLength: number;
    compressedCharacterLength: number;
    savedTokenPercent: number;
    noiseRemovedCount: number;
  };
}

export interface ProcessedMemory {
  summary: string;
  topicsExtracted: string[];
  intentHistory: string[];
  longTermPreferences: string[];
  activeContextTurns: string;
  formattedMemoryPrompt: string;
  stats: {
    totalOriginalTurns: number;
    retainedTurnsCount: number;
    noiseTokensFiltered: number;
    compressedCharLength: number;
  };
}

export class ConversationMemoryEngine {
  static cleanMessageNoise(text: string): string {
    if (!text) return '';
    let cleaned = text.trim();

    cleaned = cleaned.replace(/^(سلام|سلام علیک|درود|ممنون|مرسی|دستت درد نکنه|خدا قوت|سلام عزیزم)[!.,\s]*/gi, '');
    cleaned = cleaned.replace(/(ممنون|مرسی|خیلی عالی بود|مفید بود)[!.,\s]*$/gi, '');

    return cleaned.trim();
  }

  /**
   * Compresses and summarizes chat message history prior to sending to the AI model.
   * Reduces token consumption, optimizes AI memory buffer, and eliminates repetitive responses.
   */
  static compressAndSummarizeHistory(
    messages: { role: string; content: string }[],
    options: { maxRecentTurns?: number; maxCharsPerMsg?: number } = {}
  ): CompressedMemoryResult {
    const maxRecentTurns = options.maxRecentTurns || 10;
    const maxCharsPerMsg = options.maxCharsPerMsg || 250;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        summary: 'هیچ سابقه گفتگویی یافت نشد.',
        compressedTurns: '',
        extractedTopics: [],
        previouslyGivenSolutions: [],
        formattedMemoryPrompt: '',
        stats: {
          totalOriginalTurns: 0,
          retainedTurnsCount: 0,
          rawCharacterLength: 0,
          compressedCharacterLength: 0,
          savedTokenPercent: 0,
          noiseRemovedCount: 0
        }
      };
    }

    // Sliding Window History Constraint: Bound payload size to last 12 messages maximum
    const windowedMessages = messages.length > 12 ? messages.slice(-12) : messages;

    // 1. Calculate raw total characters
    const rawCharacterLength = windowedMessages.reduce((acc, m) => acc + (m.content ? m.content.length : 0), 0);

    // 2. Filter noise, empty entries, and exact duplicates
    let noiseRemovedCount = 0;
    const cleanMessages: { role: string; content: string }[] = [];
    const seenContent = new Set<string>();

    for (const msg of windowedMessages) {
      if (!msg || !msg.content) continue;
      const cleanText = this.cleanMessageNoise(msg.content);
      if (!cleanText) {
        noiseRemovedCount++;
        continue;
      }
      const normKey = normalizePersian(cleanText).toLowerCase();
      if (seenContent.has(normKey)) {
        noiseRemovedCount++;
        continue;
      }
      seenContent.add(normKey);
      cleanMessages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: cleanText
      });
    }

    if (cleanMessages.length === 0) {
      return {
        summary: 'پیام‌ها حاوی نویز یا تکراری بودند و فیلتر شدند.',
        compressedTurns: '',
        extractedTopics: [],
        previouslyGivenSolutions: [],
        formattedMemoryPrompt: '',
        stats: {
          totalOriginalTurns: windowedMessages.length,
          retainedTurnsCount: 0,
          rawCharacterLength,
          compressedCharacterLength: 0,
          savedTokenPercent: 100,
          noiseRemovedCount
        }
      };
    }

    // 3. Separate into older history (summarized) and recent active turns
    let olderMessages: { role: string; content: string }[] = [];
    let recentMessages: { role: string; content: string }[] = [];

    if (cleanMessages.length > maxRecentTurns) {
      olderMessages = cleanMessages.slice(0, cleanMessages.length - maxRecentTurns);
      recentMessages = cleanMessages.slice(-maxRecentTurns);
    } else {
      recentMessages = cleanMessages;
    }

    // 4. Summarize older turns & extract key topics & solutions
    const extractedTopics: string[] = [];
    const previouslyGivenSolutions: string[] = [];
    const summaryLines: string[] = [];

    for (const msg of olderMessages) {
      if (msg.role === 'user') {
        const keywords = tokenizePersian(msg.content).slice(0, 5);
        keywords.forEach(k => {
          if (k.length > 3 && !extractedTopics.includes(k)) {
            extractedTopics.push(k);
          }
        });
        const trimmed = msg.content.length > 80 ? msg.content.substring(0, 80) + '...' : msg.content;
        summaryLines.push(`• پرسش قبلی کاربر: "${trimmed}"`);
      } else {
        const firstLine = msg.content.split('\n').map(s => s.trim()).filter(Boolean)[0] || '';
        if (firstLine) {
          const shortSolution = firstLine.length > 90 ? firstLine.substring(0, 90) + '...' : firstLine;
          if (!previouslyGivenSolutions.includes(shortSolution)) {
            previouslyGivenSolutions.push(shortSolution);
          }
        }
      }
    }

    // Collect assistant solutions from recent messages for anti-repetition memory buffer
    for (const msg of recentMessages) {
      if (msg.role === 'assistant') {
        const lines = msg.content.split('\n').map(s => s.trim()).filter(Boolean);
        const headline = lines[0] || '';
        if (headline && !previouslyGivenSolutions.includes(headline)) {
          previouslyGivenSolutions.push(headline.length > 100 ? headline.substring(0, 100) + '...' : headline);
        }
      }
    }

    const olderSummaryText = summaryLines.length > 0
      ? `📌 **خلاصه فشرده نشست‌های قبلی گفتگو:**\n${summaryLines.join('\n')}`
      : '';

    // 5. Compress recent turns (smart truncation + clean formatting)
    const formattedRecentTurns = recentMessages.map(m => {
      const roleLabel = m.role === 'user' ? 'کاربر' : 'مربی کاریزما';
      let text = m.content;
      if (text.length > maxCharsPerMsg) {
        text = text.substring(0, Math.floor(maxCharsPerMsg * 0.7)) + ' ... [ادامه فشرده شد] ... ' + text.substring(text.length - 40);
      }
      return `${roleLabel}: ${text}`;
    }).join('\n');

    // 6. Construct Anti-Repetition Prompt Block
    let antiRepetitionBlock = '';
    if (previouslyGivenSolutions.length > 0) {
      antiRepetitionBlock = `⚠️ **حافظه هوش مصنوعی جهت عدم تکرار (Anti-Repetition Buffer):**
پاسخ‌ها و نکات زیر قبلاً به کاربر داده شده است:
${previouslyGivenSolutions.slice(-4).map(s => `- ${s}`).join('\n')}
⛔ **دستورالعمل حیاتی:** از تکرار مجدد تمام یا بخشی از جملات، مثال‌ها و ساختارهای فوق خودداری کن. پاسخی کاملاً تازه، مکمل و نوین ارائه ده.`;
    }

    // 7. Combine formattedMemoryPrompt
    const memoryPromptParts: string[] = [];
    if (olderSummaryText) memoryPromptParts.push(olderSummaryText);
    if (formattedRecentTurns) memoryPromptParts.push(`💬 **تاریخچه پیام‌های اخیر (حافظه فعال فشرده شده):**\n${formattedRecentTurns}`);
    if (antiRepetitionBlock) memoryPromptParts.push(antiRepetitionBlock);

    const formattedMemoryPrompt = memoryPromptParts.join('\n\n');
    const compressedCharacterLength = formattedMemoryPrompt.length;
    const savedTokenPercent = rawCharacterLength > 0
      ? Math.max(0, Math.round((1 - compressedCharacterLength / rawCharacterLength) * 100))
      : 0;

    const overallSummary = `حافظه گفتگو با موفقیت فشرده گردید (${cleanMessages.length} پیام پردازش شد، ${savedTokenPercent}% صرفه‌جویی توکن).`;

    return {
      summary: overallSummary,
      compressedTurns: formattedRecentTurns,
      extractedTopics,
      previouslyGivenSolutions,
      formattedMemoryPrompt,
      stats: {
        totalOriginalTurns: windowedMessages.length,
        retainedTurnsCount: recentMessages.length,
        rawCharacterLength,
        compressedCharacterLength,
        savedTokenPercent,
        noiseRemovedCount
      }
    };
  }

  static async processMemory(
    userId: string, 
    currentQuestion: string, 
    conversationId?: string | null,
    clientHistory?: { role: string; content: string }[]
  ): Promise<ProcessedMemory> {
    const conversations = await DBEngine.readTable<Conversation>('conversations');
    
    // Strict Session Isolation: query strictly by session conversationId
    let activeConv: Conversation | undefined;
    if (conversationId) {
      activeConv = conversations.find(c => c.id === conversationId && c.userId === userId);
    }

    let messages: { role: string; content: string }[] = activeConv?.messages || [];

    // If client provided a memory buffer history from the active UI session, prioritize/combine it
    if (clientHistory && Array.isArray(clientHistory) && clientHistory.length > 0) {
      if (messages.length === 0) {
        messages = clientHistory;
      } else {
        // Deduplicate messages by content
        const existingTexts = new Set(messages.map(m => m.content.trim()));
        const newFromClient = clientHistory.filter(m => m.content && !existingTexts.has(m.content.trim()));
        messages = [...messages, ...newFromClient];
      }
    }

    // Apply strict sliding window (last 12 messages maximum)
    const windowedMessages = messages.slice(-12);

    const compressedResult = this.compressAndSummarizeHistory(windowedMessages, {
      maxRecentTurns: 10,
      maxCharsPerMsg: 250
    });

    return {
      summary: compressedResult.summary,
      topicsExtracted: compressedResult.extractedTopics.length > 0 ? compressedResult.extractedTopics : ['هوش کلامی', 'ارتباط کاریزماتیک'],
      intentHistory: ['مشاوره مکالمه'],
      longTermPreferences: ['پاسخ صریح و کاربردی بدون تکرار'],
      activeContextTurns: compressedResult.compressedTurns,
      formattedMemoryPrompt: compressedResult.formattedMemoryPrompt,
      stats: {
        totalOriginalTurns: windowedMessages.length,
        retainedTurnsCount: compressedResult.stats.retainedTurnsCount,
        noiseTokensFiltered: compressedResult.stats.noiseRemovedCount,
        compressedCharLength: compressedResult.stats.compressedCharacterLength
      }
    };
  }
}

// ============================================================================
// 11. ANTI-REPETITION & SELF-EVALUATION ENGINE
// ============================================================================

export class AntiRepetitionEngine {
  static async getLastAssistantResponses(userId: string, limit: number = 5, conversationId?: string | null): Promise<string[]> {
    const conversations = await DBEngine.readTable<Conversation>('conversations');
    let targetConvs: Conversation[] = [];

    if (conversationId) {
      const match = conversations.find(c => c.id === conversationId && c.userId === userId);
      if (match) targetConvs = [match];
    }

    if (targetConvs.length === 0) {
      targetConvs = conversations.filter(c => c.userId === userId);
    }

    if (targetConvs.length === 0) return [];

    const assistantMsgs: string[] = [];
    for (let i = targetConvs.length - 1; i >= 0; i--) {
      const conv = targetConvs[i];
      for (let j = conv.messages.length - 1; j >= 0; j--) {
        const msg = conv.messages[j];
        if (msg.role === 'assistant' && msg.content) {
          assistantMsgs.push(msg.content);
          if (assistantMsgs.length >= limit) return assistantMsgs;
        }
      }
    }

    return assistantMsgs;
  }

  static detectCliches(text: string): string[] {
    const cliches = [
      'قانون ۳ ثانیه',
      'مکث طلایی',
      'Agree & Pivot',
      'به عنوان یک هوش مصنوعی',
      'من یک مدل زبانی هستم'
    ];

    return cliches.filter(c => text.includes(c));
  }
}

export interface ResponseQualityEvaluation {
  fluencyPersianScore: number;
  groundednessRelevanceScore: number;
  uniquenessScore: number;
  hallucinationPenalty: number;
  depthPracticalityScore: number;
  overallQualityScore: number;
  confidenceScore: number;
  isQualityAcceptable: boolean;
  clichesDetected: string[];
  rejectionReason?: string;
}

export class SelfEvaluationEngine {
  static evaluate(
    answer: string,
    question: string,
    previousResponses: string[],
    isGrounded: boolean,
    candidates: RetrievalCandidate[]
  ): ResponseQualityEvaluation {
    const normAns = normalizePersian(answer);
    const normQ = normalizePersian(question);

    let fluencyPersianScore = 90;
    if (answer.length < 80) fluencyPersianScore -= 30;

    let groundednessRelevanceScore = 85;
    const queryTokens = tokenizePersian(question);
    let matchCount = 0;
    queryTokens.forEach(t => {
      if (normAns.includes(t)) matchCount++;
    });
    const overlapRatio = matchCount / Math.max(1, queryTokens.length);
    groundednessRelevanceScore += overlapRatio * 15;

    let uniquenessScore = 100;
    previousResponses.forEach(prev => {
      const sim = computeTrigramSimilarity(answer, prev);
      if (sim > 0.6) uniquenessScore -= 30;
    });

    const clichesDetected = AntiRepetitionEngine.detectCliches(answer);
    let hallucinationPenalty = clichesDetected.length * 20;

    // Check completeness of 5 tones
    const hasAlpha = /🔥|مقتدر|آلفا|لحن ۱/i.test(answer);
    const hasFriendly = /😊|صمیمی|دوستانه|لحن ۲/i.test(answer);
    const hasCharismatic = /😎|باکلاس|کاریزماتیک|لحن ۳/i.test(answer);
    const hasEmotional = /❤️|احساسی|عاطفی|لحن ۴/i.test(answer);
    const hasHumorous = /😂|شوخ|کل‌کل|لحن ۵/i.test(answer);

    const tonesCount = [hasAlpha, hasFriendly, hasCharismatic, hasEmotional, hasHumorous].filter(Boolean).length;
    let depthPracticalityScore = 70 + (tonesCount * 6);

    // Severe penalty if output is truncated or missing multiple tones
    const isTruncated = PostProcessor.isResponseIncomplete(answer);
    if (isTruncated || tonesCount < 4) {
      depthPracticalityScore = Math.min(depthPracticalityScore, 40);
      fluencyPersianScore = Math.min(fluencyPersianScore, 40);
    }

    const overallQualityScore = Math.round(
      (fluencyPersianScore * 0.2) +
      (groundednessRelevanceScore * 0.25) +
      (uniquenessScore * 0.25) +
      (depthPracticalityScore * 0.3) -
      hallucinationPenalty
    );

    const confidenceScore = Math.min(100, Math.max(50, overallQualityScore));
    const isQualityAcceptable = overallQualityScore >= 65 && !isTruncated && tonesCount >= 4;

    return {
      fluencyPersianScore: Math.min(100, fluencyPersianScore),
      groundednessRelevanceScore: Math.min(100, groundednessRelevanceScore),
      uniquenessScore,
      hallucinationPenalty,
      depthPracticalityScore: Math.min(100, depthPracticalityScore),
      overallQualityScore,
      confidenceScore,
      isQualityAcceptable,
      clichesDetected,
      rejectionReason: !isQualityAcceptable ? (isTruncated ? 'پاسخ ناقص یا قطع‌شده است' : tonesCount < 4 ? 'تعداد لحن‌ها کمتر از حد مجاز است' : 'کیفیت پاسخ نیاز به بهبود دارد') : undefined
    };
  }
}

// ============================================================================
// 12. POST PROCESSOR (GUARANTEES 5-STYLE RESPONSE STRUCTURE)
// ============================================================================

export class PostProcessor {
  static cleanEnglishReasoningAndArtifacts(text: string): string {
    if (!text) return '';

    let cleaned = text;

    // 1. Remove reasoning / thought blocks (<think>...</think>, ```thought...```, etc.)
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
    cleaned = cleaned.replace(/```(?:thought|thinking|reasoning)?[\s\S]*?```/gi, '');
    cleaned = cleaned.replace(/(?:^|\n)\s*(?:Thinking|Reasoning|Thought Process):[\s\S]*?(?=\n\s*(?:🔥|\*\*|«|لحن|$))/gi, '');

    // 2. Remove English prompt tags like *Concept:*, *Draft:*, Idea:, Strategy:, Notes:
    cleaned = cleaned.replace(/\*+\s*(?:Concept|Draft|Note|Notes|Idea|Strategy|Approach|Goal|Tone|Analysis|Explanation|Option)\s*\*+:?/gi, '');
    cleaned = cleaned.replace(/(?:^|\n)\s*(?:Concept|Draft|Note|Notes|Idea|Strategy|Approach|Goal|Tone|Analysis|Explanation|Option)\s*:\s*[A-Za-z0-9\s,.'"-]+/gi, '');
    
    // 3. Remove lines that are predominantly English meta-commentary
    const lines = cleaned.split('\n');
    const filteredLines = lines.filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return true; // keep line breaks
      // If line is starting with an English keyword or has only English words without Persian characters
      const hasPersian = /[\u0600-\u06FF]/.test(trimmed);
      const isEnglishHeader = /^(?:concept|draft|notes?|idea|strategy|analysis|tone|goal|execution|target)\s*:/i.test(trimmed);
      if (isEnglishHeader) return false;
      if (!hasPersian && /^[a-zA-Z0-9\s*#_.:;,'"-]+$/.test(trimmed)) {
        return false;
      }
      return true;
    });

    cleaned = filteredLines.join('\n');

    return cleaned;
  }

  static isResponseIncomplete(text: string): boolean {
    if (!text || text.trim().length < 80) return true;
    const trimmed = text.trim();

    // Check tone markers count
    const toneMatches = (trimmed.match(/🔥|😊|😎|❤️|😂|لحن ۱|لحن ۲|لحن ۳|لحن ۴|لحن ۵/g) || []).length;
    if (toneMatches < 3) return true;

    // Check if the last line ends abruptly in the middle of an unclosed quote or word
    const quotesOpen = (trimmed.match(/«/g) || []).length;
    const quotesClose = (trimmed.match(/»/g) || []).length;
    if (quotesOpen > quotesClose && toneMatches < 5) return true;

    // If it ends with half-sentences or hanging prepositions
    if (/[؛،\-:]\s*$/.test(trimmed) || /(?:از|به|با|در|که|چون|ولی|اما|یه|یک)\s*$/.test(trimmed)) {
      return true;
    }

    return false;
  }

  static process(
    rawAnswer: string,
    analysis?: ComprehensiveQueryAnalysis,
    originalQuery: string = '',
    matchedCards?: KnowledgeCard[],
    candidates?: RetrievalCandidate[],
    previousResponses?: string[]
  ): string {
    if (!rawAnswer) return generateIntelligentKarizmaFallback(originalQuery, matchedCards, analysis, candidates, previousResponses);
    
    // Clean English thoughts, markdown artifacts and reasoning first
    let processed = this.cleanEnglishReasoningAndArtifacts(rawAnswer).trim();
    
    // 1. Remove any conversational preamble before the first category marker
    const firstMarkerIndex = processed.search(/🔥|\*\*پاسخ|\*\*لحن|لحن ۱|«/);
    if (firstMarkerIndex > 0) {
      processed = processed.slice(firstMarkerIndex).trim();
    }
    
    let lines = processed.split('\n');
    
    // 2. Clean up forbidden phrases on a line-by-line basis to keep them perfectly direct
    const forbiddenPhrases = [
      /برای این موقعیت[،\s]*/g,
      /در این حالت[،\s]*/g,
      /اگر منظورت(ون)?[،\s]*/g,
      /اگه منظورت(ون)?[،\s]*/g,
      /برای چنین شرایطی[،\s]*/g,
      /در چنین شرایطی[،\s]*/g,
      /برای این شرایط[،\s]*/g,
      /در این شرایط[،\s]*/g,
      /بهترین واکنش این است که[،\s]*/g,
      /بهترین واکنش اینه که[،\s]*/g,
      /بهترین واکنش اینه[،\s]*/g,
      /بهترین واکنش این است[،\s]*/g,
      /بهترین کار اینه که[،\s]*/g,
      /بهترین کار این است که[،\s]*/g,
      /بهترین واکنش برای این موقعیت[،\s]*/g,
      /بهترین واکنش برای[^:]+:/g,
      /با توجه به اینکه[،\s]*/g,
      /با توجه به[،\s]*/g,
      /بر اساس مد مربی‌گری[،\s]*/g,
      /طبق سناریوی[^،\s]*[،\s]*/g,
      /طبق سناریو[،\s]*/g,
      /بر اساس فرآیند[^،\s]*[،\s]*/g,
      /با توجه به تحلیل[^،\s]*[،\s]*/g,
      /با توجه به سناریو[^،\s]*[،\s]*/g,
      /به عنوان مربی[^،\s]*[،\s]*/g,
      /به عنوان یک مربی[^،\s]*[،\s]*/g,
      /دقیقاً درباره "[^"]+" بهترین واکنش اینه که/g,
      /دقیقاً درباره '[^']+' بهترین واکنش اینه که/g,
      /دقیقاً درباره [^\s]+ بهترین واکنش اینه که/g,
      /در این بخش[^:]+:/g
    ];

    lines = lines.map(line => {
      let cleaned = line;
      
      forbiddenPhrases.forEach(regex => {
        cleaned = cleaned.replace(regex, '');
      });

      cleaned = cleaned.replace(/coaching mode|coaching_mode|rag engine|rag_engine|پرامپت/gi, '');
      // Strip any unwanted CJK/Chinese characters if model hallucinates them
      cleaned = cleaned.replace(/[\u4e00-\u9fa5]/g, '');
      cleaned = cleaned.replace(/«\s*/g, '«').replace(/\s*»/g, '»');
      
      return cleaned;
    });

    processed = lines.join('\n').trim();

    // 3. Guarantee all 5 Distinct Tones are present in the response
    const hasAlpha = /🔥|مقتدر|آلفا|لحن ۱|لحن اول/i.test(processed);
    const hasFriendly = /😊|صمیمی|دوستانه|لحن ۲|لحن دوم/i.test(processed);
    const hasCharismatic = /😎|باکلاس|کاریزماتیک|لحن ۳|لحن سوم/i.test(processed);
    const hasEmotional = /❤️|احساسی|عاطفی|لحن ۴|لحن چهارم/i.test(processed);
    const hasHumorous = /😂|شوخ|کل‌کل|کل کل|لحن ۵|لحن پنجم/i.test(processed);

    const tonesFound = [hasAlpha, hasFriendly, hasCharismatic, hasEmotional, hasHumorous].filter(Boolean).length;

    if (tonesFound < 3 || this.isResponseIncomplete(processed)) {
      // If the LLM returned incomplete/truncated text without all tones, fallback to high-quality dynamic engine
      return generateIntelligentKarizmaFallback(originalQuery || rawAnswer, matchedCards, analysis, candidates, previousResponses);
    }

    return processed;
  }
}

// Fallback generator when LLM API is unavailable or rate limited - Dynamic Topic-Aware Iranian Charisma Engine
export function generateIntelligentKarizmaFallback(
  question: string,
  matchedCards?: KnowledgeCard[],
  queryAnalysis?: ComprehensiveQueryAnalysis,
  candidates?: RetrievalCandidate[],
  previousResponses?: string[]
): string {
  const normQ = normalizePersian(question || '');
  const cleanQ = (question || '').trim();
  
  // 1. Check if we have a direct Scenario match in the retrieved candidates
  if (candidates && candidates.length > 0) {
    const scenarioCandidate = candidates.find(c => c.sourceType === 'Scenario' && c.rawItem && (c.rawItem.responses || c.rawItem.answers));
    if (scenarioCandidate && scenarioCandidate.rawItem) {
      const item = scenarioCandidate.rawItem;
      let alpha = item.responses?.charismatic;
      let friendly = item.responses?.confident;
      let charismatic = item.responses?.mature || item.responses?.charismatic;
      let emotional = item.responses?.mysterious;
      let witty = item.responses?.funny;
      
      if (!alpha && item.answers && Array.isArray(item.answers)) {
        alpha = item.answers.find((a: any) => a.style?.includes('مقتدر') || a.style?.includes('آلفا') || a.style?.includes('قاطع'))?.text;
        friendly = item.answers.find((a: any) => a.style?.includes('صمیمی') || a.style?.includes('دوستانه'))?.text;
        charismatic = item.answers.find((a: any) => a.style?.includes('کاریزماتیک') || a.style?.includes('شیک') || a.style?.includes('سنگین'))?.text;
        emotional = item.answers.find((a: any) => a.style?.includes('عاطفی') || a.style?.includes('احساسی'))?.text;
        witty = item.answers.find((a: any) => a.style?.includes('شوخ') || a.style?.includes('کل‌کل') || a.style?.includes('طنز'))?.text;
      }

      if (alpha && witty) {
        const technique = item.technique || item.analysis?.reason || 'حفظ جذابیت و ارزش کلامی بدون وابستگی به تایید';
        const bodyLang = item.bodyLanguage || item.analysis?.bodyLanguage || 'لحن آرام، بدون عجله، قامت گشوده و نگاه مطمئن';
        const coachNote = item.teachingNote || `تحلیل سناریو: ${item.goal || item.analysis?.bestAnswer || 'کنترل چارچوب مکالمه با پرستیژ بالا'}`;

        const isRepetitive = previousResponses?.some(prev => prev.includes(alpha.slice(0, 20)));
        if (!isRepetitive) {
          return `🔥 **لحن ۱: مقتدر و آلفا:**
«${alpha.replace(/^[«"]/, '').replace(/[»"]$/, '')}»
📌 نکته اجرا: ${bodyLang}

😊 **لحن ۲: صمیمی و دوستانه:**
«${(friendly || alpha).replace(/^[«"]/, '').replace(/[»"]$/, '')}»
📌 نکته اجرا: لبخند راحت، صدای گرم و صمیمی، ایجاد حس امنیت و رفاقت.

😎 **لحن ۳: باکلاس و کاریزماتیک:**
«${(charismatic || alpha).replace(/^[«"]/, '').replace(/[»"]$/, '')}»
📌 نکته اجرا: آرامش کلامی، مکث طلایی سنجیده، نگاه عمیق و زبان بدن مسلط.

❤️ **لحن ۴: احساسی و عاطفی:**
«${(emotional || friendly || alpha).replace(/^[«"]/, '').replace(/[»"]$/, '')}»
📌 نکته اجرا: لحن پراحساس و نرم، توجه کامل به احساس مخاطب و ایجاد حس درک متقابل.

😂 **لحن ۵: شوخ‌طبع و کل‌کل + تحلیل مربی:**
«${witty.replace(/^[«"]/, '').replace(/[»"]$/, '')}»
📌 نکته اجرا: پوزخند خونسرد، لحن بازیگوشانه و حفظ اقتدار.
🧠 تحلیل مربی: ${technique} | ${coachNote}`;
        }
      }
    }
  }

  // 2. Search PRESEEDED_SCENARIOS directly for contextual fit
  if (PRESEEDED_SCENARIOS && PRESEEDED_SCENARIOS.length > 0) {
    const matchedScenario = PRESEEDED_SCENARIOS.find(s => {
      const sNorm = normalizePersian(s.title + ' ' + s.context + ' ' + s.category);
      const qWords = normQ.split(/\s+/).filter(w => w.length > 2);
      const matches = qWords.filter(w => sNorm.includes(w)).length;
      return matches >= 2 || sNorm.includes(normQ.slice(0, 15));
    });

    if (matchedScenario && matchedScenario.answers) {
      const alpha = matchedScenario.answers[0]?.text || '';
      const witty = matchedScenario.answers.find(a => a.style.includes('شوخ') || a.style.includes('کل‌کل'))?.text || matchedScenario.answers[1]?.text || '';
      const friendly = matchedScenario.answers.find(a => a.style.includes('صمیمی') || a.style.includes('دوستانه'))?.text || matchedScenario.answers[2]?.text || '';
      const charismatic = matchedScenario.answers.find(a => a.style.includes('کاریزماتیک') || a.style.includes('متین'))?.text || matchedScenario.answers[3]?.text || '';
      const emotional = matchedScenario.answers.find(a => a.style.includes('عاطفی') || a.style.includes('احساسی'))?.text || matchedScenario.answers[4]?.text || '';

      const isRepetitive = previousResponses?.some(prev => prev.includes(alpha.slice(0, 20)));
      if (!isRepetitive && alpha && witty) {
        return `🔥 **لحن ۱: مقتدر و آلفا:**
«${alpha.replace(/^[«"]/, '').replace(/[»"]$/, '')}»
📌 نکته اجرا: ${matchedScenario.analysis?.bodyLanguage || 'لحن آرام، سر بالا، مکث سنجیده'}

😊 **لحن ۲: صمیمی و دوستانه:**
«${(friendly || alpha).replace(/^[«"]/, '').replace(/[»"]$/, '')}»
📌 نکته اجرا: لبخند راحت، صدای گرم و صمیمی، ایجاد حس امنیت و رفاقت.

😎 **لحن ۳: باکلاس و کاریزماتیک:**
«${(charismatic || alpha).replace(/^[«"]/, '').replace(/[»"]$/, '')}»
📌 نکته اجرا: آرامش کلامی، مکث طلایی سنجیده، نگاه عمیق و زبان بدن مسلط.

❤️ **لحن ۴: احساسی و عاطفی:**
«${(emotional || friendly || alpha).replace(/^[«"]/, '').replace(/[»"]$/, '')}»
📌 نکته اجرا: لحن پراحساس و نرم، توجه کامل به احساس مخاطب و ایجاد حس درک متقابل.

😂 **لحن ۵: شوخ‌طبع و کل‌کل + تحلیل مربی:**
«${witty.replace(/^[«"]/, '').replace(/[»"]$/, '')}»
📌 نکته اجرا: پوزخند خونسرد، لحن بازیگوشانه و حفظ اقتدار.
🧠 تحلیل مربی: ${matchedScenario.analysis?.reason || 'روانشناسی موقعیت'} | پیشنهاد بعدی: ${matchedScenario.analysis?.nextStep || 'مکث و ارزیابی پاسخ مخاطب'}`;
      }
    }
  }

  // 3. Dynamic Multi-Variation Persian Relational Synthesis Matrix (30+ Real-Life Situations)
  const isLateReply = /دیر|سین|جواب نداده|سین کرده|بی محلی|سرد شده|پیام نمیده|انلاین بود|آنلاین بود|چند ساعت|چند روز/i.test(normQ);
  const isStoryOrInsta = /استوری|دایرکت|اینستا|عکس|پست|استوریش|استوریم|ریپلای/i.test(normQ);
  const isCompliment = /خوشگل|جذاب|خوشتیپ|چقدر نازی|دوستت دارم|کراش|خوشم اومده|چشمات|صدات|قشنگی/i.test(normQ);
  const isBanterOrTease = /تیکه|مسخره|کل کل|شوخی|پرو|زبون دراز|چند سالته|قدت|قیافت|زرنگی/i.test(normQ);
  const isFriendzone = /دوست معمولی|فرندزون|مثل داداشمی|مثل خواهرمی|کات|رابطه نمیخوام|حس ندارم/i.test(normQ);
  const isDateOrCafe = /قرار|کافه|دیدار|بریم بیرون|قهوه|ملاقات|ببینمت|ناهار|شام|رستوران/i.test(normQ);
  const isGymOrStreet = /باشگاه|خیابون|پاساژ|سر صحبت|مترو|پارک|دانشگاه|کلاس/i.test(normQ);
  const isConflict = /دعوا|دلخوری|قهر|ناراحت|عصبانی|بحث|چرا اینجوری|توقع/i.test(normQ);
  const isExReturn = /اکس|برگشته|بعد چند وقت|پیام داده بعد|سراغم اومده|پیام داد بعد از/i.test(normQ);
  const isColdReply = /اوکی|باشه|خوبه|اها|اهان|مرسی خالی|تک کلمه|سرد جواب/i.test(normQ);
  const isWorkplace = /حقوق|رئیس|همکار|مدیر|مذاکره|اضافه کاری|کارفرما|قرارداد/i.test(normQ);
  const isSayingNo = /نه گفتن|تعارف|روم نمیشه|درخواست بیجا|قرض|پول خواستن|کمک خواستن/i.test(normQ);
  const isMorningNight = /صبح بخیر|شب بخیر|خوابیدی|بیدارشدی|صبح بخیر جذاب/i.test(normQ);

  // Dynamic seed with time variance to prevent duplicate consecutive fallbacks
  const seed = Math.abs(cleanQ.split('').reduce((acc, char, i) => acc + (char.charCodeAt(0) * (i + 1)), 0) + Math.floor(Date.now() / 15000));

  let alphaOptions: string[];
  let friendlyOptions: string[];
  let charismaticOptions: string[];
  let emotionalOptions: string[];
  let wittyOptions: string[];
  let coachBreakdown: string;

  if (isLateReply) {
    alphaOptions = [
      `«سرم شلوغ بود، ولی چت باکیفیت رو به چت عجله‌ای ترجیح میدم؛ خب می‌شنوم.»`,
      `«خوبه که هر دو برای زمانمون ارزش قائلیم. ادامه‌ش رو بگو.»`,
      `«وقتی پیام میدی که واقعاً فرصتش رو داری، مکالمه خیلی خوش‌ریتم‌تر پیش میره.»`,
      `«سرم درگیر پروژه‌هام بود؛ الان با تمرکز روی خطم.»`,
      `«کیفیت حضور مهمه نه سرعت تایپ؛ خب داشتی می‌گفتی.»`
    ];
    friendlyOptions = [
      `«سلام و ارادت! حسابی درگیر کار و روزمرگی بودم، امیدوارم روزت عالی گذشته باشه.»`,
      `«سلااام! ببخشید یه مقدار سرم شلوغ شد، داشتم یه کار مهم رو جمع می‌کردم. چطوری؟»`,
      `«سلام عزیزم! روز پرکار و شلوغی بود ولی الان با انرژی اومدم. چه خبرا؟»`,
      `«سلام! امیدوارم کلی اتفاق خوب برات افتاده باشه امروز. چطور میگذره؟»`
    ];
    charismaticOptions = [
      `«آدم‌های باارزش معمولاً دیر به دیر ولی اثرگذار میان روی خط... سلام و وقتت بخیر.»`,
      `«گاهی فاصله انداختن باعث میشه ادامه حرف جذاب‌تر و شنیدنی‌تر بشه؛ چطوری؟»`,
      `«مکالمه‌ای که با آرامش و سر فرصت پیش بره همیشه موندگارتره.»`,
      `«سلیقه و حضورت همیشه توی خاطرم هست؛ خب بگو ببینم امروزت چطور گذشت؟»`
    ];
    emotionalOptions = [
      `«امیدوارم همه چیز برات در کمال آرامش پیش بره؛ دلم می‌خواست با تمرکز و حس خوب باهات حرف بزنم نه هول‌هولکی.»`,
      `«حواسم به پیامت بود، فقط خواستم وقتی بهت بنویسم که تمام فکرم پیش صحبت کردنمون باشه.»`,
      `«برام مهم بود که سر فرصت و با انرژی خوب جوابت رو بدم؛ همیشه از گپ زدن باهات حس آرامش می‌گیرم.»`
    ];
    wittyOptions = [
      `«فکر کردم رفتی تو افق محو شدی! داشتم آماده می‌شدم اعلام مفقودی کنم.»`,
      `«داشتم امتیازهای سرعت عملتو ثبت می‌کردم، متاسفانه برای این راند نمره منفی گرفتی!»`,
      `«رکورد دیر جواب دادن رو شکستی، ولی چون آدم خوش‌صحبتی هستی این بار بخشیدمت!»`,
      `«فکر کنم کبوتر نامه‌برت بین راه توقف داشته! ولی خب اشکال نداره، بگو ببینم چه خبر؟»`
    ];
    coachBreakdown = `وقتی طرف مقابل دیر جواب می‌دهد، هرگز نباید گله یا غر بزنید (ابراز نیاز و ضعف). با آرامش و حفظ پرستیژ نشان دهید که زندگی و برنامه‌های پربار خودتان را دارید و عجله‌ای در کار نیست.`;
  } else if (isStoryOrInsta) {
    alphaOptions = [
      `«سلیقه‌ت تو انتخاب این لوکیشن جالب بود؛ زاویه دید قشنگی داری.»`,
      `«انرژی این عکس نشون میده برنامه‌هات حسابی رو ریتم پیش میره.»`,
      `«انتخاب جسورانه و شیکی بود، تبریک می‌گم.»`,
      `«کادر و نورپردازی این تصویر لول بالایی داشت.»`
    ];
    friendlyOptions = [
      `«چه استوری پرانرژی و باحالی! لوکیشنش کجاست دقیقا؟»`,
      `«خیلی حس و حال خوبی داشت این تصویر، امیدوارم همیشه همینقدر شاد و پرانرژی باشی.»`,
      `«چقدر این فضا قشنگ و دلنشینه! حسابی بهت خوش بگذره.»`,
      `«سلام! این عکس فوق‌العاده حس زندگی داشت، دمت گرم.»`
    ];
    charismaticOptions = [
      `«کمتر کسی پیدا میشه که این زاویه رو انقدر با سلیقه شکار کنه؛ لول بالایی داشت.»`,
      `«یه حس رازآلود و خاص تو این تصویر بود که توجهم رو جلب کرد.»`,
      `«استوری‌هات همیشه یه امضای خاص از سلیقه و سبک خودت رو داره.»`,
      `«ترکیب این موزیک و تصویر واقعاً برازنده بود.»`
    ];
    emotionalOptions = [
      `«این استوری یه حس آرامش عمیق داشت؛ چقدر قشنگ بود حس و حالش.»`,
      `«دیدن این تصویر حس خیلی گرم و مثبتی بهم منتقل کرد، ممنون برای اشتراک این حس ناب.»`,
      `«امیدوارم قلبت همیشه مثل این لحظه پر از ذوق و شادی باشه.»`
    ];
    wittyOptions = [
      `«اعتراف کن این عکس رو فقط گرفتی که سطح جذابیت اینستاگرام رو ببری بالا!»`,
      `«فکر کنم عکاس انقدر محو هنرنمایی شما شده بود که یادش رفته کادر رو تراز کنه!»`,
      `«بین ۱ تا ۱۰ به این استوری ۹ میدم، اون یک نمره هم کسر شد چون لوکیشن دقیق رو نگفتی!»`,
      `«این استوری رسماً صلاحیت داشت که به عنوان پوستر سینمایی اکران بشه!»`
    ];
    coachBreakdown = `در ریپلای استوری، تعریف مستقیم و کلیشه‌ای از چهره اثرگذاری پایینی دارد؛ به جای آن از سلیقه، حس فضا، جزییات یا شوخی معکوس استفاده کنید تا مکالمه طبیعی شکل بگیرد.`;
  } else if (isCompliment) {
    alphaOptions = [
      `«ممنون از نظرت؛ همیشه برای آدم‌های باذوق و باانرژی احترام قائلم.»`,
      `«مرسی از نگاه دقیقت؛ داشتن انرژی مثبت و باکلاس بودن انتخاب همیشگی منه.»`,
      `«ممنونم؛ شنیدن این بازخورد از یه آدم خوش‌سلیقه واقعاً دلنشینه.»`,
      `«مرسی، خوشحالم که مورد توجهت قرار گرفت.»`
    ];
    friendlyOptions = [
      `«خیلی لطف داری! چقدر انرژی مثبت دادی اول این مکالمه، دمت گرم.»`,
      `«مرسی عزیزم، چقدر مهربونی! چشمات قشنگ می‌بینه واقعاً.»`,
      `«کلی حس و حال خوب گرفتم از کلمات قشنگت، خیلی ممنونم ازت!»`,
      `«چقدر بامحبتی! خوشحالم که این حس رو منتقل کردم.»`
    ];
    charismaticOptions = [
      `«همیشه آدم‌های بااصالت متوجه جزئیات خوب بقیه میشن؛ مرسی از نگاه قشنگت.»`,
      `«تعریف کردن از زبان یه آدم باکلاس و دقیق مثل شما دو برابر ارزش داره.»`,
      `«زیبایی توی نگاه کسیه که انقدر با وقار و پرانرژی به دنیا نگاه می‌کنه.»`,
      `«انرژی خوب کلامت نشان‌دهنده شخصیت درخشان خودته.»`
    ];
    emotionalOptions = [
      `«این حرفت خیلی به دلم نشست؛ از صمیم قلبم ممنونم که انقدر بااحساس صحبت می‌کنی.»`,
      `«شنیدن این کلمات از زبان شما حس خیلی قشنگ و ارزشمندی بهم داد.»`,
      `«کلماتت واقعاً روزم رو ساخت؛ سپاسگزار محبتت هستم.»`
    ];
    wittyOptions = [
      `«مراقب باش! انقدر تعریف کنی ممکنه به این همه خوش‌صحبتی و جذابیتت عادت کنم!»`,
      `«می‌دونم خوش‌تیپم، ولی نگفته بودی قراره انقدر بی‌پروا به روم بیاری!»`,
      `«فکر کنم این از اون تکنیک‌های مخ‌زنی هوشمندانه بود، ولی اعتراف می‌کنم خوب جواب داد!»`,
      `«قرارداد تعریفت تا کی تمدید شده؟ بگو بدونم برای شنیدن بقیه‌ش آماده باشم!»`
    ];
    coachBreakdown = `در برابر تعریف و تمجید، هرگز شکسته‌نفسی بیجا (کاهش ارزش) نکنید و مغرور هم نشوید؛ با خوش‌رویی، شوخ‌طبعی و پذیرش باوقار، ارزش خود را تثبیت کنید.`;
  } else if (isBanterOrTease) {
    alphaOptions = [
      `«شوخی‌ت رو شنیدم، ولی بازی کردن با چارچوب من تمرین بیشتری لازم داره.»`,
      `«اعتمادبه‌نفست رو تحسین می‌کنم، ولی مسیر رو داری یکم اشتباه میری.»`,
      `«خوبه که انقدر راحتی، ولی مرزها همیشه سر جاشون محفوظه.»`,
      `«بازیگوشی خوبه، به شرطی که سطح مکالمه پایین نیاد.»`
    ];
    friendlyOptions = [
      `«خیلی باحالی! خوشم اومد از حاضر‌جوابیت، معلومه پایه‌ گپی.»`,
      `«دمت گرم! شوخی باحالی بود، کم پیش میاد کسی اینجوری غافلگیرم کنه.»`,
      `«ایول، معلومه حسابی خوش‌سخنی و اهل بگو بخند!»`,
      `«خندیدم به حرفت، معلومه از اون آدم‌های پرانرژی و پر از شوخی هستی.»`
    ];
    charismaticOptions = [
      `«لحن بازیگوشت جذابه، ولی برای اینکه منو به چالش بکشی باید برگ‌های برنده‌تری رو کنی.»`,
      `«حاضرجوابی قشنگی بود؛ نشون میده هوش کلامی بالایی پشت این شوخی هست.»`,
      `«خوشم میاد از اینکه ترسی از به چالش کشیدن نداری، قابل احترامه.»`,
      `«این شوخی نشون داد سرعت پردازشت بالاست؛ ادامه بده ببینم به کجا میرسی.»`
    ];
    emotionalOptions = [
      `«شوخی‌ت نشون داد چقدر حس صمیمیت داری، برام شیرین و دلچسب بود.»`,
      `«خندیدم به حرفت، چقدر خوبه که میشه انقدر راحت و بی‌آلایش باهم شوخی کنیم.»`,
      `«حس شوخ‌طبعیت به دل میشینه و فضا رو حسابی گرم می‌کنه.»`
    ];
    wittyOptions = [
      `«اگه فکر کردی با این تیکه‌ها ضربه فنی میشم، باید بگم هنوز راند اول رو هم ندیدی!»`,
      `«به نظرم داری روی خط قرمز بازیگوشی راه میری، ولی هیجانش رو دوست دارم!»`,
      `«چقدر تمرین کردی این جمله رو بچینی؟ نمره‌ت ۱۸ شد، دفعه بعد قوی‌تر بیا!»`,
      `«تلاشت برای بامزه بودن ستودنی بود، ولی هنوز باید پیش مربی کلاس برداری!»`
    ];
    coachBreakdown = `در موقعیت‌های کل‌کل و تیکه، برنده کسی است که هیجانی نشود، گارد دفاعی نگیرد و با لبخند و پاسخ زیرکانه برتر، چارچوب برنده را در دست بگیرد.`;
  } else if (isFriendzone) {
    alphaOptions = [
      `«من به اندازه کافی دوست معمولی تو زندگیم دارم؛ دنبال ارتباط باکیفیت و شفافم، پس برات بهترین‌ها رو می‌خوام.»`,
      `«دوستی معمولی چیزی نیست که تو برنامه من باشه؛ ترجیح میدم مسیرمون از همین جا با احترام جدا باشه.»`,
      `«صداقتت قابل احترامه، ولی من چارچوب خودم رو دارم و در قالب دوست معمولی نمی‌مونم.»`,
      `«من برای احساس و زمانم استاندارد دارم؛ برات آرزوی موفقیت دارم.»`
    ];
    friendlyOptions = [
      `«ممنون که صادقانه نظرت رو گفتی. برات در ادامه مسیر بهترین حس و حال رو آرزو می‌کنم.»`,
      `«کاملاً درکت می‌کنم. خوشحالم که شفاف حرف زدی؛ موفق باشی همیشه.»`,
      `«شفافیت بهترین مزیته. برات آرزوی بهترین اتفاق‌ها رو دارم.»`
    ];
    charismaticOptions = [
      `«گاهی وقت‌ها آدم‌ها ظرفیت درک الماس‌های زندگیشون رو ندارن؛ امیدوارم همیشه بدرخشی و شاد باشی.»`,
      `«ارتباطی که قراره نصفه و نیمه باشه قشنگ نیست؛ ارزش هر دوتامون بیشتر از این حرفاست.»`,
      `«تصمیمت محترمه. هر کسی به اندازه وسعت نگاهش انتخاب می‌کنه؛ سلامت باشی.»`
    ];
    emotionalOptions = [
      `«صداقت برام بالاترین ارزشه، هرچند که مسیرمون یکی نباشه. همیشه برات آرزوی شادی قلبی دارم.»`,
      `«ممنون برای لحظات خوبی که ساختیم، برات آرامش و خوشبختی از ته دل می‌خوام.»`
    ];
    wittyOptions = [
      `«دوست معمولی؟! من انقدر پیشنهادات جذاب دارم که برای پست دوست معمولی وقت اضافه نمیارم!»`,
      `«به نظرم بهترین فرصت سال رو رد کردی، ولی نگران نباش، به عنوان یک خاطره شیرین یادت می‌مونم!»`,
      `«فرندزون برای بقیه است؛ من توی لیگ متفاوتی بازی می‌کنم!»`
    ];
    coachBreakdown = `فرندزون تله‌ای است که با ماندن در آن جذابیت صفر می‌شود. سریع، باکلاس، بدون عصبانیت و با اقتدار کامل کناره‌گیری کنید تا ارزش والای شما حفظ شود.`;
  } else if (isDateOrCafe) {
    alphaOptions = [
      `«برای یه قهوه باکیفیت و یه گفتگوی عمیق پایه هستم؛ تایم آخر هفته رو فیکس کنیم.»`,
      `«من فقط برای مکالمات معنادار وقت میذارم؛ کافه پنجشنبه ساعت ۶ مناسبه.»`,
      `«قرار حضوری همیشه جذاب‌تر از تایپ کردنه؛ برنامه آخر هفته‌ت چطوره؟»`
    ];
    friendlyOptions = [
      `«خیلی فکر خوبیه! منم کاملاً موافقم، بریم یه کافه دنج حسابی گپ بزنیم.»`,
      `«عالیه! اتفاقاً یه جای خیلی باحال بلدم که فضاش بی‌نظیره، باهم هماهنگ کنیم.»`,
      `«پیشنهاد خیلی خوبیه، روزهای آینده وقت خالی داری فیکس کنیم؟»`
    ];
    charismaticOptions = [
      `«همیشه مکالمه حضوری و چشم در چشم جادوی دیگه‌ای داره؛ بریم یه جای دنج و باکلاس.»`,
      `«قرار با یه آدم باهوش و جذاب مثل شما رو نمیشه رد کرد؛ ساعت و لوکیشن رو باهم نهایی می‌کنیم.»`,
      `«گفتگوی زنده عیار ارتباط رو نشون میده؛ خوشحال میشم سر فرصت ببینمت.»`
    ];
    emotionalOptions = [
      `«خیلی خوشحال میشم از نزدیک ببینمت و حس و حال واقعیمون رو به اشتراک بذاریم.»`,
      `«دیدار حضوری بهترین راهه برای اینکه عمق حس همدلی و هم‌صحبتی‌مون رو حس کنیم.»`
    ];
    wittyOptions = [
      `«فقط به شرطی میام که هزینه قهوه با کسی باشه که کمتر از بقیه جذاب صحبت کنه!»`,
      `«امیدوارم توی قرار حضوری هم به همین اندازه که توی چت ادعا داری خوش‌صحبت باشی!»`,
      `«اگه کافه رو انتخاب کردی، مسئولیت خوش‌سلیقه بودنش با خودته‌ها!»`
    ];
    coachBreakdown = `دعوت یا پذیرش قرار باید مشخص، با اعتمادبه‌نفس، انرژی مثبت و بدون دستپاچگی باشد تا جذابیت لحظه از بین نرود.`;
  } else if (isColdReply) {
    alphaOptions = [
      `«خوبه. هر وقت سرت خلوت شد و خواستی کامل صحبت کنیم، خبر بده.»`,
      `«پاسخ‌های مختصر معمولاً نشونه خستگیه؛ استراحت کن، بعداً گپ می‌زنیم.»`,
      `«من اهل گفتگوی یک‌طرفه نیستم؛ تایم خالی پیدا کردی در خدمتم.»`
    ];
    friendlyOptions = [
      `«معلومه حسابی خسته‌ای یا سرت شلوغه! استراحت کن عزیزم، هر وقت اوکی شدی پیام بده.»`,
      `«حس می‌کنم الان وقت مناسبی نیست؛ برو به کارات برس بعداً صحبت می‌کنیم.»`,
      `«امیدوارم همه چی روبه‌راه باشه، بعداً سر فرصت حرف می‌زنیم.»`
    ];
    charismaticOptions = [
      `«کلمات کوتاه، مکالمات عمیق رو ناقص می‌ذارن؛ بمونه برای یه وقت باانرژی‌تر.»`,
      `«کیفیت صحبت کردن ما حیفه که با پیام‌های تلگرافی بگذره؛ وقتت خوش.»`,
      `«سکوت و اختصار هم پیامی در خودش داره؛ موفق باشی.»`
    ];
    emotionalOptions = [
      `«حس کردم شاید روز شلوغ یا سختی داشتی؛ امیدوارم هر چی هست به زودی به آرامش تبدیل بشه.»`,
      `«اگه چیزی اذیتت می‌کنه، هر وقت خواستی من هستم برای شنیدنش.»`
    ];
    wittyOptions = [
      `«الان برای هر کلمه‌ای که تایپ می‌کنی مالیات در نظر گرفتن یا کیبوردت شارژ نداره؟!»`,
      `«این خلاصه کردن در حد متون باستانی بود! بگو ببینم کی انرژی تو رو دزدیده؟»`,
      `«جایزه کم‌حرف‌ترین چت سال قطعا به شما میرسه!»`
    ];
    coachBreakdown = `به پیام‌های سرد و تک‌کلمه‌ای هرگز با التماس یا پیام‌های طولانی واکنش ندهید؛ با یک پاسخ کوتاه، شوخ یا فاصله‌گذاری محترمانه توپ را در زمین او بگذارید.`;
  } else {
    // Universal High-Status Iranian Charisma Matrix
    alphaOptions = [
      `«من برای زمان و کیفیت ارتباطاتم استاندارد مشخصی دارم؛ در این باره موضع من کاملاً صریح و روشنه.»`,
      `«بدون نیاز به تایید دیگران و با تکیه بر اولویت‌های شخصی خودم جلو میرم.»`,
      `«چارچوب و مرزهای مشخصی دارم و در این موقعیت با متانت و قاطعیت تصمیم می‌گیرم.»`,
      `«همیشه ترجیح میدم کیفیت و وقار رو فدای تعارفات بیجا نکنم.»`
    ];
    friendlyOptions = [
      `«سلام و ارادت! حس و نظرت برام خیلی محترمه و ترجیح میدم با صمیمیت و حس خوب جلو بریم.»`,
      `«خیلی خوشحالم که این موضوع رو مطرح کردی؛ پایه هر گفتگوی خوبی صمیمیت و راحتیه.»`,
      `«کاملاً درکت می‌کنم؛ خیالت راحت باشه، با انرژی مثبت و همدلی حلش می‌کنیم.»`,
      `«خیلی خوبه که انقدر راحت می‌تونیم باهم تبادل نظر کنیم.»`
    ];
    charismaticOptions = [
      `«مدیریت هوشمندانه این موقعیت نیازمند رفتاری باکلاس، سنجیده، پرستیژ بالا و کلمات دقیق است.»`,
      `«با آرامش و متانت کامل: کنترل بازی کلامی با مکث‌های طلایی و ادبیات شیک بالاترین جذابیت را می‌سازد.»`,
      `«با لبخندی جذاب و مطمئن، چارچوب برتر مکالمه را هوشمندانه در دست می‌گیرم.»`,
      `«کلمات وقتی از سر اصالت و اعتمادبه‌نفس باشن، هیچ چالشی بدون پاسخ نمی‌مونه.»`
    ];
    emotionalOptions = [
      `«از صمیم قلب حست رو درک می‌کنم؛ این احساس عمیق و ارزشمندی که داری برام خیلی محترمه.»`,
      `«همدلی واقعی یعنی درکت کنم و در کنارت باشم تا این لحظه رو با آرامش تجربه کنی.»`,
      `«احساساتت برام باارزشه؛ با قلبی باز و صمیمیت عمیق همراهتم.»`,
      `«گاهی یک گوش شنوا و درک قلبی از صدها راهکار منطقی موثرتره.»`
    ];
    wittyOptions = [
      `«فکر کنم داری شانس خودتو امتحان می‌کنی؛ ولی بازی با قوانین جذاب من داستان دیگه‌ای داره!»`,
      `«انقدر غرق این موضوع شدی که یادت رفت دکمه جذابیت و لبخند رو روشن نگه‌داری!»`,
      `«با یه پوزخند خونسرد می‌گم: اگه انقدر زود همه کارت‌ها رو رو کنیم، جذابیت کشف کردن چی میشه؟!»`,
      `«این موقعیت یه چالش باحال بود، ولی مربی همیشه سه گام جلوتر فکر می‌کنه!»`
    ];
    coachBreakdown = `با حفظ آرامش، خونسردی و شوخ‌طبعی هوشمندانه، کنترل هر موقعیتی در دستان شما خواهد بود.`;
  }

  // Filter out any option that matches previous responses to strictly eliminate repetitions
  const filterRepetitive = (list: string[], offset: number): string => {
    for (let i = 0; i < list.length; i++) {
      const idx = (seed + offset + i) % list.length;
      const candidate = list[idx];
      const isUsed = previousResponses?.some(prev => prev.includes(candidate.slice(5, 25)));
      if (!isUsed) return candidate;
    }
    return list[(seed + offset) % list.length];
  };

  const t1 = filterRepetitive(alphaOptions, 0);
  const t2 = filterRepetitive(friendlyOptions, 1);
  const t3 = filterRepetitive(charismaticOptions, 2);
  const t4 = filterRepetitive(emotionalOptions, 3);
  const t5 = filterRepetitive(wittyOptions, 4);

  let cardContext = '';
  if (matchedCards && matchedCards.length > 0) {
    const topCard = matchedCards[0];
    if (topCard.content) {
      const firstSentence = topCard.content.split(/[\.\n]/)[0].trim();
      if (firstSentence.length > 10 && firstSentence.length < 80) {
        cardContext = `\n📌 راهبرد کلیدی پایگاه دانش: ${firstSentence}`;
      }
    }
  }

  return `🔥 **لحن ۱: مقتدر و آلفا:**
${t1}${cardContext}
📌 نکته اجرا: لحن سنگین و مطمئن، نگاه مستقیم، بدون شتاب‌زدگی و بدون نیاز به تایید.

😊 **لحن ۲: صمیمی و دوستانه:**
${t2}
📌 نکته اجرا: لبخند راحت، صدای گرم و صمیمی، ایجاد حس امنیت و رفاقت.

😎 **لحن ۳: باکلاس و کاریزماتیک:**
${t3}
📌 نکته اجرا: آرامش کلامی، مکث طلایی سنجیده، نگاه عمیق و زبان بدن مسلط.

❤️ **لحن ۴: احساسی و عاطفی:**
${t4}
📌 نکته اجرا: لحن پراحساس و نرم، توجه کامل به احساس مخاطب و ایجاد حس درک متقابل.

😂 **لحن ۵: شوخ‌طبع و کل‌کل + تحلیل مربی:**
${t5}
📌 نکته اجرا: پوزخند خونسرد، لحن بازیگوشانه و حفظ اقتدار.
🧠 تحلیل مربی: ${coachBreakdown}`;
}

// ============================================================================
// 13. MAIN ANSWER GENERATION PIPELINE PROCESSOR
// ============================================================================

export interface RAGAnswerResponse {
  answer: string;
  sourceCards: KnowledgeCard[];
  usedLLM: boolean;
  modelUsed?: string;
  pipelineLog: any;
}

export async function processRAGQuery(
  userId: string,
  userQuestion: string,
  customSystemPrompt?: string,
  conversationId?: string | null,
  clientHistory?: { role: string; content: string }[]
): Promise<RAGAnswerResponse> {
  const startTime = Date.now();
  const normQuery = normalizePersian(userQuestion);
  const tokens = tokenizePersian(userQuestion);

  // 1. Conversation Memory Processing (using client memory buffer if provided)
  const processedMemory = await ConversationMemoryEngine.processMemory(userId, userQuestion, conversationId, clientHistory);

  // 2. Question Analyzer (Gender, Target, Location, Goal, Intent, Emotion, Topic)
  const queryAnalysis = QuestionAnalyzer.analyze(userQuestion, processedMemory.activeContextTurns);

  // 3. Dynamic Strategy Selection
  const strategyConfig = StrategyEngine.selectStrategy(queryAnalysis);

  // 4. Search Engine Execution across all 10 specialized retrievers
  const searchManager = new SearchManager();
  const searchResult = await searchManager.search(userQuestion, queryAnalysis, {
    topKTotal: 8,
    perSourceTopK: 3,
    minConfidenceThreshold: 20
  });

  const { fusedCandidates, candidatesByBank, totalSourcesQueried, sourcesMatchedCount, sourceWeightsApplied } = searchResult;

  // Map candidates to KnowledgeCard structure for 100% backward compatibility
  const mappedCards: KnowledgeCard[] = fusedCandidates.map(c => ({
    id: c.id,
    title: c.title,
    content: c.content,
    normalizedContent: normalizePersian(c.content),
    keywords: c.keywords,
    tags: c.tags,
    category: `${c.sourceTitlePersian} - ${c.category}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    views: c.views || 0
  }));

  const topConfidence = fusedCandidates.length > 0 ? fusedCandidates[0].confidenceScore : 0;
  const isGrounded = fusedCandidates.length > 0 && topConfidence >= 20;

  // 5. Anti-Repetition Engine
  const previousResponses = await AntiRepetitionEngine.getLastAssistantResponses(userId, 5, conversationId);
  const clichesInHistory = AntiRepetitionEngine.detectCliches(previousResponses.join(' '));

  let rawAnswerText = '';
  let finalFormattedAnswer = '';
  let usedLLM = false;
  let modelUsed: string | undefined = undefined;
  let ragDecision: 'MULTI_SOURCE_RAG' | 'DIRECT_LLM_FALLBACK' = isGrounded ? 'MULTI_SOURCE_RAG' : 'DIRECT_LLM_FALLBACK';

  let evaluation: ResponseQualityEvaluation | null = null;
  let attemptsCount = 0;
  let promptComposerResult: PromptComposerResult | null = null;
  const retryLogs: any[] = [];

  const MAX_ATTEMPTS = 3;

  // 6. Gemini Generation Loop with Multi-Style Enforcement
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    attemptsCount = attempt + 1;

    const currentPresencePenalty = Math.min(1.0, strategyConfig.presencePenalty + (attempt * 0.15));
    const currentFrequencyPenalty = Math.min(1.0, strategyConfig.frequencyPenalty + (attempt * 0.15));
    const currentTemp = Math.min(0.95, strategyConfig.temperature + (attempt * 0.08));

    promptComposerResult = PromptComposer.composePrompt(
      userQuestion,
      queryAnalysis,
      strategyConfig,
      candidatesByBank,
      processedMemory.formattedMemoryPrompt,
      isGrounded,
      clichesInHistory,
      attempt
    );

    const finalSystemInstruction = customSystemPrompt
      ? `${promptComposerResult.systemInstruction}\n\n=== دستورالعمل ویژه لحن و سیستم کاربر ===\n${customSystemPrompt}`
      : promptComposerResult.systemInstruction;

    const requestOptions: AIRequestOptions = {
      promptText: promptComposerResult.promptText,
      systemInstruction: finalSystemInstruction,
      temperature: Math.min(0.8, Math.max(0.7, currentTemp)),
      top_p: strategyConfig.top_p ?? 0.95,
      top_k: strategyConfig.top_k ?? 40,
      presence_penalty: currentPresencePenalty,
      frequency_penalty: currentFrequencyPenalty,
      max_tokens: strategyConfig.maxTokens,
      minResponseLength: 15
    };

    try {
      const aiRes = await generateMultiProviderAIResponse(requestOptions);
      rawAnswerText = aiRes.text;
      usedLLM = true;
      modelUsed = aiRes.modelUsed;

      // Post Processor: Verify & Guarantee 5-Style Output Format
      finalFormattedAnswer = PostProcessor.process(rawAnswerText, queryAnalysis, userQuestion);

      evaluation = SelfEvaluationEngine.evaluate(
        finalFormattedAnswer,
        userQuestion,
        previousResponses,
        isGrounded,
        fusedCandidates
      );

      retryLogs.push({
        attempt: attemptsCount,
        providerUsed: aiRes.providerUsed,
        modelUsed: aiRes.modelUsed,
        temperature: currentTemp,
        qualityScore: evaluation.overallQualityScore,
        confidenceScore: evaluation.confidenceScore,
        isAccepted: evaluation.isQualityAcceptable,
        rejectionReason: evaluation.rejectionReason
      });

      if (evaluation.isQualityAcceptable) {
        if (isGrounded) {
          incrementViews(fusedCandidates.map(c => c.id));
        }
        break;
      } else {
        console.warn(`[Karizma Pipeline Retry] Attempt ${attemptsCount} rejected: ${evaluation.rejectionReason}. Retrying...`);
      }
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      console.warn(`[Karizma Pipeline] AI Provider unavailable on attempt ${attemptsCount} (${errorMsg.slice(0, 100)}). Activating Karizma Fallback Engine...`);
      retryLogs.push({
        attempt: attemptsCount,
        error: errorMsg.slice(0, 150),
        isAccepted: false
      });

      // Activate fallback generator immediately when AI providers fail
      rawAnswerText = generateIntelligentKarizmaFallback(userQuestion, mappedCards, queryAnalysis, fusedCandidates, previousResponses);
      finalFormattedAnswer = PostProcessor.process(rawAnswerText, queryAnalysis, userQuestion, mappedCards, fusedCandidates, previousResponses);
      usedLLM = false;
      evaluation = SelfEvaluationEngine.evaluate(
        finalFormattedAnswer,
        userQuestion,
        previousResponses,
        isGrounded,
        fusedCandidates
      );
      break;
    }
  }

  const durationMs = Date.now() - startTime;

  // 7. Diagnostics Pipeline Log
  const pipelineLog = {
    normalizedQuery: normQuery,
    tokens: tokens,
    bm25Results: fusedCandidates.slice(0, 5).map(r => ({
      title: `[${r.sourceTitlePersian}] ${r.title}`,
      score: Number(r.reRankedScore.toFixed(2))
    })),
    reRankedTopResult: fusedCandidates.length > 0 ? `[${fusedCandidates[0].sourceTitlePersian}] ${fusedCandidates[0].title}` : 'هیچ منبعی پیدا نشد',
    usedLLM,
    sourceCards: mappedCards,

    searchManager: {
      totalSourcesQueried,
      sourcesMatchedCount,
      totalCandidatesFound: fusedCandidates.length,
      topConfidence: `${topConfidence}%`,
      sourceWeightsApplied
    },

    promptLibrary: {
      promptTemplateUsed: promptComposerResult?.promptTemplateUsed.name || 'Master Karizma Coaching Prompt',
      promptCategory: promptComposerResult?.promptTemplateUsed.category || 'General',
      tacticalFocusCount: promptComposerResult?.promptTemplateUsed.tacticalFocus.length || 0
    },

    promptComposer: {
      curatedItemsCount: Object.values(promptComposerResult?.curatedItems || {}).reduce((acc, arr) => acc + arr.length, 0),
      formattedContextLength: promptComposerResult?.formattedContext.length || 0,
      personaRole: promptComposerResult?.promptMetadata.personaRole
    },

    postProcessor: {
      multiStyleApplied: true,
      stylesCount: 5,
      stylesList: ['🔥 قاطع و پرقدرت (آلفا)', '❤️ صمیمی و همدلانه (گرم)', '🧠 تحلیل‌گر و علمی (داده‌محور)', '💼 دیپلماتیک و هوشمندانه (تکتیکال)', '😏 شوخ‌طبع و رندانه (کاریزماتیک)']
    },

    selectedCardsCount: mappedCards.length,
    finalConfidenceScore: evaluation ? `${evaluation.confidenceScore}%` : `${topConfidence}%`,
    responseQualityScore: evaluation ? evaluation.overallQualityScore : 70,
    ragDecision,

    queryAnalysis,
    strategyApplied: strategyConfig.strategyName,

    memoryEngine: {
      summary: processedMemory.summary,
      topicsExtracted: processedMemory.topicsExtracted,
      intentHistory: processedMemory.intentHistory,
      longTermPreferences: processedMemory.longTermPreferences,
      stats: processedMemory.stats
    },

    selfEvaluation: evaluation,

    antiRepetitionEngine: {
      comparedLastResponsesCount: previousResponses.length,
      attemptsUsed: attemptsCount,
      wasRetried: attemptsCount > 1,
      clichesAvoided: clichesInHistory,
      retryLogs
    },

    durationMs
  };

  return {
    answer: finalFormattedAnswer,
    sourceCards: mappedCards,
    usedLLM,
    modelUsed,
    pipelineLog
  };
}




// Increment views helper
async function incrementViews(cardIds: string[]) {
  try {
    const cards = await DBEngine.readTable<KnowledgeCard>('knowledge_cards');
    for (const cid of cardIds) {
      const c = cards.find(x => x.id === cid);
      if (c) {
        await DBEngine.updateRecord<KnowledgeCard>('knowledge_cards', cid, { views: (c.views || 0) + 1 });
      }
    }
  } catch (e) {
    console.error('Failed to increment card views:', e);
  }
}
