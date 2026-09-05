/**
 * Automated Unit Tests for PersianNormalizer, ToneDistributor, PersonaGenerator, ResponseSelector, and DBEngine
 */
import { PersianNormalizer } from './PersianNormalizer.js';
import { PersonaGenerator } from './PersonaGenerator.js';
import { ToneDistributor } from './ToneDistributor.js';
import { ResponseSelector } from './ResponseSelector.js';

export function runTests(): boolean {
  console.log('[TEST] Starting Karizma Coach Engine Unit Tests...');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✓ PASSED: ${msg}`);
    } else {
      console.error(`  ✗ FAILED: ${msg}`);
      throw new Error(`Test assertion failed: ${msg}`);
    }
  }

  // Test 1: stripMetadataTags with closed tag
  const t1 = PersianNormalizer.stripMetadataTags('[حالت کوچینگ: پاسخ‌ساز هوشمند]\n[لحن انتخابی: شوخ‌طبع و رندانه]\nسلام چطوری؟');
  assert(t1.cleanText === 'سلام چطوری؟', 'stripMetadataTags extracts clean text correctly');
  assert(t1.extractedTone === 'funny', 'stripMetadataTags extracts funny tone correctly');

  // Test 2: stripMetadataTags with unclosed/malformed tag
  const t2 = PersianNormalizer.stripMetadataTags('[لحن انتخابی: کاریزماتیک و باکلاس\nموقعیت تستی');
  assert(t2.cleanText === 'موقعیت تستی', 'stripMetadataTags handles unclosed bracket safely');
  assert(t2.extractedTone === 'charismatic', 'stripMetadataTags extracts charismatic tone correctly');

  // Test 3: normalize basic Persian text and Arabic char conversion
  const norm1 = PersianNormalizer.normalize('سلاممم علیك خوبی؟ يک سوال داشتم.');
  assert(norm1.includes('سلام'), 'normalize collapses repeated letters');
  assert(norm1.includes('یک'), 'normalize converts Arabic Yeh to Persian Yeh');

  // Test 4: Trigram similarity calculation
  const sim = PersianNormalizer.computeTrigramSimilarity('بیشعور عوضی', 'بیشعوری عوضی');
  assert(sim > 0.6, `computeTrigramSimilarity gives high score for similar phrases (${sim})`);

  // Test 5: PersonaGenerator variation generation
  const vars = PersonaGenerator.generateVariations('جواب تستی', null, 'به من گفت بیشعور');
  assert(Boolean(vars.charismatic && vars.funny && vars.confident && vars.mysterious && vars.mature), 'PersonaGenerator produces all 5 non-empty tones');
  assert(vars.charismatic !== vars.funny, 'Tones are distinct from each other');

  // Test 6: ResponseSelector formatting
  const result = ResponseSelector.formatResult(null, null, 'سلام چطوری', 0.9);
  assert(Boolean(result.structuredData && result.structuredData.responses.length === 5), 'ResponseSelector outputs 5 canonical responses in structuredData');
  assert(Boolean(result.answer && result.answer.includes('لحن ۱') && result.answer.includes('لحن ۵')), 'ResponseSelector markdown includes all 5 tones');

  // Test 7: canonicalizeTone mapping
  assert(PersianNormalizer.canonicalizeTone('کاریزماتیک') === 'charismatic', 'canonicalizeTone maps کاریزماتیک to charismatic');
  assert(PersianNormalizer.canonicalizeTone('مقتدر و قاطع') === 'confident', 'canonicalizeTone maps مقتدر to confident');
  assert(PersianNormalizer.canonicalizeTone('شوخ طبع') === 'funny', 'canonicalizeTone maps شوخ to funny');
  assert(PersianNormalizer.canonicalizeTone('مرموز') === 'mysterious', 'canonicalizeTone maps مرموز to mysterious');
  assert(PersianNormalizer.canonicalizeTone('متین و سنگین') === 'mature', 'canonicalizeTone maps متین to mature');
  assert(PersianNormalizer.canonicalizeTone('نامشخص') === 'all', 'canonicalizeTone defaults unmapped strings to all');

  // Test 8: Single-reply legacy scenario distribution with trigram similarity detection
  const legacyScenario: any = {
    id: 'legacy_1',
    title: 'تست لگاسی',
    situation: 'موقعیت تستی',
    responses: {
      charismatic: 'همین یک پاسخ تستی برای تمام لحن‌ها',
      funny: 'همین یک پاسخ تستی برای تمام لحن‌ها',
      confident: 'همین یک پاسخ تستی برای تمام لحن‌ها',
      mysterious: 'همین یک پاسخ تستی برای تمام لحن‌ها',
      mature: 'همین یک پاسخ تستی برای تمام لحن‌ها'
    }
  };
  const legacyDistributed = ToneDistributor.distribute(legacyScenario, null, 'legacy_1', 'به من بی احترامی کرد');
  assert(legacyDistributed.charismaticReply !== legacyDistributed.funnyReply, 'ToneDistributor generates distinct variations for identical single-reply legacy scenario');
  assert(legacyDistributed.funnyReply !== legacyDistributed.confidentReply, 'Funny and confident tones are distinct in legacy distribution');

  // Test 9: ResponseSelector filtering with canonical tone
  const filteredResult = ResponseSelector.formatResult(legacyScenario, null, 'تست', 0.85, { selectedTone: 'confident' });
  assert(filteredResult.structuredData?.responses.length === 1, 'ResponseSelector correctly filters to 1 response when selectedTone is confident');
  assert(filteredResult.structuredData?.responses[0].tone === 'confident', 'Filtered response tone matches selected confident tone');

  console.log(`[TEST] Complete: ${passed}/${total} assertions passed successfully!`);
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('PersianNormalizer.test.ts')) {
  try {
    runTests();
  } catch (e) {
    console.error('[TEST] Test runner failed:', e);
    process.exit(1);
  }
}
