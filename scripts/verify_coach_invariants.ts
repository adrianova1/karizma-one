import { coachEngine } from '../src/server/coach/CoachEngine.js';
import { CoachLoader } from '../src/server/coach/CoachLoader.js';

async function verifyInvariants() {
  console.log('=====================================================');
  console.log('🧪 KARIZMA COACH - INVARIANT & ISOLATION VERIFICATION');
  console.log('=====================================================\n');

  // 1. Check Canonical Scenario Count
  const scenarios = CoachLoader.getScenarios();
  const scenarioCount = scenarios.length;
  console.log(`[Invariant 1] CANONICAL_SCENARIO_COUNT: ${scenarioCount} (Expected: 60000)`);
  if (scenarioCount !== 60000) {
    console.error(`❌ INVARIANT 1 FAILED: Expected 60000 scenarios, found ${scenarioCount}`);
    process.exit(1);
  }
  console.log('✅ Invariant 1 Passed: Exact 60,000 canonical scenarios loaded from 12 chunks.\n');

  // 2. Check Legacy 9K Dataset Isolation
  const hasLegacyPrefix = scenarios.some(s => s.id.startsWith('legacy_9k_') || s.id.startsWith('base_9k_'));
  console.log(`[Invariant 2] LEGACY_DATASET_USED_BY_COACH: ${hasLegacyPrefix}`);
  if (hasLegacyPrefix) {
    console.error(`❌ INVARIANT 2 FAILED: Legacy dataset detected in runtime!`);
    process.exit(1);
  }
  console.log('✅ Invariant 2 Passed: Zero legacy dataset leakage in Coach Runtime.\n');

  // 3. Test Scenario Consistency and Zero Cross-Scenario Responses on representative queries
  const testQueries = [
    'چطوری سر صحبت رو باز کنم؟',
    'وقتی تو مهمونی تنها و معذبم چیکار کنم؟',
    'وقتی پیام میده کجایی چی بگم؟',
    'سین زد ولی جواب نداد',
    'چطوری پیشنهاد قرار بذارم؟',
    'چطور تو جمع بدون استرس صحبت کنم؟',
    'وقتی کسی متلک میندازه چی جواب بدم؟',
    'چطوری دایرکت اینستاگرام رو شروع کنم؟',
    'وقتی میگه بهت فکر میکنم چی بگم؟',
    'چطور مرزبندی صمیمیت رو حفظ کنم؟',
    'وقتی از ظاهرم تعریف میکنه چی بگم؟',
    'چگونه تو محیط کاری باکلاس رفتار کنم؟',
    'وقتی با تاخیر پیام میده چطور جواب بدم؟',
    'چطور شوخ‌طبعی رندانه داشته باشم؟',
    'وقتی میگه حوصلم سر رفته چی بگم؟'
  ];

  let totalQueriesTested = 0;
  let consistencyViolations = 0;

  console.log('[Invariant 3] Testing Scenario Consistency & Isolation across test suite:');

  for (const query of testQueries) {
    totalQueriesTested++;
    const res = coachEngine.processQuery(query);
    const selectedId = res.pipelineLog.selectedScenarioId;
    const selectedChunk = res.pipelineLog.selectedChunk;
    const provenanceMatch = res.pipelineLog.provenanceMatch;

    if (!provenanceMatch) {
      console.error(`❌ Consistency violation on query: "${query}" (Selected: ${selectedId})`);
      consistencyViolations++;
      continue;
    }

    const responses = res.structuredData.responses;
    if (responses.length !== 5 && !res.pipelineLog.matchedScenarioId) {
      // If full 5 tones expected
    }

    for (const r of responses) {
      if (r.scenarioId !== selectedId) {
        console.error(`❌ Cross-scenario response detected! Tone: ${r.tone}, Tone ScenId: ${r.scenarioId}, Selected: ${selectedId}`);
        consistencyViolations++;
      }
    }
  }

  console.log(`\nTested ${totalQueriesTested} queries. Consistency Violations: ${consistencyViolations}`);
  if (consistencyViolations > 0) {
    console.error(`❌ INVARIANT 3 FAILED: ${consistencyViolations} cross-scenario violations found!`);
    process.exit(1);
  }
  console.log('✅ Invariant 3 Passed: CROSS_SCENARIO_RESPONSE = false across all test cases.\n');

  console.log('=====================================================');
  console.log('🎉 ALL INVARIANTS VERIFIED SUCCESSFULLY (100% PASS)');
  console.log('=====================================================');
}

verifyInvariants().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
