import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { DBEngine } from '../db.js';
import { ScenarioItem, Role } from '../../types.js';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { normalizePersian } from '../utils/persianNormalizer.js';
import { MASTER_CATEGORIES, getMasterCategoryTitle } from '../../data/scenarios.js';
import { CoachDataPipeline } from '../coach/CoachDataPipeline.js';
import { coachEngine, CoachEngine } from '../coach/CoachEngine.js';
import { CoachLoader } from '../coach/CoachLoader.js';

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

    // Database Search by Word or Phrase across Title, Situation, OpponentLine, Technique, and 5-Tone Responses
    if (search) {
      const normSearch = normalizePersian(search).toLowerCase();
      const searchTerms = normSearch.split(/\s+/).filter(Boolean);

      filtered = filtered.filter(s => {
        const titleNorm = normalizePersian(s.title || '').toLowerCase();
        const situationNorm = normalizePersian(s.situation || '').toLowerCase();
        const opponentNorm = normalizePersian(s.opponentLine || '').toLowerCase();
        const techNorm = normalizePersian(s.technique || '').toLowerCase();
        const noteNorm = normalizePersian(s.teachingNote || '').toLowerCase();
        
        const responsesNorm = s.responses
          ? Object.values(s.responses)
              .map(r => (Array.isArray(r) ? r.join(' ') : String(r || '')))
              .map(text => normalizePersian(text).toLowerCase())
              .join(' ')
          : '';

        const fullText = `${titleNorm} ${situationNorm} ${opponentNorm} ${techNorm} ${noteNorm} ${responsesNorm}`;

        // Match either complete phrase or all individual keywords
        if (fullText.includes(normSearch)) return true;
        return searchTerms.every(term => fullText.includes(term));
      });
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
    const { title, situation, opponentLine, environment, difficulty, responses, technique, bodyLanguage, teachingNote, goal } = req.body;

    if (!title || !situation) {
      return res.status(400).json({ error: 'عنوان و موقعیت سناریو الزامی است.' });
    }

    const now = new Date().toISOString();

    const newScenario: ScenarioItem = {
      id: 'scen_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      title: title.trim(),
      situation: situation.trim(),
      opponentLine: opponentLine ? opponentLine.trim() : undefined,
      environment: environment ? environment.trim() : 'شیت‌تست و سنجش عیار',
      difficulty: difficulty || 'medium',
      goal: goal || 'جذابیت و کنترل مکالمه',
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
    const { title, situation, opponentLine, environment, difficulty, responses, technique, bodyLanguage, teachingNote, goal } = req.body;

    const scenarios = await getCanonicalScenarios();
    const scenario = scenarios.find(s => s.id === id);
    if (!scenario) {
      return res.status(404).json({ error: 'سناریو مورد نظر یافت نشد.' });
    }

    const now = new Date().toISOString();

    const updatedData: Partial<ScenarioItem> = {
      title: title !== undefined ? title.trim() : scenario.title,
      situation: situation !== undefined ? situation.trim() : scenario.situation,
      opponentLine: opponentLine !== undefined ? opponentLine.trim() : scenario.opponentLine,
      environment: environment !== undefined ? environment.trim() : scenario.environment,
      difficulty: difficulty !== undefined ? difficulty : scenario.difficulty,
      goal: goal !== undefined ? goal : scenario.goal,
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
        error: 'داده‌های وارد شده خالی یا نامعتبر هستند. لطفاً فایل اکسل معتبر با حداقل یک سطر آپلود کنید.' 
      });
    }

    if (rows.length > 2000) {
      return res.status(400).json({ 
        error: 'تعداد سطرهای فایل بیش از حد مجاز است (حداکثر ۲۰۰۰ سطر). لطفاً فایل را تقسیم کنید.' 
      });
    }

    const scenarios = await DBEngine.readTable<ScenarioItem>('scenarios');
    const now = new Date().toISOString();
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

        // Extract Responses
        const charismatic = (row.charismatic || row.tone_charismatic || row['پاسخ کاریزماتیک'] || row['کاریزماتیک'] || row['باکلاس'] || '').toString().trim();
        const funny = (row.funny || row.tone_funny || row['پاسخ شوخ‌طبع'] || row['شوخ طبع'] || row['شوخ‌طبع'] || row['طنز'] || row['فان'] || row['رندانه'] || '').toString().trim();
        const confident = (row.confident || row.tone_confident || row['پاسخ مقتدر'] || row['مقتدر'] || row['قاطع'] || row['با اعتماد به نفس'] || row['با اعتمادبه‌نفس'] || row['آلفا'] || '').toString().trim();
        const mysterious = (row.mysterious || row.tone_mysterious || row['پاسخ مرموز'] || row['مرموز'] || row['پرکشش'] || row['چندلایه'] || '').toString().trim();
        const mature = (row.mature || row.tone_mature || row['پاسخ متین'] || row['متین'] || row['پخته'] || row['بالغ'] || row['دیپلماتیک'] || '').toString().trim();

        const opponentLine = (row.opponentLine || row.opponent_line || row['پیام مخاطب'] || row['کلام طرف مقابل'] || '').toString().trim();
        const technique = (row.technique || row['تکنیک'] || row['روانشناسی'] || '').toString().trim();
        const bodyLanguage = (row.bodyLanguage || row.body_language || row['زبان بدن'] || '').toString().trim();
        const teachingNote = (row.teachingNote || row.teaching_note || row['نکته آموزشی'] || row['گام بعدی'] || '').toString().trim();
        const difficulty = row.difficulty === 'hard' || row['دشواری'] === 'چالش‌برانگیز' ? 'hard' : (row.difficulty === 'easy' || row['دشواری'] === 'آسان' ? 'easy' : 'medium');

        // Check if duplicate exists by title or situation
        const existingIdx = scenarios.findIndex(s => 
          normalizePersian(s.title).toLowerCase() === normalizePersian(finalTitle).toLowerCase() ||
          (s.situation && normalizePersian(s.situation).toLowerCase() === normalizePersian(finalSituation).toLowerCase())
        );

        if (existingIdx !== -1) {
          // Update existing scenario with new details
          const updatedData = {
            ...scenarios[existingIdx],
            environment: mappedCategory || scenarios[existingIdx].environment,
            responses: {
              charismatic: charismatic || scenarios[existingIdx].responses.charismatic,
              funny: funny || scenarios[existingIdx].responses.funny,
              confident: confident || scenarios[existingIdx].responses.confident,
              mysterious: mysterious || scenarios[existingIdx].responses.mysterious,
              mature: mature || scenarios[existingIdx].responses.mature
            },
            technique: technique || scenarios[existingIdx].technique,
            bodyLanguage: bodyLanguage || scenarios[existingIdx].bodyLanguage,
            teachingNote: teachingNote || scenarios[existingIdx].teachingNote,
            updatedAt: now
          };
          await DBEngine.updateRecord('scenarios', scenarios[existingIdx].id, updatedData);
          updatedCount++;
        } else {
          // Create new scenario
          const newScenario: ScenarioItem = {
            id: 'scen_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            title: finalTitle,
            situation: finalSituation,
            opponentLine: opponentLine || undefined,
            environment: mappedCategory,
            difficulty,
            goal: 'جذابیت و کنترل مکالمه',
            responses: {
              charismatic: charismatic || 'پاسخ پیش‌فرض کاریزماتیک با حفظ چارچوب قدرتمند.',
              funny: funny || 'پاسخ شوخ‌طبعانه و رندانه با چاشنی طنز موقعیتی.',
              confident: confident || 'پاسخ صمیمانه و گرم با همدلی موثر.',
              mysterious: mysterious || 'پاسخ تحلیلی و عمیق همراه با جذابیت کلامی.',
              mature: mature || 'پاسخ دیپلماتیک و باوقار برای مدیریت منطقی گفتگو.'
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
          importedCount++;
        }
      } catch (rowErr: any) {
        errors.push(`سطر ${i + 1}: ${rowErr.message || 'خطای ناشناخته'}`);
      }
    }

    // Re-index coach engine
    coachEngine.reindex();

    res.json({
      success: true,
      message: `عملیات تمام شد. ${importedCount} سناریو جدید اضافه و ${updatedCount} سناریو به‌روزرسانی شد.`,
      importedCount,
      updatedCount,
      errors: errors.slice(0, 20)
    });
  } catch (error: any) {
    console.error('Import Excel Error:', error);
    res.status(500).json({ 
      error: 'خطا در درون‌ریزی فایل اکسل: ' + (error.message || 'خطای داخلی سرور') 
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
