import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { DBEngine } from '../db.js';
import { Role, AITraceRecord, User, AuditLog } from '../../types.js';

const router = Router();

// GET /api/admin/traces
router.get('/traces', authenticateToken, requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  const traces = await DBEngine.readTable<AITraceRecord>('ai_traces');
  res.json(traces);
});

// GET /api/admin/users
router.get('/users', authenticateToken, requireRole([Role.ADMIN, Role.MODERATOR]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await DBEngine.readTable<User>('users');
    const safeUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      phoneNumber: u.phoneNumber || '',
      preferences: u.preferences,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }));
    res.json(safeUsers);
  } catch (err: any) {
    res.status(500).json({ error: 'خطا در دریافت لیست کاربران', details: err.message });
  }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', authenticateToken, requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const validRoles = [Role.ADMIN, Role.MODERATOR, Role.USER];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'نقش کاربری ارسالی نامعتبر است.' });
    }

    const users = await DBEngine.readTable<User>('users');
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'کاربر مورد نظر یافت نشد.' });
    }

    if (users[userIndex].username.toLowerCase() === 'admin' && role !== Role.ADMIN) {
      return res.status(400).json({ error: 'امکان تغییر نقش کاربر اصلی سیستم (admin) وجود ندارد.' });
    }

    users[userIndex].role = role;
    users[userIndex].updatedAt = new Date().toISOString();
    await DBEngine.writeTable('users', users);

    res.json({ success: true, user: { id: users[userIndex].id, username: users[userIndex].username, role: users[userIndex].role } });
  } catch (err: any) {
    res.status(500).json({ error: 'خطا در تغییر نقش کاربر', details: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', authenticateToken, requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentAdmin = req.user;
    if (currentAdmin?.id === id) {
      return res.status(400).json({ error: 'امکان حذف حساب کاربری خود وجود ندارد.' });
    }

    const users = await DBEngine.readTable<User>('users');
    const user = users.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد.' });
    }
    if (user.username.toLowerCase() === 'admin') {
      return res.status(400).json({ error: 'حذف کاربر اصلی ادمین سیستم مجاز نمی‌باشد.' });
    }

    await DBEngine.deleteRecord('users', id);
    res.json({ success: true, message: 'کاربر با موفقیت حذف شد.' });
  } catch (err: any) {
    res.status(500).json({ error: 'خطا در حذف کاربر', details: err.message });
  }
});

// GET /api/admin/audits
router.get('/audits', authenticateToken, requireRole([Role.ADMIN, Role.MODERATOR]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const audits = await DBEngine.readTable<AuditLog>('audit_logs');
    const sortedAudits = [...audits].sort((a, b) => {
      const tA = new Date(a.createdAt || 0).getTime();
      const tB = new Date(b.createdAt || 0).getTime();
      return tB - tA;
    });
    res.json(sortedAudits.slice(0, 100));
  } catch (err: any) {
    res.status(500).json({ error: 'خطا در دریافت لیست لاگ‌ها', details: err.message });
  }
});

export default router;
