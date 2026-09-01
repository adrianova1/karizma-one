import fs from 'fs';
import crypto from 'crypto';
import { DBEngine } from './src/server/db.js';
import { ScenarioItem } from './src/types.js';

const categoryMap: Record<string, string> = {
  'شت تست، مکالمات با دختر': 'شیت‌تست (سنجش عیار)',
  'آداب معاشرت': 'شرایط آلفا و پرستیژ',
  'استوری تلینگ': 'استوری تلنگر و استارترها',
  'اشعار': 'شعر',
  'تیکه های لفظ کل کل': 'تیکه سبک / بادگیر / نگ',
  'جملات سرکاری سرگرم کننده': 'سرگرمی شخصیت نابی',
  'جوک': 'جوک ناب و شوخی با پسر و دختر',
  'چیستان': 'چیستان های جذاب',
  'حاضرجوابی ترکی': 'جواب و زبون ریختن ترکی',
  'حاظرجوابی روزمره': 'حاضر جوابی ناب / روزمره',
  'ریپلای استوری': 'ریپلای استوری',
  'زبون ریزی': 'زبون ریختن',
  'سیاسی، اقتصادی، فرهنگی': 'شرایط آلفا و پرستیژ',
  'شرایط آلفا': 'شرایط آلفا و پرستیژ',
  'شرایط ترکی': 'جواب و زبون ریختن ترکی',
  'شرایط فارسی': 'عمومی',
  'شوخی دوپهلو': 'شوخی دو پهلو',
  'ضرب المثل': 'سرگرمی شخصیت نابی',
  'لیست جملات': 'عمومی',
  'نگ': 'تیکه سبک / بادگیر / نگ',
  'None': 'عمومی',
  '': 'عمومی'
};

