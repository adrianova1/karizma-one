import fs from 'fs';
import path from 'path';
import { CoachIndex } from '../src/server/coach/CoachIndex.js';
import { QueryMatcher } from '../src/server/coach/QueryMatcher.js';
import { RankingEngine } from '../src/server/coach/RankingEngine.js';
import { CoachScenario } from '../src/server/coach/CoachTypes.js';

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

// Persian Colloquial Transformer for realistic natural user testing (Identical to benchmark)
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
    throw new Error(`Enriched bank not found at: ${enrichedPath}`);
  }

  const raw = fs.readFileSync(enrichedPath, 'utf-8');
  const scenarios: CoachScenario[] = JSON.parse(raw);
  const total = scenarios.length;

  console.log(`Total Enriched Records Loaded: ${total}`);

  // Build index directly with enriched dataset
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

    try {
      // 1. Exact Match Test
      const exactInput = s.situation || s.title || '';
      if (exactInput) {
        const exactCandidates = matcher.match(exactInput);
        const exactRanked = RankingEngine.rankAndSelect(exactCandidates, exactInput);
        if (exactRanked.matchedScenario?.id === s.id) {
          exactMatches++;
        }
      }

      // 2. Colloquial User Query Test
      const colloquialInput = toColloquialQuery(s.situation || s.title || '');
      const colCandidates = matcher.match(colloquialInput);
      const colRanked = RankingEngine.rankAndSelect(colCandidates, colloquialInput);
      const colMatchedId = colRanked.matchedScenario?.id;
      const isFallback = !colMatchedId;
      const score = colRanked.confidenceScore;

      totalScoreSum += score;

      if (!isFallback && colMatchedId === s.id) {
        colloquialMatches++;
        categoryStats[category].matched++;
      } else {
        colloquialFallbacks++;
        categoryStats[category].fallback++;

        let reason = 'FALLBACK_TRIGGERED';
        if (!isFallback && colMatchedId && colMatchedId !== s.id) {
          reason = `MISMATCH_TO_OTHER_SCENARIO (Matched: ${colMatchedId})`;
        } else if (isFallback && score === 75) {
          reason = 'FALLBACK_LOW_CONFIDENCE_BELOW_THRESHOLD';
        }

        if (failures.length < 100) {
          failures.push({
            input: colloquialInput,
            expectedScenario: {
              id: s.id,
              title: s.title || '',
              situation: s.situation || '',
              category: s.category || '',
              triggers: s.triggers || [],
              aliases: s.aliases || []
            },
            matchedScenario: colMatchedId || null,
            score,
            reason
          });
        }
      }
    } catch (e: any) {
      console.error(`Error auditing scenario #${i} (${s.id}):`, e.message);
    }

    if ((i + 1) % 500 === 0 || i + 1 === total) {
      console.log(`Audited: ${i + 1}/${total} (${((i + 1) / total * 100).toFixed(1)}%) - Matches so far: ${colloquialMatches}`);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nAudit completed in ${durationSec}s.\n`);

  const exactMatchRate = ((exactMatches / total) * 100).toFixed(2);
  const colloquialMatchRate = ((colloquialMatches / total) * 100).toFixed(2);
  const fallbackRate = ((colloquialFallbacks / total) * 100).toFixed(2);
  const avgScore = (totalScoreSum / total).toFixed(2);

  // Baseline comparison
  const baselineColloquialMatch = 67.62;
  const delta = (parseFloat(colloquialMatchRate) - baselineColloquialMatch).toFixed(2);

  const sortedCategories = Object.entries(categoryStats)
    .map(([cat, stat]) => ({
      category: cat,
      total: stat.total,
      fallback: stat.fallback,
      failRate: ((stat.fallback / stat.total) * 100).toFixed(1)
    }))
    .sort((a, b) => parseFloat(b.failRate) - parseFloat(a.failRate));

  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPayload = {
    auditDate: new Date().toISOString(),
    totalRecords: total,
    baselineRetrievalRate: `${baselineColloquialMatch}%`,
    enrichedRetrievalRate: `${colloquialMatchRate}%`,
    improvementDelta: `${parseFloat(delta) >= 0 ? '+' : ''}${delta}%`,
    metrics: {
      exactMatchRate: `${exactMatchRate}%`,
      colloquialRetrievalRate: `${colloquialMatchRate}%`,
      fallbackRate: `${fallbackRate}%`,
      averageMatchingScore: `${avgScore}%`
    },
    topFailedCategories: sortedCategories.slice(0, 15),
    totalFailuresRecorded: failures.length,
    failureSamples: failures
  };

  const reportPath = path.join(reportDir, 'retrieval_enriched_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportPayload, null, 2), 'utf-8');

  console.log('=====================================================');
  console.log(`📊 RETRIEVAL AUDIT RESULTS (ENRICHED BANK)`);
  console.log('=====================================================');
  console.log(`Total Records: ${total}`);
  console.log(`Exact Match Rate: ${exactMatchRate}%`);
  console.log(`Natural User Query Match Rate: ${colloquialMatchRate}% (Baseline: ${baselineColloquialMatch}%, Delta: ${parseFloat(delta) >= 0 ? '+' : ''}${delta}%)`);
  console.log(`Fallback Rate: ${fallbackRate}%`);
  console.log(`Average Matching Score: ${avgScore}%`);
  console.log(`Report Saved to: ${reportPath}`);
  console.log('=====================================================');
}

runEnrichedAudit().catch(console.error);
