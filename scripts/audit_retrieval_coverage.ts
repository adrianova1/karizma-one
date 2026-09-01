import fs from 'fs';
import path from 'path';
import { CoachEngine } from '../src/server/coach/CoachEngine.js';
import { CoachLoader } from '../src/server/coach/CoachLoader.js';
import { PersianNormalizer } from '../src/server/coach/PersianNormalizer.js';

interface FailureRecord {
  input: string;
  expectedScenario: {
    id: string;
    title: string;
    situation: string;
    category: string;
    triggers: string[];
    aliases: string[];
  };
  matchedScenario: string | null;
  score: number;
  reason: string;
}

// Persian Colloquial Transformer for realistic natural user testing
function toColloquialQuery(rawSituation: string): string {
  let text = rawSituation.trim();

  // 1. Remove leading bullets, emojis, numbers
  text = text.replace(/^[🎈♦️✳️🔹🔸🔻🔺▪️▫️•\-\d.:\)\s]+/gu, '').trim();

  // 2. Remove common scenario / narrative headings
  text = text.replace(/^(سناریو|موقعیت|پاسخ به|در جواب|واکنش به)[:\-\s]*/gu, '').trim();

  // 3. Transformation of narrative prefixes to typical user queries
  const narrativeTransforms: Array<{ pattern: RegExp; replacer: (match: string, p1: string) => string }> = [
    {
      pattern: /^وقتی\s+(?:که\s+)?(?:دختر|دختره|خانوم|خانم|طرف|پارتنرت|رل|کراشت)\s+(?:بهت\s+)?(?:میگه|گفت|بگه)[:،,\s]+(.*)$/u,
      replacer: (_, core) => `دختره گفت ${core.trim()}`
    },
    {
      pattern: /^وقتی\s+(?:که\s+)?(?:پسر|پسره|مرد|آقا|طرف)\s+(?:بهت\s+)?(?:میگه|گفت|بگه)[:،,\s]+(.*)$/u,
      replacer: (_, core) => `پسره بهم گفت ${core.trim()}`
    },
    {
      pattern: /^وقتی\s+(?:که\s+)?(?:بهت\s+)?(?:میگه|میگن|گفت|بگه)[:،,\s]+(.*)$/u,
      replacer: (_, core) => `بهم میگه ${core.trim()}`
    },
    {
      pattern: /^وقتی\s+(?:که\s+)?(?:بهش\s+)?(?:میگی|گفتی|بگی)[:،,\s]+(.*)$/u,
      replacer: (_, core) => `بهش گفتم ${core.trim()}`
    },
    {
      pattern: /^(?:اگه|اگر)\s+(?:بهت\s+)?(?:گفت|بگه|میگه|پرسید)[:،,\s]+(.*)$/u,
      replacer: (_, core) => `اگه بهم بگه ${core.trim()}`
    },
    {
      pattern: /^(?:بهت\s+)?(?:میگه|گفت|بگه)[:،,\s]+(.*)$/u,
      replacer: (_, core) => `میگه ${core.trim()}`
    }
  ];

  let transformed = false;
  for (const item of narrativeTransforms) {
    if (item.pattern.test(text)) {
      text = text.replace(item.pattern, item.replacer);
      transformed = true;
      break;
    }
  }

  // If no prefix pattern matched, convert standard formal sentences into user inquiry
  if (!transformed) {
    if (text.startsWith('"') || text.startsWith('«') || text.startsWith('“')) {
      text = text.replace(/^[«"“\s]+|[»"”\s]+$/gu, '').trim();
      text = `دختره گفت ${text}`;
    } else if (text.endsWith('؟') || text.endsWith('?')) {
      text = text.trim();
    } else {
      text = text.trim();
    }
  }

  return text;
}

