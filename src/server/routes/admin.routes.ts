import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { DBEngine } from '../db.js';
import { Role, AITraceRecord, Setting } from '../../types.js';

const router = Router();

// GET /api/admin/traces
router.get('/traces', authenticateToken, requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  const traces = await DBEngine.readTable<AITraceRecord>('ai_traces');
  res.json(traces);
});


// GET /api/admin/ai/keys
router.get('/ai/keys', authenticateToken, requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  const settings = await DBEngine.readTable<Setting>('settings');
  const getVal = (k: string) => settings.find(s => s.key === k)?.value || '';
  res.json({
    geminiKey: getVal('ai_gemini_key'),
    groqKey: getVal('ai_groq_key'),
    openRouterKey: getVal('ai_openrouter_key'),
    customBaseUrl: getVal('ai_custom_base_url'),
    customKey: getVal('ai_custom_key'),
    customModel: getVal('ai_custom_model')
  });
});

// POST /api/admin/ai/keys
router.post('/ai/keys', authenticateToken, requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  const { geminiKey, groqKey, openRouterKey, customBaseUrl, customKey, customModel } = req.body;
  const settings = await DBEngine.readTable<Setting>('settings');
  
  const updateSetting = (key: string, value: string, desc: string) => {
    const idx = settings.findIndex(s => s.key === key);
    if (idx !== -1) {
      settings[idx].value = value;
      settings[idx].updatedAt = new Date().toISOString();
    } else {
      settings.push({ id: 'set_' + Date.now() + Math.random(), key, value, description: desc, updatedAt: new Date().toISOString() });
    }
  };

  updateSetting('ai_gemini_key', geminiKey || '', 'Gemini API Key');
  updateSetting('ai_groq_key', groqKey || '', 'Groq API Key');
  updateSetting('ai_openrouter_key', openRouterKey || '', 'OpenRouter API Key');
  updateSetting('ai_custom_base_url', customBaseUrl || '', 'Custom AI Base URL');
  updateSetting('ai_custom_key', customKey || '', 'Custom AI API Key');
  updateSetting('ai_custom_model', customModel || '', 'Custom AI Model Name');

  await DBEngine.writeTable('settings', settings);
  res.json({ success: true });
});

// POST /api/admin/ai/test
router.post('/ai/test', authenticateToken, requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  const settings = await DBEngine.readTable<Setting>('settings');
  const getSetting = (k1: string, k2: string) => settings.find(s => s.key === k1 || s.key === k2)?.value;
  
  const geminiKey = getSetting('ai_gemini_key', 'gemini_api_key') || process.env.GEMINI_API_KEY;
  const groqKey = getSetting('ai_groq_key', 'groq_api_key') || process.env.GROQ_API_KEY;
  const openRouterKey = getSetting('ai_openrouter_key', 'openrouter_api_key') || process.env.OPENROUTER_API_KEY;
  const customBaseUrl = settings.find(s => s.key === 'ai_custom_base_url')?.value;
  const customKey = settings.find(s => s.key === 'ai_custom_key')?.value;
  const customModel = settings.find(s => s.key === 'ai_custom_model')?.value;
  
  let results: any = {
    gemini: { status: 'failed', message: geminiKey ? 'خطا در ارتباط با سرور گوگل' : 'کلید API تنظیم نشده است' },
    groq: { status: 'failed', message: groqKey ? 'خطا در ارتباط با سرور Groq' : 'کلید API تنظیم نشده است' },
    openrouter: { status: 'failed', message: openRouterKey ? 'خطا در ارتباط با سرور OpenRouter' : 'کلید API تنظیم نشده است' },
    custom: { status: 'failed', message: customBaseUrl ? 'خطا در ارتباط با سرور سفارشی' : 'تنظیم نشده' }
  };

  // Test Gemini
  if (geminiKey) {
    const rawKey = geminiKey.split(',')[0].trim();
    const geminiModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-flash-lite-latest',
      'gemini-3.7-flash'
    ];
    let lastErr = '';
    for (const gModel of geminiModels) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${gModel}:generateContent?key=${rawKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] })
        });
        if (response.ok) {
          results.gemini = { status: 'ok', modelUsed: gModel, message: 'اتصال فعال و معتبر' };
          break;
        } else {
          const errData = await response.json().catch(() => ({}));
          lastErr = (errData as any)?.error?.message || `HTTP ${response.status}`;
        }
      } catch (e: any) {
        lastErr = e?.message || 'خطای شبکه';
      }
    }
    if (results.gemini.status !== 'ok') {
      results.gemini.message = lastErr || 'خطا در احراز هویت کلید';
    }
  }

  // Test Groq
  if (groqKey) {
    const rawGroqKey = groqKey.split(',')[0].trim();
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${rawGroqKey}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: 'ping' }], max_tokens: 5 })
      });
      if (response.ok) {
        results.groq = { status: 'ok', modelUsed: 'llama-3.3-70b-versatile', message: 'اتصال فعال و معتبر' };
      } else {
        const errData = await response.json().catch(() => ({}));
        results.groq.message = (errData as any)?.error?.message || `HTTP ${response.status}`;
      }
    } catch (e: any) {
      results.groq.message = e?.message || 'خطای شبکه';
    }
  }

  // Test OpenRouter
  if (openRouterKey) {
    const rawOpenRouterKey = openRouterKey.split(',')[0].trim();
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${rawOpenRouterKey}`,
          'HTTP-Referer': 'https://app.g51.ir',
          'X-Title': 'Karizma Center'
        },
        body: JSON.stringify({ model: 'meta-llama/llama-3.3-70b-instruct:free', messages: [{ role: 'user', content: 'ping' }], max_tokens: 5 })
      });
      if (response.ok) {
        results.openrouter = { status: 'ok', modelUsed: 'llama-3.3-70b-instruct', message: 'اتصال فعال و معتبر' };
      } else {
        const errData = await response.json().catch(() => ({}));
        results.openrouter.message = (errData as any)?.error?.message || `HTTP ${response.status}`;
      }
    } catch (e: any) {
      results.openrouter.message = e?.message || 'خطای شبکه';
    }
  }
  
  // Test Custom
  if (customBaseUrl && customKey && customModel) {
    try {
      const response = await fetch(customBaseUrl.replace(/\/+$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customKey.trim()}` },
        body: JSON.stringify({ model: customModel.trim(), messages: [{ role: 'user', content: 'ping' }], max_tokens: 5 })
      });
      if (response.ok) {
        results.custom = { status: 'ok', modelUsed: customModel, message: 'اتصال فعال و معتبر' };
      } else {
        results.custom.message = `HTTP ${response.status}`;
      }
    } catch (e: any) {
      results.custom.message = e?.message || 'خطای شبکه';
    }
  }
  
  res.json({ success: true, results });
});

export default router;
