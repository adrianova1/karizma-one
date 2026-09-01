import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface RawScenario {
  id: string;
  title: string;
  category: string;
  situation: string;
  context?: string;
  user_input_patterns?: string[];
  triggers: string[];
  aliases: string[];
  keywords: string[];
  responses: {
    direct: string | string[];
    funny: string | string[];
    charismatic: string | string[];
    emotional: string | string[];
    psychology: string | string[];
    friendly?: string | string[];
    mysterious?: string | string[];
    mature?: string | string[];
    confident?: string | string[];
    tone_1?: string | string[];
    tone_2?: string | string[];
    tone_3?: string | string[];
    tone_4?: string | string[];
    tone_5?: string | string[];
    psychological_analysis?: string;
  };
  tips?: string;
  technique?: string;
  bodyLanguage?: string;
  nextMove?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  likes?: number;
  views?: number;
  createdAt?: string;
  updatedAt?: string;
  opponentLine?: string;
  environment?: string;
  genderContext?: string;
  goal?: string;
  teachingNote?: string;
}

export function norm(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u200c\u200b\u200e\u200f]/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function buildCanonicalBank() {
  console.log('====================================================');
  console.log('   CANONICAL SCENARIO BANK BUILD & AUDIT PIPELINE   ');
  console.log('====================================================');

  const startTime = Date.now();

  // 1. Base 51 Scenarios
  const existing51Path = path.join(process.cwd(), 'data', 'scenarios.backup.json');
  let initialScenarios: any[] = [];
  if (fs.existsSync(existing51Path)) {
    try {
      initialScenarios = JSON.parse(fs.readFileSync(existing51Path, 'utf8'));
    } catch (e) {
      console.warn('Could not read existing scenarios.backup.json:', e);
    }
  }

  const scenarioMap = new Map<string, RawScenario>();
  const seenSignatures = new Set<string>();

  let base51Total = initialScenarios.length;
  let base51Added = 0;
  let base51Duplicates = 0;

  for (const s of initialScenarios) {
    const rawDirect = typeof s.responses?.direct === 'string' ? s.responses.direct : (s.responses?.tone_1 || s.responses?.charismatic || s.goal || '');
    const rawFunny = typeof s.responses?.funny === 'string' ? s.responses.funny : (s.responses?.tone_5 || s.goal || '');
    const rawCharismatic = typeof s.responses?.charismatic === 'string' ? s.responses.charismatic : (s.responses?.tone_1 || s.goal || '');
    const rawEmotional = typeof s.responses?.emotional === 'string' ? s.responses.emotional : (s.responses?.friendly || s.responses?.tone_2 || s.goal || '');
    const rawPsychology = typeof s.responses?.psychology === 'string' ? s.responses.psychology : (s.responses?.psychological_analysis || s.responses?.mature || s.technique || '');

    const item: RawScenario = {
      id: String(s.id),
      title: s.title || s.situation || 'سناریو',
      category: s.category || s.environment || 'عمومی',
      situation: s.situation || s.title || '',
      context: s.context || s.situation || '',
      user_input_patterns: s.user_input_patterns || s.triggers || [s.title || s.situation],
      triggers: s.triggers || [s.title || s.situation],
      aliases: s.aliases || [],
      keywords: s.keywords || [s.category, s.environment, s.opponentLine, s.title].filter(Boolean),
      responses: {
        direct: rawDirect,
        funny: rawFunny,
        charismatic: rawCharismatic,
        emotional: rawEmotional,
        psychology: rawPsychology,
        friendly: rawEmotional,
        mysterious: rawCharismatic,
        mature: rawPsychology,
        confident: rawCharismatic,
        tone_1: rawCharismatic,
        tone_2: rawEmotional,
        tone_3: rawPsychology,
        tone_4: rawCharismatic,
        tone_5: rawFunny,
        psychological_analysis: s.responses?.psychological_analysis || s.technique || 'تحلیل ارتباطی و تکنیک کنترل فریم گفتگو.'
      },
      tips: s.tips || s.technique || 'حفظ آرامش و تن صدای رسا و ملایم.',
      technique: s.technique || 'کنترل فریم مکالمه با اتکا به زبان بدن مطمئن.',
      bodyLanguage: s.bodyLanguage || 'پوسچر صاف، نگاه مستقیم و لبخند ملایم.',
      nextMove: s.nextMove || s.teachingNote || 'مکث طلایی و هدایت هوشمندانه گفتگو.',
      difficulty: s.difficulty || 'medium',
      likes: typeof s.likes === 'number' ? s.likes : 0,
      views: typeof s.views === 'number' ? s.views : 0,
      createdAt: s.createdAt || new Date().toISOString(),
      updatedAt: s.updatedAt || new Date().toISOString(),
      opponentLine: s.opponentLine || '',
      environment: s.environment || s.category || 'عمومی',
      genderContext: s.genderContext || 'general',
      goal: s.goal || 'کاریزما و جذابیت کلامی',
      teachingNote: s.teachingNote || s.nextMove || ''
    };

    const sig = norm(item.situation || item.title) + '|' + norm(typeof item.responses.charismatic === 'string' ? item.responses.charismatic : (item.responses.direct as string || ''));
    if (seenSignatures.has(sig)) {
      base51Duplicates++;
    } else {
      seenSignatures.add(sig);
      scenarioMap.set(item.id, item);
      base51Added++;
    }
  }

  console.log(`[Source 1: Base 51] Total: ${base51Total}, Added: ${base51Added}, Duplicates: ${base51Duplicates}`);

  // 2. Source A: Scenario_Bank.txt
  const sbPath = path.join(process.cwd(), 'Scenario_Bank.txt');
  let rawAParsed = 0;
  let rawAIncomplete = 0;
  let rawADuplicates = 0;
  let rawAAdded = 0;

  if (fs.existsSync(sbPath)) {
    const content = fs.readFileSync(sbPath, 'utf8');
    const lines = content.split('\n');
    let temp: any = null;
    let isParsingResponse = false;

    const saveRecord = () => {
      if (temp) {
        rawAParsed++;
        const sitTrim = temp.situation ? temp.situation.trim() : '';
        const respTrim = temp.response ? temp.response.trim() : '';
        if (sitTrim.length >= 2 && respTrim.length >= 2) {
          const sig = norm(sitTrim) + '|' + norm(respTrim);
          if (seenSignatures.has(sig)) {
            rawADuplicates++;
          } else {
            seenSignatures.add(sig);
            rawAAdded++;
            const hash = crypto.createHash('md5').update(sig).digest('hex').substring(0, 10);
            const id = `scen_sb_${hash}`;

            const category = temp.category || 'حاضر جوابی / روزمره';
            const item: RawScenario = {
              id,
              title: sitTrim.length > 55 ? sitTrim.substring(0, 55) + '...' : sitTrim,
              category,
              situation: sitTrim,
              context: sitTrim,
              user_input_patterns: [sitTrim],
              triggers: [sitTrim],
              aliases: [],
              keywords: [category].filter(Boolean),
              responses: {
                direct: respTrim,
                funny: respTrim,
                charismatic: respTrim,
                emotional: respTrim,
                psychology: 'پاسخ حاضر جوابی سریع با حفظ اعتماد به نفس و خونسردی.',
                friendly: respTrim,
                mysterious: respTrim,
                mature: respTrim,
                confident: respTrim,
                tone_1: respTrim,
                tone_2: respTrim,
                tone_3: respTrim,
                tone_4: respTrim,
                tone_5: respTrim,
                psychological_analysis: 'پاسخ حاضر جوابی سریع با حفظ اعتماد به نفس و خونسردی.'
              },
              tips: 'حفظ آرامش، پرستیژ و تن صدای رسا و باصلابت.',
              technique: 'پاسخ هوشمندانه و خونسرد با بازگرداندن فریم مکالمه.',
              bodyLanguage: 'زبان بدن باز، قامت استوار و لبخند مطمئن.',
              nextMove: 'مکث کوتاه و اجازه به طرف مقابل برای هضم پیام.',
              difficulty: 'medium',
              likes: 0,
              views: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              opponentLine: '',
              environment: category,
              genderContext: 'general',
              goal: 'حاضرجوابی و جذابیت کلامی',
              teachingNote: 'کنترل فریم گفتگو و حفظ تعادل ارتباطی.'
            };

            scenarioMap.set(id, item);
          }
        } else {
          rawAIncomplete++;
        }
      }
      temp = null;
      isParsingResponse = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('## ') && line.includes('— رکورد')) {
        saveRecord();
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
    saveRecord();
    console.log(`[Source A: Scenario_Bank.txt] Parsed: ${rawAParsed}, Incomplete: ${rawAIncomplete}, Duplicates: ${rawADuplicates}, Unique Added: ${rawAAdded}`);
  }

  // 3. Source B: karizma_scenario_bank_import.txt
  const kbPath = path.join(process.cwd(), 'karizma_scenario_bank_import.txt');
  let rawBParsed = 0;
  let rawBIncomplete = 0;
  let rawBDuplicates = 0;
  let rawBAdded = 0;

  if (fs.existsSync(kbPath)) {
    const content = fs.readFileSync(kbPath, 'utf8');
    const lines = content.split('\n');
    let currentRecord: any = null;
    let isParsingResponse = false;

    const saveCard = () => {
      if (currentRecord) {
        rawBParsed++;
        const sitTrim = currentRecord.situation ? currentRecord.situation.trim() : '';
        const respTrim = currentRecord.response ? currentRecord.response.trim() : '';
        if (sitTrim.length >= 2 && respTrim.length >= 2) {
          const sig = norm(sitTrim) + '|' + norm(respTrim);
          if (seenSignatures.has(sig)) {
            rawBDuplicates++;
          } else {
            seenSignatures.add(sig);
            rawBAdded++;
            const hash = crypto.createHash('md5').update(sig).digest('hex').substring(0, 10);
            const id = `scen_kb_${hash}`;

            const category = currentRecord.sourceCategory || 'عمومی';
            const item: RawScenario = {
              id,
              title: sitTrim.length > 55 ? sitTrim.substring(0, 55) + '...' : sitTrim,
              category,
              situation: sitTrim,
              context: sitTrim,
              user_input_patterns: [sitTrim],
              triggers: [sitTrim],
              aliases: [],
              keywords: [category].filter(Boolean),
              responses: {
                direct: respTrim,
                funny: respTrim,
                charismatic: respTrim,
                emotional: respTrim,
                psychology: 'پاسخ هوشمندانه به شیت‌تست یا مکالمه با حفظ تسلط.',
                friendly: respTrim,
                mysterious: respTrim,
                mature: respTrim,
                confident: respTrim,
                tone_1: respTrim,
                tone_2: respTrim,
                tone_3: respTrim,
                tone_4: respTrim,
                tone_5: respTrim,
                psychological_analysis: 'پاسخ هوشمندانه به شیت‌تست یا مکالمه با حفظ تسلط.'
              },
              tips: 'حفظ خونسردی، نگاه نافذ و لحن شمرده.',
              technique: 'پاسخ غیرتدافعی و باکلاس به پیام یا سوال طرف مقابل.',
              bodyLanguage: 'حالت چهره آرام، عدم ابراز سراسیمگی.',
              nextMove: 'هدایت صحبت به سمت موضوعی جدید یا سکوت هوشمندانه.',
              difficulty: 'medium',
              likes: 0,
              views: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              opponentLine: '',
              environment: category,
              genderContext: 'general',
              goal: 'مدیریت مکالمه و آزمون‌های رفتاری',
              teachingNote: 'عدم تله‌افتادن در شیت‌تست‌ها و حفظ ارزش فردی.'
            };

            scenarioMap.set(id, item);
          }
        } else {
          rawBIncomplete++;
        }
      }
      currentRecord = null;
      isParsingResponse = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('[card_')) {
        saveCard();
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
          saveCard();
        } else if (isParsingResponse) {
          if (line !== '') {
            currentRecord.response += (currentRecord.response ? '\n' : '') + line;
          }
        } else if (line !== '' && currentRecord.situation && !currentRecord.response && !isParsingResponse && !line.startsWith('===========')) {
          currentRecord.situation += '\n' + line;
        }
      }
    }
    saveCard();
    console.log(`[Source B: karizma_scenario_bank_import.txt] Parsed: ${rawBParsed}, Incomplete: ${rawBIncomplete}, Duplicates: ${rawBDuplicates}, Unique Added: ${rawBAdded}`);
  }

  const allScenarios = Array.from(scenarioMap.values());
  const finalCanonicalCount = allScenarios.length;
  const totalDuplicates = base51Duplicates + rawADuplicates + rawBDuplicates;
  const totalIncomplete = rawAIncomplete + rawBIncomplete;

  console.log('----------------------------------------------------');
  console.log(`FINAL CANONICAL COUNT: ${finalCanonicalCount}`);
  console.log(`TOTAL REDUNDANT / DUPLICATES REMOVED: ${totalDuplicates}`);
  console.log(`TOTAL INCOMPLETE SKIPPED: ${totalIncomplete}`);
  console.log('----------------------------------------------------');

  // Write files
  const canonicalFile1 = path.join(process.cwd(), 'data', 'scenarios.json');
  const canonicalFile2 = path.join(process.cwd(), 'data', 'coach', 'scenarios.json');
  const canonicalFileLocked = path.join(process.cwd(), 'data', 'scenarios_canonical.json');

  fs.writeFileSync(canonicalFile1, JSON.stringify(allScenarios, null, 2), 'utf8');
  fs.writeFileSync(canonicalFile2, JSON.stringify(allScenarios, null, 2), 'utf8');
  fs.writeFileSync(canonicalFileLocked, JSON.stringify(allScenarios, null, 2), 'utf8');

  // Write Manifest Report
  const manifestData = {
    auditTimestamp: new Date().toISOString(),
    executionDurationMs: Date.now() - startTime,
    sources: {
      rawA: {
        file: 'Scenario_Bank.txt',
        parsedRecords: rawAParsed,
        incompleteRecords: rawAIncomplete,
        internalDuplicates: rawADuplicates,
        uniqueRecordsAdded: rawAAdded
      },
      rawB: {
        file: 'karizma_scenario_bank_import.txt',
        parsedRecords: rawBParsed,
        incompleteRecords: rawBIncomplete,
        crossDuplicatesWithA: rawBDuplicates,
        uniqueRecordsAdded: rawBAdded
      },
      base51: {
        file: 'data/scenarios.backup.json',
        parsedRecords: base51Total,
        duplicates: base51Duplicates,
        uniqueRecordsAdded: base51Added
      }
    },
    deduplicationRule: "norm(situation) + '|' + norm(response) where norm removes zero-width characters, collapses whitespace, trims, and normalizes casing.",
    auditSummary: {
      rawTotalParsed: rawAParsed + rawBParsed + base51Total,
      totalDuplicatesRemoved: totalDuplicates,
      totalIncompleteSkipped: totalIncomplete,
      finalCanonicalCount: finalCanonicalCount
    },
    canonicalFiles: [
      'data/scenarios.json',
      'data/coach/scenarios.json',
      'data/scenarios_canonical.json'
    ],
    status: 'LOCKED_SINGLE_SOURCE_OF_TRUTH'
  };

  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const manifestJsonPath = path.join(reportsDir, 'CANONICAL_DATASET_MANIFEST.json');
  fs.writeFileSync(manifestJsonPath, JSON.stringify(manifestData, null, 2), 'utf8');

  const manifestMdPath = path.join(reportsDir, 'CANONICAL_DATASET_MANIFEST.md');
  const mdContent = `# Canonical Scenario Bank Audit & Lock Report

**Audit Date:** ${manifestData.auditTimestamp}  
**Status:** \`LOCKED_SINGLE_SOURCE_OF_TRUTH\`

---

## 1. Raw Sources Breakdown

| Source Identifier | Source File Path | Total Parsed | Incomplete / Empty | Duplicates Filtered | Unique Canonical Added |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Raw A** | \`Scenario_Bank.txt\` | **${rawAParsed}** | ${rawAIncomplete} | **${rawADuplicates}** (Internal) | **${rawAAdded}** |
| **Raw B** | \`karizma_scenario_bank_import.txt\` | **${rawBParsed}** | ${rawBIncomplete} | **${rawBDuplicates}** (Cross-source) | **${rawBAdded}** |
| **51-Bank** | \`data/scenarios.backup.json\` | **${base51Total}** | 0 | **${base51Duplicates}** | **${base51Added}** |

---

## 2. Deduplication Rule & Policy
- **Deterministic Signature:** \`norm(situation) + '|' + norm(response)\`
- **Normalization Standard:** Strips zero-width Persian characters (\`\\u200c\`, \`\\u200b\`, etc.), unifies whitespaces/newlines, trims leading/trailing spaces, and lowercases text.
- **Priority Tiering:**
  1. Base 51 scenarios are preserved as Priority 1.
  2. Raw A (\`Scenario_Bank.txt\`) is ingested as Priority 2.
  3. Raw B (\`karizma_scenario_bank_import.txt\`) is ingested as Priority 3, filtering out identical situation+response pairs already registered.

---

## 3. Final Canonical Summary

- **Total Raw Records Scanned:** \`${rawAParsed + rawBParsed + base51Total}\`
- **Total Duplicate / Redundant Records Removed:** \`${totalDuplicates}\`
- **Total Incomplete / Malformed Records Skipped:** \`${totalIncomplete}\`
- **Final Canonical Scenario Count:** **\`${finalCanonicalCount}\`**

---

## 4. Locked Canonical File Paths
1. \`data/scenarios.json\` (Primary DB / API source)
2. \`data/coach/scenarios.json\` (Coach Engine runtime index source)
3. \`data/scenarios_canonical.json\` (Immutable canonical reference)
`;

  fs.writeFileSync(manifestMdPath, mdContent, 'utf8');

  console.log(`Manifest JSON saved: ${manifestJsonPath}`);
  console.log(`Manifest MD saved: ${manifestMdPath}`);

  return manifestData;
}

if (process.argv[1].endsWith('build_full_canonical_bank.ts')) {
  buildCanonicalBank();
}
