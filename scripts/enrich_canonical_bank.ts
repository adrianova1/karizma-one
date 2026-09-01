import fs from 'fs';
import path from 'path';
import { PersianNormalizer } from '../src/server/coach/PersianNormalizer.js';

interface ScenarioRecord {
  id: string;
  title?: string;
  category?: string;
  situation?: string;
  context?: string;
  triggers?: string[];
  aliases?: string[];
  user_input_patterns?: string[];
  keywords?: string[];
  responses?: any;
  tips?: string;
  technique?: string;
  bodyLanguage?: string;
  nextMove?: string;
  difficulty?: string;
  likes?: number;
  views?: number;
  createdAt?: string;
  updatedAt?: string;
}

// 1. Clean emoji and decorative bullets
export function stripEmojisAndBullets(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}🎈♦️✳️🔹🔸🔻🔺▪️▫️•*#~✓✔★☆–—]/gu, ' ')
    .replace(/^[\s\d.:)\-]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 2. Extract core speech and quotes strictly from this scenario's own text
export function extractSpecificCores(rawText: string, category?: string): string[] {
  const cleaned = stripEmojisAndBullets(rawText);
  if (!cleaned) return [];

  const candidates = new Set<string>();

  // A. Quotes inside quotes: «...», "...", "...", '...', ‘...’
  const quoteMatches = cleaned.match(/[«"“'‘]([^»"”'’]{2,100})[»"”'’]/g);
  if (quoteMatches) {
    for (const q of quoteMatches) {
      const core = q.replace(/^[«"“'‘\s]+|[»"”'’\s]+$/g, '').trim();
      if (core.length >= 2) {
        candidates.add(core);
      }
    }
  }

  // B. Quotes inside category if present
  if (category) {
    const catQuotes = category.match(/[«"“'‘]([^»"”'’]{2,80})[»"”'’]/g);
    if (catQuotes) {
      for (const cq of catQuotes) {
        const cCore = cq.replace(/^[«"“'‘\s]+|[»"”'’\s]+$/g, '').trim();
        if (cCore.length >= 2) candidates.add(cCore);
      }
    }
  }

  // C. Narrative prefix removal
  const narrativePrefixRegexes = [
    /^(?:سناریو|موقعیت|پاسخ به|در جواب|واکنش به|راهکار برای|نحوه برخورد با|چطور جواب بدم وقتی|تکنیک برای|راهکار|چگونه پاسخ دهیم به)\s*[:\-\s]*/g,
    /^(?:وقتی|اگر|اگه|زمانی که|چنانچه|موقعی که)\s+(?:که\s+)?(?:دختر|دختره|خانوم|خانم|طرف|طرف مقابل|پارتنرت|رل|کراشت|پسر|پسره|مرد|آقا|یکی|کسی|دوستت|همکارت|مخاطب|مخاطبت|مخاطب چت)\s+(?:بهت|بهت میگه|باهات|ازت|در چت)?\s*(?:میگه|میگوید|گفت|بگه|پرسید|میپرسه|بپرسه|چت داد|پیام داد|نوشت|استوری گذاشت|ریپلای کرد|تیکه انداخت|گیر داد|تعریف کرد|طلبکار شد|طعنه زد|ادعا کرد|بیان کرد|تدافعی می‌گوید|به شوخی می‌گوید)?[:،,\s]+/g,
    /^(?:وقتی|اگر|اگه|زمانی که|موقعی که)\s+(?:بهت|بهش|ازت)?\s*(?:میگه|میگوید|میگن|گفت|بگه|پرسید|میپرسه|میگی|گفتی|بگی|مینویسه|نوشت)[:،,\s]+/g,
    /^(?:بهت|بهش|ازت)\s*(?:میگه|میگوید|میگن|گفت|بگه|میگی|گفتی|بگی|پرسید|میپرسه)[:،,\s]+/g,
    /^(?:دختره|پسره|طرف|پارتنرت|کراشت|مخاطب)\s*(?:میگه|میگوید|گفت|بگه|پرسید|میپرسه|نوشت)[:،,\s]+/g,
    /^(?:در پاسخ به اینکه|در واکنش به اینکه|وقتی طرف مقابل|در جواب اینکه)\s*[:،,\s]+/g,
    /^(?:وقتی مخاطب تدافعی می‌گوید|وقتی طرف تدافعی میگه|وقتی با لحن کنایه‌آمیز میگه)\s*[:،,\s]+/g
  ];

  let stripped = cleaned;
  for (const reg of narrativePrefixRegexes) {
    stripped = stripped.replace(reg, '').trim();
  }

  if (stripped && stripped.length >= 2 && stripped !== cleaned) {
    candidates.add(stripped);
  }

  // D. Also extract clean sentence without question mark or trailing punctuations
  if (stripped && (stripped.endsWith('؟') || stripped.endsWith('?') || stripped.endsWith('!'))) {
    const withoutPunct = stripped.replace(/[؟?!.!؛;]/g, '').trim();
    if (withoutPunct.length >= 2) {
      candidates.add(withoutPunct);
    }
  }

  return Array.from(candidates);
}

// 3. Generate colloquial variations strictly based on this specific core phrase
export function generateVariationsForCore(core: string): string[] {
  const trimmed = stripEmojisAndBullets(core).trim();
  if (!trimmed || trimmed.length < 2) return [];

  const variations = new Set<string>();

  // Standard user conversational prefixes
  const prefixes = [
    'دختره گفت ',
    'بهم میگه ',
    'میگه ',
    'اگه بگه ',
    'بهش گفتم ',
    'اگه گفت ',
    'پسره بهم گفت ',
    'طرف گفت ',
    'بهم گفت '
  ];

  for (const p of prefixes) {
    if (!trimmed.startsWith(p)) {
      variations.add(`${p}${trimmed}`);
    }
  }

  // If question
  if (trimmed.includes('؟') || trimmed.includes('?') || /^(چرا|چند|کجا|کی|چی|چطور|چگونه|مگه|ایا|آیا)/.test(trimmed)) {
    const cleanQ = trimmed.replace(/[؟?]/g, '').trim();
    variations.add(cleanQ);
    variations.add(`${cleanQ}؟`);
    variations.add(`طرف پرسید ${cleanQ}`);
    variations.add(`ازم پرسید ${cleanQ}`);
    variations.add(`دختره پرسید ${cleanQ}`);
  }

  return Array.from(variations);
}

// Main Enrichment Function
export async function enrichCanonicalBank() {
  console.log('=====================================================');
  console.log('⚡ STARTING CANONICAL BANK ENRICHMENT PROCESS');
  console.log('=====================================================');

  const inputPath = path.join(process.cwd(), 'data', 'scenarios.json');
  const outputPath = path.join(process.cwd(), 'data', 'scenarios_enriched.json');
  const reportPath = path.join(process.cwd(), 'reports', 'enrichment_report.json');

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found at ${inputPath}`);
  }

  const raw = fs.readFileSync(inputPath, 'utf-8');
  let scenarios: ScenarioRecord[];
  try {
    scenarios = JSON.parse(raw);
  } catch (e) {
    const sanitized = raw.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '');
    scenarios = JSON.parse(sanitized);
  }

  console.log(`Loaded ${scenarios.length} canonical scenarios from: ${inputPath}`);

  let totalProcessed = scenarios.length;
  let addedTriggersCount = 0;
  let addedAliasesCount = 0;
  let problematicRecordsCount = 0;

  const enrichedScenarios: ScenarioRecord[] = [];

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    try {
      const originalSituation = s.situation || s.title || '';
      const existingTriggers = Array.isArray(s.triggers) ? [...s.triggers] : (s.title ? [s.title] : [originalSituation]);
      const existingAliases = Array.isArray(s.aliases) ? [...s.aliases] : [];
      const existingKeywords = Array.isArray(s.keywords) ? [...s.keywords] : [];

      const newTriggersSet = new Set<string>();
      const newAliasesSet = new Set<string>();
      const newKeywordsSet = new Set<string>();

      // Preserve all existing items (after stripping emojis/excessive spaces)
      for (const t of existingTriggers) {
        const cleaned = stripEmojisAndBullets(t);
        if (cleaned) newTriggersSet.add(cleaned);
      }
      for (const a of existingAliases) {
        const cleaned = stripEmojisAndBullets(a);
        if (cleaned) newAliasesSet.add(cleaned);
      }
      for (const k of existingKeywords) {
        const cleaned = stripEmojisAndBullets(k);
        if (cleaned) newKeywordsSet.add(cleaned);
      }

      // 1. Extract core searchable phrases strictly from this scenario
      const candidateTexts = [s.title || '', originalSituation, ...existingTriggers];
      const extractedCores = new Set<string>();

      for (const text of candidateTexts) {
        if (!text) continue;
        const cores = extractSpecificCores(text, s.category);
        for (const c of cores) {
          if (c && c.length >= 2) {
            extractedCores.add(c);
            newTriggersSet.add(c);
          }
        }
      }

      // 2. Generate colloquial aliases strictly for this scenario's cores & situation
      for (const core of extractedCores) {
        const variations = generateVariationsForCore(core);
        for (const v of variations) {
          newAliasesSet.add(v);
        }

        const tokens = PersianNormalizer.tokenize(core).filter(t => t.length > 2);
        for (const tok of tokens) {
          newKeywordsSet.add(tok);
        }
      }

      // Also generate variations for original title and situation
      if (s.title) {
        const titleVars = generateVariationsForCore(s.title);
        for (const tv of titleVars) newAliasesSet.add(tv);
      }

      const sitClean = stripEmojisAndBullets(originalSituation);
      if (sitClean) {
        const sitVars = generateVariationsForCore(sitClean);
        for (const sv of sitVars) newAliasesSet.add(sv);
      }

      // Final unique arrays
      const finalTriggers = Array.from(newTriggersSet).filter(t => t.length >= 2);
      const finalAliases = Array.from(newAliasesSet).filter(a => a.length >= 2);
      const finalKeywords = Array.from(newKeywordsSet).filter(k => k.length >= 2);

      const addedT = Math.max(0, finalTriggers.length - existingTriggers.length);
      const addedA = Math.max(0, finalAliases.length - existingAliases.length);

      addedTriggersCount += addedT;
      addedAliasesCount += addedA;

      // Assemble enriched record preserving exact original structure, situation, responses, etc.
      const enriched: ScenarioRecord = {
        ...s,
        situation: s.situation, // Original situation strictly preserved
        title: s.title,
        category: s.category,
        triggers: finalTriggers,
        aliases: finalAliases,
        keywords: finalKeywords,
        user_input_patterns: Array.from(new Set([...finalTriggers, ...finalAliases]))
      };

      enrichedScenarios.push(enriched);
    } catch (err) {
      problematicRecordsCount++;
      console.error(`Error processing scenario ${s.id}:`, err);
      enrichedScenarios.push(s);
    }
  }

  // Save enriched dataset
  fs.writeFileSync(outputPath, JSON.stringify(enrichedScenarios, null, 2), 'utf-8');
  console.log(`\nSuccessfully written enriched dataset (${enrichedScenarios.length} records) to: ${outputPath}`);

  // Create report
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPayload = {
    timestamp: new Date().toISOString(),
    inputFile: inputPath,
    outputFile: outputPath,
    totalProcessed,
    addedTriggersCount,
    addedAliasesCount,
    problematicRecordsCount,
    averageTriggersPerScenario: (enrichedScenarios.reduce((acc, s) => acc + (s.triggers?.length || 0), 0) / totalProcessed).toFixed(2),
    averageAliasesPerScenario: (enrichedScenarios.reduce((acc, s) => acc + (s.aliases?.length || 0), 0) / totalProcessed).toFixed(2)
  };

  fs.writeFileSync(reportPath, JSON.stringify(reportPayload, null, 2), 'utf-8');
  console.log(`Successfully written enrichment report to: ${reportPath}`);

  console.log('\n--- Enrichment Summary ---');
  console.log(`Processed Records: ${totalProcessed}`);
  console.log(`Added Triggers: +${addedTriggersCount}`);
  console.log(`Added Aliases: +${addedAliasesCount}`);
  console.log(`Problematic Records: ${problematicRecordsCount}`);
  console.log(`Avg Triggers/Scenario: ${reportPayload.averageTriggersPerScenario}`);
  console.log(`Avg Aliases/Scenario: ${reportPayload.averageAliasesPerScenario}`);
}

// If run directly via tsx
if (process.argv[1]?.endsWith('enrich_canonical_bank.ts')) {
  enrichCanonicalBank().catch(console.error);
}
