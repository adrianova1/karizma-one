import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { DBEngine } from '../db.js';
import { ScenarioItem, Role } from '../../types.js';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { normalizePersian } from '../utils/persianNormalizer.js';
import { PersianNormalizer } from '../coach/PersianNormalizer.js';
import { MASTER_CATEGORIES, getMasterCategoryTitle } from '../../data/scenarios.js';
import { CoachDataPipeline } from '../coach/CoachDataPipeline.js';
import { coachEngine, CoachEngine } from '../coach/CoachEngine.js';
import { CoachLoader } from '../coach/CoachLoader.js';
import { PersonaGenerator } from '../coach/PersonaGenerator.js';

const router = Router();

let masterCache: ScenarioItem[] | null = null;
let masterCacheMtime = 0;

/**
 * Helper to fetch all active canonical scenarios from CoachLoader
 */
async function getCanonicalScenarios(): Promise<ScenarioItem[]> {
  const runtimeScenarios = CoachLoader.getScenarios();
  if (runtimeScenarios && runtimeScenarios.length > 0) {
    return runtimeScenarios.map(s => ({
      id: s.id,
      title: s.title,
      category: s.category,
      situation: s.situation,
      context: s.context,
      user_input_patterns: s.user_input_patterns,
      triggers: s.triggers,
      aliases: s.aliases,
      keywords: s.keywords,
      responses: s.responses as any,
      tips: s.tips || s.technique,
      technique: s.technique,
      bodyLanguage: s.bodyLanguage,
      nextMove: s.nextMove,
      difficulty: (s.difficulty || 'medium') as any,
      likes: s.likes || 0,
      views: s.views || 0,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      opponentLine: (s as any).opponentLine || '',
      environment: (s as any).environment || s.category,
      genderContext: (s as any).genderContext || 'general',
      goal: (s as any).goal || s.title,
      teachingNote: (s as any).teachingNote || s.technique || s.nextMove || ''
    }));
  }
  return await DBEngine.readTable<ScenarioItem>('scenarios');
}

