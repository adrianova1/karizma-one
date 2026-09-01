import fs from 'fs';
import path from 'path';

// Let's verify existing file paths and existing scenarios
console.log('Checking existing database files...');
const enrichedPath = path.join(process.cwd(), 'data', 'scenarios_enriched.json');
const existing = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
console.log(`Current scenario count: ${existing.length}`);
