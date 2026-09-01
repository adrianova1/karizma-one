import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ScenarioItem } from '../src/types.js';

function norm(t: string): string {
  if (!t) return '';
  return t.toString()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\s\u200c]+/g, ' ')
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[ۀ]/g, 'ه')
    .replace(/[،,؛;\.!\?؟]/g, '')
    .trim();
}

interface SourceStats {
  rawParsed: number;
  accepted: number;
  duplicates: number;
  incomplete: number;
}

export function restoreAndLockBase9k() {
  console.log('=== RESTORING & LOCKING BASE 9K ===');

  const sourceStats: Record<string, SourceStats> = {
    base51: { rawParsed: 0, accepted: 0, duplicates: 0, incomplete: 0 },
    scenarioBankTxt: { rawParsed: 0, accepted: 0, duplicates: 0, incomplete: 0 },
    karizmaImportTxt: { rawParsed: 0, accepted: 0, duplicates: 0, incomplete: 0 },
    sampleImportsTxt: { rawParsed: 0, accepted: 0, duplicates: 0, incomplete: 0 }
  };

  const uniqueSignatures = new Set<string>();
  const uniqueScenariosMap = new Map<string, ScenarioItem>();
  let totalDuplicatesAcrossAll = 0;

  function register(item: ScenarioItem, sourceKey: keyof typeof sourceStats) {
    sourceStats[sourceKey].rawParsed++;

    const sit = (item.situation || item.title || '').trim();
    const respCharismatic = item.responses?.charismatic;
    const respStr = typeof respCharismatic === 'string'
      ? respCharismatic
      : (Array.isArray(respCharismatic) ? respCharismatic.join(' ') : '');

    const sig = norm(sit) + '|' + norm(respStr);

    if (uniqueSignatures.has(sig)) {
      sourceStats[sourceKey].duplicates++;
      totalDuplicatesAcrossAll++;
      return;
    }

    uniqueSignatures.add(sig);
    sourceStats[sourceKey].accepted++;
    uniqueScenariosMap.set(item.id, item);
  }

  // 1. Source 1: data/scenarios.backup.json (51 Base items)
  const backupPath = path.join(process.cwd(), 'data', 'scenarios.backup.json');
  if (fs.existsSync(backupPath)) {
    try {
      const base51: ScenarioItem[] = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      for (const s of base51) {
        register(s, 'base51');
      }
    } catch (e) {
      console.error('Error reading scenarios.backup.json:', e);
    }
  }

  // 2. Source 2: Scenario_Bank.txt
  const sbPath = path.join(process.cwd(), 'Scenario_Bank.txt');
  if (fs.existsSync(sbPath)) {
    const content = fs.readFileSync(sbPath, 'utf8');
    const lines = content.split('\n');
    let temp: any = null;
    let isParsingResponse = false;

    const flushRecord = () => {
      if (temp) {
        const sitTrim = temp.situation ? temp.situation.trim() : '';
        const respTrim = temp.response ? temp.response.trim() : '';
        if (sitTrim.length >= 2 && respTrim.length >= 2) {
          const hash = crypto.createHash('md5').update(norm(sitTrim) + '|' + norm(respTrim)).digest('hex').substring(0, 12);
          const id = `scen_sb_${hash}`;
          const category = temp.category || 'حاضر جوابی / روزمره';
          const item: ScenarioItem = {
            id,
            title: sitTrim.length > 55 ? sitTrim.substring(0, 55) + '...' : sitTrim,
            category,
            situation: sitTrim,
            triggers: [sitTrim],
            aliases: [],
            keywords: [category].filter(Boolean),
            responses: {
              charismatic: respTrim,
              funny: respTrim,
              confident: respTrim,
              mysterious: respTrim,
              mature: respTrim
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
          register(item, 'scenarioBankTxt');
        } else {
          sourceStats.scenarioBankTxt.incomplete++;
        }
      }
      temp = null;
      isParsingResponse = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('## ') && line.includes('— رکورد')) {
        flushRecord();
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
    flushRecord();
  }

  // 3. Source 3: karizma_scenario_bank_import.txt
  const kbPath = path.join(process.cwd(), 'karizma_scenario_bank_import.txt');
  if (fs.existsSync(kbPath)) {
    const content = fs.readFileSync(kbPath, 'utf8');
    const lines = content.split('\n');
    let currentRecord: any = null;
    let isParsingResponse = false;

    const flushCard = () => {
      if (currentRecord) {
        const sitTrim = currentRecord.situation ? currentRecord.situation.trim() : '';
        const respTrim = currentRecord.response ? currentRecord.response.trim() : '';
        if (sitTrim.length >= 2 && respTrim.length >= 2) {
          const hash = crypto.createHash('md5').update(norm(sitTrim) + '|' + norm(respTrim)).digest('hex').substring(0, 12);
          const id = `scen_kb_${hash}`;
          const category = currentRecord.sourceCategory || 'عمومی';
          const item: ScenarioItem = {
            id,
            title: sitTrim.length > 55 ? sitTrim.substring(0, 55) + '...' : sitTrim,
            category,
            situation: sitTrim,
            triggers: [sitTrim],
            aliases: [],
            keywords: [category].filter(Boolean),
            responses: {
              charismatic: respTrim,
              funny: respTrim,
              confident: respTrim,
              mysterious: respTrim,
              mature: respTrim
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
          register(item, 'karizmaImportTxt');
        } else {
          sourceStats.karizmaImportTxt.incomplete++;
        }
      }
      currentRecord = null;
      isParsingResponse = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('[card_')) {
        flushCard();
        currentRecord = { sourceCategory: '', situation: '', response: '' };
        continue;
      }
      if (currentRecord) {
        if (line.startsWith('دسته‌بندی منبع:')) {
          currentRecord.sourceCategory = line.replace('دسته‌بندی منبع:', '').trim();
          isParsingResponse = false;
        } else if (line.startsWith('موقعیت / جمله کاربر:')) {
          currentRecord.situation = line.replace('موقعیت / جمله کاربر:', '').trim();
          isParsingResponse = false;
        } else if (line.startsWith('پاسخ یا پاسخ‌های پیشنهادی:')) {
          currentRecord.response = line.replace('پاسخ یا پاسخ‌های پیشنهادی:', '').trim();
          isParsingResponse = true;
        } else if (line === '---') {
          flushCard();
        } else if (isParsingResponse) {
          if (line !== '') {
            currentRecord.response += (currentRecord.response ? '\n' : '') + line;
          }
        } else if (line !== '' && currentRecord.situation && !currentRecord.response && !isParsingResponse && !line.startsWith('===========')) {
          currentRecord.situation += '\n' + line;
        }
      }
    }
    flushCard();
  }

  // 4. Source 4: Sample Imports
  const sampleImportPath = path.join(process.cwd(), 'data', 'imports', '1_hazir_javabi_sample.txt');
  if (fs.existsSync(sampleImportPath)) {
    const raw = fs.readFileSync(sampleImportPath, 'utf8');
    const lines = raw.split('\n');
    for (const l of lines) {
      const trimmed = l.trim();
      if (trimmed.length > 5 && (trimmed.includes(':') || trimmed.includes('-'))) {
        const parts = trimmed.split(/[:\-]/);
        if (parts.length >= 2) {
          const sit = parts[0].trim();
          const resp = parts.slice(1).join(' ').trim();
          if (sit.length > 2 && resp.length > 2) {
            const hash = crypto.createHash('md5').update(norm(sit) + '|' + norm(resp)).digest('hex').substring(0, 10);
            const id = `scen_import_${hash}`;
            const item: ScenarioItem = {
              id,
              title: sit,
              category: 'حاضرجوابی',
              situation: sit,
              triggers: [sit],
              aliases: [],
              keywords: ['حاضرجوابی'],
              responses: {
                charismatic: resp,
                funny: resp,
                confident: resp,
                mysterious: resp,
                mature: resp
              },
              tips: 'پاسخ محترمانه و دقیق.',
              technique: 'پاسخ مستقیم و صریح.',
              bodyLanguage: 'آرامش چهره.',
              nextMove: 'سکوت موثر.',
              difficulty: 'medium',
              likes: 5,
              views: 40,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              opponentLine: '',
              environment: 'حاضرجوابی',
              genderContext: 'general',
              goal: 'حاضرجوابی',
              teachingNote: ''
            };
            register(item, 'sampleImportsTxt');
          }
        }
      }
    }
  }

  const finalScenarios = Array.from(uniqueScenariosMap.values());
  const finalCount = finalScenarios.length;

  // Ensure production output dir
  const prodDir = path.join(process.cwd(), 'data', 'production');
  if (!fs.existsSync(prodDir)) {
    fs.mkdirSync(prodDir, { recursive: true });
  }

  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const baseFilePath = path.join(prodDir, 'base_9k.json');
  const manifestPath = path.join(reportsDir, 'BASE_9K_MANIFEST.json');

  // Write base_9k.json
  fs.writeFileSync(baseFilePath, JSON.stringify(finalScenarios, null, 2), 'utf8');

  // Create Manifest
  const manifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    locked: true,
    description: 'Locked Base Production Bank compiled strictly from authentic repository source files and deduplicated.',
    targetFile: 'data/production/base_9k.json',
    totalScenarios: finalCount,
    rawParsedSummary: {
      base51: sourceStats.base51.rawParsed,
      scenarioBankTxt: sourceStats.scenarioBankTxt.rawParsed,
      karizmaImportTxt: sourceStats.karizmaImportTxt.rawParsed,
      sampleImportsTxt: sourceStats.sampleImportsTxt.rawParsed,
      totalRawParsed: Object.values(sourceStats).reduce((acc, s) => acc + s.rawParsed, 0)
    },
    acceptedBySource: {
      base51: sourceStats.base51.accepted,
      scenarioBankTxt: sourceStats.scenarioBankTxt.accepted,
      karizmaImportTxt: sourceStats.karizmaImportTxt.accepted,
      sampleImportsTxt: sourceStats.sampleImportsTxt.accepted
    },
    duplicateCount: totalDuplicatesAcrossAll,
    categoryDistribution: finalScenarios.reduce((acc: Record<string, number>, s) => {
      const cat = s.category || s.environment || 'عمومی';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`Base 9K written to: ${baseFilePath}`);
  console.log(`Manifest written to: ${manifestPath}`);
  console.log(`Total Scenarios: ${finalCount}`);
  console.log(`Duplicates Removed: ${totalDuplicatesAcrossAll}`);

  return {
    rawCounts: manifest.rawParsedSummary,
    base51Count: sourceStats.base51.rawParsed,
    duplicateCount: totalDuplicatesAcrossAll,
    finalBaseCount: finalCount,
    baseFilePath: 'data/production/base_9k.json',
    manifestPath: 'reports/BASE_9K_MANIFEST.json'
  };
}

if (process.argv[1] && process.argv[1].endsWith('restore_base_9k.ts')) {
  restoreAndLockBase9k();
}
