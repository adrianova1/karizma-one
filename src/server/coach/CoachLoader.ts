import fs from 'fs';
import path from 'path';
import { CoachScenario, CoachFallbackItem, CoachCategory, CoachToneResponses } from './CoachTypes.js';
import { PersianNormalizer } from './PersianNormalizer.js';

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

    // Extract the 5 Canonical Tones from raw dataset
    const rawCharismatic = s.responses?.charismatic || s.responses?.tone_1 || s.responses?.tone_3 || s.responses?.friendly || '';
    const rawFunny = s.responses?.funny || s.responses?.tone_2 || '';
    const rawConfident = s.responses?.confident || s.responses?.direct || s.responses?.tone_3 || '';
    const rawMysterious = s.responses?.mysterious || s.responses?.emotional || s.responses?.tone_4 || '';
    const rawMature = s.responses?.mature || s.responses?.psychology || s.responses?.tone_5 || '';

    const responses: CoachToneResponses = {
      charismatic: rawCharismatic || rawConfident || 'با متانت و کنترل فریم فضا را مدیریت کنید.',
      funny: rawFunny || 'با شوخ‌طبعی و رندی هوشمندانه فضا را تلطیف کنید.',
      confident: rawConfident || rawCharismatic || 'با صراحت، اقتدار و اعتمادبه‌نفس موضع خود را بیان کنید.',
      mysterious: rawMysterious || 'با نگاهی عمیق و پاسخی سنجیده کنجکاوی مخاطب را حفظ کنید.',
      mature: rawMature || 'با وقار، پرستیژ و آرامش ارتباط را پیش ببرید.'
    };

    const triggers = Array.isArray(s.triggers) && s.triggers.length > 0
      ? s.triggers
      : [s.title || s.situation || ''];

    const aliases = Array.isArray(s.aliases) && s.aliases.length > 0
      ? s.aliases
      : [s.situation || ''];

    const userInputPatterns = Array.isArray(s.user_input_patterns) && s.user_input_patterns.length > 0
      ? s.user_input_patterns
      : [...triggers, ...aliases];

    // Extract rich, non-generic keywords
    const rawKeywords = Array.isArray(s.keywords) ? s.keywords : [];
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

    return {
      id: scenarioId,
      title: s.title || s.situation || 'سناریوی بدون عنوان',
      category: s.category || s.environment || 'عمومی',
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
    if (this.loaded && this.scenarios.length === 60000) {
      return { scenarios: this.scenarios, fallbacks: this.fallbacks, categories: this.categories };
    }

    try {
      const scenarioMap = new Map<string, CoachScenario>();
      this.scenarioChunkMap.clear();

      // Load 60K Bank directly from data/chunks/ (Sole Source of Truth for Coach Runtime)
      const chunksDir = path.join(process.cwd(), 'data', 'chunks');
      const manifestPath = path.join(chunksDir, 'manifest.json');

      if (fs.existsSync(chunksDir)) {
        let chunkFiles: string[] = [];

        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            if (Array.isArray(manifest.chunks)) {
              chunkFiles = manifest.chunks.map((c: any) => c.file);
            }
          } catch (mErr) {
            console.warn('[CoachLoader] Error parsing chunks manifest:', mErr);
          }
        }

        // Fallback to reading directory files if manifest failed
        if (chunkFiles.length === 0) {
          chunkFiles = fs.readdirSync(chunksDir).filter(f => f.startsWith('chunk_') && f.endsWith('.json')).sort();
        }

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
