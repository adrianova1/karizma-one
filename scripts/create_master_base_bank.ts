import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ScenarioItem } from '../src/types.js';
import { normalizePersianText } from './restore_real_base_dataset.js';

export function createMasterBaseBank() {
  console.log('=== MERGE & LOCK MASTER BASE BANK ===');
  const cwd = process.cwd();
  const base9kPath = path.join(cwd, 'data', 'production', 'base_9k.json');
  const backup51Path = path.join(cwd, 'data', 'scenarios.backup.json');
  const masterOutputPath = path.join(cwd, 'data', 'production', 'master_base_bank.json');

  if (!fs.existsSync(base9kPath)) {
    throw new Error(`Base 9k file not found: ${base9kPath}`);
  }
  if (!fs.existsSync(backup51Path)) {
    throw new Error(`Backup 51 file not found: ${backup51Path}`);
  }

  const base9k: ScenarioItem[] = JSON.parse(fs.readFileSync(base9kPath, 'utf8'));
  const backup51: ScenarioItem[] = JSON.parse(fs.readFileSync(backup51Path, 'utf8'));

  const count9425 = base9k.length;
  const count51 = backup51.length;

  const masterMap = new Map<string, ScenarioItem>();
  const seenSignatures = new Map<string, string>();
  let duplicateCount = 0;

  // 1. Ingest base9k records
  for (const item of base9k) {
    const sit = (item.situation || item.title || '').trim();
    const respCharismatic = item.responses?.charismatic;
    const respStr = typeof respCharismatic === 'string'
      ? respCharismatic
      : (Array.isArray(respCharismatic) ? respCharismatic.join(' ') : '');
    const sig = normalizePersianText(sit) + '|' + normalizePersianText(respStr);

    if (seenSignatures.has(sig)) {
      duplicateCount++;
    } else {
      seenSignatures.set(sig, item.id);
      masterMap.set(item.id, item);
    }
  }

  // 2. Ingest backup51 records
  for (const item of backup51) {
    const sit = (item.situation || item.title || '').trim();
    const respCharismatic = item.responses?.charismatic;
    const respStr = typeof respCharismatic === 'string'
      ? respCharismatic
      : (Array.isArray(respCharismatic) ? respCharismatic.join(' ') : '');
    const sig = normalizePersianText(sit) + '|' + normalizePersianText(respStr);

    if (seenSignatures.has(sig)) {
      duplicateCount++;
    } else {
      seenSignatures.set(sig, item.id);
      masterMap.set(item.id, item);
    }
  }

  const masterArray = Array.from(masterMap.values());
  const finalMasterCount = masterArray.length;

  // Write master_base_bank.json
  fs.writeFileSync(masterOutputPath, JSON.stringify(masterArray, null, 2), 'utf8');

  // Compute SHA-256
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(masterOutputPath)).digest('hex');

  console.log('Master Base Bank created successfully.');
  console.log(`9,425 Count: ${count9425}`);
  console.log(`51 Count: ${count51}`);
  console.log(`Duplicates: ${duplicateCount}`);
  console.log(`Final Master Count: ${finalMasterCount}`);
  console.log(`Master Path: data/production/master_base_bank.json`);
  console.log(`SHA-256: ${sha256}`);

  return {
    count9425,
    count51,
    duplicates: duplicateCount,
    finalMasterCount,
    masterPath: 'data/production/master_base_bank.json',
    sha256
  };
}

if (process.argv[1] && process.argv[1].endsWith('create_master_base_bank.ts')) {
  createMasterBaseBank();
}
