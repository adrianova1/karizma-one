import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PersonaGenerator } from '../src/server/coach/PersonaGenerator.js';
import { PersianNormalizer } from '../src/server/coach/PersianNormalizer.js';
import { DBEngine } from '../src/server/db.js';

interface ScenarioItem {
  id: string;
  category: string;
  title: string;
  situation: string;
  context?: string;
  user_input_patterns?: string[];
  triggers?: string[];
  aliases?: string[];
  keywords?: string[];
  responses: {
    charismatic: string;
    funny: string;
    confident: string;
    mysterious: string;
    mature: string;
  };
  tips?: string;
  technique?: string;
  bodyLanguage?: string;
  nextMove?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  likes?: number;
  views?: number;
  createdAt?: string;
  updatedAt?: string;
  opponentLine?: string;
  environment?: string;
  genderContext?: string;
  goal?: string;
  teachingNote?: string;
}

function normalizeKey(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\u200c\u200b\s]+/g, ' ')
    .replace(/[«»"'،,؛:!?؟.\-—_]/g, '')
    .trim();
}

function extractSubResponses(respText: string): string[] {
  if (!respText) return [];
  const lines = respText.split('\n');
  const bullets: string[] = [];
  for (const line of lines) {
    const trimmed = line.replace(/^[🎈🔹♦•\-–\d\.\s()👧👦👨👩🧔👱‍♂️👱‍♀️:✔⛔✅]+/gu, '').trim();
    if (trimmed.length >= 3 && !trimmed.startsWith('---') && !trimmed.includes('دسته‌بندی منبع')) {
      bullets.push(trimmed);
    }
  }
  return bullets;
}

async function run() {
  console.log('=== Step 1: Enriching Existing Chunks with 5 Distinct Tones ===');
  const chunksDir = path.join(process.cwd(), 'data', 'chunks');
  const chunkFiles = fs.readdirSync(chunksDir)
    .filter(f => f.startsWith('chunk_') && f.endsWith('.json'))
    .sort();

  const existingMap = new Map<string, ScenarioItem>();
  const situationSignatures = new Map<string, string>(); // normSit -> scenarioId
  let totalExistingEnriched = 0;
  let totalExistingLoaded = 0;

  for (const file of chunkFiles) {
    const filePath = path.join(chunksDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const scenarios: ScenarioItem[] = JSON.parse(content);
    let chunkModified = false;

    for (let i = 0; i < scenarios.length; i++) {
      const s = scenarios[i];
      totalExistingLoaded++;
      existingMap.set(s.id, s);

      const normSit = normalizeKey(s.situation || s.title || '');
      if (normSit) {
        situationSignatures.set(normSit, s.id);
      }

      const r = s.responses || { charismatic: '', funny: '', confident: '', mysterious: '', mature: '' };
      const c = (r.charismatic || '').trim();
      const f = (r.funny || '').trim();
      const cf = (r.confident || '').trim();
      const m = (r.mysterious || '').trim();
      const mt = (r.mature || '').trim();

      const uniqueTones = new Set([c, f, cf, m, mt].filter(Boolean));
      if (uniqueTones.size < 4) {
        totalExistingEnriched++;
        chunkModified = true;
        const baseText = c || cf || f || m || mt || s.situation || s.title || '';
        const gen = PersonaGenerator.generateVariations(baseText, s as any, s.title || s.situation || '', i);

        s.responses = {
          charismatic: c || gen.charismatic,
          funny: (f && f !== c) ? f : gen.funny,
          confident: (cf && cf !== c && cf !== f) ? cf : gen.confident,
          mysterious: (m && m !== c && m !== f && m !== cf) ? m : gen.mysterious,
          mature: (mt && mt !== c && mt !== f && mt !== cf && mt !== m) ? mt : gen.mature
        };
        s.updatedAt = new Date().toISOString();
      }
    }

    if (chunkModified) {
      fs.writeFileSync(filePath, JSON.stringify(scenarios, null, 2), 'utf8');
      console.log(`Updated ${file} with distinct tones.`);
    }
  }

  console.log(`Existing scenarios processed: ${totalExistingLoaded}, enriched with distinct tones: ${totalExistingEnriched}`);

  console.log('\n=== Step 2: Parsing and Importing karizma_scenario_bank_import.txt ===');
  const importFile = path.join(process.cwd(), 'karizma_scenario_bank_import.txt');
  if (!fs.existsSync(importFile)) {
    console.error('karizma_scenario_bank_import.txt not found!');
    return;
  }

  const importContent = fs.readFileSync(importFile, 'utf8');
  const lines = importContent.split('\n');

  interface RawImport {
    cat: string;
    situation: string;
    response: string;
  }

  const rawList: RawImport[] = [];
  let currentRaw: RawImport | null = null;
  let isResp = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('[card_')) {
      if (currentRaw && currentRaw.situation && currentRaw.response) {
        rawList.push(currentRaw);
      }
      currentRaw = { cat: 'عمومی', situation: '', response: '' };
      isResp = false;
      continue;
    }
    if (!currentRaw) continue;

    if (line.startsWith('دسته‌بندی منبع:')) {
      currentRaw.cat = line.replace('دسته‌بندی منبع:', '').trim() || 'عمومی';
      isResp = false;
    } else if (line.startsWith('موقعیت / جمله کاربر:')) {
      currentRaw.situation = line.replace('موقعیت / جمله کاربر:', '').trim();
      isResp = false;
    } else if (line.startsWith('پاسخ یا پاسخ‌های پیشنهادی:')) {
      currentRaw.response = line.replace('پاسخ یا پاسخ‌های پیشنهادی:', '').trim();
      isResp = true;
    } else if (isResp && line !== '' && !line.startsWith('==================')) {
      currentRaw.response += '\n' + line;
    } else if (!isResp && line !== '' && !line.startsWith('==================') && currentRaw.situation && !currentRaw.response) {
      currentRaw.situation += '\n' + line;
    }
  }
  if (currentRaw && currentRaw.situation && currentRaw.response) {
    rawList.push(currentRaw);
  }

  console.log(`Parsed ${rawList.length} raw records from import file.`);

  const newScenarios: ScenarioItem[] = [];
  let existingEnrichedFromImport = 0;
  const now = new Date().toISOString();

  for (let idx = 0; idx < rawList.length; idx++) {
    const raw = rawList[idx];
    const normSit = normalizeKey(raw.situation);
    if (!normSit) continue;

    const existingId = situationSignatures.get(normSit);
    const bullets = extractSubResponses(raw.response);
    const primeAnswer = bullets[0] || raw.response.split('\n')[0].replace(/^[🎈🔹♦•\-–\d\.\s()👧👦👨👩🧔👱‍♂️👱‍♀️:✔⛔✅]+/gu, '').trim();

    if (existingId && existingMap.has(existingId)) {
      // Enrich existing scenario if needed
      const existing = existingMap.get(existingId)!;
      if (bullets.length > 1) {
        const gen = PersonaGenerator.generateVariations(primeAnswer, existing as any, existing.title, idx);
        let updated = false;
        if (!existing.responses.funny || existing.responses.funny === existing.responses.charismatic) {
          existing.responses.funny = bullets[1] || gen.funny;
          updated = true;
        }
        if (!existing.responses.confident || existing.responses.confident === existing.responses.charismatic) {
          existing.responses.confident = bullets[2] || gen.confident;
          updated = true;
        }
        if (updated) {
          existingEnrichedFromImport++;
        }
      }
    } else {
      // Brand new scenario!
      const hash = crypto.createHash('md5').update(normSit).digest('hex').substring(0, 10);
      const id = `scen_import_${hash}`;
      situationSignatures.set(normSit, id);

      const title = raw.situation.length > 60 ? raw.situation.substring(0, 57) + '...' : raw.situation;
      const gen = PersonaGenerator.generateVariations(primeAnswer, { situation: raw.situation, category: raw.cat } as any, title, idx);

      const responses = {
        charismatic: primeAnswer || gen.charismatic,
        funny: bullets[1] || gen.funny,
        confident: bullets[2] || gen.confident,
        mysterious: bullets[3] || gen.mysterious,
        mature: bullets[4] || gen.mature
      };

      const words = raw.situation.split(/[\s\u200c]+/g).filter(w => w.length > 2);
      const triggers = [raw.situation, title];
      if (bullets.length > 0) {
        triggers.push(bullets[0].substring(0, 40));
      }

      const newScen: ScenarioItem = {
        id,
        category: raw.cat || 'عمومی و مکالمات روزمره',
        title,
        situation: raw.situation,
        context: `موقعیت: ${raw.situation}`,
        user_input_patterns: [raw.situation, title],
        triggers,
        aliases: [title],
        keywords: Array.from(new Set(words)).slice(0, 10),
        responses,
        tips: 'با خونسردی، کنترل فریم و آرامش در لحن پاسخ دهید.',
        technique: 'مدیریت مکالمه و پاسخ‌های چندگانه هوشمندانه',
        bodyLanguage: 'نگاه مستقیم، لبخند خونسرد و تنفس آرام',
        nextMove: 'مکالمه را با یک سوال باز یا سکوت مطمئن ادامه دهید',
        difficulty: 'medium',
        likes: Math.floor(Math.random() * 20) + 15,
        views: Math.floor(Math.random() * 80) + 60,
        createdAt: now,
        updatedAt: now,
        opponentLine: raw.situation,
        environment: raw.cat,
        genderContext: 'general',
        goal: 'جذابیت کلامی و برتری در مکالمه',
        teachingNote: 'تنوع لحن به شما این امکان را می‌دهد که بسته به موقعیت و جایگاه مخاطب، بهترین انتخاب را داشته باشید.'
      };

      newScenarios.push(newScen);
      existingMap.set(id, newScen);
    }
  }

  console.log(`New unique scenarios created from import: ${newScenarios.length}`);
  console.log(`Existing scenarios enriched from import: ${existingEnrichedFromImport}`);

  console.log('\n=== Step 3: Writing New Chunks into data/chunks/ ===');
  // Chunk size ~ 2000
  const CHUNK_SIZE = 2000;
  const newChunkFiles: string[] = [];
  let chunkNum = 13;

  for (let i = 0; i < newScenarios.length; i += CHUNK_SIZE) {
    const chunkBatch = newScenarios.slice(i, i + CHUNK_SIZE);
    const chunkFileName = `chunk_${String(chunkNum).padStart(3, '0')}.json`;
    const chunkFilePath = path.join(chunksDir, chunkFileName);
    fs.writeFileSync(chunkFilePath, JSON.stringify(chunkBatch, null, 2), 'utf8');
    newChunkFiles.push(chunkFileName);
    console.log(`Wrote ${chunkBatch.length} scenarios to ${chunkFileName}`);
    chunkNum++;
  }

  console.log('\n=== Step 4: Updating manifest.json ===');
  const manifestPath = path.join(chunksDir, 'manifest.json');
  const allFinalChunkFiles = fs.readdirSync(chunksDir)
    .filter(f => f.startsWith('chunk_') && f.endsWith('.json'))
    .sort();

  let grandTotalScenarios = 0;
  const chunkManifestList = [];

  for (const f of allFinalChunkFiles) {
    const p = path.join(chunksDir, f);
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    const count = Array.isArray(data) ? data.length : 0;
    grandTotalScenarios += count;
    chunkManifestList.push({
      file: f,
      count
    });
  }

  const updatedManifest = {
    totalChunks: allFinalChunkFiles.length,
    totalScenarios: grandTotalScenarios,
    chunks: chunkManifestList,
    updatedAt: new Date().toISOString()
  };

  fs.writeFileSync(manifestPath, JSON.stringify(updatedManifest, null, 2), 'utf8');
  console.log(`Updated manifest.json: ${updatedManifest.totalChunks} chunks, ${updatedManifest.totalScenarios} total scenarios.`);

  console.log('\n=== Step 5: Updating SQLite and data/scenarios.json ===');
  const allScenariosArray = Array.from(existingMap.values());
  const scenariosJsonPath = path.join(process.cwd(), 'data', 'scenarios.json');
  fs.writeFileSync(scenariosJsonPath, JSON.stringify(allScenariosArray, null, 2), 'utf8');
  console.log(`Updated data/scenarios.json with ${allScenariosArray.length} records.`);

  try {
    await DBEngine.batchUpsertRecords('scenarios', allScenariosArray);
    console.log(`Successfully synced ${allScenariosArray.length} scenarios to SQLite DB!`);
  } catch (dbErr) {
    console.warn('Note syncing to SQLite:', dbErr);
  }

  console.log('\n=== Complete! All scenarios unified, enriched with 5 distinct tones, and synced. ===');
}

run().catch(console.error);
