import fs from 'fs';
import path from 'path';
import { CoachScenario, CoachFallbackItem, CoachCategory, CoachToneResponses } from './CoachTypes.js';
import { PersianNormalizer } from './PersianNormalizer.js';
import { CANONICAL_FEATURED_SCENARIOS } from './CanonicalScenarios.js';
import { DBEngine } from '../db.js';
import { ToneDistributor } from './ToneDistributor.js';
import { PersonaGenerator } from './PersonaGenerator.js';

/**
 * Safely parse JSON from a file with graceful error handling
 */
function safeReadJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw || raw.trim().length === 0) {
      return fallback;
    }
    const sanitized = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ' ');
    return JSON.parse(sanitized) as T;
  } catch (err) {
    console.warn(`[CoachLoader] Warning reading file ${filePath}:`, err);
    return fallback;
  }
}

export class CoachLoader {
  private static scenarios: CoachScenario[] = [];
  private static scenarioChunkMap: Map<string, string> = new Map();
  private static fallbacks: CoachFallbackItem[] = [];
  private static categories: CoachCategory[] = [];
  private static loaded = false;

  /**
   * Normalize an incoming scenario object to the canonical CoachScenario schema
   * strictly enforcing the 5 Canonical Tones: charismatic, funny, confident, mysterious, mature
   */
  public static normalizeScenario(s: any, chunkName?: string): CoachScenario {
    if (!s || typeof s !== 'object') {
      return {
        id: 'scen_default_' + Math.random().toString(36).substring(2, 7),
        title: 'سناریوی پیش‌فرض',
        category: 'عمومی',
        situation: '',
        context: '',
        user_input_patterns: [],
        triggers: [],
        aliases: [],
        keywords: [],
        responses: {
          charismatic: 'با وقار، کنترل فریم کلامی و حفظ پرستیژ پاسخ دهید.',
          funny: 'با شوخ‌طبعی و رندی هوشمندانه فضا را تلطیف کنید.',
          confident: 'با صراحت، اقتدار و اعتمادبه‌نفس بالا موضع خود را بیان نمایید.',
          mysterious: 'با لحنی جذاب و پرکشش، کنجکاوی مخاطب را برانگیزید.',
          mature: 'با متانت، وقار دیپلماتیک و پختگی موقعیت را مدیریت کنید.'
        },
        difficulty: 'medium',
        likes: 0,
        views: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    // Extract the 5 Canonical Tones from raw dataset and strip any synthetic residuals
    const cleanDialogue = (txt: any) => {
      if (!txt) return '';
      if (typeof txt !== 'string') txt = String(txt);
      return ToneDistributor.cleanDialogue(ToneDistributor.stripToneWrappers(txt));
    };

    let resObj = s.responses;
    if (typeof resObj === 'string') {
      try { resObj = JSON.parse(resObj); } catch { resObj = {}; }
    }
    if (!resObj || typeof resObj !== 'object') {
      resObj = {};
    }

    // Comprehensive extraction with Persian synonyms and alternative field names
    let rawCharismatic = cleanDialogue(
      resObj.charismatic || resObj.tone_charismatic || resObj.tone_1 || resObj['پاسخ کاریزماتیک'] ||
      resObj['کاریزماتیک'] || resObj['باکلاس'] || resObj['پاسخ باکلاس'] || resObj.friendly ||
      s.charismatic || s.tone_charismatic || s['پاسخ کاریزماتیک'] || s['کاریزماتیک'] || s.analysis?.bestAnswer || ''
    );
    let rawFunny = cleanDialogue(
      resObj.funny || resObj.tone_funny || resObj.tone_2 || resObj['پاسخ شوخ‌طبع'] ||
      resObj['شوخ طبع'] || resObj['شوخ‌طبع'] || resObj['طنز'] || resObj['فان'] || resObj['رندانه'] ||
      s.funny || s.tone_funny || s['پاسخ شوخ‌طبع'] || s['شوخ طبع'] || s['طنز'] || ''
    );
    let rawConfident = cleanDialogue(
      resObj.confident || resObj.tone_confident || resObj.tone_3 || resObj.direct || resObj['پاسخ مقتدر'] ||
      resObj['مقتدر'] || resObj['قاطع'] || resObj['با اعتماد به نفس'] || resObj['با اعتمادبه‌نفس'] || resObj['آلفا'] ||
      s.confident || s.tone_confident || s.direct || s['پاسخ مقتدر'] || s['مقتدر'] || s['قاطع'] || ''
    );
    let rawMysterious = cleanDialogue(
      resObj.mysterious || resObj.tone_mysterious || resObj.tone_4 || resObj.emotional || resObj['پاسخ مرموز'] ||
      resObj['مرموز'] || resObj['پرکشش'] || resObj['چندلایه'] ||
      s.mysterious || s.tone_mysterious || s['پاسخ مرموز'] || s['مرموز'] || s['پرکشش'] || ''
    );
    let rawMature = cleanDialogue(
      resObj.mature || resObj.tone_mature || resObj.tone_5 || resObj.psychology || resObj['پاسخ متین'] ||
      resObj['متین'] || resObj['پخته'] || resObj['بالغ'] || resObj['دیپلماتیک'] || resObj['خونسرد'] ||
      s.mature || s.tone_mature || s['پاسخ متین'] || s['متین'] || s['پخته'] || ''
    );

    // If answers array is provided, extract tones from structured array
    if (Array.isArray(s.answers) && s.answers.length > 0) {
      for (const a of s.answers) {
        if (!a || !a.text) continue;
        const style = (a.style || '').toLowerCase();
        const text = cleanDialogue(a.text);
        if (!rawCharismatic && (style.includes('کاریزماتیک') || style.includes('باکلاس') || style.includes('charismatic'))) rawCharismatic = text;
        if (!rawFunny && (style.includes('طنز') || style.includes('شوخ') || style.includes('funny') || style.includes('رندانه'))) rawFunny = text;
        if (!rawConfident && (style.includes('مقتدر') || style.includes('سنگین') || style.includes('قاطع') || style.includes('confident'))) rawConfident = text;
        if (!rawMysterious && (style.includes('مرموز') || style.includes('پرکشش') || style.includes('mysterious'))) rawMysterious = text;
        if (!rawMature && (style.includes('متین') || style.includes('خونسرد') || style.includes('پخته') || style.includes('mature'))) rawMature = text;
      }
    }

    let finalCharismatic = rawCharismatic;
    let finalFunny = rawFunny;
    let finalConfident = rawConfident;
    let finalMysterious = rawMysterious;
    let finalMature = rawMature;

    const uniqueTones = new Set([finalCharismatic, finalFunny, finalConfident, finalMysterious, finalMature].filter(Boolean));
    if (uniqueTones.size < 4) {
      const baseText = finalCharismatic || finalConfident || finalFunny || finalMysterious || finalMature || s.situation || s.title || '';
      const rotation = (s.id || '').split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
      const gen = PersonaGenerator.generateVariations(baseText, s, s.title || s.situation || '', rotation);

      finalCharismatic = finalCharismatic || gen.charismatic;
      finalFunny = (finalFunny && finalFunny !== finalCharismatic) ? finalFunny : gen.funny;
      finalConfident = (finalConfident && finalConfident !== finalCharismatic && finalConfident !== finalFunny) ? finalConfident : gen.confident;
      finalMysterious = (finalMysterious && finalMysterious !== finalCharismatic && finalMysterious !== finalFunny && finalMysterious !== finalConfident) ? finalMysterious : gen.mysterious;
      finalMature = (finalMature && finalMature !== finalCharismatic && finalMature !== finalFunny && finalMature !== finalConfident && finalMature !== finalMysterious) ? finalMature : gen.mature;
    }

    const responses: CoachToneResponses = {
      charismatic: finalCharismatic || 'با متانت و کنترل فریم فضا را مدیریت کنید.',
      funny: finalFunny || 'با شوخ‌طبعی و رندی هوشمندانه فضا را تلطیف کنید.',
      confident: finalConfident || 'با صراحت، اقتدار و اعتمادبه‌نفس موضع خود را بیان کنید.',
      mysterious: finalMysterious || 'با نگاهی عمیق و پاسخی سنجیده کنجکاوی مخاطب را حفظ کنید.',
      mature: finalMature || 'با وقار، پرستیژ و آرامش ارتباط را پیش ببرید.'
    };

    let triggers: string[] = [];
    if (Array.isArray(s.triggers)) {
      triggers = s.triggers.map(String).map(t => t.trim()).filter(Boolean);
    } else if (typeof s.triggers === 'string' && s.triggers.trim()) {
      triggers = s.triggers.split(/[,\n;|،]+/).map(t => t.trim()).filter(Boolean);
    }

    // Always include opponentLine (what the girl/boy said) and title into high-priority triggers
    const opponentLine = (s.opponentLine || s.opponent_line || '').toString().trim();
    if (opponentLine && !triggers.includes(opponentLine)) {
      triggers.unshift(opponentLine);
    }
    const cleanTitle = (s.title || '').toString().trim();
    if (cleanTitle && !triggers.includes(cleanTitle)) {
      triggers.push(cleanTitle);
    }

    if (triggers.length === 0) {
      triggers = [s.title || s.situation || ''];
    }

    let aliases: string[] = [];
    if (Array.isArray(s.aliases)) {
      aliases = s.aliases.map(String).map(a => a.trim()).filter(Boolean);
    } else if (typeof s.aliases === 'string' && s.aliases.trim()) {
      aliases = s.aliases.split(/[,\n;|،]+/).map(a => a.trim()).filter(Boolean);
    }
    if (aliases.length === 0) {
      aliases = [s.situation || ''];
    }

    let userInputPatterns: string[] = [];
    if (Array.isArray(s.user_input_patterns) && s.user_input_patterns.length > 0) {
      userInputPatterns = s.user_input_patterns.map(String).map(p => p.trim()).filter(Boolean);
    } else {
      userInputPatterns = [...triggers, ...aliases];
    }

    // Extract rich, non-generic keywords
    let rawKeywords: string[] = [];
    if (Array.isArray(s.keywords)) {
      rawKeywords = s.keywords.map(String).map(k => k.trim()).filter(Boolean);
    } else if (typeof s.keywords === 'string' && s.keywords.trim()) {
      rawKeywords = s.keywords.split(/[,\n;|،]+/).map(k => k.trim()).filter(Boolean);
    }
    const isJunkKeywords = rawKeywords.length === 0 || (rawKeywords.length === 1 && (rawKeywords[0] === 'شیت تست' || rawKeywords[0] === 'عمومی'));
    
    let keywords: string[] = isJunkKeywords ? [] : [...rawKeywords];

    if (keywords.length === 0) {
      const titleTokens = PersianNormalizer.tokenize(`${s.title || ''} ${s.situation || ''} ${s.category || ''}`);
      keywords.push(...titleTokens.slice(0, 8));
    }

    // Add domain-specific semantic expansions
    const combinedText = `${s.title || ''} ${s.situation || ''} ${triggers.join(' ')}`;
    if (/سکس|جنسی|همخواب|اتاق خواب/.test(combinedText)) {
      keywords.push('رابطه جنسی', 'سکس', 'پیشنهاد جنسی', 'صمیمیت', 'مرزبندی جنسی');
    }
    if (/بیشعور|توهین|فحش|متلک|احمق|پرو|پررو/.test(combinedText)) {
      keywords.push('توهین', 'فحش', 'کنایه', 'تیکه', 'بی احترامی', 'کل کل');
    }
    if (/استوری|اینستا|دایرکت|پست/.test(combinedText)) {
      keywords.push('استوری', 'اینستاگرام', 'دایرکت', 'پست', 'ریپلای استوری');
    }
    if (/سین|تیک ابی|دیر جواب|انلاین/.test(combinedText)) {
      keywords.push('سین زدن', 'دیر جواب دادن', 'تیک ابی', 'تاخیر پیام');
    }
    if (/قرار|کافه|دیت|دیدار|بیرون/.test(combinedText)) {
      keywords.push('پیشنهاد قرار', 'دعوت به کافه', 'دیدار حضوری', 'دیت');
    }

    keywords = Array.from(new Set(keywords.filter(Boolean)));

    const scenarioId = String(s.id || 'scen_' + Math.random().toString(36).substring(2, 7));
    if (chunkName) {
      this.scenarioChunkMap.set(scenarioId, chunkName);
    }

    const normalizeCatName = (cat?: string) => {
      if (!cat) return 'عمومی';
      const c = cat.trim();
      if (c === 'جواب و زبون‌ریختن ترکی') return 'جواب و زبون ریختن ترکی';
      if (c === 'تیکه سبک / بادگیر / نِگ' || c === 'نگ') return 'تیکه سبک / بادگیر / نگ';
      if (c === 'چیستان‌های جذاب') return 'چیستان های جذاب';
      if (c === 'پوش‌پول / حمایتگری') return 'پوش پول حمایتگری';
      if (c === 'شوخی دوپهلو') return 'شوخی دو پهلو';
      if (c === 'جوک و شوخی با پسر و دختر') return 'جوک ناب و شوخی با پسر و دختر';
      if (c === 'اشعار') return 'شعر';
      if (c === 'استوری تلنگ') return 'استوری تلنگر';
      if (c === 'شت تست، مکالمات با دختر') return 'شیت تست، مکالمات با دختر';
      if (c === 'زبون ریزی') return 'زبون ریختن';
      if (c === '...') return 'شرایط آلفا';
      return c;
    };

    return {
      id: scenarioId,
      title: s.title || s.situation || 'سناریوی بدون عنوان',
      category: normalizeCatName(s.category || s.environment),
      situation: s.situation || s.title || '',
      context: s.context || s.situation || '',
      user_input_patterns: userInputPatterns,
      triggers,
      aliases,
      keywords,
      responses,
      tips: s.tips || s.technique,
      technique: s.technique,
      bodyLanguage: s.bodyLanguage,
      nextMove: s.nextMove || s.teachingNote,
      difficulty: s.difficulty || 'medium',
      likes: typeof s.likes === 'number' ? s.likes : 0,
      views: typeof s.views === 'number' ? s.views : 0,
      createdAt: s.createdAt || new Date().toISOString(),
      updatedAt: s.updatedAt || new Date().toISOString()
    };
  }

  /**
   * Load the 60K bank from data/chunks/ as the Sole Canonical Source of Truth
   */
  static loadData(): { scenarios: CoachScenario[]; fallbacks: CoachFallbackItem[]; categories: CoachCategory[] } {
    if (this.loaded && this.scenarios.length > 0) {
      return { scenarios: this.scenarios, fallbacks: this.fallbacks, categories: this.categories };
    }

    try {
      const scenarioMap = new Map<string, CoachScenario>();
      this.scenarioChunkMap.clear();

      // Load 60K Bank directly from data/chunks/ (Sole Source of Truth for Coach Runtime)
      const chunksDir = path.join(process.cwd(), 'data', 'chunks');
      const manifestPath = path.join(chunksDir, 'manifest.json');

      if (fs.existsSync(chunksDir)) {
        // Read ALL chunk_*.json files in chunksDir dynamically
        const chunkFiles = fs.readdirSync(chunksDir)
          .filter(f => f.startsWith('chunk_') && f.endsWith('.json'))
          .sort();

        for (const file of chunkFiles) {
          const filePath = path.join(chunksDir, file);
          if (fs.existsSync(filePath)) {
            try {
              const raw = fs.readFileSync(filePath, 'utf8');
              const sanitized = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ' ');
              const parsed = JSON.parse(sanitized);
              if (Array.isArray(parsed)) {
                for (const s of parsed) {
                  const normalized = this.normalizeScenario(s, file);
                  if (!scenarioMap.has(normalized.id)) {
                    scenarioMap.set(normalized.id, normalized);
                  }
                }
              }
            } catch (chunkErr) {
              console.warn(`[CoachLoader] Error parsing chunk ${file}:`, chunkErr);
            }
          }
        }
      }

      // Add high-priority canonical hand-crafted scenarios
      for (const canonical of CANONICAL_FEATURED_SCENARIOS) {
        const normalized = this.normalizeScenario(canonical, 'canonical_core.json');
        scenarioMap.set(normalized.id, normalized);
        this.scenarioChunkMap.set(normalized.id, 'canonical_core.json');
      }

      // Merge custom / imported scenarios from SQLite DB if present
      try {
        const dbScenarios = DBEngine.readTableSync<any>('scenarios');
        if (Array.isArray(dbScenarios) && dbScenarios.length > 0) {
          for (const s of dbScenarios) {
            const normalized = this.normalizeScenario(s, 'db_scenarios');
            scenarioMap.set(normalized.id, normalized);
            this.scenarioChunkMap.set(normalized.id, 'db_scenarios');
          }
        }
      } catch (dbErr) {
        console.warn('[CoachLoader] Note while loading db scenarios:', dbErr);
      }

      // Also merge data/scenarios.json if extra custom records exist
      try {
        const dbScenariosJsonPath = path.join(process.cwd(), 'data', 'scenarios.json');
        if (fs.existsSync(dbScenariosJsonPath)) {
          const rawDb = fs.readFileSync(dbScenariosJsonPath, 'utf8');
          if (rawDb && rawDb.trim().length > 0) {
            const dbList = JSON.parse(rawDb);
            if (Array.isArray(dbList)) {
              for (const s of dbList) {
                if (s && s.id && !scenarioMap.has(s.id)) {
                  const normalized = this.normalizeScenario(s, 'db_scenarios.json');
                  scenarioMap.set(normalized.id, normalized);
                  this.scenarioChunkMap.set(normalized.id, 'db_scenarios.json');
                }
              }
            }
          }
        }
      } catch (jsonErr) {
        console.warn('[CoachLoader] Note while loading extra scenarios.json:', jsonErr);
      }

      this.scenarios = Array.from(scenarioMap.values());

      // Load Fallbacks & Categories
      const coachDir = path.join(process.cwd(), 'data', 'coach');
      const fallbacksPath = path.join(coachDir, 'fallbacks.json');
      this.fallbacks = safeReadJsonFile<CoachFallbackItem[]>(fallbacksPath, []);

      const categoriesPath = path.join(coachDir, 'categories.json');
      this.categories = safeReadJsonFile<CoachCategory[]>(categoriesPath, []);

      this.loaded = true;
      console.log(`[CoachLoader] Successfully loaded ${this.scenarios.length} canonical scenarios from 60K Bank, ${this.fallbacks.length} fallbacks, ${this.categories.length} categories.`);
    } catch (error) {
      console.error('[CoachLoader] Error in loadData:', error);
    }

    return { scenarios: this.scenarios, fallbacks: this.fallbacks, categories: this.categories };
  }

  static getScenarios(): CoachScenario[] {
    if (!this.loaded || this.scenarios.length === 0) this.loadData();
    return this.scenarios;
  }

  static getScenarioById(id: string): CoachScenario | undefined {
    return this.getScenarios().find(s => s.id === id);
  }

  static getChunkForScenarioId(id: string): string {
    return this.scenarioChunkMap.get(id) || 'chunk_001.json';
  }

  static getFallbacks(): CoachFallbackItem[] {
    if (!this.loaded || this.fallbacks.length === 0) this.loadData();
    return this.fallbacks;
  }

  static getCategories(): CoachCategory[] {
    if (!this.loaded || this.categories.length === 0) this.loadData();
    return this.categories;
  }

  static reload(): void {
    this.loaded = false;
    this.scenarios = [];
    this.scenarioChunkMap.clear();
    this.loadData();
  }
}