// GET /api/scenarios - List & Search Scenarios across categories with database search
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search ? String(req.query.search).trim() : '';
    const category = req.query.category ? String(req.query.category).trim() : '';
    const difficulty = req.query.difficulty ? String(req.query.difficulty).trim() : '';
    const limit = parseInt(String(req.query.limit || '50'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);

    const allScenarios = await getCanonicalScenarios();
    let filtered = [...allScenarios];

    // Filter by Category if provided
    if (category && category !== 'all') {
      const normCat = normalizePersian(category).toLowerCase();
      filtered = filtered.filter(s => {
        const env = normalizePersian(s.environment || s.category || '').toLowerCase();
        const masterTitle = normalizePersian(getMasterCategoryTitle(s.environment || s.category || '')).toLowerCase();
        return env.includes(normCat) || masterTitle.includes(normCat) || normCat.includes(env);
      });
    }

    // Filter by Difficulty if provided
    if (difficulty && difficulty !== 'all') {
      filtered = filtered.filter(s => s.difficulty === difficulty);
    }

    // Intelligent Weighted Database Search by Phrase, Content Keywords, and Semantic Trigram Similarity
    if (search) {
      const normSearch = normalizePersian(search).toLowerCase();
      const rawTerms = normSearch.split(/\s+/).filter(Boolean);
      const contentTerms = rawTerms.filter(t => !PersianNormalizer.isStopWord(t) && !PersianNormalizer.GENERIC_CARRIER_PHRASES.has(t));
      const effectiveTerms = contentTerms.length > 0 ? contentTerms : rawTerms;

      const scoredList: { scenario: ScenarioItem; score: number }[] = [];

      for (const s of filtered) {
        let score = 0;
        const titleNorm = normalizePersian(s.title || '').toLowerCase();
        const situationNorm = normalizePersian(s.situation || '').toLowerCase();
        const opponentNorm = normalizePersian((s as any).opponentLine || '').toLowerCase();
        const triggersNorm = (s.triggers || []).map(t => normalizePersian(t).toLowerCase()).join(' ');
        const aliasesNorm = (s.aliases || []).map(a => normalizePersian(a).toLowerCase()).join(' ');
        const keywordsNorm = (s.keywords || []).map(k => normalizePersian(k).toLowerCase()).join(' ');
        const techNorm = normalizePersian(s.technique || '').toLowerCase();

        // 1. Exact phrase match (High priority)
        if (normSearch.length >= 3) {
          if (opponentNorm.includes(normSearch)) score += 120;
          if (titleNorm.includes(normSearch)) score += 100;
          if (triggersNorm.includes(normSearch)) score += 90;
          if (aliasesNorm.includes(normSearch)) score += 80;
          if (situationNorm.includes(normSearch)) score += 60;
          if (keywordsNorm.includes(normSearch)) score += 50;
        }

        // 2. Individual content terms matching
        let matchedTermsCount = 0;
        for (const term of effectiveTerms) {
          if (term.length < 2) continue;
          let termMatched = false;
          if (opponentNorm.includes(term)) { score += 40; termMatched = true; }
          if (titleNorm.includes(term)) { score += 35; termMatched = true; }
          if (triggersNorm.includes(term)) { score += 30; termMatched = true; }
          if (aliasesNorm.includes(term)) { score += 25; termMatched = true; }
          if (situationNorm.includes(term)) { score += 20; termMatched = true; }
          if (keywordsNorm.includes(term)) { score += 15; termMatched = true; }
          if (techNorm.includes(term)) { score += 10; termMatched = true; }
          if (termMatched) matchedTermsCount++;
        }

        // 3. Trigram similarity for long user sentences / questions
        if (normSearch.length >= 5) {
          const simTitle = PersianNormalizer.computeTrigramSimilarity(normSearch, titleNorm);
          const simOpponent = opponentNorm ? PersianNormalizer.computeTrigramSimilarity(normSearch, opponentNorm) : 0;
          const bestSim = Math.max(simTitle, simOpponent);
          if (bestSim >= 0.25) {
            score += Math.round(bestSim * 85);
          }
        }

        // Include if any meaningful relevance score was achieved
        if (score > 0) {
          // Bonus if all terms matched
          if (effectiveTerms.length > 1 && matchedTermsCount === effectiveTerms.length) {
            score += 50;
          }
          scoredList.push({ scenario: s, score });
        }
      }

      scoredList.sort((a, b) => b.score - a.score);
      filtered = scoredList.map(item => item.scenario);
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    // Calculate count per master category for tab badges
    const categoryCounts: Record<string, number> = {};
    for (const cat of MASTER_CATEGORIES) {
      categoryCounts[cat.id] = allScenarios.filter(s => {
        const title = getMasterCategoryTitle(s.environment || s.category || '');
        return title === cat.title;
      }).length;
    }

    res.json({
      success: true,
      scenarios: paginated,
      total,
      categories: MASTER_CATEGORIES,
      categoryCounts
    });
  } catch (error: any) {
    console.error('Error fetching scenarios:', error);
    res.status(500).json({ error: 'خطا در دریافت لیست سناریوها' });
  }
});

// GET /api/scenarios/categories - List Categories and meta
router.get('/categories', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const allScenarios = await getCanonicalScenarios();
    const enrichedCategories = MASTER_CATEGORIES.map(cat => {
      const count = allScenarios.filter(s => getMasterCategoryTitle(s.environment || s.category || '') === cat.title).length;
      return { ...cat, count };
    });

    res.json({
      success: true,
      categories: enrichedCategories,
      totalScenarios: allScenarios.length
    });
  } catch (error: any) {
    res.status(500).json({ error: 'خطا در دریافت دسته‌بندی‌ها' });
  }
});

