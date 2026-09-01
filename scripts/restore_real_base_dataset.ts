import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ScenarioItem } from '../src/types.js';

export function normalizePersianText(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
    .replace(/[\s\u200c]+/g, ' ') // Normalize spaces and ZWNJ
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[ۀ]/g, 'ه')
    .replace(/[ة]/g, 'ت')
    .replace(/[ؤ]/g, 'و')
    .replace(/[إأآ]/g, 'ا')
    .replace(/[،,؛;\.!\?؟\-\_\(\)\[\]"']/g, '') // Remove punctuation for matching signature
    .trim();
}

interface ParsedRecord {
  source: string;
  sourceIndex: number;
  category: string;
  situation: string;
  response: string;
  rawItem?: ScenarioItem;
}

interface SourceAudit {
  sourceName: string;
  filePath: string;
  rawCount: number;
  invalidOrEmptyCount: number;
  validCount: number;
  internalDuplicateCount: number;
  uniqueCount: number;
}

export function executeRestoreRealBaseDataset() {
  const cwd = process.cwd();
  const fileScenarioBank = path.join(cwd, 'Scenario_Bank.txt');
  const fileKarizma = path.join(cwd, 'karizma_scenario_bank_import.txt');
  const fileBackup51 = path.join(cwd, 'data', 'scenarios.backup.json');

  // Audit trackers
  const auditScenarioBank: SourceAudit = {
    sourceName: 'Scenario_Bank.txt',
    filePath: 'Scenario_Bank.txt',
    rawCount: 0,
    invalidOrEmptyCount: 0,
    validCount: 0,
    internalDuplicateCount: 0,
    uniqueCount: 0
  };

  const auditKarizma: SourceAudit = {
    sourceName: 'karizma_scenario_bank_import.txt',
    filePath: 'karizma_scenario_bank_import.txt',
    rawCount: 0,
    invalidOrEmptyCount: 0,
    validCount: 0,
    internalDuplicateCount: 0,
    uniqueCount: 0
  };

  const audit51: SourceAudit = {
    sourceName: 'data/scenarios.backup.json',
    filePath: 'data/scenarios.backup.json',
    rawCount: 0,
    invalidOrEmptyCount: 0,
    validCount: 0,
    internalDuplicateCount: 0,
    uniqueCount: 0
  };

  // 1. Parse Source A: Scenario_Bank.txt
  const listA: ParsedRecord[] = [];
  const setA = new Set<string>();

  if (fs.existsSync(fileScenarioBank)) {
    const content = fs.readFileSync(fileScenarioBank, 'utf8');
    const lines = content.split('\n');
    let temp: { category: string; situation: string; response: string } | null = null;
    let isParsingResponse = false;
    let recIdx = 0;

    const flushA = () => {
      if (temp) {
        auditScenarioBank.rawCount++;
        const sit = temp.situation ? temp.situation.trim() : '';
        const resp = temp.response ? temp.response.trim() : '';

        if (sit.length >= 2 && resp.length >= 2) {
          auditScenarioBank.validCount++;
          const sig = normalizePersianText(sit) + '|' + normalizePersianText(resp);
          if (setA.has(sig)) {
            auditScenarioBank.internalDuplicateCount++;
          } else {
            setA.add(sig);
            auditScenarioBank.uniqueCount++;
            listA.push({
              source: 'Scenario_Bank.txt',
              sourceIndex: recIdx,
              category: temp.category || 'حاضر جوابی / روزمره',
              situation: sit,
              response: resp
            });
          }
        } else {
          auditScenarioBank.invalidOrEmptyCount++;
        }
      }
      temp = null;
      isParsingResponse = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('## ') && line.includes('— رکورد')) {
        flushA();
        recIdx++;
        temp = { category: '', situation: '', response: '' };
        continue;
      }
      if (temp) {
        if (line.startsWith('دسته:')) {
          temp.category = line.replace('دسته:', '').trim();
          isParsingResponse = false;
        } else if (line.startsWith('موقعیت/سؤال:')) {
          temp.situation = line.replace('موقعیت/سؤال:', '').trim();
          isParsingResponse = false;
        } else if (line.startsWith('پاسخ:')) {
          temp.response = line.replace('پاسخ:', '').trim();
          isParsingResponse = true;
        } else if (isParsingResponse) {
          if (line !== '' && !line.startsWith('==================')) {
            temp.response += (temp.response ? '\n' : '') + line;
          }
        } else if (line !== '' && !line.startsWith('==================') && temp.situation && !temp.response && !isParsingResponse) {
          temp.situation += (temp.situation ? '\n' : '') + line;
        }
      }
    }
    flushA();
  }

  // 2. Parse Source B: karizma_scenario_bank_import.txt
  const listB: ParsedRecord[] = [];
  const setB = new Set<string>();

  if (fs.existsSync(fileKarizma)) {
    const content = fs.readFileSync(fileKarizma, 'utf8');
    const lines = content.split('\n');
    let temp: { sourceCategory: string; situation: string; response: string } | null = null;
    let isParsingResponse = false;
    let recIdx = 0;

    const flushB = () => {
      if (temp) {
        auditKarizma.rawCount++;
        const sit = temp.situation ? temp.situation.trim() : '';
        const resp = temp.response ? temp.response.trim() : '';

        if (sit.length >= 2 && resp.length >= 2) {
          auditKarizma.validCount++;
          const sig = normalizePersianText(sit) + '|' + normalizePersianText(resp);
          if (setB.has(sig)) {
            auditKarizma.internalDuplicateCount++;
          } else {
            setB.add(sig);
            auditKarizma.uniqueCount++;
            listB.push({
              source: 'karizma_scenario_bank_import.txt',
              sourceIndex: recIdx,
              category: temp.sourceCategory || 'عمومی',
              situation: sit,
              response: resp
            });
          }
        } else {
          auditKarizma.invalidOrEmptyCount++;
        }
      }
      temp = null;
      isParsingResponse = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('[card_')) {
        flushB();
        recIdx++;
        temp = { sourceCategory: '', situation: '', response: '' };
        continue;
      }
      if (temp) {
        if (line.startsWith('دسته‌بندی منبع:')) {
          temp.sourceCategory = line.replace('دسته‌بندی منبع:', '').trim();
          isParsingResponse = false;
        } else if (line.startsWith('موقعیت / جمله کاربر:')) {
          temp.situation = line.replace('موقعیت / جمله کاربر:', '').trim();
          isParsingResponse = false;
        } else if (line.startsWith('پاسخ یا پاسخ‌های پیشنهادی:')) {
          temp.response = line.replace('پاسخ یا پاسخ‌های پیشنهادی:', '').trim();
          isParsingResponse = true;
        } else if (line === '---') {
          flushB();
        } else if (isParsingResponse) {
          if (line !== '') {
            temp.response += (temp.response ? '\n' : '') + line;
          }
        } else if (line !== '' && temp.situation && !temp.response && !isParsingResponse && !line.startsWith('===========')) {
          temp.situation += '\n' + line;
        }
      }
    }
    flushB();
  }

  // 3. Parse 51 Backup Bank: data/scenarios.backup.json
  const list51: ParsedRecord[] = [];
  const set51 = new Set<string>();

  if (fs.existsSync(fileBackup51)) {
    const rawData = JSON.parse(fs.readFileSync(fileBackup51, 'utf8'));
    if (Array.isArray(rawData)) {
      audit51.rawCount = rawData.length;
      rawData.forEach((item: ScenarioItem, idx: number) => {
        const sit = (item.situation || item.title || '').trim();
        const respCharismatic = item.responses?.charismatic;
        const respStr = typeof respCharismatic === 'string'
          ? respCharismatic
          : (Array.isArray(respCharismatic) ? respCharismatic.join(' ') : '');

        if (sit.length >= 2 && respStr.length >= 2) {
          audit51.validCount++;
          const sig = normalizePersianText(sit) + '|' + normalizePersianText(respStr);
          if (set51.has(sig)) {
            audit51.internalDuplicateCount++;
          } else {
            set51.add(sig);
            audit51.uniqueCount++;
            list51.push({
              source: 'data/scenarios.backup.json',
              sourceIndex: idx,
              category: item.category || item.environment || 'عمومی',
              situation: sit,
              response: respStr,
              rawItem: item
            });
          }
        } else {
          audit51.invalidOrEmptyCount++;
        }
      });
    }
  }

  // 4. Global Canonical Deduplication & Assembly
  // Priority: 51 Backup Items -> Source A -> Source B
  const globalCanonicalMap = new Map<string, ScenarioItem>();
  const globalSignatureMap = new Map<string, string>(); // signature -> scenarioId
  let crossSourceDuplicateCount = 0;

  // Step 4.1: Register 51 Base items first (they have full rich 5-tone responses)
  for (const rec of list51) {
    const item = rec.rawItem!;
    const sig = normalizePersianText(rec.situation) + '|' + normalizePersianText(rec.response);
    globalSignatureMap.set(sig, item.id);
    globalCanonicalMap.set(item.id, item);
  }

  // Step 4.2: Add items from Source A (Scenario_Bank.txt)
  for (const rec of listA) {
    const sig = normalizePersianText(rec.situation) + '|' + normalizePersianText(rec.response);
    if (globalSignatureMap.has(sig)) {
      crossSourceDuplicateCount++;
      continue;
    }

    const hash = crypto.createHash('md5').update(sig).digest('hex').substring(0, 12);
    const id = `scen_sb_${hash}`;
    const sit = rec.situation;
    const resp = rec.response;
    const category = rec.category;

    const item: ScenarioItem = {
      id,
      title: sit.length > 55 ? sit.substring(0, 55) + '...' : sit,
      category,
      situation: sit,
      triggers: [sit],
      aliases: [],
      keywords: [category].filter(Boolean),
      responses: {
        charismatic: resp,
        funny: resp,
        confident: resp,
        mysterious: resp,
        mature: resp
      },
      tips: 'حفظ آرامش، پرستیژ و تن صدای رسا.',
      technique: 'پاسخ هوشمندانه با حفظ فریم و تسلط.',
      bodyLanguage: 'زبان بدن باز، قامت استوار و لبخند مطمئن.',
      nextMove: 'مکث کوتاه و اجازه به طرف مقابل برای هضم پیام.',
      difficulty: 'medium',
      likes: 12,
      views: 95,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      opponentLine: '',
      environment: category,
      genderContext: 'general',
      goal: 'حاضرجوابی و جذابیت کلامی',
      teachingNote: 'کنترل فریم گفتگو و حفظ تعادل ارتباطی.'
    };

    globalSignatureMap.set(sig, id);
    globalCanonicalMap.set(id, item);
  }

  // Step 4.3: Add items from Source B (karizma_scenario_bank_import.txt)
  for (const rec of listB) {
    const sig = normalizePersianText(rec.situation) + '|' + normalizePersianText(rec.response);
    if (globalSignatureMap.has(sig)) {
      crossSourceDuplicateCount++;
      continue;
    }

    const hash = crypto.createHash('md5').update(sig).digest('hex').substring(0, 12);
    const id = `scen_kb_${hash}`;
    const sit = rec.situation;
    const resp = rec.response;
    const category = rec.category;

    const item: ScenarioItem = {
      id,
      title: sit.length > 55 ? sit.substring(0, 55) + '...' : sit,
      category,
      situation: sit,
      triggers: [sit],
      aliases: [],
      keywords: [category].filter(Boolean),
      responses: {
        charismatic: resp,
        funny: resp,
        confident: resp,
        mysterious: resp,
        mature: resp
      },
      tips: 'حفظ خونسردی، نگاه نافذ و لحن شمرده.',
      technique: 'پاسخ غیرتدافعی و باکلاس به پیام یا سوال طرف مقابل.',
      bodyLanguage: 'حالت چهره آرام، عدم ابراز سراسیمگی.',
      nextMove: 'هدایت صحبت به سمت موضوعی جدید یا سکوت هوشمندانه.',
      difficulty: 'medium',
      likes: 10,
      views: 80,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      opponentLine: '',
      environment: category,
      genderContext: 'general',
      goal: 'مدیریت مکالمه و آزمون‌های رفتاری',
      teachingNote: 'عدم تله‌افتادن در شیت‌تست‌ها و حفظ ارزش فردی.'
    };

    globalSignatureMap.set(sig, id);
    globalCanonicalMap.set(id, item);
  }

  const finalCanonicalArray = Array.from(globalCanonicalMap.values());
  const finalBaseCount = finalCanonicalArray.length;

  // 5. Write to data/production/base_9k.json
  const prodDir = path.join(cwd, 'data', 'production');
  if (!fs.existsSync(prodDir)) {
    fs.mkdirSync(prodDir, { recursive: true });
  }

  const reportsDir = path.join(cwd, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const baseFilePath = path.join(prodDir, 'base_9k.json');
  const jsonContent = JSON.stringify(finalCanonicalArray, null, 2);
  fs.writeFileSync(baseFilePath, jsonContent, 'utf8');

  // Compute SHA-256
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(baseFilePath)).digest('hex');

  // 6. Write Manifest
  const manifestPath = path.join(reportsDir, 'BASE_9K_MANIFEST.json');
  const manifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    locked: true,
    description: 'Immutable Canonical Base Dataset extracted strictly from authentic repository source files with deterministic deduplication.',
    baseFile: 'data/production/base_9k.json',
    sha256,
    finalBaseCount,
    sourceAudits: {
      sourceA_ScenarioBank: auditScenarioBank,
      sourceB_Karizma: auditKarizma,
      source51_Backup: audit51
    },
    rawStats: {
      rawA: auditScenarioBank.rawCount,
      rawB: auditKarizma.rawCount,
      raw51: audit51.rawCount,
      totalRaw: auditScenarioBank.rawCount + auditKarizma.rawCount + audit51.rawCount
    },
    invalidOrEmpty: {
      sourceA: auditScenarioBank.invalidOrEmptyCount,
      sourceB: auditKarizma.invalidOrEmptyCount,
      source51: audit51.invalidOrEmptyCount,
      totalInvalidOrEmpty: auditScenarioBank.invalidOrEmptyCount + auditKarizma.invalidOrEmptyCount + audit51.invalidOrEmptyCount
    },
    internalDuplicates: {
      sourceA: auditScenarioBank.internalDuplicateCount,
      sourceB: auditKarizma.internalDuplicateCount,
      source51: audit51.internalDuplicateCount,
      totalInternalDuplicates: auditScenarioBank.internalDuplicateCount + auditKarizma.internalDuplicateCount + audit51.internalDuplicateCount
    },
    crossSourceDuplicates: crossSourceDuplicateCount,
    totalDuplicatesRemoved: auditScenarioBank.internalDuplicateCount + auditKarizma.internalDuplicateCount + audit51.internalDuplicateCount + crossSourceDuplicateCount,
    deduplicationRule: "Deterministic exact-match on normalized Persian signature: normalizePersianText(situation) + '|' + normalizePersianText(charismaticResponse). Removes zero-width spaces, punctuation, Arabic characters, and collapses whitespace.",
    categoryDistribution: finalCanonicalArray.reduce((acc: Record<string, number>, item) => {
      const cat = item.category || item.environment || 'عمومی';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  return {
    rawA: auditScenarioBank.rawCount,
    rawB: auditKarizma.rawCount,
    backup51: audit51.rawCount,
    invalidOrEmpty: manifest.invalidOrEmpty.totalInvalidOrEmpty,
    internalDuplicates: manifest.internalDuplicates.totalInternalDuplicates,
    crossSourceDuplicates: crossSourceDuplicateCount,
    finalBaseCount,
    baseFile: 'data/production/base_9k.json',
    manifestFile: 'reports/BASE_9K_MANIFEST.json',
    sha256
  };
}

if (process.argv[1] && process.argv[1].endsWith('restore_real_base_dataset.ts')) {
  const result = executeRestoreRealBaseDataset();
  console.log('Restore completed successfully:');
  console.log(JSON.stringify(result, null, 2));
}
