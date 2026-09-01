import { CoachEngine } from '../src/server/coach/CoachEngine.js';
import { CoachLoader } from '../src/server/coach/CoachLoader.js';

async function verify50kRuntime() {
  console.log('--- Verifying 51,000 Scenario Runtime Performance ---');

  const startLoad = Date.now();
  const { scenarios, fallbacks, categories } = CoachLoader.loadData();
  const loadTime = Date.now() - startLoad;

  console.log(`✅ Loaded ${scenarios.length.toLocaleString()} scenarios in ${loadTime}ms.`);
  console.log(`✅ Loaded ${fallbacks.length} fallback matrices & ${categories.length} categories.`);

  if (scenarios.length < 50000) {
    throw new Error(`Expected at least 50,000 scenarios, got ${scenarios.length}`);
  }

  const startIndex = Date.now();
  const engine = CoachEngine.getInstance();
  engine.initialize();
  const indexTime = Date.now() - startIndex;
  console.log(`✅ Initialized Coach Engine & Built Index in ${indexTime}ms.`);

  const testQueries = [
    'دیر جواب میده چی بگم؟',
    'بهم میگه اهل رابطه نیستم',
    'تو کی هستی پیام دادی',
    'چرا سین کردی جواب ندادی',
    'خیلی خوشگلی و جذابی',
    'ولنتاین جشن میگیری؟',
    'میشه بهم پول قرض بدی؟',
    'چرا ازدواج نمیکنی؟',
    'اضافه کاری در تعطیلات بدون حقوق',
    'استوری موزیک ریپلای زدن'
  ];

  console.log('\n--- Running Test Queries ---');
  for (const q of testQueries) {
    const t0 = Date.now();
    const result = engine.processQuery(q);
    const queryTime = Date.now() - t0;

    console.log(`\nQuery: "${q}" (Latency: ${queryTime}ms)`);
    console.log(`  Matched: "${result.pipelineLog.reRankedTopResult || result.sourceCards[0]?.title || 'Fallback'}" (Confidence: ${result.pipelineLog.confidenceScore}%)`);
    console.log(`  Responses count: ${result.structuredData.responses.length}`);
    for (const r of result.structuredData.responses) {
      console.log(`    [${r.tone}] ${r.title}: ${r.reply.substring(0, 60)}...`);
    }
  }

  console.log('\n✅ 51,000 Scenario Verification Succeeded!');
}

verify50kRuntime().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
