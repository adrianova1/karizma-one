import fs from 'fs';
import crypto from 'crypto';
import { DBEngine } from './src/server/db.js';
import { ScenarioItem } from './src/types.js';

async function run() {
  const sourceFile = '/app/applet/Scenario_Bank.txt';
  const content = fs.readFileSync(sourceFile, 'utf8');

  const records: any[] = [];
  let isParsingResponse = false;

  const lines = content.split('\n');
  let recordCount = 0;
  let incompleteCount = 0;
  const categories: Record<string, number> = {};

  let tempRecord: any = null;

  function saveRecord() {
    if (tempRecord) {
      // Check completeness
      let incomplete = false;
      if (!tempRecord.situation || !tempRecord.response) {
        incomplete = true;
        incompleteCount++;
      }
      tempRecord.incomplete = incomplete;
      
      // Hash for ID
      const hash = crypto.createHash('md5').update(tempRecord.situation + tempRecord.response).digest('hex').substring(0, 12);
      tempRecord.id = `scen_import_${hash}`;
      
      records.push(tempRecord);
      categories[tempRecord.category] = (categories[tempRecord.category] || 0) + 1;
      tempRecord = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('## ') && line.includes('— رکورد')) {
      saveRecord();
      isParsingResponse = false;
      tempRecord = { category: '', situation: '', response: '' };
      recordCount++;
      continue;
    }
    
    if (tempRecord) {
      if (line.startsWith('دسته:')) {
        tempRecord.category = line.replace('دسته:', '').trim();
        isParsingResponse = false;
      } else if (line.startsWith('موقعیت/سؤال:')) {
        tempRecord.situation = line.replace('موقعیت/سؤال:', '').trim();
        isParsingResponse = false;
      } else if (line.startsWith('پاسخ:')) {
        tempRecord.response = line.replace('پاسخ:', '').trim();
        isParsingResponse = true;
      } else if (isParsingResponse) {
        if (line !== '' && !line.startsWith('==================')) {
          tempRecord.response += '\n' + line;
        }
      } else if (line !== '' && !line.startsWith('==================') && tempRecord.situation && !tempRecord.response && !isParsingResponse) {
          tempRecord.situation += '\n' + line;
      }
    }
  }
  saveRecord();

  // Detect duplicates
  const uniqueSet = new Set();
  let duplicates = 0;
  const uniqueRecords = [];
  for (const r of records) {
    const key = r.situation.trim() + '|' + r.response.trim();
    if (uniqueSet.has(key)) {
      duplicates++;
    } else {
      uniqueSet.add(key);
      uniqueRecords.push(r);
    }
  }

  console.log('--- DRY RUN REPORT ---');
  console.log(`Total Records Parsed: ${records.length}`);
  console.log(`Incomplete Records (Needs Review): ${incompleteCount}`);
  console.log(`Exact Duplicates Detected: ${duplicates}`);
  console.log(`Records to Import: ${uniqueRecords.length}`);
  console.log('\n--- Categories Breakdown ---');
  for (const [cat, count] of Object.entries(categories)) {
    console.log(`${cat}: ${count}`);
  }

  // Import Phase
  if (process.argv.includes('--execute')) {
    console.log('\n--- EXECUTING IMPORT ---');
    const existingScenarios = await DBEngine.readTable<ScenarioItem>('scenarios') || [];
    const existingIds = new Set(existingScenarios.map(s => s.id));
    
    let addedCount = 0;
    const newScenarios: ScenarioItem[] = [];

    for (const r of uniqueRecords) {
      if (!existingIds.has(r.id)) {
        newScenarios.push({
          id: r.id,
          title: r.situation.length > 50 ? r.situation.substring(0, 50) + '...' : r.situation,
          situation: r.situation,
          opponentLine: '',
          environment: r.category || 'عمومی',
          genderContext: 'general',
          goal: '',
          difficulty: 'medium',
          responses: {
            charismatic: r.response,
            funny: '',
            confident: '',
            mysterious: '',
            mature: ''
          },
          technique: '',
          bodyLanguage: '',
          teachingNote: r.incomplete ? 'Needs Review' : '',
          views: 0,
          likes: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        addedCount++;
        existingIds.add(r.id);
      }
    }

    if (newScenarios.length > 0) {
      await DBEngine.writeTable('scenarios', [...existingScenarios, ...newScenarios]);
      console.log(`Successfully imported ${addedCount} new scenarios.`);
    } else {
      console.log('No new scenarios to import. Database is up to date.');
    }
    
    // Verification
    const finalScenarios = await DBEngine.readTable<ScenarioItem>('scenarios');
    console.log('\n--- VERIFICATION REPORT ---');
    console.log(`Total scenarios in DB: ${finalScenarios.length}`);
    const finalCats: Record<string, number> = {};
    let needsReview = 0;
    for (const s of finalScenarios) {
      finalCats[s.environment] = (finalCats[s.environment] || 0) + 1;
      if (s.teachingNote === 'Needs Review') needsReview++;
    }
    console.log(`Total Needs Review in DB: ${needsReview}`);
    console.log('Category breakdown in DB:');
    for (const [cat, count] of Object.entries(finalCats)) {
      console.log(`- ${cat}: ${count}`);
    }
  }
}

run().catch(console.error);
