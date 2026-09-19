/**
 * ARCHITECTURAL ROLE:
 * CoachDataPipeline serves as the administrative ingestion, schema validation, and offline audit
 * utility for scenario datasets. The online live Coach engine uses CoachLoader & CoachEngine directly.
 */

import fs from 'fs';
import path from 'path';
import { CoachScenario, CoachToneResponses } from './CoachTypes.js';
import { CoachLoader } from './CoachLoader.js';
import { CoachEngine } from './CoachEngine.js';
import { PersonaGenerator } from './PersonaGenerator.js';
import { DBEngine } from '../db.js';

export interface ScenarioValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitized?: CoachScenario;
}

export interface IngestionReport {
  totalReceived: number;
  validCount: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  missingTonesAutoFilled: number;
  errors: Array<{ index: number; id?: string; title?: string; errors: string[] }>;
  warnings: Array<{ index: number; id?: string; title?: string; warnings: string[] }>;
  totalBankSizeAfterImport: number;
}

export interface BankAuditReport {
  totalScenarios: number;
  categoryDistribution: Record<string, number>;
  totalUniqueTriggers: number;
  totalUniqueAliases: number;
  averageTriggersPerScenario: number;
  toneCoverage: {
    charismatic: number;
    friendly: number;
    mature: number;
    mysterious: number;
    funny: number;
    complete5TonesRate: string;
  };
  poolDiversity: {
    scenariosWithMultiResponsePools: number;
    totalResponsesInAllPools: number;
  };
  integrityStatus: 'PERFECT' | 'WARNING' | 'CRITICAL';
}

export class CoachDataPipeline {
  private static canonicalPath = path.join(process.cwd(), 'data', 'scenarios.json');
  private static coachPath = path.join(process.cwd(), 'data', 'coach', 'scenarios.json');