async function runAudit() {
  console.log('=====================================================');
  console.log('🚀 RUNNING RETRIEVAL AUDIT ON CANONICAL BANK');
  console.log('=====================================================');

  const engine = CoachEngine.getInstance();
  const scenarios = CoachLoader.getScenarios();
  const total = scenarios.length;

  console.log(`Total Canonical Records Loaded: ${total}`);

  let exactMatches = 0;
  let colloquialMatches = 0;
  let colloquialFallbacks = 0;
  let totalScoreSum = 0;

  const categoryStats: Record<string, { total: number; matched: number; fallback: number }> = {};
  const failures: FailureRecord[] = [];

  const startTime = Date.now();

  for (let i = 0; i < total; i++) {
    const s = scenarios[i];
    const category = s.category || 'عمومی';
    if (!categoryStats[category]) {
      categoryStats[category] = { total: 0, matched: 0, fallback: 0 };
    }
    categoryStats[category].total++;

    // 1. Exact Match Test (Original primary situation / trigger)
    const exactInput = s.situation || s.title;
    const exactRes = engine.processQuery(exactInput);
    const exactMatchedId = exactRes.pipelineLog?.matchedScenarioId;
    if (exactMatchedId === s.id) {
      exactMatches++;
    }

    // 2. Colloquial User Query Test (Natural user phrasing)
    const colloquialInput = toColloquialQuery(exactInput);
    const colRes = engine.processQuery(colloquialInput);
    const colMatchedId = colRes.pipelineLog?.matchedScenarioId;
    const isFallback = !colMatchedId;
    const scoreStr = colRes.structuredData?.analysis?.confidence || '0';
    const score = parseFloat(scoreStr.replace('%', '')) || 0;

    totalScoreSum += score;

    if (!isFallback && colMatchedId === s.id) {
      colloquialMatches++;
      categoryStats[category].matched++;
    } else {
      colloquialFallbacks++;
      categoryStats[category].fallback++;

      // Log failure detail
      let reason = 'FALLBACK_TRIGGERED';
      if (!isFallback && colMatchedId && colMatchedId !== s.id) {
        reason = `MISMATCH_TO_OTHER_SCENARIO (Matched: ${colMatchedId})`;
      } else if (isFallback && score === 0.75) {
        reason = 'FALLBACK_LOW_CONFIDENCE_BELOW_THRESHOLD';
      }

      if (failures.length < 100) {
        failures.push({
          input: colloquialInput,
          expectedScenario: {
            id: s.id,
            title: s.title,
            situation: s.situation,
            category: s.category,
            triggers: s.triggers || [],
            aliases: s.aliases || []
          },
          matchedScenario: colMatchedId || null,
          score,
          reason
        });
      }
    }

    if ((i + 1) % 1000 === 0 || i + 1 === total) {
      process.stdout.write(`\rProgress: ${i + 1}/${total} (${((i + 1) / total * 100).toFixed(1)}%)...`);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nAudit completed in ${durationSec}s.\n`);

  const exactMatchRate = ((exactMatches / total) * 100).toFixed(2);
  const colloquialMatchRate = ((colloquialMatches / total) * 100).toFixed(2);
  const fallbackRate = ((colloquialFallbacks / total) * 100).toFixed(2);
  const avgScore = (totalScoreSum / total).toFixed(3);

  // Sort failed categories by failure rate
  const sortedCategories = Object.entries(categoryStats)
    .map(([cat, stat]) => ({
      category: cat,
      total: stat.total,
      fallback: stat.fallback,
      failRate: ((stat.fallback / stat.total) * 100).toFixed(1)
    }))
    .sort((a, b) => parseFloat(b.failRate) - parseFloat(a.failRate));

  // Save report to reports/retrieval_failures.json
  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPayload = {
    auditDate: new Date().toISOString(),
    totalRecords: total,
    metrics: {
      exactMatchRate: `${exactMatchRate}%`,
      colloquialRetrievalRate: `${colloquialMatchRate}%`,
      fallbackRate: `${fallbackRate}%`,
      averageMatchingScore: avgScore
    },
    topFailedCategories: sortedCategories,
    totalFailuresRecorded: failures.length,
    failureSamples: failures
  };

  const reportPath = path.join(reportDir, 'retrieval_failures.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportPayload, null, 2), 'utf-8');

  console.log(`Report successfully saved to: ${reportPath}`);

  // Summary output
  console.log('\n=====================================================');
  console.log(`Total Records: ${total}`);
  console.log('');
  console.log(`Exact Match:\n${exactMatchRate}%`);
  console.log('');
  console.log(`Natural User Query Match:\n${colloquialMatchRate}%`);
  console.log('');
  console.log(`Fallback:\n${fallbackRate}%`);
  console.log('');
  console.log(`Average Matching Score:\n${avgScore}`);
  console.log('');
  console.log('ضعیف‌ترین دسته‌ها:');
  sortedCategories.slice(0, 10).forEach(c => {
    console.log(`- ${c.category}: ${c.failRate}% خطا (${c.fallback} از ${c.total})`);
  });
  console.log('=====================================================');
}

runAudit().catch(console.error);