async function run() {
  const sourceFile = '/app/applet/karizma_scenario_bank_import.txt';
  const content = fs.readFileSync(sourceFile, 'utf8');

  const lines = content.split('\n');
  const records: any[] = [];
  
  let currentRecord: any = null;
  let isParsingResponse = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('[card_')) {
      if (currentRecord) {
        records.push(currentRecord);
      }
      currentRecord = { sourceCategory: '', situation: '', response: '', incomplete: false };
      isParsingResponse = false;
      continue;
    }

    if (currentRecord) {
      if (line.startsWith('دسته‌بندی منبع:')) {
        currentRecord.sourceCategory = line.replace('دسته‌بندی منبع:', '').trim();
        isParsingResponse = false;
      } else if (line.startsWith('موقعیت / جمله کاربر:')) {
        currentRecord.situation = line.replace('موقعیت / جمله کاربر:', '').trim();
        isParsingResponse = false;
      } else if (line.startsWith('پاسخ یا پاسخ‌های پیشنهادی:')) {
        currentRecord.response = line.replace('پاسخ یا پاسخ‌های پیشنهادی:', '').trim();
        isParsingResponse = true;
      } else if (line === '---') {
        records.push(currentRecord);
        currentRecord = null;
        isParsingResponse = false;
      } else if (isParsingResponse) {
        if (line !== '') {
          currentRecord.response += (currentRecord.response ? '\n' : '') + line;
        }
      } else if (line !== '' && currentRecord.situation && !currentRecord.response && !isParsingResponse && !line.startsWith('===========')) {
        currentRecord.situation += '\n' + line;
      }
    }
  }
  if (currentRecord) {
    records.push(currentRecord);
  }

  // Duplicate detection & Validation
  const existingScenarios = await DBEngine.readTable<ScenarioItem>('scenarios') || [];
  
  // Create an index for faster lookup
  const existingBySituation = new Map<string, ScenarioItem[]>();
  const existingCategories = new Set<string>();
  
  for (const s of existingScenarios) {
    existingCategories.add(s.environment);
    const normSit = s.situation.trim().toLowerCase().replace(/[\s\u200c]+/g, ' ');
    if (!existingBySituation.has(normSit)) {
      existingBySituation.set(normSit, []);
    }
    existingBySituation.get(normSit)!.push(s);
  }

  let incompleteCount = 0;
  let exactDuplicates = 0;
  const uniqueRecords = [];
  const sourceCategories: Record<string, number> = {};
  const mappedCategoriesCount: Record<string, number> = {};
  let newCategoriesCreated = 0;
  let categoriesMerged = 0;

  for (const r of records) {
    if (!r.situation || !r.response) {
      r.incomplete = true;
      incompleteCount++;
    }

    // Category mapping
    const mappedCat = categoryMap[r.sourceCategory] || 'عمومی';

    const normSit = r.situation.trim().toLowerCase().replace(/[\s\u200c]+/g, ' ');
    const normResp = r.response.trim().toLowerCase().replace(/[\s\u200c]+/g, ' ');

    let isDuplicate = false;
    const matches = existingBySituation.get(normSit) || [];
    
    for (const match of matches) {
       let matchResp = '';
       if (match.responses && match.responses.charismatic) {
           const val = match.responses.charismatic;
           const str = Array.isArray(val) ? val.join(' ') : String(val);
           matchResp = str.trim().toLowerCase().replace(/[\s\u200c]+/g, ' ');
       }
       if (matchResp === normResp || matchResp.includes(normResp) || normResp.includes(matchResp)) {
           isDuplicate = true;
           exactDuplicates++;
           break;
       }
    }

    if (!sourceCategories[r.sourceCategory]) {
       sourceCategories[r.sourceCategory] = 0;
       if (existingCategories.has(mappedCat)) {
           categoriesMerged++;
       } else {
           newCategoriesCreated++;
           existingCategories.add(mappedCat);
       }
    }
    sourceCategories[r.sourceCategory]++;

    if (!isDuplicate) {
       r.mappedCat = mappedCat;
       uniqueRecords.push(r);
       mappedCategoriesCount[mappedCat] = (mappedCategoriesCount[mappedCat] || 0) + 1;
    }
  }

  console.log('--- DRY RUN REPORT ---');
  console.log(`Total Records Parsed from File: ${records.length}`);
  console.log(`Records Available to Import: ${uniqueRecords.length}`);
  console.log(`Incomplete Records (Needs Review): ${incompleteCount}`);
  console.log(`Exact Duplicates Detected (matched against DB): ${exactDuplicates}`);
  console.log(`Total Source Categories in File: ${Object.keys(sourceCategories).length}`);
  console.log(`Categories Merged into Existing: ${categoriesMerged}`);
  console.log(`New Categories Created: ${newCategoriesCreated}`);
  
  if (process.argv.includes('--execute')) {
     console.log('\n--- EXECUTING BATCH IMPORT ---');
     let addedCount = 0;
     const newScenarios: ScenarioItem[] = [];
     for (const r of uniqueRecords) {
        const hash = crypto.createHash('md5').update(r.situation + r.response).digest('hex').substring(0, 12);
        const id = `scen_k_${hash}`;
        
        newScenarios.push({
          id,
          title: r.situation.length > 50 ? r.situation.substring(0, 50) + '...' : r.situation,
          situation: r.situation,
          opponentLine: r.sourceCategory, // Store original category here as requested
          environment: r.mappedCat,
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
     }
     
     if (newScenarios.length > 0) {
        await DBEngine.writeTable('scenarios', [...existingScenarios, ...newScenarios]);
        console.log(`Successfully imported ${addedCount} new scenarios.`);
     } else {
        console.log('No new scenarios to import. Database is up to date.');
     }

     const finalScenarios = await DBEngine.readTable<ScenarioItem>('scenarios');
     console.log('\n--- VERIFICATION REPORT ---');
     console.log(`Total scenarios in DB: ${finalScenarios.length}`);
     console.log(`Newly Imported: ${addedCount}`);
     console.log(`Duplicates skipped: ${exactDuplicates}`);
     
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
