import { coachEngine } from '../src/server/coach/CoachEngine.js';
import { PersianNormalizer } from '../src/server/coach/PersianNormalizer.js';

async function testQueries() {
  console.log('=== INITIALIZING COACH ENGINE ===');
  coachEngine.initialize();

  const q1 = 'دختره لباس صورتی پوشیده چی بگم بهش تو خیابون';
  const q2 = 'زیادی دور نگیر';

  console.log('\n--- TESTING Q1 ---');
  console.log('Query:', q1);
  console.log('Normalized:', PersianNormalizer.normalize(q1));
  const res1 = coachEngine.processQuery(q1);
  console.log('Selected Scenario ID:', res1.pipelineLog.selectedScenarioId);
  console.log('Selected Scenario Title:', res1.sourceCards?.[0]?.title);
  console.log('Situation:', res1.sourceCards?.[0]?.situation);
  console.log('Match Score:', res1.pipelineLog.confidenceScore);
  console.log('Match Type:', res1.pipelineLog.matchType);
  console.log('5 Tones:');
  for (const r of res1.structuredData.responses) {
    console.log(`  [${r.tone}]: ${r.reply}`);
  }

  console.log('\n--- TESTING Q2 ---');
  console.log('Query:', q2);
  console.log('Normalized:', PersianNormalizer.normalize(q2));
  const res2 = coachEngine.processQuery(q2);
  console.log('Selected Scenario ID:', res2.pipelineLog.selectedScenarioId);
  console.log('Selected Scenario Title:', res2.sourceCards?.[0]?.title);
  console.log('Situation:', res2.sourceCards?.[0]?.situation);
  console.log('Match Score:', res2.pipelineLog.confidenceScore);
  console.log('Match Type:', res2.pipelineLog.matchType);
  console.log('5 Tones:');
  for (const r of res2.structuredData.responses) {
    console.log(`  [${r.tone}]: ${r.reply}`);
  }
}

testQueries().catch(console.error);