// GET /api/scenarios/:id - Get Single Scenario with View Count Increment
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const scenarios = await getCanonicalScenarios();
    const scenario = scenarios.find(s => s.id === id);

    if (!scenario) {
      return res.status(404).json({ error: 'سناریو مورد نظر یافت نشد.' });
    }

    // Increment view count asynchronously
    const newViews = (scenario.views || 0) + 1;
    await DBEngine.updateRecord('scenarios', id, { views: newViews });
    scenario.views = newViews;

    res.json({
      success: true,
      scenario: scenario
    });
  } catch (error: any) {
    res.status(500).json({ error: 'خطا در دریافت جزئیات سناریو' });
  }
});

// POST /api/scenarios/:id/like - Like a Scenario
router.post('/:id/like', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const scenarios = await getCanonicalScenarios();
    const scenario = scenarios.find(s => s.id === id);

    if (!scenario) {
      return res.status(404).json({ error: 'سناریو یافت نشد.' });
    }

    const newLikes = (scenario.likes || 0) + 1;
    await DBEngine.updateRecord('scenarios', id, { likes: newLikes });

    res.json({
      success: true,
      likes: newLikes
    });
  } catch (error: any) {
    res.status(500).json({ error: 'خطا در ثبت لایک' });
  }
});

// POST /api/scenarios - Create Scenario (Admin/Moderator)
router.post('/', authenticateToken, requireRole([Role.ADMIN, Role.MODERATOR]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, situation, opponentLine, environment, difficulty, responses, technique, bodyLanguage, teachingNote, goal, triggers, keywords, aliases } = req.body;

    if (!title || !situation) {
      return res.status(400).json({ error: 'عنوان و موقعیت سناریو الزامی است.' });
    }

    const now = new Date().toISOString();

    let parsedTriggers: string[] = [];
    if (Array.isArray(triggers)) {
      parsedTriggers = triggers.map(String).map(t => t.trim()).filter(Boolean);
    } else if (typeof triggers === 'string' && triggers.trim()) {
      parsedTriggers = triggers.split(/[,\n;|،]+/).map(t => t.trim()).filter(Boolean);
    }
    if (parsedTriggers.length === 0) {
      parsedTriggers = [title.trim()];
      if (opponentLine && opponentLine.trim() !== title.trim()) {
        parsedTriggers.push(opponentLine.trim());
      }
    }

    let parsedKeywords: string[] = [];
    if (Array.isArray(keywords)) {
      parsedKeywords = keywords.map(String).map(k => k.trim()).filter(Boolean);
    } else if (typeof keywords === 'string' && keywords.trim()) {
      parsedKeywords = keywords.split(/[,\n;|،]+/).map(k => k.trim()).filter(Boolean);
    }

    let parsedAliases: string[] = [];
    if (Array.isArray(aliases)) {
      parsedAliases = aliases.map(String).map(a => a.trim()).filter(Boolean);
    } else if (typeof aliases === 'string' && aliases.trim()) {
      parsedAliases = aliases.split(/[,\n;|،]+/).map(a => a.trim()).filter(Boolean);
    }

    const newScenario: ScenarioItem = {
      id: 'scen_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      title: title.trim(),
      situation: situation.trim(),
      opponentLine: opponentLine ? opponentLine.trim() : undefined,
      environment: environment ? environment.trim() : 'شیت‌تست و سنجش عیار',
      difficulty: difficulty || 'medium',
      goal: goal || 'جذابیت و کنترل مکالمه',
      triggers: parsedTriggers,
      keywords: parsedKeywords,
      aliases: parsedAliases,
      responses: {
        charismatic: responses?.charismatic || '',
        funny: responses?.funny || '',
        confident: responses?.confident || '',
        mysterious: responses?.mysterious || '',
        mature: responses?.mature || ''
      },
      technique: technique || '',
      bodyLanguage: bodyLanguage || '',
      teachingNote: teachingNote || '',
      createdAt: now,
      updatedAt: now,
      views: 0,
      likes: 0
    };

    await DBEngine.insertRecord('scenarios', newScenario);
    CoachLoader.reload();
    coachEngine.reindex();

    res.status(201).json({ success: true, scenario: newScenario });
  } catch (error: any) {
    console.error("Error creating scenario:", error);
    res.status(500).json({ error: "خطا در ایجاد سناریو جدید" });
  }
});