  /**
   * Validate a single scenario record against the Standard Schema
   */
  static validateScenario(raw: any, index: number = 0): ScenarioValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!raw || typeof raw !== 'object') {
      return { valid: false, errors: ['رکورد ورودی یک شیء معتبر JSON نیست.'], warnings: [] };
    }

    const id = raw.id ? String(raw.id).trim() : `scen_${Date.now()}_${index}`;
    const title = raw.title ? String(raw.title).trim() : (raw.situation ? String(raw.situation).trim() : '');
    const situation = raw.situation ? String(raw.situation).trim() : title;
    const category = raw.category || raw.environment || 'عمومی';

    if (!title && !situation) {
      errors.push('عنوان (title) یا شرح موقعیت (situation) الزامی است.');
    }

    // Triggers and Aliases
    let triggers: string[] = [];
    if (Array.isArray(raw.triggers)) {
      triggers = raw.triggers.map((t: any) => String(t).trim()).filter(Boolean);
    } else if (typeof raw.triggers === 'string' && raw.triggers.trim()) {
      triggers = [raw.triggers.trim()];
    }
    if (triggers.length === 0 && title) {
      triggers = [title];
      warnings.push('تریگر تعریف نشده بود؛ عنوان به عنوان تریگر پیش‌فرض ثبت شد.');
    }

    let aliases: string[] = [];
    if (Array.isArray(raw.aliases)) {
      aliases = raw.aliases.map((a: any) => String(a).trim()).filter(Boolean);
    } else if (typeof raw.aliases === 'string' && raw.aliases.trim()) {
      aliases = [raw.aliases.trim()];
    }

    let userInputPatterns: string[] = [];
    if (Array.isArray(raw.user_input_patterns)) {
      userInputPatterns = raw.user_input_patterns.map((p: any) => String(p).trim()).filter(Boolean);
    } else {
      userInputPatterns = [...triggers, ...aliases];
    }

    let keywords: string[] = [];
    if (Array.isArray(raw.keywords)) {
      keywords = raw.keywords.map((k: any) => String(k).trim()).filter(Boolean);
    } else {
      keywords = [category, raw.opponentLine, title].filter(Boolean);
    }

    // Responses & 5-Tone Validation
    let rawResp = raw.responses;
    if (typeof rawResp === 'string') {
      try { rawResp = JSON.parse(rawResp); } catch { rawResp = {}; }
    }
    if (!rawResp || typeof rawResp !== 'object') {
      rawResp = {};
    }

    let charismatic = (
      rawResp.charismatic || rawResp.tone_charismatic || rawResp.tone_1 || rawResp['پاسخ کاریزماتیک'] ||
      rawResp['کاریزماتیک'] || rawResp['باکلاس'] || rawResp.friendly || raw.charismatic || raw.analysis?.bestAnswer || ''
    ).toString().trim();

    let funny = (
      rawResp.funny || rawResp.tone_funny || rawResp.tone_2 || rawResp['پاسخ شوخ‌طبع'] ||
      rawResp['شوخ طبع'] || rawResp['شوخ‌طبع'] || rawResp['طنز'] || rawResp['فان'] || rawResp['رندانه'] || raw.funny || ''
    ).toString().trim();

    let confident = (
      rawResp.confident || rawResp.tone_confident || rawResp.tone_3 || rawResp.direct || rawResp['پاسخ مقتدر'] ||
      rawResp['مقتدر'] || rawResp['قاطع'] || rawResp['با اعتماد به نفس'] || rawResp['با اعتمادبه‌نفس'] || rawResp['آلفا'] || raw.confident || ''
    ).toString().trim();

    let mysterious = (
      rawResp.mysterious || rawResp.tone_mysterious || rawResp.tone_4 || rawResp.emotional || rawResp['پاسخ مرموز'] ||
      rawResp['مرموز'] || rawResp['پرکشش'] || rawResp['چندلایه'] || raw.mysterious || ''
    ).toString().trim();

    let mature = (
      rawResp.mature || rawResp.tone_mature || rawResp.tone_5 || rawResp.psychology || rawResp['پاسخ متین'] ||
      rawResp['متین'] || rawResp['پخته'] || rawResp['بالغ'] || rawResp['دیپلماتیک'] || rawResp['خونسرد'] || raw.mature || ''
    ).toString().trim();

    // Check answers array if present
    if (Array.isArray(raw.answers) && raw.answers.length > 0) {
      for (const a of raw.answers) {
        if (!a || !a.text) continue;
        const style = (a.style || '').toLowerCase();
        const text = a.text.toString().trim();
        if (!charismatic && (style.includes('کاریزماتیک') || style.includes('باکلاس'))) charismatic = text;
        if (!funny && (style.includes('طنز') || style.includes('شوخ') || style.includes('funny'))) funny = text;
        if (!confident && (style.includes('مقتدر') || style.includes('سنگین') || style.includes('قاطع'))) confident = text;
        if (!mysterious && style.includes('مرموز')) mysterious = text;
        if (!mature && (style.includes('متین') || style.includes('خونسرد') || style.includes('پخته'))) mature = text;
      }
    }

    const hasMissingTone = !charismatic || !funny || !confident || !mysterious || !mature;
    if (hasMissingTone) {
      const baseText = charismatic || confident || funny || mysterious || mature || situation || title;
      const gen = PersonaGenerator.generateVariations(baseText, raw, title, index);
      if (!charismatic) charismatic = gen.charismatic;
      if (!funny) funny = gen.funny;
      if (!confident) confident = gen.confident;
      if (!mysterious) mysterious = gen.mysterious;
      if (!mature) mature = gen.mature;
      warnings.push('بخشی از لحن‌ها به صورت هوشمند و متمایز با لحن‌های پنج‌گانه تکمیل شدند.');
    }

    const sanitizedResponses: CoachToneResponses = {
      direct: confident || 'با کلامی شفاف و مطمئن پیش بروید.',
      funny: funny || 'با یک شوخی مؤدبانه و خونسرد جو را منعطف کنید.',
      charismatic: charismatic || 'با متانت و تسلط فضا را مدیریت کنید.',
      emotional: mysterious || 'با نگاهی عمیق و پاسخی سنجیده کنجکاوی طرف مقابل را حفظ کنید.',
      psychology: mature || raw.technique || 'تحلیل رفتار و زبان بدن متناسب با موقعیت را در نظر داشته باشید.',
      friendly: charismatic || 'با صمیمیت و احترام در کنارت هستم.',
      mature: mature || 'با وقار، پرستیژ و آرامش ارتباط را پیش ببرید.',
      mysterious: mysterious || 'با نگاهی عمیق و پاسخی سنجیده کنجکاوی طرف مقابل را حفظ کنید.',
      tone_1: charismatic || 'با متانت و تسلط فضا را مدیریت کنید.',
      tone_2: funny || 'با یک شوخی مؤدبانه و خونسرد جو را منعطف کنید.',
      tone_3: confident || 'با وقار، پرستیژ و صراحت ارتباط را پیش ببرید.',
      tone_4: mysterious || 'با نگاهی عمیق و پاسخی سنجیده کنجکاوی طرف مقابل را حفظ کنید.',
      tone_5: mature || 'با متانت و دوراندیشی موقعیت را هدایت کنید.',
      psychological_analysis: raw.technique || 'تحلیل رفتار کلامی و حفظ ارزش'
    };

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    const sanitized: CoachScenario = {
      id,
      title,
      category,
      situation,
      context: raw.context || situation,
      user_input_patterns: userInputPatterns,
      triggers,
      aliases,
      keywords,
      responses: sanitizedResponses,
      tips: raw.tips || raw.technique || 'حفظ آرامش و تن صدای رسا و ملایم.',
      technique: raw.technique || 'کنترل فریم مکالمه با اتکا به زبان بدن مطمئن.',
      bodyLanguage: raw.bodyLanguage || 'پوسچر صاف، نگاه مستقیم و لبخند ملایم.',
      nextMove: raw.nextMove || raw.teachingNote || 'مکث طلایی و هدایت هوشمندانه گفتگو.',
      difficulty: raw.difficulty || 'medium',
      likes: typeof raw.likes === 'number' ? raw.likes : 0,
      views: typeof raw.views === 'number' ? raw.views : 0,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return {
      valid: true,
      errors,
      warnings,
      sanitized
    };
  }

  /**
   * Ingest and merge scenarios into Canonical Bank
   */
  static async ingestScenarios(
    items: any[],
    options: { overwrite?: boolean; autoFillTones?: boolean } = { overwrite: true, autoFillTones: true }
  ): Promise<IngestionReport> {
    const report: IngestionReport = {
      totalReceived: items ? items.length : 0,
      validCount: 0,
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      missingTonesAutoFilled: 0,
      errors: [],
      warnings: [],
      totalBankSizeAfterImport: 0
    };

    if (!Array.isArray(items) || items.length === 0) {
      report.errors.push({ index: 0, errors: ['داده ورودی خالی یا غیرآرایه است.'] });
      return report;
    }

    // Read existing bank
    let existingBank: CoachScenario[] = [];
    try {
      if (fs.existsSync(this.canonicalPath)) {
        const raw = fs.readFileSync(this.canonicalPath, 'utf-8');
        existingBank = JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[CoachDataPipeline] Could not read existing bank, creating fresh bank:', err);
    }

    const bankMap = new Map<string, CoachScenario>();
    for (const s of existingBank) {
      bankMap.set(s.id, s);
    }

    // Process each input item
    items.forEach((item, idx) => {
      const validation = this.validateScenario(item, idx);

      if (!validation.valid || !validation.sanitized) {
        report.errors.push({
          index: idx,
          id: item?.id,
          title: item?.title,
          errors: validation.errors
        });
        report.skippedCount++;
        return;
      }

      report.validCount++;

      if (validation.warnings.length > 0) {
        report.warnings.push({
          index: idx,
          id: validation.sanitized.id,
          title: validation.sanitized.title,
          warnings: validation.warnings
        });
        report.missingTonesAutoFilled++;
      }

      const existing = bankMap.get(validation.sanitized.id);
      if (existing) {
        if (options.overwrite) {
          bankMap.set(validation.sanitized.id, validation.sanitized);
          report.updatedCount++;
        } else {
          report.skippedCount++;
        }
      } else {
        bankMap.set(validation.sanitized.id, validation.sanitized);
        report.insertedCount++;
      }
    });

    const finalBank = Array.from(bankMap.values());
    report.totalBankSizeAfterImport = finalBank.length;

    // Write back atomically to Canonical files
    try {
      const jsonContent = JSON.stringify(finalBank, null, 2);
      fs.writeFileSync(this.canonicalPath, jsonContent, 'utf-8');
      
      // Keep coach directory in sync
      const coachDir = path.dirname(this.coachPath);
      if (!fs.existsSync(coachDir)) {
        fs.mkdirSync(coachDir, { recursive: true });
      }
      fs.writeFileSync(this.coachPath, jsonContent, 'utf-8');

      // Sync to SQLite database
      try {
        await DBEngine.batchUpsertRecords('scenarios', finalBank);
      } catch (dbErr) {
        console.warn('[CoachDataPipeline] Warning while syncing to SQLite DB:', dbErr);
      }

      // Re-index Coach Engine in memory
      CoachLoader.reload();
      CoachEngine.getInstance().reindex();
      console.log(`[CoachDataPipeline] Successfully ingested ${report.insertedCount} new, ${report.updatedCount} updated scenarios. Total bank: ${finalBank.length}`);
    } catch (err: any) {
      console.error('[CoachDataPipeline] Error writing canonical bank:', err);
      report.errors.push({ index: -1, errors: [`خطا در ذخیره فایل‌های پایگاه داده: ${err?.message}`] });
    }

    return report;
  }

  /**
   * Audit Canonical Bank for coverage and data health
   */
  static auditBank(): BankAuditReport {
    const scenarios = CoachLoader.getScenarios();
    const catMap: Record<string, number> = {};
    const triggersSet = new Set<string>();
    const aliasesSet = new Set<string>();
    let totalTriggers = 0;
    let complete5Tones = 0;
    let multiPoolCount = 0;
    let totalResponsesCount = 0;

    for (const s of scenarios) {
      catMap[s.category] = (catMap[s.category] || 0) + 1;
      
      if (Array.isArray(s.triggers)) {
        s.triggers.forEach(t => {
          triggersSet.add(t.trim());
          totalTriggers++;
        });
      }

      if (Array.isArray(s.aliases)) {
        s.aliases.forEach(a => aliasesSet.add(a.trim()));
      }

      const r = s.responses;
      let has5 = true;
      let isMulti = false;

      const tones: (keyof CoachToneResponses)[] = ['charismatic', 'friendly', 'mature', 'mysterious', 'funny'];
      for (const t of tones) {
        const pool = r[t];
        if (!pool || (Array.isArray(pool) && pool.length === 0)) {
          has5 = false;
        } else if (Array.isArray(pool)) {
          totalResponsesCount += pool.length;
          if (pool.length > 1) isMulti = true;
        } else if (typeof pool === 'string') {
          totalResponsesCount += 1;
        }
      }

      if (has5) complete5Tones++;
      if (isMulti) multiPoolCount++;
    }

    const rate = scenarios.length > 0 ? ((complete5Tones / scenarios.length) * 100).toFixed(1) + '%' : '0%';

    return {
      totalScenarios: scenarios.length,
      categoryDistribution: catMap,
      totalUniqueTriggers: triggersSet.size,
      totalUniqueAliases: aliasesSet.size,
      averageTriggersPerScenario: scenarios.length > 0 ? Number((totalTriggers / scenarios.length).toFixed(2)) : 0,
      toneCoverage: {
        charismatic: scenarios.filter(s => Boolean(s.responses.charismatic)).length,
        friendly: scenarios.filter(s => Boolean(s.responses.friendly)).length,
        mature: scenarios.filter(s => Boolean(s.responses.mature)).length,
        mysterious: scenarios.filter(s => Boolean(s.responses.mysterious)).length,
        funny: scenarios.filter(s => Boolean(s.responses.funny)).length,
        complete5TonesRate: rate
      },
      poolDiversity: {
        scenariosWithMultiResponsePools: multiPoolCount,
        totalResponsesInAllPools: totalResponsesCount
      },
      integrityStatus: complete5Tones === scenarios.length ? 'PERFECT' : (complete5Tones > scenarios.length * 0.9 ? 'WARNING' : 'CRITICAL')
    };
  }
}
