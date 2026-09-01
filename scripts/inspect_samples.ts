import fs from 'fs';
import path from 'path';

const raw = fs.readFileSync(path.join(process.cwd(), 'data', 'scenarios.json'), 'utf-8');
const data = JSON.parse(raw);

console.log('Sample scenario structure:');
for (let i = 0; i < 5; i++) {
  const s = data[i];
  console.log(`\n--- Scenario ${i + 1} (${s.id}) ---`);
  console.log('Title:', s.title);
  console.log('Situation:', s.situation);
  console.log('Category:', s.category);
  console.log('Triggers:', s.triggers);
  console.log('Aliases:', s.aliases);
  console.log('Keywords:', s.keywords);
}