// PUT /api/scenarios/:id - Update Scenario (Admin/Moderator)
router.put('/:id', authenticateToken, requireRole([Role.ADMIN, Role.MODERATOR]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, situation, opponentLine, environment, difficulty, responses, technique, bodyLanguage, teachingNote, goal, triggers, keywords, aliases } = req.body;

    const scenarios = await getCanonicalScenarios();
    const scenario = scenarios.find(s => s.id === id);
    if (!scenario) {
      return res.status(404).json({ error: 'سناریو مورد نظر یافت نشد.' });
    }

    const now = new Date().toISOString();

    let parsedTriggers: string[] | undefined = undefined;
    if (triggers !== undefined) {
      if (Array.isArray(triggers)) {
        parsedTriggers = triggers.map(String).map(t => t.trim()).filter(Boolean);
      } else if (typeof triggers === 'string') {
        parsedTriggers = triggers.split(/[,\n;|،]+/).map(t => t.trim()).filter(Boolean);
      }
    }

    let parsedKeywords: string[] | undefined = undefined;
    if (keywords !== undefined) {
      if (Array.isArray(keywords)) {
        parsedKeywords = keywords.map(String).map(k => k.trim()).filter(Boolean);
      } else if (typeof keywords === 'string') {
        parsedKeywords = keywords.split(/[,\n;|،]+/).map(k => k.trim()).filter(Boolean);
      }
    }

    let parsedAliases: string[] | undefined = undefined;
    if (aliases !== undefined) {
      if (Array.isArray(aliases)) {
        parsedAliases = aliases.map(String).map(a => a.trim()).filter(Boolean);
      } else if (typeof aliases === 'string') {
        parsedAliases = aliases.split(/[,\n;|،]+/).map(a => a.trim()).filter(Boolean);
      }
    }

    const updatedData: Partial<ScenarioItem> = {
      title: title !== undefined ? title.trim() : scenario.title,
      situation: situation !== undefined ? situation.trim() : scenario.situation,
      opponentLine: opponentLine !== undefined ? opponentLine.trim() : scenario.opponentLine,
      environment: environment !== undefined ? environment.trim() : scenario.environment,
      difficulty: difficulty !== undefined ? difficulty : scenario.difficulty,
      goal: goal !== undefined ? goal : scenario.goal,
      triggers: parsedTriggers !== undefined ? parsedTriggers : scenario.triggers,
      keywords: parsedKeywords !== undefined ? parsedKeywords : scenario.keywords,
      aliases: parsedAliases !== undefined ? parsedAliases : scenario.aliases,
      responses: {
        charismatic: responses?.charismatic !== undefined ? responses.charismatic : scenario.responses.charismatic,
        funny: responses?.funny !== undefined ? responses.funny : scenario.responses.funny,
        confident: responses?.confident !== undefined ? responses.confident : scenario.responses.confident,
        mysterious: responses?.mysterious !== undefined ? responses.mysterious : scenario.responses.mysterious,
        mature: responses?.mature !== undefined ? responses.mature : scenario.responses.mature
      },
      technique: technique !== undefined ? technique : scenario.technique,
      bodyLanguage: bodyLanguage !== undefined ? bodyLanguage : scenario.bodyLanguage,
      teachingNote: teachingNote !== undefined ? teachingNote : scenario.teachingNote,
      updatedAt: now
    };

    await DBEngine.updateRecord('scenarios', id, updatedData);
    CoachLoader.reload();
    coachEngine.reindex();

    res.json({ success: true, scenario: { ...scenario, ...updatedData } });
  } catch (error: any) {
    console.error('Error updating scenario:', error);
    res.status(500).json({ error: 'خطا در ویرایش سناریو' });
  }
});

