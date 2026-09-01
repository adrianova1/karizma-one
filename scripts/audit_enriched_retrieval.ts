import fs from 'fs';
import path from 'path';
import { CoachScenario } from '../src/server/coach/CoachTypes.js';
import { CoachIndex } from '../src/server/coach/CoachIndex.js';
import { QueryMatcher } from '../src/server/coach/QueryMatcher.js';
import { RankingEngine } from '../src/server/coach/RankingEngine.js';

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

// Exact same Persian Colloquial Transformer used in baseline audit
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

async function runEnrichedAudit() {
  console.log('=====================================================');
  console.log('🚀 RUNNING RETRIEVAL AUDIT ON ENRICHED CANONICAL BANK');
  console.log('=====================================================');

  const enrichedPath = path.join(process.cwd(), 'data', 'scenarios_enriched.json');
  if (!fs.existsSync(enrichedPath)) {
    throw new Error(`File not found: ${enrichedPath}`);
  }

  const raw = fs.readFileSync(enrichedPath, 'utf-8');
  const scenarios: CoachScenario[] = JSON.parse(raw);
  const total = scenarios.length;

  console.log(`Total Enriched Canonical Records Loaded: ${total}`);

  // Build index purely from enriched dataset without modifying any engine code
  const index = new CoachIndex();
  index.buildIndex(scenarios);

  const matcher = new QueryMatcher(index);

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

    // 1. Exact Match Test
    const exactInput = s.situation || s.title;
    const exactCandidates = matcher.match(exactInput);
    const exactRanked = RankingEngine.rankAndSelect(exactCandidates, exactInput);
    if (!exactRanked.isFallback && exactRanked.matchedScenario?.id === s.id) {
      exactMatches++;
    }

    // 2. Colloquial User Query Test
    const colloquialInput = toColloquialQuery(exactInput);
    const colCandidates = matcher.match(colloquialInput);
    const colRanked = RankingEngine.rankAndSelect(colCandidates, colloquialInput);

    const matchedId = colRanked.matchedScenario?.id || null;
    const isFallback = colRanked.isFallback;
    const score = colRanked.confidenceScore;

    totalScoreSum += score;

    if (!isFallback && matchedId === s.id) {
      colloquialMatches++;
      categoryStats[category].matched++;
    } else {
      colloquialFallbacks++;
      categoryStats[category].fallback++;

      let reason = 'FALLBACK_TRIGGERED';
      if (!isFallback && matchedId && matchedId !== s.id) {
        reason = `MISMATCH_TO_OTHER_SCENARIO (Matched: ${matchedId})`;
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
          matchedScenario: matchedId,
          score,
          reason
        });
      }
    }

    if ((i + 1) % 500 === 0 || i + 1 === total) {
      console.log(`Progress: ${i + 1}/${total} (${((i + 1) / total * 100).toFixed(1)}%) - Exact: ${exactMatches}, ColMatched: ${colloquialMatches}, Fallback: ${colloquialFallbacks}`);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nAudit completed in ${durationSec}s.\n`);

  const exactMatchRate = ((exactMatches / total) * 100).toFixed(2);
  const colloquialMatchRate = ((colloquialMatches / total) * 100).toFixed(2);
  const fallbackRate = ((colloquialFallbacks / total) * 100).toFixed(2);
  const avgScore = (totalScoreSum / total).toFixed(3);

  // Baseline metrics from previous audit
  const baseline = {
    exactMatchRate: '67.64%',
    colloquialRetrievalRate: '67.62%',
    fallbackRate: '32.38%',
    averageMatchingScore: '98.729'
  };

  const sortedCategories = Object.entries(categoryStats)
    .map(([cat, stat]) => ({
      category: cat,
      total: stat.total,
      fallback: stat.fallback,
      failRate: ((stat.fallback / stat.total) * 100).toFixed(1)
    }))
    .sort((a, b) => parseFloat(b.failRate) - parseFloat(a.failRate));

  const reportPayload = {
    auditDate: new Date().toISOString(),
    dataset: 'data/scenarios_enriched.json',
    totalRecords: total,
    baselineComparison: {
      before: {
        exactMatchRate: baseline.exactMatchRate,
        colloquialRetrievalRate: baseline.colloquialRetrievalRate,
        fallbackRate: baseline.fallbackRate,
        averageMatchingScore: baseline.averageMatchingScore
      },
      after: {
        exactMatchRate: `${exactMatchRate}%`,
        colloquialRetrievalRate: `${colloquialMatchRate}%`,
        fallbackRate: `${fallbackRate}%`,
        averageMatchingScore: avgScore
      },
      improvement: {
        colloquialRetrievalDelta: `+${(parseFloat(colloquialMatchRate) - parseFloat(baseline.colloquialRetrievalRate)).toFixed(2)}%`,
        fallbackReduction: `-${(parseFloat(baseline.fallbackRate) - parseFloat(fallbackRate)).toFixed(2)}%`
      }
    },
    topCategoriesPerformance: sortedCategories,
    failureSamplesCount: failures.length,
    failureSamples: failures
  };

  const reportPath = path.join(process.cwd(), 'reports', 'enriched_retrieval_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportPayload, null, 2), 'utf-8');

  console.log('=====================================================');
  console.log('📊 COMPARISON WITH BASELINE:');
  console.log(`Total Records: ${total}`);
  console.log(`Exact Match: ${baseline.exactMatchRate} ➔ ${exactMatchRate}%`);
  console.log(`Natural User Query Match: ${baseline.colloquialRetrievalRate} ➔ ${colloquialMatchRate}% (${reportPayload.baselineComparison.improvement.colloquialRetrievalDelta})`);
  console.log(`Fallback Rate: ${baseline.fallbackRate} ➔ ${fallbackRate}% (${reportPayload.baselineComparison.improvement.fallbackReduction})`);
  console.log(`Average Matching Score: ${avgScore}`);
  console.log('-----------------------------------------------------');
  console.log('دسته‌بندی‌ها پس از بهینه‌سازی:');
  sortedCategories.forEach(c => {
    console.log(`- ${c.category}: ${c.failRate}% خطا (${c.fallback} از ${c.total})`);
  });
  console.log('=====================================================');
  console.log(`Report saved to: ${reportPath}`);
}

runEnrichedAudit().catch(console.error);
