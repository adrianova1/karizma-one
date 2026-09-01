import { Router } from 'express';
import { DBEngine } from '../db.js';
import { Setting } from '../../types.js';

export const testRouter = Router();
testRouter.get('/groq-models', async (req, res) => {
  let key = process.env.GROQ_API_KEY;
  if (!key) {
    const settings = await DBEngine.readTable<Setting>('settings');
    key = settings.find(s => s.key === 'ai_groq_key' || s.key === 'groq_api_key')?.value;
  }
  if (!key) return res.json({error: 'no key'});
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${key.split(',')[0].trim()}` }
    });
    const data = await response.json();
    res.json(data);
  } catch (e: any) { res.json({error: e.message}); }
});
