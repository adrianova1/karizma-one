import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { ConversationMemoryEngine } from '../utils/persianNormalizer.js';
import { AIService } from '../services/ai.service.js';
import { SubscriptionService } from '../services/subscription.service.js';
import { DBEngine } from '../db.js';
import { coachEngine } from '../coach/CoachEngine.js';
import { PersianNormalizer } from '../coach/PersianNormalizer.js';
import { Conversation, Message, AuditLog, Subscription, Plan, Role } from '../../types.js';

const router = Router();

// POST /api/ai/query
router.post('/query', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { customSystemPrompt, conversationId, history } = req.body;
  const rawQuestion = req.body.question || req.body.query;
  const question = typeof rawQuestion === 'string' ? rawQuestion.trim() : '';
  const user = req.user!;

  if (!question) {
    return res.status(400).json({ error: 'ارسال سوال یا متن موقعیت کاربر الزامی است.' });
  }

  const isAdmin = (
    user.role === Role.ADMIN ||
    (user.role as string) === 'admin' ||
    user.id === 'u1' ||
    user.id === 'u_1001' ||
    user.username === 'admin'
  );

  // Check active subscription & query limits with tamper-proof validation
  const subStatus = await SubscriptionService.getUserActiveSubscription(user.id, user.role);

  if (!isAdmin) {
    if (subStatus.isExpired || !subStatus.subscription) {
      return res.status(403).json({
        error: 'اعتبار زمانی اشتراک شما به پایان رسیده است یا اشتراک فعالی ندارید. جهت استفاده از مربی هوشمند و دستیار کاریزما، لطفاً اشتراک خود را تمدید یا فعال فرمایید.',
        code: 'SUBSCRIPTION_EXPIRED',
        status: 'expired'
      });
    }

    if (subStatus.isQuotaExceeded) {
      return res.status(403).json({
        error: `سهمیه پیام‌های هوشمند شما در طرح «${subStatus.planName}» به اتمام رسیده است (${subStatus.queryCount} از ${subStatus.maxQueries} پیام). جهت ادامه گفتگو، لطفاً اشتراک خود را تمدید یا ارتقا دهید.`,
        code: 'QUOTA_EXHAUSTED',
        usage: subStatus.queryCount,
        maxQueries: subStatus.maxQueries
      });
    }
  }

  const startTime = Date.now();

  try {
    // tolerant extraction and canonicalize
    let selectedTone = 'all';
    const toneTagMatch = question.match(/\[لحن انتخابی:\s*([^\]\n\r]+)/) || question.match(/\[لحن انتخابی:\s*([^\]]+)\]/);
    if (toneTagMatch) {
      const { PersianNormalizer } = await import('../coach/PersianNormalizer.js');
      selectedTone = PersianNormalizer.canonicalizeTone(toneTagMatch[1].trim());
    } else if (req.body.selectedTone) {
      const { PersianNormalizer } = await import('../coach/PersianNormalizer.js');
      selectedTone = PersianNormalizer.canonicalizeTone(req.body.selectedTone);
    }

    // 1. Run Local Coach Engine without external AI calls
    const coachResult = coachEngine.processQuery(question, {
      conversationId,
      customSystemPrompt,
      history,
      selectedTone
    });

    // Increment query usage for non-admin users safely without failing user response
    if (!isAdmin) {
      try {
        await SubscriptionService.incrementUsage(user.id);
      } catch (usageErr) {
        console.error('[AI Routes] Non-blocking usage increment error:', usageErr);
      }
    }

    // 2. Save Conversation Record
    let isExistingRecord = false;
    let currentConv: Conversation | undefined;

    if (conversationId) {
      const found = await DBEngine.findById<Conversation>('conversations', conversationId);
      if (found && found.userId === user.id) {
        currentConv = found;
        isExistingRecord = true;
      }
    }

    const userMsg: Message = { role: 'user', content: question, timestamp: new Date().toISOString() };
    const assistantMsg: Message = {
      role: 'assistant',
      content: coachResult.answer,
      // structuredData will be used by frontend to render 5 tones reliably
      ...({ structuredData: coachResult.structuredData } as any),
      timestamp: new Date().toISOString()
    };

    if (currentConv) {
      currentConv.messages.push(userMsg, assistantMsg);
    } else {
      currentConv = {
        id: conversationId || 'conv_' + Math.random().toString(36).substring(2, 9),
        userId: user.id,
        title: question.length > 30 ? question.substring(0, 30) + '...' : question,
        messages: [userMsg, assistantMsg],
        createdAt: new Date().toISOString()
      };
    }

    if (isExistingRecord) {
      await DBEngine.updateRecord('conversations', currentConv.id, { messages: currentConv.messages });
    } else {
      await DBEngine.insertRecord('conversations', currentConv);
    }

    // 3. Log Audit Trace
    AIService.logTrace({
      provider: 'fallback',
      model: 'local-coach-engine-v1',
      latencyMs: Date.now() - startTime,
      status: 'success'
    });

    const remainingQueries = isAdmin ? 9999999 : Math.max(0, subStatus.maxQueries - (subStatus.queryCount + 1));
    const isExpiringSoon = !isAdmin && remainingQueries <= 5;
    const warning = isExpiringSoon
      ? `توجه: تنها ${remainingQueries} پیام دیگر از سهمیه اشتراک شما باقی مانده است.`
      : undefined;

    res.json({
      structuredData: coachResult.structuredData,
      answer: coachResult.answer,
      sourceCards: coachResult.sourceCards,
      usedLLM: false,
      pipelineLog: coachResult.pipelineLog,
      conversationId: currentConv.id,
      subscriptionInfo: {
        remainingQueries,
        maxQueries: isAdmin ? 9999999 : subStatus.maxQueries,
        isExpiringSoon,
        warning
      }
    });
  } catch (error: any) {
    console.error('Coach Engine Query Endpoint Error:', error);
    AIService.logTrace({
      provider: 'fallback',
      model: 'none',
      latencyMs: Date.now() - startTime,
      status: 'failed',
      error: error.message
    });
    res.status(500).json({ error: 'متاسفانه در پردازش پاسخ مرکز کاریزما مشکلی به وجود آمد. لطفا مجددا تلاش کنید.' });
  }
});

// POST /api/ai/compress-history
router.post('/compress-history', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { messages, maxRecentTurns, maxCharsPerMsg } = req.body;

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'لیست پیام‌های سابقه گفتگو الزامی است.' });
  }

  const compressed = ConversationMemoryEngine.compressAndSummarizeHistory(messages, {
    maxRecentTurns: Number(maxRecentTurns) || 4,
    maxCharsPerMsg: Number(maxCharsPerMsg) || 220
  });

  res.json(compressed);
});

export default router;