// DELETE /api/scenarios/:id - Delete Scenario (Admin Only)
router.delete("/:id", authenticateToken, requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const scenario = await DBEngine.findById<ScenarioItem>("scenarios", id);
    if (!scenario) {
      return res.status(404).json({ error: "سناریو مورد نظر یافت نشد." });
    }
    await DBEngine.deleteRecord("scenarios", id);
    CoachLoader.reload();
    coachEngine.reindex();
    res.json({ success: true, message: "سناریو با موفقیت حذف شد." });
  } catch (error: any) {
    res.status(500).json({ error: "خطا در حذف سناریو" });
  }
});

// POST /api/scenarios/import-excel
router.post('/import-excel', authenticateToken, requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows, defaultCategory } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ 
        error: 'داده‌های وارد شده خالی یا نامعتبر هستند. لطفاً فایل اکسل یا جیسون معتبر با حداقل یک سطر آپلود کنید.' 
      });
    }

    if (rows.length > 100000) {
      return res.status(400).json({ 
        error: 'تعداد سطرهای ارسالی بیش از ۱۰۰,۰۰۰ سطر است. لطفاً داده‌ها را در دسته‌های کوچک‌تر بارگذاری فرمایید.' 
      });
    }

    const scenarios = await DBEngine.readTable<ScenarioItem>('scenarios');
    const now = new Date().toISOString();
    
    // Fast O(1) lookup Map for deduplication
    const existingMap = new Map<string, ScenarioItem>();
    for (const s of scenarios) {
      if (s.title) existingMap.set(normalizePersian(s.title).toLowerCase(), s);
      if (s.situation) existingMap.set(normalizePersian(s.situation).toLowerCase(), s);
    }

    const recordsToBatchUpsert: ScenarioItem[] = [];
    let importedCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const title = (row.title || row.scenario_title || row['عنوان'] || row['نام سناریو'] || row['عنوان سناریو'] || '').toString().trim();
        const situation = (row.situation || row['موقعیت'] || row['صورت مسئله'] || row['متن موقعیت'] || '').toString().trim();

        if (!title && !situation) {
          errors.push(`سطر ${i + 1}: عنوان و موقعیت خالی است`);
          continue;
        }

        const finalTitle = title || (situation.length > 50 ? situation.slice(0, 47) + '...' : situation);
        const finalSituation = situation || finalTitle;

        // Extract Category / Environment
        const rawCat = row.environment || row.category || row['دسته‌بندی'] || row['دسته بندی'] || row['دسته'] || defaultCategory || '';
        const mappedCategory = getMasterCategoryTitle(rawCat);

        // Extract raw responses from multiple potential column names
        let charismatic = (row.charismatic || row.tone_charismatic || row.tone_1 || row['پاسخ کاریزماتیک'] || row['کاریزماتیک'] || row['باکلاس'] || row['پاسخ باکلاس'] || '').toString().trim();
        let funny = (row.funny || row.tone_funny || row.tone_2 || row['پاسخ شوخ‌طبع'] || row['شوخ طبع'] || row['شوخ‌طبع'] || row['طنز'] || row['فان'] || row['رندانه'] || '').toString().trim();
        let confident = (row.confident || row.tone_confident || row.tone_3 || row.direct || row['پاسخ مقتدر'] || row['مقتدر'] || row['قاطع'] || row['با اعتماد به نفس'] || row['با اعتمادبه‌نفس'] || row['آلفا'] || '').toString().trim();
        let mysterious = (row.mysterious || row.tone_mysterious || row.tone_4 || row.emotional || row['پاسخ مرموز'] || row['مرموز'] || row['پرکشش'] || row['چندلایه'] || '').toString().trim();
        let mature = (row.mature || row.tone_mature || row.tone_5 || row.psychology || row['پاسخ متین'] || row['متین'] || row['پخته'] || row['بالغ'] || row['دیپلماتیک'] || '').toString().trim();

        // If any of the 5 canonical tones is missing, dynamically synthesize distinct Persian tone variations
        const hasMissingTone = !charismatic || !funny || !confident || !mysterious || !mature;
        if (hasMissingTone) {
          const baseText = charismatic || confident || funny || mysterious || mature || finalSituation;
          const synthesized = PersonaGenerator.generateVariations(baseText, null, finalTitle, i);
          if (!charismatic) charismatic = synthesized.charismatic;
          if (!funny) funny = synthesized.funny;
          if (!confident) confident = synthesized.confident;
          if (!mysterious) mysterious = synthesized.mysterious;
          if (!mature) mature = synthesized.mature;
        }

        const opponentLine = (row.opponentLine || row.opponent_line || row['پیام مخاطب'] || row['کلام طرف مقابل'] || '').toString().trim();
        const technique = (row.technique || row['تکنیک'] || row['روانشناسی'] || 'کنترل فریم کلامی و حفظ ارزش بدون نیاز به تایید.').toString().trim();
        const bodyLanguage = (row.bodyLanguage || row.body_language || row['زبان بدن'] || 'نگاه مستقیم، لبخند خونسرد و مکث آرام.').toString().trim();
        const teachingNote = (row.teachingNote || row.teaching_note || row['نکته آموزشی'] || row['گام بعدی'] || 'مکث کوتاه، لبخند خونسرد و هدایت هوشمندانه مکالمه.').toString().trim();
        const difficulty = row.difficulty === 'hard' || row['دشواری'] === 'چالش‌برانگیز' ? 'hard' : (row.difficulty === 'easy' || row['دشواری'] === 'آسان' ? 'easy' : 'medium');

        // Extract Triggers / Keywords / Aliases from Excel columns
        let triggers: string[] = [];
        const rawTriggers = row.triggers || row.trigger || row['عبارت‌های جستجو'] || row['تریگر'] || row['نمونه سوال'] || row['پیام‌ها'] || row['عبارات کلیدی'];
        if (Array.isArray(rawTriggers)) {
          triggers = rawTriggers.map(String).map(t => t.trim()).filter(Boolean);
        } else if (typeof rawTriggers === 'string' && rawTriggers.trim()) {
          triggers = rawTriggers.split(/[,\n;|،]+/).map(t => t.trim()).filter(Boolean);
        }
        if (triggers.length === 0) {
          triggers = [finalTitle];
          if (opponentLine && opponentLine !== finalTitle) {
            triggers.push(opponentLine);
          }
        }

        let keywords: string[] = [];
        const rawKeywords = row.keywords || row.keyword || row['کلمات کلیدی'] || row['کلمات'] || row['تگ‌ها'] || row['برچسب‌ها'];
        if (Array.isArray(rawKeywords)) {
          keywords = rawKeywords.map(String).map(k => k.trim()).filter(Boolean);
        } else if (typeof rawKeywords === 'string' && rawKeywords.trim()) {
          keywords = rawKeywords.split(/[,\n;|،]+/).map(k => k.trim()).filter(Boolean);
        }

        let aliases: string[] = [];
        const rawAliases = row.aliases || row.alias || row['مترادف'] || row['هم‌معنی'];
        if (Array.isArray(rawAliases)) {
          aliases = rawAliases.map(String).map(a => a.trim()).filter(Boolean);
        } else if (typeof rawAliases === 'string' && rawAliases.trim()) {
          aliases = rawAliases.split(/[,\n;|،]+/).map(a => a.trim()).filter(Boolean);
        }

        // Check if duplicate exists via fast Map lookup
        const normTitle = normalizePersian(finalTitle).toLowerCase();
        const normSit = normalizePersian(finalSituation).toLowerCase();
        const existing = existingMap.get(normTitle) || existingMap.get(normSit);

        if (existing) {
          const updatedItem: ScenarioItem = {
            ...existing,
            title: finalTitle,
            situation: finalSituation,
            opponentLine: opponentLine || existing.opponentLine,
            environment: mappedCategory || existing.environment,
            triggers: triggers.length > 0 ? triggers : existing.triggers,
            keywords: keywords.length > 0 ? keywords : existing.keywords,
            aliases: aliases.length > 0 ? aliases : existing.aliases,
            responses: {
              charismatic: charismatic || existing.responses.charismatic,
              funny: funny || existing.responses.funny,
              confident: confident || existing.responses.confident,
              mysterious: mysterious || existing.responses.mysterious,
              mature: mature || existing.responses.mature
            },
            technique: technique || existing.technique,
            bodyLanguage: bodyLanguage || existing.bodyLanguage,
            teachingNote: teachingNote || existing.teachingNote,
            updatedAt: now
          };
          recordsToBatchUpsert.push(updatedItem);
          existingMap.set(normTitle, updatedItem);
          existingMap.set(normSit, updatedItem);
          updatedCount++;
        } else {
          const newScenario: ScenarioItem = {
            id: row.id ? String(row.id) : ('scen_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substr(2, 5)),
            title: finalTitle,
            situation: finalSituation,
            opponentLine: opponentLine || undefined,
            environment: mappedCategory,
            difficulty,
            goal: row.goal || 'جذابیت و کنترل مکالمه',
            triggers,
            keywords,
            aliases,
            responses: {
              charismatic,
              funny,
              confident,
              mysterious,
              mature
            },
            technique,
            bodyLanguage,
            teachingNote,
            createdAt: now,
            updatedAt: now,
            views: 0,
            likes: 0
          };
          recordsToBatchUpsert.push(newScenario);
          existingMap.set(normTitle, newScenario);
          existingMap.set(normSit, newScenario);
          importedCount++;
        }
      } catch (rowErr: any) {
        errors.push(`سطر ${i + 1}: ${rowErr.message || 'خطای ناشناخته'}`);
      }
    }

    // Execute atomic batch upsert
    if (recordsToBatchUpsert.length > 0) {
      await DBEngine.batchUpsertRecords('scenarios', recordsToBatchUpsert);
      
      // Synchronize Coach in-memory index
      CoachLoader.reload();
      coachEngine.reindex();
    }

    res.json({
      success: true,
      message: `عملیات با موفقیت انجام شد. ${importedCount} سناریو افزوده و ${updatedCount} سناریو به‌روزرسانی شد. تمام سناریوها با ۵ لحن متمایز آماده هستند.`,
      importedCount,
      updatedCount,
      totalProcessed: recordsToBatchUpsert.length,
      errors: errors.slice(0, 20)
    });
  } catch (error: any) {
    console.error('Import Excel Error:', error);
    res.status(500).json({ 
      error: 'خطا در درون‌ریزی فایل: ' + (error.message || 'خطای داخلی سرور') 
    });
  }
});

