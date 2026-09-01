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
    const rawResp = raw.responses || {};
    let missingTonesCount = 0;

    const charismatic = rawResp.charismatic || rawResp.tone_1 || raw.goal || '';
    const friendly = rawResp.friendly || rawResp.confident || rawResp.tone_2 || raw.goal || '';
    const mature = rawResp.mature || rawResp.tone_3 || rawResp.charismatic || raw.goal || '';
    const mysterious = rawResp.mysterious || rawResp.tone_4 || raw.goal || '';
    const funny = rawResp.funny || rawResp.tone_5 || raw.goal || '';

    if (!charismatic) { missingTonesCount++; warnings.push('لحن کاریزماتیک/مقتدر (tone_1) تعریف نشده است.'); }
    if (!friendly) { missingTonesCount++; warnings.push('لحن صمیمی/دوستانه (tone_2) تعریف نشده است.'); }
    if (!mature) { missingTonesCount++; warnings.push('لحن باکلاس/متین (tone_3) تعریف نشده است.'); }
    if (!mysterious) { missingTonesCount++; warnings.push('لحن احساسی/رازآلود (tone_4) تعریف نشده است.'); }
    if (!funny) { missingTonesCount++; warnings.push('لحن شوخ‌طبع (tone_5) تعریف نشده است.'); }

    const direct = rawResp.direct || rawResp.tone_1 || rawResp.charismatic || raw.goal || '';
    const emotional = rawResp.emotional || rawResp.tone_4 || rawResp.friendly || '';
    const psychology = rawResp.psychology || rawResp.psychological_analysis || raw.technique || '';

    const sanitizedResponses: CoachToneResponses = {
      direct: direct || 'با کلامی شفاف و مطمئن پیش بروید.',
      funny: funny || charismatic || 'با یک شوخی مؤدبانه و خونسرد جو را منعطف کنید.',
      charismatic: charismatic || 'با متانت و تسلط فضا را مدیریت کنید.',
      emotional: emotional || friendly || charismatic || 'سلام! با صمیمیت و احترام در کنارت هستم.',
      psychology: psychology || 'تحلیل رفتار و زبان بدن متناسب با موقعیت را در نظر داشته باشید.',
      friendly: friendly || charismatic || 'سلام! با صمیمیت و احترام در کنارت هستم.',
      mature: mature || charismatic || 'با وقار، پرستیژ و آرامش ارتباط را پیش ببرید.',
      mysterious: mysterious || charismatic || 'با نگاهی عمیق و پاسخی سنجیده کنجکاوی طرف مقابل را حفظ کنید.',
      tone_1: direct || charismatic || 'با متانت و تسلط فضا را مدیریت کنید.',
      tone_2: funny || charismatic || 'با یک شوخی مؤدبانه و خونسرد جو را منعطف کنید.',
      tone_3: charismatic || 'با وقار، پرستیژ و آرامش ارتباط را پیش ببرید.',
      tone_4: emotional || friendly || 'سلام! با صمیمیت و احترام در کنارت هستم.',
      tone_5: psychology || 'با نگاهی عمیق و پاسخی سنجیده کنجکاوی طرف مقابل را حفظ کنید.',
      psychological_analysis: psychology || raw.technique || ''
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
