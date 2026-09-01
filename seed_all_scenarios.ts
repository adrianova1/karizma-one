import fs from 'fs';
import crypto from 'crypto';
import { DBEngine } from './src/server/db.js';
import { ScenarioItem } from './src/types.js';

/**
 * All-In-One Importer for Postgres / Production VPS
 * Imports all scenarios from Scenario_Bank.txt (8,700+ records)
 * and karizma_scenario_bank_import.txt (4,300+ records)
 * Deduplicating and seeding perfectly into PostgreSQL.
 */
async function importAll() {
  console.log('=== Starting Master Scenario Importer ===');

  const existingScenarios = await DBEngine.readTable<ScenarioItem>('scenarios') || [];
  const existingIds = new Set(existingScenarios.map(s => s.id));
  const getRespStr = (r: any) => {
    if (!r) return '';
    if (Array.isArray(r)) return r.join(' ');
    return String(r);
  };
  const uniqueSignatures = new Set(existingScenarios.map(s => (s.situation || '').trim() + '|' + getRespStr(s.responses?.charismatic).trim()));

  let totalParsed = 0;
  let totalNewAdded = 0;
  const newScenarios: ScenarioItem[] = [];

  // 1. Process Scenario_Bank.txt
  if (fs.existsSync('Scenario_Bank.txt')) {
    console.log('Processing Scenario_Bank.txt (8,700+ entries)...');
    const content = fs.readFileSync('Scenario_Bank.txt', 'utf8');
    const lines = content.split('\n');
    let temp: any = null;
    let isParsingResponse = false;

    const saveRecord = () => {
      if (temp && temp.situation && temp.response) {
        totalParsed++;
        const sig = temp.situation.trim() + '|' + temp.response.trim();
        if (!uniqueSignatures.has(sig)) {
          uniqueSignatures.add(sig);
          const hash = crypto.createHash('md5').update(sig).digest('hex').substring(0, 12);
          const id = `scen_bank_${hash}`;
          if (!existingIds.has(id)) {
            existingIds.add(id);
            newScenarios.push({
              id,
              title: temp.situation.length > 50 ? temp.situation.substring(0, 50) + '...' : temp.situation,
              situation: temp.situation,
              opponentLine: '',
              environment: temp.category || 'عمومی',
              genderContext: 'general',
              goal: '',
              difficulty: 'medium',
              responses: {
                charismatic: temp.response,
                funny: '',
                confident: '',
                mysterious: '',
                mature: ''
              },
              technique: '',
              bodyLanguage: '',
              teachingNote: '',
              views: 0,
              likes: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            totalNewAdded++;
          }
        }
      }
      temp = null;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('## ') && line.includes('— رکورد')) {
        saveRecord();
        isParsingResponse = false;
        temp = { category: '', situation: '', response: '' };
        continue;
      }
      if (temp) {
        if (line.startsWith('دسته:')) {
          temp.category = line.replace('دسته:', '').trim();
          isParsingResponse = false;
        } else if (line.startsWith('موقعیت/سؤال:')) {
          temp.situation = line.replace('موقعیت/سؤال:', '').trim();
          isParsingResponse = false;
        } else if (line.startsWith('پاسخ:')) {
          temp.response = line.replace('پاسخ:', '').trim();
          isParsingResponse = true;
        } else if (isParsingResponse) {
          if (line !== '' && !line.startsWith('==================')) {
            temp.response += '\n' + line;
          }
        } else if (line !== '' && !line.startsWith('==================') && temp.situation && !temp.response) {
          temp.situation += '\n' + line;
        }
      }
    }
    saveRecord();
  }

  // 2. Process karizma_scenario_bank_import.txt
  if (fs.existsSync('karizma_scenario_bank_import.txt')) {
    console.log('Processing karizma_scenario_bank_import.txt (4,300+ entries)...');
    const content = fs.readFileSync('karizma_scenario_bank_import.txt', 'utf8');
    const lines = content.split('\n');
    let currentCategory = 'عمومی';
    let tempCard: any = null;
    let isParsingResponse = false;

    const saveCard = () => {
      if (tempCard && tempCard.situation && tempCard.response) {
        totalParsed++;
        const sig = tempCard.situation.trim() + '|' + tempCard.response.trim();
        if (!uniqueSignatures.has(sig)) {
          uniqueSignatures.add(sig);
          const hash = crypto.createHash('md5').update(sig).digest('hex').substring(0, 12);
          const id = `scen_import_${hash}`;
          if (!existingIds.has(id)) {
            existingIds.add(id);
            newScenarios.push({
              id,
              title: tempCard.situation.length > 50 ? tempCard.situation.substring(0, 50) + '...' : tempCard.situation,
              situation: tempCard.situation,
              opponentLine: '',
              environment: tempCard.category || currentCategory || 'عمومی',
              genderContext: 'general',
              goal: '',
              difficulty: 'medium',
              responses: {
                charismatic: tempCard.response,
                funny: '',
                confident: '',
                mysterious: '',
                mature: ''
              },
              technique: '',
              bodyLanguage: '',
              teachingNote: '',
              views: 0,
              likes: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            totalNewAdded++;
          }
        }
      }
      tempCard = null;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('دسته‌بندی منبع:') && !line.includes('[card_')) {
        currentCategory = line.replace('دسته‌بندی منبع:', '').trim();
        continue;
      }
      if (line.startsWith('[card_')) {
        saveCard();
        isParsingResponse = false;
        tempCard = { category: currentCategory, situation: '', response: '' };
        continue;
      }
      if (tempCard) {
        if (line.startsWith('دسته‌بندی منبع:')) {
          tempCard.category = line.replace('دسته‌بندی منبع:', '').trim();
          isParsingResponse = false;
        } else if (line.startsWith('موقعیت / جمله کاربر:')) {
          tempCard.situation = line.replace('موقعیت / جمله کاربر:', '').trim();
          isParsingResponse = false;
        } else if (line.startsWith('پاسخ یا پاسخ‌های پیشنهادی:')) {
          tempCard.response = line.replace('پاسخ یا پاسخ‌های پیشنهادی:', '').trim();
          isParsingResponse = true;
        } else if (isParsingResponse) {
          if (line !== '' && !line.startsWith('==================') && !line.startsWith('[card_')) {
            tempCard.response += '\n' + line;
          }
        } else if (line !== '' && !line.startsWith('==================') && tempCard.situation && !tempCard.response) {
          tempCard.situation += '\n' + line;
        }
      }
    }
    saveCard();
  }

  console.log(`Total Records Parsed Across All Files: ${totalParsed}`);
  console.log(`New Unique Scenarios to Insert: ${newScenarios.length}`);

  if (newScenarios.length > 0) {
    const all = [...existingScenarios, ...newScenarios];
    await DBEngine.writeTable('scenarios', all);
    console.log(`Successfully saved ${all.length} total scenarios to the database!`);
  } else {
    console.log(`Database already has all ${existingScenarios.length} scenarios.`);
  }

  const finalCheck = await DBEngine.readTable<ScenarioItem>('scenarios') || [];
  console.log(`=== Complete! Final Database Count: ${finalCheck.length} Scenarios ===`);
}

importAll().catch(console.error);
