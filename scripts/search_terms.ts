import { CoachLoader } from '../src/server/coach/CoachLoader.js';

async function searchScenarios() {
  const { scenarios } = CoachLoader.loadData();
  console.log(`Loaded ${scenarios.length} scenarios.`);

  console.log('\n=== SEARCHING FOR Q1 (لباس صورتی / خیابون / اپنر / شروع مکالمه) ===');
  const q1Matches = scenarios.filter(s => {
    const text = `${s.title} ${s.situation} ${(s.triggers || []).join(' ')} ${(s.keywords || []).join(' ')} ${(s.aliases || []).join(' ')}`;
    return text.includes('صورتی') || text.includes('لباس') || (text.includes('خیابان') && text.includes('شروع')) || (text.includes('خیابون') && text.includes('شروع'));
  });

  console.log(`Found ${q1Matches.length} matching scenarios for Q1 terms.`);
  for (const s of q1Matches.slice(0, 10)) {
    console.log(`ID: ${s.id} | Title: ${s.title} | Category: ${s.category}`);
    console.log(`  Triggers:`, s.triggers?.slice(0, 3));
    console.log(`  Charismatic: ${s.responses?.charismatic}`);
    console.log(`  Funny: ${s.responses?.funny}`);
    console.log(`  Confident: ${s.responses?.confident}`);
    console.log(`  Mysterious: ${s.responses?.mysterious}`);
    console.log(`  Mature: ${s.responses?.mature}`);
    console.log('--------------------------------------------------');
  }

  console.log('\n=== SEARCHING FOR Q2 (دور نگیر / جو نگیرتت / فاز نگیر / شیت تست) ===');
  const q2Matches = scenarios.filter(s => {
    const text = `${s.title} ${s.situation} ${(s.triggers || []).join(' ')} ${(s.keywords || []).join(' ')} ${(s.aliases || []).join(' ')}`;
    return text.includes('دور نگیر') || text.includes('جو نگیر') || text.includes('فاز نگیر') || text.includes('پررو نشو') || text.includes('رو نگیر') || text.includes('زیادی');
  });

  console.log(`Found ${q2Matches.length} matching scenarios for Q2 terms.`);
  for (const s of q2Matches.slice(0, 10)) {
    console.log(`ID: ${s.id} | Title: ${s.title} | Category: ${s.category}`);
    console.log(`  Triggers:`, s.triggers?.slice(0, 3));
    console.log(`  Charismatic: ${s.responses?.charismatic}`);
    console.log(`  Funny: ${s.responses?.funny}`);
    console.log(`  Confident: ${s.responses?.confident}`);
    console.log(`  Mysterious: ${s.responses?.mysterious}`);
    console.log(`  Mature: ${s.responses?.mature}`);
    console.log('--------------------------------------------------');
  }
}

searchScenarios().catch(console.error);
