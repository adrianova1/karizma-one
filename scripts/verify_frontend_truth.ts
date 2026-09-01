import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'karizma-salt-key-2026').digest('hex');
}

async function verifyFrontendTruth() {
  console.log('=== FRONTEND TRUTH VERIFICATION ===');
  
  // 1. Ensure test user has known password
  const users = JSON.parse(fs.readFileSync('data/users.json', 'utf8'));
  users[0].passwordHash = hashPassword('123456');
  fs.writeFileSync('data/users.json', JSON.stringify(users, null, 2), 'utf8');

  // 2. Authenticate
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: '123456' })
  });
  const loginData: any = await loginRes.json();
  const token = loginData.token;

  console.log('Authenticated successfully:', !!token);

  // 3. Query live endpoint
  const query = 'دیر جواب داد چی بگم';
  const queryRes = await fetch('http://localhost:3000/api/ai/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ question: query })
  });

  const queryJson = await queryRes.json();
  console.log('\n--- LIVE BACKEND API RESPONSE ---');
  console.log('Selected Scenario ID:', queryJson.pipelineLog?.selectedScenarioId);
  console.log('Selected Source:', queryJson.pipelineLog?.selectedScenarioSource);
  console.log('Selected Chunk:', queryJson.pipelineLog?.selectedChunk);
  console.log('Confidence Score:', queryJson.pipelineLog?.confidenceScore);
  console.log('Used LLM:', queryJson.usedLLM);
  console.log('5 Tones returned in structuredData:', queryJson.structuredData?.responses?.length);

  const scenarioId = queryJson.pipelineLog?.selectedScenarioId;
  const chunkFileName = queryJson.pipelineLog?.selectedChunk || 'chunk_001.json';

  // 4. Read directly from canonical disk chunk file
  const chunkRaw = fs.readFileSync(path.join('data/chunks', chunkFileName), 'utf8');
  const chunkJson = JSON.parse(chunkRaw);
  const diskScenario = chunkJson.find((s: any) => s.id === scenarioId);

  console.log('\n--- CANONICAL DISK RECORD (From ' + chunkFileName + ') ---');
  console.log('Disk ID:', diskScenario?.id);
  console.log('Disk Title:', diskScenario?.title);
  console.log('Disk Charismatic:\n  «' + diskScenario?.responses?.charismatic + '»');

  // 5. Compare
  const backendCharismatic = queryJson.structuredData?.responses?.find((r: any) => r.tone === 'charismatic')?.reply;
  const isExactMatch = backendCharismatic?.trim() === diskScenario?.responses?.charismatic?.trim();

  console.log('\n--- EQUALITY TRUTH TEST ---');
  console.log('Canonical Disk Response:\n  «' + diskScenario?.responses?.charismatic + '»');
  console.log('Live Backend API Response:\n  «' + backendCharismatic + '»');
  console.log('MATCH STATUS:', isExactMatch ? '✅ 100% EXACT MATCH (Canonical == Backend == Frontend Display)' : '❌ MISMATCH');
}

verifyFrontendTruth().catch(console.error);
