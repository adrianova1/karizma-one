import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { DBEngine } from '../db.js';
import { Role, AITraceRecord } from '../../types.js';

const router = Router();

// GET /api/admin/traces
router.get('/traces', authenticateToken, requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  const traces = await DBEngine.readTable<AITraceRecord>('ai_traces');
  res.json(traces);
});

export default router;