// POST /api/scenarios/ingest-json - Ingest bulk JSON scenarios into Canonical Bank
router.post('/ingest-json', authenticateToken, requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { items, overwrite = true, autoFillTones = true } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'آرایه معتبر سناریوها ارسال نشده است.'
      });
    }

    const report = await CoachDataPipeline.ingestScenarios(items, { overwrite, autoFillTones });

    res.json({
      success: true,
      message: `عملیات بارگذاری تکمیل شد. ${report.insertedCount} سناریوی جدید افزوده و ${report.updatedCount} سناریو به‌روزرسانی شد.`,
      report
    });
  } catch (error: any) {
    console.error('Bulk JSON Ingest Error:', error);
    res.status(500).json({
      error: 'خطا در پردازش و ورود اطلاعات سناریوها: ' + (error.message || 'خطای داخلی سرور')
    });
  }
});

// GET /api/scenarios/bank-audit - Audit Canonical Bank health, triggers, and tone coverage
router.get('/bank-audit', authenticateToken, requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const audit = CoachDataPipeline.auditBank();
    res.json({
      success: true,
      audit
    });
  } catch (error: any) {
    console.error('Bank Audit Error:', error);
    res.status(500).json({
      error: 'خطا در حسابرسی بانک سناریو: ' + (error.message || 'خطای داخلی سرور')
    });
  }
});

export default router;
