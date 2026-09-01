import fs from 'fs';
import path from 'path';

const raw = fs.readFileSync(path.join(process.cwd(), 'data', 'scenarios.json'), 'utf-8');
const data = JSON.parse(raw);

console.log(`Total scenarios: ${data.length}`);

// Sample situations and titles
const titlePrefixes = new Map<string, number>();
const situationSamples: string[] = [];

for (const s of data) {
  const t = s.title || '';
  const firstWord = t.split(' ').slice(0, 2).join(' ');
  titlePrefixes.set(firstWord, (titlePrefixes.get(firstWord) || 0) + 1);
  if (situationSamples.length < 20) {
    situationSamples.push(s.situation);
  }
}

console.log('Top Title Prefixes:');
const sorted = Array.from(titlePrefixes.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20);
for (const [prefix, count] of sorted) {
  console.log(`- "${prefix}": ${count}`);
}

console.log('\nSample Situations:');
situationSamples.slice(0, 10).forEach((s, idx) => console.log(`${idx + 1}. ${s}`));
