import fs from 'fs';
import path from 'path';

function testLoad() {
  const filePath = path.join(process.cwd(), 'data', 'scenarios.json');
  console.log('Reading:', filePath);
  let raw = fs.readFileSync(filePath, 'utf-8');
  console.log('Raw length:', raw.length);
  
  // Fix unescaped control chars in JSON string values
  // In JSON, control characters \x00-\x1F (like unescaped newlines/tabs inside strings) must be handled
  try {
    const parsed = JSON.parse(raw);
    console.log('Direct JSON.parse success! Items:', parsed.length);
  } catch (e: any) {
    console.log('Direct parse failed:', e.message);
    // Sanitize control chars
    const sanitized = raw.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '');
    try {
      const parsed2 = JSON.parse(sanitized);
      console.log('Sanitized parse success! Items:', parsed2.length);
    } catch (e2: any) {
      console.log('Sanitized parse failed:', e2.message);
    }
  }
}

testLoad();
