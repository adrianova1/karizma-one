/**
 * Karizma Center Full-Stack Server
 * Express Server with complete REST API and Vite Dev Middleware
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { DBEngine, hashPassword, verifyPassword } from './src/server/db.js';
import { SubscriptionService } from './src/server/services/subscription.service.js';
import { CleanupService } from './src/server/services/cleanup.service.js';
import { normalizePersian } from './src/server/utils/persianNormalizer.js';
import { coachEngine } from './src/server/coach/CoachEngine.js';
import { User, Role, KnowledgeCard, Plan, Subscription, AuditLog, PromptTemplate, Setting, Notification, ContentItem, Receipt, Conversation, Message, TrackingEvent, Ticket, TicketMessage } from './src/types.js';

import aiRoutes from './src/server/routes/ai.routes.js';
import adminRoutes from './src/server/routes/admin.routes.js';
import scenarioRoutes from './src/server/routes/scenario.routes.js';

import { TokenService } from './src/server/services/token.service.js';

// Scalable sliding-window Rate Limiter with memory leak cleanup
const rateLimits = new Map<string, { count: number; resetTime: number }>();

// Periodic sweep to evict expired rate limit keys and prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimits.entries()) {
    if (now > record.resetTime) {
      rateLimits.delete(key);
    }
  }
}, 60000);

function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {
  // Extract client IP safely (first non-internal IP in x-forwarded-for if present)
  const forwarded = req.headers['x-forwarded-for'];
  const rawIp = (typeof forwarded === 'string' ? forwarded.split(',')[0] : null) || 
                (req.headers['x-real-ip'] as string) || 
                req.socket.remoteAddress || 
                '127.0.0.1';
  const ip = rawIp.trim();
  
  // Distinguish sensitive auth routes from normal traffic
  const isAuthRoute = req.path.includes('/auth/login') || req.path.includes('/auth/register');
  const bucketKey = `${isAuthRoute ? 'auth' : 'api'}:${ip}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = isAuthRoute ? 40 : 400; // 40 attempts for auth, 400 for general API per minute

  const record = rateLimits.get(bucketKey);
  if (!record || now > record.resetTime) {
    rateLimits.set(bucketKey, { count: 1, resetTime: now + windowMs });
    return next();
  }

  record.count++;
  if (record.count > maxRequests) {
    return res.status(429).json({ 
      error: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً یک دقیقه دیگر مجدداً تلاش فرمایید.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
  next();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));
  app.use(rateLimiterMiddleware);

  // Normalize prefix for subdirectory deployments (/app/api/* -> /api/*)
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.url.startsWith('/app/api')) {
      req.url = req.url.replace(/^\/app\/api/, '/api');
    }
    next();
  });

  // CORS & Security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  // Health check endpoint
  app.get(['/api/health', '/app/api/health'], (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Mount Modular Routes
  app.use(['/api/ai', '/app/api/ai'], aiRoutes);
  app.use(['/api/admin', '/app/api/admin'], adminRoutes);
  app.use(['/api/scenarios', '/app/api/scenarios'], scenarioRoutes);

  // Helper to log user actions in the audit ledger
  async function logAudit(userId: string, username: string, action: string, ip: string, details: string) {
    const audits = await DBEngine.readTable<AuditLog>('audit_logs');
    const newLog: AuditLog = {
      id: 'al_' + Math.random().toString(36).substring(2, 11),
      userId,
      username,
      action,
      ip,
      details,
      createdAt: new Date().toISOString()
    };
    audits.push(newLog);
    await DBEngine.writeTable('audit_logs', audits);
  }

  // Auth Middleware
  function authenticateToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'توکن ورود ارسال نشده است.' });
    }

    const decoded = TokenService.verify(token);
    if (!decoded) {
      return res.status(403).json({ error: 'توکن ورود نامعتبر یا منقضی شده است.' });
    }

    (req as any).user = decoded;
    next();
  }

  function requireRole(roles: Role[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ error: 'شما سطح دسترسی مناسب برای انجام این کار را ندارید.' });
      }
      next();
    };
  }

  // ==================== AUTH API ====================

  app.post('/api/auth/register', async (req: Request, res: Response) => {
    const { username, password, phoneNumber } = req.body;
    if (!username || !password || !phoneNumber) {
      return res.status(400).json({ error: 'وارد کردن نام کاربری، کلمه عبور و شماره تلفن الزامی است.' });
    }

    const cleanUsername = String(username).trim();
    // Enforce English username starting with letter
    if (!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(cleanUsername)) {
      return res.status(400).json({ error: 'نام کاربری باید حتماً با یک حرف انگلیسی آغاز شود و نمی‌تواند فقط عدد باشد یا با عدد شروع شود (مثال معتبر: adri12).' });
    }
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return res.status(400).json({ error: 'نام کاربری باید بین ۳ تا ۳۰ کاراکتر باشد.' });
    }

    // Convert Persian/Arabic digits to English digits
    const toEnglishDigits = (str: string) => {
      return str
        .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
    };

    const normalizedPhone = toEnglishDigits(String(phoneNumber).trim()).replace(/[^0-9]/g, '');
    if (!/^09\d{9}$/.test(normalizedPhone)) {
      return res.status(400).json({ error: 'شماره موبایل وارد شده معتبر نیست. شماره موبایل باید ۱۱ رقم و با 09 شروع شود (مثال: 09123456789).' });
    }

    const users = await DBEngine.readTable<User>('users');
    const exists = users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: 'این نام کاربری قبلاً ثبت شده است.' });
    }

    const newUser: User = {
      id: 'u_' + Math.random().toString(36).substring(2, 11),
      username: cleanUsername,
      passwordHash: hashPassword(password),
      role: Role.USER,
      phoneNumber: normalizedPhone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users.push(newUser);
    await DBEngine.writeTable('users', users);

    // Create a welcoming notification
    const notifications = await DBEngine.readTable<Notification>('notifications');
    notifications.push({
      id: 'n_' + Math.random().toString(36).substring(2, 11),
      userId: newUser.id,
      title: 'خوش‌آمدگویی',
      message: `${username} عزیز، به مرکز دانش کاریزما خوش آمدید! جهت دسترسی به تمام امکانات پیشرفته، لطفاً طرح اشتراک خود را فعال فرمایید.`,
      isRead: false,
      createdAt: new Date().toISOString()
    });
    await DBEngine.writeTable('notifications', notifications);

    await logAudit(newUser.id, username, 'ثبت‌نام کاربر جدید', req.ip || '127.0.0.1', 'ثبت‌نام مستقیم توسط کاربر');

    const token = TokenService.sign({ id: newUser.id, username: newUser.username, role: newUser.role });
    res.json({ 
      token, 
      user: { 
        id: newUser.id, 
        username: newUser.username, 
        role: newUser.role,
        phoneNumber: newUser.phoneNumber,
        preferences: newUser.preferences
      } 
    });
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'نام کاربری و کلمه عبور الزامی است.' });
    }

    const users = await DBEngine.readTable<User>('users');
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(400).json({ error: 'نام کاربری یا کلمه عبور اشتباه است.' });
    }

    // Transparently upgrade legacy SHA-256 hashes to modern scrypt hash
    if (user.passwordHash && !user.passwordHash.startsWith('scrypt:')) {
      const upgradedHash = hashPassword(password);
      user.passwordHash = upgradedHash;
      DBEngine.updateRecord('users', user.id, { passwordHash: upgradedHash }).catch(() => {});
    }

    await logAudit(user.id, user.username, 'ورود به سیستم', req.ip || '127.0.0.1', 'ورود موفقیت‌آمیز');

    const token = TokenService.sign({ id: user.id, username: user.username, role: user.role });
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        phoneNumber: user.phoneNumber,
        preferences: user.preferences
      } 
    });
  });

  app.get('/api/auth/me', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const users = await DBEngine.readTable<User>('users');
    const found = users.find(u => u.id === user.id);
    if (!found) {
      return res.status(404).json({ error: 'کاربر یافت نشد.' });
    }

    // Calculate real XP and Streak from conversations
    const conversations = await DBEngine.readTable<Conversation>('conversations');
    const userConvs = conversations.filter(c => c.userId === user.id);
    
    // XP: 10 points per message/query
    let totalMsgs = 0;
    const daysSet = new Set<string>();
    userConvs.forEach(c => {
      if (c.messages && c.messages.length) {
        totalMsgs += c.messages.filter(m => m.role === 'user').length;
      }
      if (c.createdAt) {
         // Count unique days
         const d = new Date(c.createdAt);
         if (!isNaN(d.getTime())) {
           daysSet.add(d.toISOString().split('T')[0]);
         }
      }
    });

    let xp = totalMsgs * 10;
    if (xp < 50) xp = 50; // minimum base XP
    
    // Calculate streak
    let streak = 0;
    const sortedDays = Array.from(daysSet).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    if (sortedDays.length > 0) {
      streak = 1;
      let curr = new Date(sortedDays[0]);
      for (let i = 1; i < sortedDays.length; i++) {
        let prev = new Date(sortedDays[i]);
        const diffTime = Math.abs(curr.getTime() - prev.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          streak++;
          curr = prev;
        } else {
          break;
        }
      }
    }
    
    res.json({ 
      user: { 
        id: found.id, 
        username: found.username, 
        role: found.role,
        phoneNumber: found.phoneNumber,
        preferences: found.preferences,
        createdAt: found.createdAt
      },
      stats: { xp, streak } 
    });
  });

  app.get(['/api/user/profile', '/app/api/user/profile'], authenticateToken, async (req: Request, res: Response) => {
    const authUser = (req as any).user;
    const users = await DBEngine.readTable<User>('users');
    const found = users.find(u => u.id === authUser.id);
    if (!found) {
      return res.status(404).json({ error: 'کاربر یافت نشد.' });
    }
    const { passwordHash: _, ...safeUser } = found;
    res.json({ user: safeUser });
  });

  app.put('/api/user/profile', authenticateToken, async (req: Request, res: Response) => {
    const authUser = (req as any).user;
    const { phoneNumber, preferences } = req.body;

    const users = await DBEngine.readTable<User>('users');
    const idx = users.findIndex(u => u.id === authUser.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'کاربر یافت نشد.' });
    }

    if (phoneNumber !== undefined) {
      const toEnglishDigits = (str: string) => {
        return str
          .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
          .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
      };
      const normalizedPhone = toEnglishDigits(String(phoneNumber).trim()).replace(/[^0-9]/g, '');
      if (normalizedPhone && !/^09\d{9}$/.test(normalizedPhone)) {
        return res.status(400).json({ error: 'شماره موبایل وارد شده معتبر نیست. شماره موبایل باید ۱۱ رقم و با 09 شروع شود.' });
      }
      users[idx].phoneNumber = normalizedPhone || undefined;
    }

    if (preferences !== undefined) {
      users[idx].preferences = {
        ...users[idx].preferences,
        ...preferences
      };
    }

    users[idx].updatedAt = new Date().toISOString();
    await DBEngine.writeTable('users', users);

    await logAudit(users[idx].id, users[idx].username, 'ویرایش پروفایل', req.ip || '127.0.0.1', 'بروزرسانی مشخصات و تنظیمات کاربری');

    res.json({
      success: true,
      user: {
        id: users[idx].id,
        username: users[idx].username,
        role: users[idx].role,
        phoneNumber: users[idx].phoneNumber,
        preferences: users[idx].preferences,
        createdAt: users[idx].createdAt,
        updatedAt: users[idx].updatedAt
      }
    });
  });

  // ==================== KNOWLEDGE CARDS API ====================

  // Tickets User Endpoints
  app.get('/api/tickets', authenticateToken, async (req: Request, res: Response) => {
    const authUser = (req as any).user;
    const tickets = await DBEngine.readTable<Ticket>('tickets');
    const userTickets = tickets.filter(t => t.userId === authUser.id);
    res.json(userTickets.reverse());
  });

  app.get('/api/tickets/:id', authenticateToken, async (req: Request, res: Response) => {
    const authUser = (req as any).user;
    const tickets = await DBEngine.readTable<Ticket>('tickets');
    const ticket = tickets.find(t => t.id === req.params.id);
    if (!ticket) return res.status(404).json({ error: 'تیکت یافت نشد' });
    if (ticket.userId !== authUser.id && authUser.role !== 'admin' && authUser.role !== 'moderator') {
      return res.status(403).json({ error: 'عدم دسترسی' });
    }

    const messages = await DBEngine.readTable<TicketMessage>('ticket_messages');
    const ticketMessages = messages.filter(m => m.ticketId === ticket.id);
    res.json({ ticket, messages: ticketMessages });
  });

  app.post('/api/tickets', authenticateToken, async (req: Request, res: Response) => {
    const authUser = (req as any).user;
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: 'موضوع و متن پیام الزامی است' });

    const tickets = await DBEngine.readTable<Ticket>('tickets');
    const newTicket: Ticket = {
      id: 'tk_' + Date.now() + Math.random().toString(36).substr(2, 5),
      userId: authUser.id,
      subject,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    tickets.push(newTicket);
    await DBEngine.writeTable('tickets', tickets);

    const messages = await DBEngine.readTable<TicketMessage>('ticket_messages');
    const newMsg: TicketMessage = {
      id: 'tm_' + Date.now() + Math.random().toString(36).substr(2, 5),
      ticketId: newTicket.id,
      senderId: authUser.id,
      senderRole: 'user',
      message,
      createdAt: new Date().toISOString()
    };
    messages.push(newMsg);
    await DBEngine.writeTable('ticket_messages', messages);

    res.json(newTicket);
  });

  app.post('/api/tickets/:id/reply', authenticateToken, async (req: Request, res: Response) => {
    const authUser = (req as any).user;
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'پیام الزامی است' });

    const tickets = await DBEngine.readTable<Ticket>('tickets');
    const idx = tickets.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'تیکت یافت نشد' });
    
    if (tickets[idx].userId !== authUser.id) {
      return res.status(403).json({ error: 'عدم دسترسی' });
    }

    const messages = await DBEngine.readTable<TicketMessage>('ticket_messages');
    const newMsg: TicketMessage = {
      id: 'tm_' + Date.now() + Math.random().toString(36).substr(2, 5),
      ticketId: req.params.id,
      senderId: authUser.id,
      senderRole: 'user',
      message,
      createdAt: new Date().toISOString()
    };
    messages.push(newMsg);
    await DBEngine.writeTable('ticket_messages', messages);

    tickets[idx].status = 'open';
    tickets[idx].updatedAt = new Date().toISOString();
    await DBEngine.writeTable('tickets', tickets);

    res.json(newMsg);
  });

  app.put('/api/tickets/:id/status', authenticateToken, async (req: Request, res: Response) => {
    const authUser = (req as any).user;
    const { status } = req.body;
    if (!status || !['open', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'وضعیت نامعتبر است' });
    }

    const tickets = await DBEngine.readTable<Ticket>('tickets');
    const idx = tickets.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'تیکت یافت نشد' });
    
    if (tickets[idx].userId !== authUser.id && authUser.role !== Role.ADMIN && authUser.role !== Role.MODERATOR) {
      return res.status(403).json({ error: 'عدم دسترسی' });
    }

    tickets[idx].status = status;
    tickets[idx].updatedAt = new Date().toISOString();
    await DBEngine.writeTable('tickets', tickets);

    res.json(tickets[idx]);
  });

  app.get('/api/knowledge-cards', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (user.role !== Role.ADMIN) {
      const subInfo = await SubscriptionService.getUserActiveSubscription(user.id, user.role);
      if (!subInfo.hasActiveSub) {
        return res.status(403).json({
          error: 'دسترسی به کارت‌های دانش و لایتنر مهارتی نیازمند اشتراک فعال است.',
          code: 'SUBSCRIPTION_REQUIRED'
        });
      }
    }

    const cards = await DBEngine.readTable<KnowledgeCard>('knowledge_cards');
    const { search, category } = req.query;
    
    let filtered = [...cards];
    
    if (category) {
      filtered = filtered.filter(c => c.category === category);
    }
    
    if (search) {
      const qNorm = normalizePersian(search as string);
      filtered = filtered.filter(c => 
        normalizePersian(c.title).includes(qNorm) || 
        normalizePersian(c.content).includes(qNorm) ||
        c.keywords.some(k => normalizePersian(k).includes(qNorm))
      );
    }

    res.json(filtered);
  });

  app.post('/api/knowledge-cards', authenticateToken, requireRole([Role.ADMIN, Role.MODERATOR]), async (req: Request, res: Response) => {
    const { title, content, keywords, tags, category } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'عنوان و متن کارت دانش الزامی است.' });
    }

    const cards = await DBEngine.readTable<KnowledgeCard>('knowledge_cards');
    const newCard: KnowledgeCard = {
      id: 'c_' + Math.random().toString(36).substring(2, 11),
      title,
      content,
      normalizedContent: normalizePersian(content),
      keywords: Array.isArray(keywords) ? keywords : keywords ? keywords.split(',').map((k: string) => k.trim()) : [],
      tags: Array.isArray(tags) ? tags : tags ? tags.split(',').map((t: string) => t.trim()) : [],
      category: category || 'عمومی',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      views: 0
    };

    cards.push(newCard);
    await DBEngine.writeTable('knowledge_cards', cards);

    const user = (req as any).user;
    await logAudit(user.id, user.username, 'ایجاد کارت دانش جدید', req.ip || '127.0.0.1', `عنوان کارت: ${title}`);

    res.json(newCard);
  });

  app.put('/api/knowledge-cards/:id', authenticateToken, requireRole([Role.ADMIN, Role.MODERATOR]), async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, content, keywords, tags, category } = req.body;

    const cards = await DBEngine.readTable<KnowledgeCard>('knowledge_cards');
    const index = cards.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'کارت دانش یافت نشد.' });
    }

    const updatedCard = {
      ...cards[index],
      title: title || cards[index].title,
      content: content || cards[index].content,
      normalizedContent: content ? normalizePersian(content) : cards[index].normalizedContent,
      keywords: Array.isArray(keywords) ? keywords : keywords ? keywords.split(',').map((k: string) => k.trim()) : cards[index].keywords,
      tags: Array.isArray(tags) ? tags : tags ? tags.split(',').map((t: string) => t.trim()) : cards[index].tags,
      category: category || cards[index].category,
      updatedAt: new Date().toISOString()
    };

    cards[index] = updatedCard;
    await DBEngine.writeTable('knowledge_cards', cards);

    const user = (req as any).user;
    await logAudit(user.id, user.username, 'ویرایش کارت دانش', req.ip || '127.0.0.1', `شناسه کارت: ${id}`);

    res.json(updatedCard);
  });

  app.delete('/api/knowledge-cards/:id', authenticateToken, requireRole([Role.ADMIN]), async (req: Request, res: Response) => {
    const { id } = req.params;
    const cards = await DBEngine.readTable<KnowledgeCard>('knowledge_cards');
    const index = cards.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'کارت دانش یافت نشد.' });
    }

    const deletedCard = cards[index];
    cards.splice(index, 1);
    await DBEngine.writeTable('knowledge_cards', cards);

    const user = (req as any).user;
    await logAudit(user.id, user.username, 'حذف کارت دانش', req.ip || '127.0.0.1', `عنوان کارت حذف‌شده: ${deletedCard.title}`);

    res.json({ success: true });
  });

  // ==================== USER MANAGEMENT CRUD ====================

  app.get('/api/users', authenticateToken, requireRole([Role.ADMIN]), async (req: Request, res: Response) => {
    const users = await DBEngine.readTable<User>('users');
    // Hide password hashes
    const secureUsers = users.map(({ passwordHash, ...rest }) => rest);
    res.json(secureUsers);
  });

  app.post('/api/users', authenticateToken, requireRole([Role.ADMIN]), async (req: Request, res: Response) => {
    const { username, password, role, phoneNumber } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'وارد کردن تمامی اطلاعات الزامی است.' });
    }

    const cleanUsername = String(username).trim();
    if (!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(cleanUsername)) {
      return res.status(400).json({ error: 'نام کاربری باید حتماً با یک حرف انگلیسی آغاز شود و نمی‌تواند فقط عدد باشد (مثال معتبر: adri12).' });
    }
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return res.status(400).json({ error: 'نام کاربری باید بین ۳ تا ۳۰ کاراکتر باشد.' });
    }

    const toEnglishDigits = (str: string) => {
      return str
        .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
    };

    let normalizedPhone: string | undefined = undefined;
    if (phoneNumber && String(phoneNumber).trim()) {
      normalizedPhone = toEnglishDigits(String(phoneNumber).trim()).replace(/[^0-9]/g, '');
      if (!/^09\d{9}$/.test(normalizedPhone)) {
        return res.status(400).json({ error: 'شماره موبایل وارد شده معتبر نیست. باید ۱۱ رقم و با 09 شروع شود.' });
      }
    }

    const users = await DBEngine.readTable<User>('users');
    if (users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
      return res.status(400).json({ error: 'این نام کاربری تکراری است.' });
    }

    const newUser: User = {
      id: 'u_' + Math.random().toString(36).substring(2, 11),
      username: cleanUsername,
      passwordHash: hashPassword(password),
      role: role as Role,
      phoneNumber: normalizedPhone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users.push(newUser);
    await DBEngine.writeTable('users', users);

    const adminUser = (req as any).user;
    await logAudit(adminUser.id, adminUser.username, 'ایجاد کاربر جدید توسط مدیر', req.ip || '127.0.0.1', `نام کاربری ایجاد شده: ${cleanUsername} با نقش ${role}`);

    res.json({ id: newUser.id, username: newUser.username, role: newUser.role, phoneNumber: newUser.phoneNumber });
  });

  app.put('/api/users/:id', authenticateToken, requireRole([Role.ADMIN]), async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role, password, phoneNumber } = req.body;

    const users = await DBEngine.readTable<User>('users');
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'کاربر مورد نظر یافت نشد.' });
    }

    if (role) {
      users[idx].role = role as Role;
    }
    if (password) {
      users[idx].passwordHash = hashPassword(password);
    }
    if (phoneNumber !== undefined) {
      const toEnglishDigits = (str: string) => {
        return str
          .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
          .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
      };
      const cleaned = toEnglishDigits(String(phoneNumber).trim()).replace(/[^0-9]/g, '');
      if (cleaned) {
        if (!/^09\d{9}$/.test(cleaned)) {
          return res.status(400).json({ error: 'شماره موبایل وارد شده معتبر نیست. باید ۱۱ رقم و با 09 شروع شود.' });
        }
        users[idx].phoneNumber = cleaned;
      } else {
        users[idx].phoneNumber = undefined;
      }
    }
    users[idx].updatedAt = new Date().toISOString();

    await DBEngine.writeTable('users', users);

    const adminUser = (req as any).user;
    await logAudit(adminUser.id, adminUser.username, 'بروزرسانی کاربر توسط مدیر', req.ip || '127.0.0.1', `شناسه کاربر: ${id}`);

    res.json({ success: true, user: users[idx] });
  });

  app.delete('/api/users/:id', authenticateToken, requireRole([Role.ADMIN]), async (req: Request, res: Response) => {
    const { id } = req.params;
    if (id === 'u1') {
      return res.status(400).json({ error: 'حذف مدیر ارشد اصلی سیستم امکان‌پذیر نیست.' });
    }

    const users = await DBEngine.readTable<User>('users');
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'کاربر مورد نظر یافت نشد.' });
    }

    const deleted = users[idx];
    users.splice(idx, 1);
    await DBEngine.writeTable('users', users);

    const adminUser = (req as any).user;
    await logAudit(adminUser.id, adminUser.username, 'حذف کاربر توسط مدیر', req.ip || '127.0.0.1', `نام کاربری حذف‌شده: ${deleted.username}`);

    res.json({ success: true });
  });

  // ==================== PLANS & SUBSCRIPTIONS API ====================

  app.get('/api/plans', async (req: Request, res: Response) => {
    const plans = await DBEngine.readTable<Plan>('plans');
    res.json(plans);
  });

  // Admin: Create Plan
  app.post('/api/admin/plans', authenticateToken, requireRole([Role.ADMIN]), async (req: Request, res: Response) => {
    const { name, price, description, maxQueries, maxKnowledgeCards, durationDays, maxScenarios, quizLimitPerDay, academyAccess, badge } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'نام و قیمت طرح الزامی است.' });
    }

    const plans = await DBEngine.readTable<Plan>('plans');
    const newPlan: Plan = {
      id: 'plan_' + Math.random().toString(36).substring(2, 9),
      name,
      price: Number(price),
      description: description || '',
      maxQueries: Number(maxQueries || 100),
      maxKnowledgeCards: Number(maxKnowledgeCards || 500),
      durationDays: Number(durationDays || 30),
      maxScenarios: Number(maxScenarios || 100),
      quizLimitPerDay: Number(quizLimitPerDay || 20),
      academyAccess: academyAccess || 'unlimited',
      badge: badge || '',
      createdAt: new Date().toISOString()
    };

    plans.push(newPlan);
    await DBEngine.writeTable('plans', plans);

    const user = (req as any).user;
    await logAudit(user.id, user.username, 'ایجاد طرح اشتراک جدید', req.ip || '127.0.0.1', `عنوان: ${name}`);

    res.json(newPlan);
  });

  // Admin: Update Plan
  app.put('/api/admin/plans/:id', authenticateToken, requireRole([Role.ADMIN]), async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, price, description, maxQueries, maxKnowledgeCards, durationDays, maxScenarios, quizLimitPerDay, academyAccess, badge } = req.body;

    const plans = await DBEngine.readTable<Plan>('plans');
    const idx = plans.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'طرح مورد نظر یافت نشد.' });
    }

    plans[idx] = {
      ...plans[idx],
      name: name !== undefined ? name : plans[idx].name,
      price: price !== undefined ? Number(price) : plans[idx].price,
      description: description !== undefined ? description : plans[idx].description,
      maxQueries: maxQueries !== undefined ? Number(maxQueries) : plans[idx].maxQueries,
      maxKnowledgeCards: maxKnowledgeCards !== undefined ? Number(maxKnowledgeCards) : plans[idx].maxKnowledgeCards,
      durationDays: durationDays !== undefined ? Number(durationDays) : (plans[idx].durationDays || 30),
      maxScenarios: maxScenarios !== undefined ? Number(maxScenarios) : (plans[idx].maxScenarios || 100),
      quizLimitPerDay: quizLimitPerDay !== undefined ? Number(quizLimitPerDay) : (plans[idx].quizLimitPerDay || 20),
      academyAccess: academyAccess !== undefined ? academyAccess : (plans[idx].academyAccess || 'unlimited'),
      badge: badge !== undefined ? badge : plans[idx].badge
    };

    await DBEngine.writeTable('plans', plans);

    const user = (req as any).user;
    await logAudit(user.id, user.username, 'ویرایش طرح اشتراک', req.ip || '127.0.0.1', `شناسه طرح: ${id}`);

    res.json(plans[idx]);
  });

  // Admin: Delete Plan
  app.delete('/api/admin/plans/:id', authenticateToken, requireRole([Role.ADMIN]), async (req: Request, res: Response) => {
    const { id } = req.params;
    const plans = await DBEngine.readTable<Plan>('plans');
    const filtered = plans.filter(p => p.id !== id);

    if (plans.length === filtered.length) {
      return res.status(404).json({ error: 'طرح یافت نشد.' });
    }

    await DBEngine.writeTable('plans', filtered);

    const user = (req as any).user;
    await logAudit(user.id, user.username, 'حذف طرح اشتراک', req.ip || '127.0.0.1', `شناسه: ${id}`);

    res.json({ success: true });
  });

  // Admin: Manual Subscription Override
  app.post('/api/admin/subscriptions/override', authenticateToken, requireRole([Role.ADMIN]), async (req: Request, res: Response) => {
    const { userId, planId, durationDays } = req.body;
    if (!userId || !planId) {
      return res.status(400).json({ error: 'شناسه کاربر و شناسه طرح الزامی است.' });
    }

    const plans = await DBEngine.readTable<Plan>('plans');
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      return res.status(404).json({ error: 'طرح یافت نشد.' });
    }

    const days = durationDays ? Number(durationDays) : (plan.durationDays || (plan.id === 'p1' ? 7 : plan.id === 'p2' ? 15 : 30));
    const newSub = await SubscriptionService.activateSubscription(userId, plan.id, days);

    const adminUser = (req as any).user;
    await logAudit(adminUser.id, adminUser.username, 'اعطای دستی اشتراک به کاربر', req.ip || '127.0.0.1', `کاربر: ${userId}، طرح: ${plan.name}، مدت: ${days} روز`);

    res.json({ success: true, subscription: newSub });
  });

  app.get('/api/subscriptions', authenticateToken, async (req: Request, res: Response) => {
    SubscriptionService.checkAndExpireSubscriptions();
    const subs = await DBEngine.readTable<Subscription>('subscriptions');
    const plans = await DBEngine.readTable<Plan>('plans');
    const users = await DBEngine.readTable<User>('users');

    const mapped = subs.map(sub => {
      const plan = plans.find(p => p.id === sub.planId);
      const user = users.find(u => u.id === sub.userId);
      return {
        ...sub,
        planName: plan ? plan.name : 'طرح نامشخص',
        username: user ? user.username : 'کاربر نامشخص'
      };
    });

    res.json(mapped);
  });

  app.get('/api/subscriptions/me', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const subInfo = await SubscriptionService.getUserActiveSubscription(user.id, user.role);

    const isAdmin = (
      user.role === Role.ADMIN ||
      user.role === 'admin' ||
      user.id === 'u1' ||
      user.id === 'u_1001' ||
      user.username === 'admin'
    );

    if (isAdmin) {
      return res.json({
        hasActiveSub: true,
        isLifetimeAdmin: true,
        planName: 'طرح ادمین مادام‌العمر (VIP نامحدود)',
        queryCount: 0,
        maxQueries: 9999999,
        remainingQueries: 9999999,
        isExpiringSoon: false,
        maxKnowledgeCards: 9999999,
        allowedCoachModes: ['reply_generator', 'starter', 'coach', 'scenario', 'live_coach', 'analyzer', 'profile', 'body_language', 'voice', 'story'],
        allowVisionAnalysis: true,
        allowVoiceCoach: true,
        daysRemaining: 99999,
        hoursRemaining: 99999 * 24,
        isQuotaExceeded: false,
        status: 'active'
      });
    }

    if (subInfo.isExpired || !subInfo.subscription) {
      return res.json({
        hasActiveSub: false,
        isLifetimeAdmin: false,
        planName: 'بدون اشتراک فعال',
        queryCount: 0,
        maxQueries: 0,
        remainingQueries: 0,
        isExpiringSoon: false,
        warningMessage: 'اشتراک فعالی برای حساب شما یافت نشد یا مهلت آن منقضی شده است.',
        maxKnowledgeCards: 0,
        allowedCoachModes: [],
        allowVoiceCoach: false,
        daysRemaining: 0,
        hoursRemaining: 0,
        isQuotaExceeded: false,
        status: 'expired'
      });
    }

    res.json({
      hasActiveSub: subInfo.hasActiveSub,
      isLifetimeAdmin: false,
      subscriptionId: subInfo.subscription.id,
      planId: subInfo.subscription.planId,
      planName: subInfo.planName,
      queryCount: subInfo.queryCount,
      maxQueries: subInfo.maxQueries,
      remainingQueries: subInfo.remainingQueries,
      isExpiringSoon: subInfo.isExpiringSoon,
      warningMessage: subInfo.warningMessage,
      maxKnowledgeCards: subInfo.plan?.maxKnowledgeCards || 500,
      allowedCoachModes: subInfo.allowedCoachModes,
      allowVoiceCoach: subInfo.allowVoiceCoach,
      startDate: subInfo.subscription.startDate,
      endDate: subInfo.subscription.endDate,
      daysRemaining: subInfo.daysRemaining,
      hoursRemaining: subInfo.hoursRemaining,
      isQuotaExceeded: subInfo.isQuotaExceeded,
      status: subInfo.status
    });
  });

  app.post('/api/subscriptions/purchase', authenticateToken, async (req: Request, res: Response) => {
    const { planId } = req.body;
    const user = (req as any).user;

    const plans = await DBEngine.readTable<Plan>('plans');
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      return res.status(404).json({ error: 'طرح انتخابی یافت نشد.' });
    }

    const durationDays = plan.durationDays || (plan.id === 'p1' ? 7 : plan.id === 'p2' ? 15 : 30);
    const newSub = await SubscriptionService.activateSubscription(user.id, plan.id, durationDays);

    // Create a Payment Receipt
    const receipts = await DBEngine.readTable<Receipt>('receipts');
    const traceNo = 'TR-' + Math.floor(10000000 + Math.random() * 90000000).toString();
    const refId = 'REF-' + Math.floor(10000000 + Math.random() * 90000000).toString();
    const newReceipt: Receipt = {
      id: 'rec_' + Math.random().toString(36).substring(2, 11),
      userId: user.id,
      subscriptionId: newSub.id,
      amount: plan.price,
      traceNumber: traceNo,
      refId,
      status: 'success',
      createdAt: new Date().toISOString()
    };

    receipts.push(newReceipt);
    await DBEngine.writeTable('receipts', receipts);

    await logAudit(user.id, user.username, 'خرید اشتراک جدید', req.ip || '127.0.0.1', `طرح: ${plan.name} به مبلغ ${plan.price} تومان (${durationDays} روزه)`);

    res.json({ success: true, subscription: newSub, receipt: newReceipt });
  });

  // ==================== PROMPTS TEMPLATES API ====================

  app.get('/api/prompts', authenticateToken, requireRole([Role.ADMIN]), async (req: Request, res: Response) => {
    const templates = await DBEngine.readTable<PromptTemplate>('prompts');
    res.json(templates);
  });

  app.put('/api/prompts/:id', authenticateToken, requireRole([Role.ADMIN]), async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, systemInstruction, templateText, isActive } = req.body;

    const templates = await DBEngine.readTable<PromptTemplate>('prompts');
    const index = templates.findIndex(t => t.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'الگو یافت نشد.' });
    }

    if (isActive === true) {
      // Toggle off all other templates
      templates.forEach(t => t.isActive = false);
    }

    templates[index] = {
      ...templates[index],
      name: name || templates[index].name,
      systemInstruction: systemInstruction || templates[index].systemInstruction,
      templateText: templateText || templates[index].templateText,
      isActive: isActive !== undefined ? isActive : templates[index].isActive
    };

    await DBEngine.writeTable('prompts', templates);

    const user = (req as any).user;
    await logAudit(user.id, user.username, 'بروزرسانی قالب پرامپت', req.ip || '127.0.0.1', `شناسه قالب: ${id}`);

    res.json(templates[index]);
  });

  // ==================== AUDIT LOGS & STATS ====================

  app.get('/api/audit-logs', authenticateToken, requireRole([Role.ADMIN, Role.MODERATOR]), async (req: Request, res: Response) => {
    const logs = await DBEngine.readTable<AuditLog>('audit_logs');
    res.json(logs.reverse()); // Latest logs first
  });

  app.get('/api/statistics', authenticateToken, async (req: Request, res: Response) => {
    const cards = await DBEngine.readTable<KnowledgeCard>('knowledge_cards');
    const subs = await DBEngine.readTable<Subscription>('subscriptions');
    const users = await DBEngine.readTable<User>('users');
    const receipts = await DBEngine.readTable<Receipt>('receipts');
    const audits = await DBEngine.readTable<AuditLog>('audit_logs');
    const conversations = await DBEngine.readTable<Conversation>('conversations');

    const totalRevenue = receipts
      .filter(r => r.status === 'success')
      .reduce((sum, r) => sum + r.amount, 0);

    const totalQueries = conversations.reduce((sum, c) => sum + Math.floor(c.messages.length / 2), 0);

    // Group cards views
    const popularCards = [...cards]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
      .map(c => ({ title: c.title, views: c.views || 0 }));

    // Role count
    const roleStats = {
      admin: users.filter(u => u.role === Role.ADMIN).length,
      moderator: users.filter(u => u.role === Role.MODERATOR).length,
      user: users.filter(u => u.role === Role.USER).length,
    };

    res.json({
      totalCards: cards.length,
      totalUsers: users.length,
      activeSubscriptions: subs.filter(s => s.status === 'active').length,
      totalRevenue,
      totalQueries,
      popularCards,
      roleStats,
      totalAuditLogs: audits.length
    });
  });

  // ==================== IMPORT ENGINE API ====================

  app.post('/api/import/process', authenticateToken, requireRole([Role.ADMIN, Role.MODERATOR]), async (req: Request, res: Response) => {
    const { fileName, dataRows, rollbackOnDuplicate } = req.body;
    
    if (!fileName || !Array.isArray(dataRows)) {
      return res.status(400).json({ error: 'اطلاعات ارسالی برای ایمپورت نامعتبر است.' });
    }

    const cards = await DBEngine.readTable<KnowledgeCard>('knowledge_cards');
    const currentCardTitles = new Set(cards.map(c => c.title.trim().toLowerCase()));

    const logMessages: string[] = [];
    let processed = 0;
    let duplicateCount = 0;
    let successCount = 0;
    const importedCards: KnowledgeCard[] = [];

    logMessages.push(`شروع فرآیند درون‌ریزی فایل: ${fileName}`);
    logMessages.push(`تعداد رکوردهای موجود در فایل: ${dataRows.length}`);

    // Chunk Processing
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const title = row.title || row['عنوان'];
      const content = row.content || row['محتوا'] || row['متن'];
      const category = row.category || row['دسته‌بندی'] || 'عمومی';
      const keywordsStr = row.keywords || row['کلیدواژه‌ها'] || '';

      if (!title || !content) {
        logMessages.push(`⚠️ ردیف ${i + 1} رد شد: عنوان یا محتوا خالی است.`);
        continue;
      }

      const cleanTitle = title.trim();
      const isDuplicate = currentCardTitles.has(cleanTitle.toLowerCase());

      if (isDuplicate) {
        duplicateCount++;
        if (rollbackOnDuplicate) {
          logMessages.push(`🛑 خطا: عنوان تکراری "${cleanTitle}" در ردیف ${i + 1} شناسایی شد. فرآیند لغو شد.`);
          return res.json({
            status: 'failed',
            totalRows: dataRows.length,
            processedRows: 0,
            successCount: 0,
            duplicateCount,
            logMessages,
          });
        } else {
          logMessages.push(`⚠️ ردیف ${i + 1}: عنوان "${cleanTitle}" تکراری بود؛ بروزرسانی شد.`);
          const cardIdx = cards.findIndex(c => c.title.trim().toLowerCase() === cleanTitle.toLowerCase());
          if (cardIdx !== -1) {
            cards[cardIdx].content = content;
            cards[cardIdx].normalizedContent = normalizePersian(content);
            cards[cardIdx].category = category;
            cards[cardIdx].updatedAt = new Date().toISOString();
          }
          processed++;
          continue;
        }
      }

      // Add new card
      const newCard: KnowledgeCard = {
        id: 'c_imp_' + Math.random().toString(36).substring(2, 11),
        title: cleanTitle,
        content,
        normalizedContent: normalizePersian(content),
        keywords: keywordsStr ? keywordsStr.split(',').map((k: string) => k.trim()) : [],
        tags: [category],
        category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 0
      };

      cards.push(newCard);
      importedCards.push(newCard);
      successCount++;
      processed++;
    }

    await DBEngine.writeTable('knowledge_cards', cards);

    logMessages.push(`✅ درون‌ریزی با موفقیت به پایان رسید. رکوردهای ثبت شده: ${successCount}، تکراری‌ها: ${duplicateCount}`);

    const user = (req as any).user;
    await logAudit(user.id, user.username, 'درون‌ریزی انبوه اکسل/CSV', req.ip || '127.0.0.1', `فایل: ${fileName}، تعداد رکوردهای پردازش‌شده: ${processed}`);

    res.json({
      status: 'completed',
      totalRows: dataRows.length,
      processedRows: processed,
      successCount,
      duplicateCount,
      logMessages
    });
  });

  // ==================== CONVERSATIONS API ====================

  app.get('/api/conversations', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const conversations = await DBEngine.readTable<Conversation>('conversations');
    const userConvs = conversations.filter(c => c.userId === user.id);
    res.json(userConvs.reverse());
  });

  app.get('/api/conversations/:id', authenticateToken, async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = (req as any).user;
    const conversations = await DBEngine.readTable<Conversation>('conversations');
    const conv = conversations.find(c => c.id === id && c.userId === user.id);
    if (!conv) {
      return res.status(404).json({ error: 'گفتگو یافت نشد.' });
    }
    res.json(conv);
  });

  app.delete('/api/conversations/:id', authenticateToken, async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = (req as any).user;
    const conversations = await DBEngine.readTable<Conversation>('conversations');
    const idx = conversations.findIndex(c => c.id === id && c.userId === user.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'گفتگو یافت نشد.' });
    }
    conversations.splice(idx, 1);
    await DBEngine.writeTable('conversations', conversations);
    res.json({ success: true });
  });

  app.post('/api/conversations/clear', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const conversations = await DBEngine.readTable<Conversation>('conversations');
    const remaining = conversations.filter(c => c.userId !== user.id);
    await DBEngine.writeTable('conversations', remaining);
    res.json({ success: true });
  });

  // ==================== MANUAL PAYMENTS & CARD-TO-CARD API ====================

  app.get('/api/settings/public', async (req: Request, res: Response) => {
    const settings = await DBEngine.readTable<Setting>('settings');
    const cardSetting = settings.find(s => s.key === 'card_number');
    const ownerSetting = settings.find(s => s.key === 'card_owner');
    const bankSetting = settings.find(s => s.key === 'card_bank');

    res.json({
      cardNumber: cardSetting ? cardSetting.value : '6037-9911-2233-4455',
      cardOwner: ownerSetting ? ownerSetting.value : 'مدیریت مرکز کاریزما',
      cardBank: bankSetting ? bankSetting.value : 'بانک ملی ایران'
    });
  });

  app.get('/api/admin/settings/card', authenticateToken, requireRole([Role.ADMIN, Role.MODERATOR]), async (req: Request, res: Response) => {
    const settings = await DBEngine.readTable<Setting>('settings');
    const cardSetting = settings.find(s => s.key === 'card_number');
    const ownerSetting = settings.find(s => s.key === 'card_owner');
    const bankSetting = settings.find(s => s.key === 'card_bank');

    res.json({
      cardNumber: cardSetting ? cardSetting.value : '6037-9911-2233-4455',
      cardOwner: ownerSetting ? ownerSetting.value : 'مدیریت مرکز کاریزما',
      cardBank: bankSetting ? bankSetting.value : 'بانک ملی ایران'
    });
  });

  app.put('/api/admin/settings/card', authenticateToken, requireRole([Role.ADMIN, Role.MODERATOR]), async (req: Request, res: Response) => {
    const { cardNumber, cardOwner, cardBank } = req.body;

    if (!cardNumber || typeof cardNumber !== 'string') {
      return res.status(400).json({ error: 'شماره کارت الزامی است.' });
    }

    const settings = await DBEngine.readTable<Setting>('settings');

    const updateOrInsertSetting = (key: string, value: string, desc: string) => {
      const idx = settings.findIndex(s => s.key === key);
      if (idx !== -1) {
        settings[idx].value = value;
        settings[idx].updatedAt = new Date().toISOString();
      } else {
        settings.push({
          id: 's_' + Math.random().toString(36).substring(2, 9),
          key,
          value,
          description: desc,
          updatedAt: new Date().toISOString()
        });
      }
    };

    updateOrInsertSetting('card_number', cardNumber.trim(), 'شماره کارت پیش‌فرض جهت واریزی');
    updateOrInsertSetting('card_owner', (cardOwner || 'مدیریت مرکز کاریزما').trim(), 'نام صاحب کارت');
    updateOrInsertSetting('card_bank', (cardBank || 'بانک ملی ایران').trim(), 'نام بانک صادرکننده کارت');

    await DBEngine.writeTable('settings', settings);

    const user = (req as any).user;
    await logAudit(user.id, user.username, 'ویرایش شماره کارت پیش‌فرض', req.ip || '127.0.0.1', `شماره کارت جدید: ${cardNumber} | صاحب کارت: ${cardOwner}`);

    res.json({
      success: true,
      cardNumber: cardNumber.trim(),
      cardOwner: (cardOwner || 'مدیریت مرکز کاریزما').trim(),
      cardBank: (cardBank || 'بانک ملی ایران').trim()
    });
  });

  // ==================== EDUCATIONAL CHANNEL & LINKS SETTINGS API ====================

  app.get('/api/settings/educational-channel', async (req: Request, res: Response) => {
    const settings = await DBEngine.readTable<Setting>('settings');
    const tgSetting = settings.find(s => s.key === 'telegram_url');
    const altUrlSetting = settings.find(s => s.key === 'alternative_url') || settings.find(s => s.key === 'spotplayer_url') || settings.find(s => s.key === 'youtube_url');
    const altTitleSetting = settings.find(s => s.key === 'alternative_title');
    const altDescSetting = settings.find(s => s.key === 'alternative_desc');
    const altPlatformSetting = settings.find(s => s.key === 'alternative_platform');
    const titleSetting = settings.find(s => s.key === 'channel_title');
    const descSetting = settings.find(s => s.key === 'channel_desc');

    res.json({
      telegramUrl: tgSetting ? tgSetting.value : 'https://t.me/Karizma_Academy',
      alternativeUrl: altUrlSetting ? altUrlSetting.value : 'https://youtube.com/@Karizma_Center',
      alternativeTitle: altTitleSetting ? altTitleSetting.value : 'کانال ارتباطی و دوره‌های جایگزین',
      alternativeDesc: altDescSetting ? altDescSetting.value : 'دسترسی جایگزین به دوره‌ها، آموزش‌های تصویری، کانال‌های داخلی یا شبکه‌های اجتماعی در صورت عدم دسترسی به تلگرام',
      alternativePlatformName: altPlatformSetting ? altPlatformSetting.value : 'یوتیوب / دوره‌ها / کانال جایگزین',
      channelTitle: titleSetting ? titleSetting.value : 'کانال‌های آموزشی و ارتباطی کاریزما',
      channelDescription: descSetting ? descSetting.value : 'دسترسی به کانال اصلی تلگرام و بستر ارتباطی جایگزین جهت دریافت دوره‌های آموزشی، پشتیبانی و کتاب‌ها'
    });
  });

  app.get('/api/admin/settings/educational-channel', authenticateToken, requireRole([Role.ADMIN, Role.MODERATOR]), async (req: Request, res: Response) => {
    const settings = await DBEngine.readTable<Setting>('settings');
    const tgSetting = settings.find(s => s.key === 'telegram_url');
    const altUrlSetting = settings.find(s => s.key === 'alternative_url') || settings.find(s => s.key === 'spotplayer_url') || settings.find(s => s.key === 'youtube_url');
    const altTitleSetting = settings.find(s => s.key === 'alternative_title');
    const altDescSetting = settings.find(s => s.key === 'alternative_desc');
    const altPlatformSetting = settings.find(s => s.key === 'alternative_platform');
    const titleSetting = settings.find(s => s.key === 'channel_title');
    const descSetting = settings.find(s => s.key === 'channel_desc');

    res.json({
      telegramUrl: tgSetting ? tgSetting.value : 'https://t.me/Karizma_Academy',
      alternativeUrl: altUrlSetting ? altUrlSetting.value : 'https://youtube.com/@Karizma_Center',
      alternativeTitle: altTitleSetting ? altTitleSetting.value : 'کانال ارتباطی و دوره‌های جایگزین',
      alternativeDesc: altDescSetting ? altDescSetting.value : 'دسترسی جایگزین به دوره‌ها، آموزش‌های تصویری، کانال‌های داخلی یا شبکه‌های اجتماعی در صورت عدم دسترسی به تلگرام',
      alternativePlatformName: altPlatformSetting ? altPlatformSetting.value : 'یوتیوب / دوره‌ها / کانال جایگزین',
      channelTitle: titleSetting ? titleSetting.value : 'کانال‌های آموزشی و ارتباطی کاریزما',
      channelDescription: descSetting ? descSetting.value : 'دسترسی به کانال اصلی تلگرام و بستر ارتباطی جایگزین جهت دریافت دوره‌های آموزشی، پشتیبانی و کتاب‌ها'
    });
  });

  app.put('/api/admin/settings/educational-channel', authenticateToken, requireRole([Role.ADMIN, Role.MODERATOR]), async (req: Request, res: Response) => {
    const { 
      telegramUrl, 
      alternativeUrl,
      alternativeTitle,
      alternativeDesc,
      alternativePlatformName,
      channelTitle, 
      channelDescription 
    } = req.body;

    const settings = await DBEngine.readTable<Setting>('settings');

    const updateOrInsertSetting = (key: string, value: string, desc: string) => {
      const idx = settings.findIndex(s => s.key === key);
      if (idx !== -1) {
        settings[idx].value = value;
        settings[idx].updatedAt = new Date().toISOString();
      } else {
        settings.push({
          id: 's_' + Math.random().toString(36).substring(2, 9),
          key,
          value,
          description: desc,
          updatedAt: new Date().toISOString()
        });
      }
    };

    updateOrInsertSetting('telegram_url', (telegramUrl ?? 'https://t.me/Karizma_Academy').trim(), 'لینک کانال اصلی تلگرام کاریزما');
    updateOrInsertSetting('alternative_url', (alternativeUrl ?? 'https://youtube.com/@Karizma_Center').trim(), 'لینک کانال یا بستر ارتباطی جایگزین');
    updateOrInsertSetting('alternative_title', (alternativeTitle ?? 'کانال ارتباطی و دوره‌های جایگزین').trim(), 'عنوان کارت کانال جایگزین');
    updateOrInsertSetting('alternative_desc', (alternativeDesc ?? 'دسترسی جایگزین به دوره‌ها و کانال‌های آموزشی').trim(), 'توضیحات کارت کانال جایگزین');
    updateOrInsertSetting('alternative_platform', (alternativePlatformName ?? 'بستر جایگزین').trim(), 'نام پلتفرم یا برچسب کانال جایگزین');
    updateOrInsertSetting('channel_title', (channelTitle ?? 'کانال‌های آموزشی و ارتباطی کاریزما').trim(), 'عنوان کلی صفحه کانال');
    updateOrInsertSetting('channel_desc', (channelDescription ?? '').trim(), 'توضیحات کلی صفحه کانال');

    await DBEngine.writeTable('settings', settings);

    const user = (req as any).user;
    await logAudit(user.id, user.username, 'ویرایش لینک‌های کانال تلگرام و کانال جایگزین', req.ip || '127.0.0.1', `تلگرام: ${telegramUrl} | لینک جایگزین: ${alternativeUrl}`);

    res.json({
      success: true,
      telegramUrl: (telegramUrl ?? 'https://t.me/Karizma_Academy').trim(),
      alternativeUrl: (alternativeUrl ?? 'https://youtube.com/@Karizma_Center').trim(),
      alternativeTitle: (alternativeTitle ?? 'کانال ارتباطی و دوره‌های جایگزین').trim(),
      alternativeDesc: (alternativeDesc ?? '').trim(),
      alternativePlatformName: (alternativePlatformName ?? 'بستر جایگزین').trim(),
      channelTitle: (channelTitle ?? 'کانال‌های آموزشی و ارتباطی کاریزما').trim(),
      channelDescription: (channelDescription ?? '').trim()
    });
  });

  // ==================== USER SKILL REPORTS API ====================

  app.post('/api/skill-reports', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { skillId, skillTitle, score, status, notes } = req.body;

    if (!skillTitle) {
      return res.status(400).json({ error: 'عنوان مهارت الزامی است.' });
    }

    const reports = await DBEngine.readTable<any>('skill_reports');
    const newReport = {
      id: 'sr_' + Math.random().toString(36).substring(2, 11),
      userId: user.id,
      username: user.username,
      skillId: skillId || 'general_skill',
      skillTitle: String(skillTitle).trim(),
      score: Number(score) || 100,
      status: status || 'completed',
      notes: notes ? String(notes).trim() : '',
      createdAt: new Date().toISOString()
    };

    reports.push(newReport);
    await DBEngine.writeTable('skill_reports', reports);

    res.json({ success: true, report: newReport });
  });

  // Tickets Admin Endpoints
  app.get('/api/admin/tickets', authenticateToken, requireRole([Role.ADMIN, Role.MODERATOR]), async (req: Request, res: Response) => {
    const tickets = await DBEngine.readTable<Ticket>('tickets');
    const users = await DBEngine.readTable<User>('users');
    
    const mapped = tickets.map(t => {
      const user = users.find(u => u.id === t.userId);
      return {
        ...t,
        username: user?.username || 'کاربر نامشخص'
      };
    });
    res.json(mapped.reverse());
  });

  app.put('/api/admin/tickets/:id/status', authenticateToken, requireRole([Role.ADMIN, Role.MODERATOR]), async (req: Request, res: Response) => {
    const { status } = req.body;
    const tickets = await DBEngine.readTable<Ticket>('tickets');
    const idx = tickets.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'تیکت یافت نشد' });

    tickets[idx].status = status;
    tickets[idx].updatedAt = new Date().toISOString();
    await DBEngine.writeTable('tickets', tickets);
    res.json(tickets[idx]);
  });

  app.post('/api/admin/tickets/:id/reply', authenticateToken, requireRole([Role.ADMIN, Role.MODERATOR]), async (req: Request, res: Response) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'پیام الزامی است' });

    const tickets = await DBEngine.readTable<Ticket>('tickets');
    const idx = tickets.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'تیکت یافت نشد' });

    const messages = await DBEngine.readTable<TicketMessage>('ticket_messages');
    const newMsg: TicketMessage = {
      id: 'tm_' + Date.now() + Math.random().toString(36).substr(2, 5),
      ticketId: req.params.id,
      senderId: (req as any).user.id,
      senderRole: 'admin',
      message,
      createdAt: new Date().toISOString()
    };
    messages.push(newMsg);
    await DBEngine.writeTable('ticket_messages', messages);

    tickets[idx].status = 'answered';
    tickets[idx].updatedAt = new Date().toISOString();
    await DBEngine.writeTable('tickets', tickets);

    res.json(newMsg);
  });

  app.get('/api/admin/receipts', authenticateToken, requireRole([Role.ADMIN, Role.MODERATOR]), async (req: Request, res: Response) => {
    const receipts = await DBEngine.readTable<Receipt>('receipts');
    const users = await DBEngine.readTable<User>('users');
    const plans = await DBEngine.readTable<Plan>('plans');

    const mapped = receipts.map(r => {
      const user = users.find(u => u.id === r.userId);
      const plan = plans.find(p => p.id === r.planId);
      return {
        ...r,
        username: user ? user.username : 'کاربر نامشخص',
        planName: plan ? plan.name : 'طرح نامشخص'
      };
    });
    res.json(mapped.reverse());
  });

  app.get('/api/admin/bank-deposits', authenticateToken, requireRole([Role.ADMIN, Role.MODERATOR]), async (req: Request, res: Response) => {
    const deposits = await DBEngine.readTable<any>('bank_deposits');
    res.json(deposits.reverse());
  });

  app.post('/api/admin/bank-deposits', authenticateToken, requireRole([Role.ADMIN, Role.MODERATOR]), async (req: Request, res: Response) => {
    const { senderCard, amount } = req.body;
    if (!senderCard || !amount) {
      return res.status(400).json({ error: 'شماره کارت فرستنده و مبلغ الزامی است.' });
    }

    const cleanCard = senderCard.trim().replace(/\s+|-/g, '');
    const numAmount = Number(amount);

    const deposits = await DBEngine.readTable<any>('bank_deposits');
    const receipts = await DBEngine.readTable<Receipt>('receipts');
    const subs = await DBEngine.readTable<Subscription>('subscriptions');

    // 1. Check if there's an existing PENDING receipt with same card number and amount
    const pendingReceipt = receipts.find(r => {
      if (r.status !== 'pending' || !r.senderCard) return false;
      const rCard = r.senderCard.trim().replace(/\s+|-/g, '');
      return rCard === cleanCard && r.amount === numAmount;
    });

    if (pendingReceipt) {
      // Automatic Match found!
      pendingReceipt.status = 'success';
      pendingReceipt.traceNumber = 'MATCH-' + Math.floor(100000 + Math.random() * 900000);
      await DBEngine.writeTable('receipts', receipts);

      // Activate subscription using plan duration
      const plans = await DBEngine.readTable<Plan>('plans');
      const matchedPlan = plans.find(p => p.id === pendingReceipt.planId);
      const planDuration = matchedPlan?.durationDays || (pendingReceipt.planId === 'p1' ? 7 : pendingReceipt.planId === 'p2' ? 15 : 30);
      const newSub = await SubscriptionService.activateSubscription(pendingReceipt.userId, pendingReceipt.planId || 'p1', planDuration);

      // Create deposit as assigned
      const newDeposit = {
        id: 'dep_' + Math.random().toString(36).substring(2, 11),
        senderCard: senderCard.trim(),
        amount: numAmount,
        isAssigned: true,
        createdAt: new Date().toISOString()
      };
      deposits.push(newDeposit);
      await DBEngine.writeTable('bank_deposits', deposits);

      const admin = (req as any).user;
      await logAudit(admin.id, admin.username, 'ثبت واریزی و تطابق خودکار', req.ip || '127.0.0.1', `مبلغ: ${numAmount} - کارت: ${senderCard} - کاربر فعال شده: ${pendingReceipt.userId} (${planDuration} روزه)`);

      return res.json({ success: true, matched: true, matchedUserId: pendingReceipt.userId, subscription: newSub });
    }

    // No match found, save as unassigned deposit
    const newDeposit = {
      id: 'dep_' + Math.random().toString(36).substring(2, 11),
      senderCard: senderCard.trim(),
      amount: numAmount,
      isAssigned: false,
      createdAt: new Date().toISOString()
    };
    deposits.push(newDeposit);
    await DBEngine.writeTable('bank_deposits', deposits);

    const admin = (req as any).user;
    await logAudit(admin.id, admin.username, 'ثبت واریزی بانکی جدید', req.ip || '127.0.0.1', `مبلغ: ${numAmount} - کارت: ${senderCard}`);

    res.json({ success: true, matched: false });
  });

  app.post('/api/receipts/submit', authenticateToken, async (req: Request, res: Response) => {
    const { senderCard, amount, planId, traceNumber } = req.body;
    const user = (req as any).user;

    if (!senderCard || !amount || !planId) {
      return res.status(400).json({ error: 'اطلاعات فرستنده، مبلغ و طرح انتخابی الزامی است.' });
    }

    const plans = await DBEngine.readTable<Plan>('plans');
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      return res.status(404).json({ error: 'طرح انتخابی یافت نشد.' });
    }

    const cleanCard = senderCard.trim().replace(/\s+|-/g, '');
    const numAmount = Number(amount);

    const deposits = await DBEngine.readTable<any>('bank_deposits');
    const receipts = await DBEngine.readTable<Receipt>('receipts');
    const subs = await DBEngine.readTable<Subscription>('subscriptions');

    // Check if there is an unassigned bank deposit matching this senderCard and amount
    const matchingDeposit = deposits.find(d => {
      if (d.isAssigned) return false;
      const dCard = d.senderCard.trim().replace(/\s+|-/g, '');
      return dCard === cleanCard && d.amount === numAmount;
    });

    const subId = 'sub_' + Math.random().toString(36).substring(2, 11);

    if (matchingDeposit) {
      // Auto-match successful! Approve immediately
      matchingDeposit.isAssigned = true;
      await DBEngine.writeTable('bank_deposits', deposits);

      const planDuration = plan.durationDays || (plan.id === 'p1' ? 7 : plan.id === 'p2' ? 15 : 30);
      const newSub = await SubscriptionService.activateSubscription(user.id, plan.id, planDuration);

      const newReceipt: Receipt = {
        id: 'rec_' + Math.random().toString(36).substring(2, 11),
        userId: user.id,
        subscriptionId: newSub.id,
        amount: numAmount,
        traceNumber: traceNumber || 'MATCH-' + Math.floor(100000 + Math.random() * 900000),
        refId: 'REF-' + Math.floor(100000 + Math.random() * 900000),
        status: 'success',
        senderCard: senderCard.trim(),
        planId: plan.id,
        createdAt: new Date().toISOString()
      };
      receipts.push(newReceipt);
      await DBEngine.writeTable('receipts', receipts);

      await logAudit(user.id, user.username, 'ثبت رسید و تایید خودکار', req.ip || '127.0.0.1', `مبلغ: ${numAmount} - طرح: ${plan.name} (${planDuration} روزه)`);

      return res.json({ success: true, status: 'success', subscription: newSub });
    }

    // No match, register as pending
    const newReceipt: Receipt = {
      id: 'rec_' + Math.random().toString(36).substring(2, 11),
      userId: user.id,
      subscriptionId: subId,
      amount: numAmount,
      traceNumber: traceNumber || '',
      refId: 'REF-PENDING',
      status: 'pending',
      senderCard: senderCard.trim(),
      planId: plan.id,
      createdAt: new Date().toISOString()
    };
    receipts.push(newReceipt);
    await DBEngine.writeTable('receipts', receipts);

    await logAudit(user.id, user.username, 'ثبت رسید واریز دستی (در انتظار تایید)', req.ip || '127.0.0.1', `مبلغ: ${numAmount} - طرح: ${plan.name}`);

    res.json({ success: true, status: 'pending' });
  });

  app.post('/api/admin/receipts/:id/approve', authenticateToken, requireRole([Role.ADMIN, Role.MODERATOR]), async (req: Request, res: Response) => {
    const { id } = req.params;
    const receipts = await DBEngine.readTable<Receipt>('receipts');
    const receiptIndex = receipts.findIndex(r => r.id === id);

    if (receiptIndex === -1) {
      return res.status(404).json({ error: 'رسید مورد نظر یافت نشد.' });
    }

    const receipt = receipts[receiptIndex];
    if (receipt.status === 'success') {
      return res.status(400).json({ error: 'این رسید قبلاً تایید شده است.' });
    }

    receipt.status = 'success';
    receipt.traceNumber = receipt.traceNumber || 'MANUAL-' + Math.floor(100000 + Math.random() * 900000);
    await DBEngine.writeTable('receipts', receipts);

    // Activate subscription with plan duration
    const plans = await DBEngine.readTable<Plan>('plans');
    const plan = plans.find(p => p.id === receipt.planId);
    const planDuration = plan?.durationDays || (receipt.planId === 'p1' ? 7 : receipt.planId === 'p2' ? 15 : 30);
    const newSub = await SubscriptionService.activateSubscription(receipt.userId, receipt.planId || 'p1', planDuration);

    const admin = (req as any).user;
    await logAudit(admin.id, admin.username, 'تایید دستی رسید کاربران', req.ip || '127.0.0.1', `کد رسید: ${receipt.id} - کاربر: ${receipt.userId} - طرح: ${plan?.name || receipt.planId} (${planDuration} روزه)`);

    res.json({ success: true, subscription: newSub });
  });

  app.post('/api/admin/receipts/:id/decline', authenticateToken, requireRole([Role.ADMIN, Role.MODERATOR]), async (req: Request, res: Response) => {
    const { id } = req.params;
    const receipts = await DBEngine.readTable<Receipt>('receipts');
    const receiptIndex = receipts.findIndex(r => r.id === id);

    if (receiptIndex === -1) {
      return res.status(404).json({ error: 'رسید مورد نظر یافت نشد.' });
    }

    const receipt = receipts[receiptIndex];
    receipt.status = 'failed';
    await DBEngine.writeTable('receipts', receipts);

    const admin = (req as any).user;
    await logAudit(admin.id, admin.username, 'رد کردن رسید کاربران', req.ip || '127.0.0.1', `کد رسید: ${receipt.id}`);

    res.json({ success: true });
  });

  // ==================== PRIVACY-FOCUSED ANALYTICS API ====================

  app.post('/api/analytics/event', async (req: Request, res: Response) => {
    try {
      const { eventName, category, metadata, userId, timestamp } = req.body || {};
      if (!eventName) {
        return res.status(400).json({ error: 'نام رویداد الزامی است.' });
      }

      const events = await DBEngine.readTable<TrackingEvent>('tracking_events');
      
      // Privacy check: Ensure no text content/prompts are saved
      const safeMetadata: Record<string, any> = {};
      if (metadata && typeof metadata === 'object') {
        const SENSITIVE = ['password', 'token', 'message', 'prompt', 'text', 'content', 'input', 'email', 'phone'];
        for (const [k, v] of Object.entries(metadata)) {
          if (!SENSITIVE.some(s => k.toLowerCase().includes(s))) {
            if (typeof v === 'string') safeMetadata[k] = v.substring(0, 60);
            else if (typeof v === 'number' || typeof v === 'boolean') safeMetadata[k] = v;
          }
        }
      }

      const newEvent: TrackingEvent = {
        id: 'evt_' + Math.random().toString(36).substring(2, 11),
        eventName: String(eventName).substring(0, 50),
        category: category || 'general',
        metadata: safeMetadata,
        userId: userId || 'anon_' + Math.random().toString(36).substring(2, 7),
        timestamp: timestamp || new Date().toISOString()
      };

      events.push(newEvent);
      // Keep max 1000 events to maintain lightweight database size
      if (events.length > 1000) {
        events.splice(0, events.length - 1000);
      }
      await DBEngine.writeTable('tracking_events', events);

      res.json({ success: true, eventId: newEvent.id });
    } catch (e: any) {
      res.status(500).json({ error: 'خطا در ثبت رویداد تحلیلی', details: e.message });
    }
  });

  app.get('/api/analytics/stats', async (req: Request, res: Response) => {
    try {
      const events = await DBEngine.readTable<TrackingEvent>('tracking_events');
      
      const totalEvents = events.length;
      const categories: Record<string, number> = {};
      const eventCounts: Record<string, number> = {};

      events.forEach(e => {
        if (e.category) {
          categories[e.category] = (categories[e.category] || 0) + 1;
        }
        if (e.eventName) {
          eventCounts[e.eventName] = (eventCounts[e.eventName] || 0) + 1;
        }
      });

      const recentEvents = events.slice(-20).reverse();

      res.json({
        success: true,
        totalEvents,
        categories,
        eventCounts,
        recentEvents
      });
    } catch (e: any) {
      res.status(500).json({ error: 'خطا در دریافت آمار آنالیتیکس', details: e.message });
    }
  });

  // ==================== ERROR & FALLBACK API HANDLERS ====================

  // 404 Handler for all unmatched API routes (guarantees JSON response, never falls through to HTML)
  app.all(['/api', '/api/*', '/app/api', '/app/api/*'], (req: Request, res: Response) => {
    res.status(404).json({ error: 'سرویس مورد نظر یافت نشد (404).' });
  });

  // General Error Handler for all API routes
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('SERVER API ERROR:', err);
    res.status(err.status || 500).json({
      error: 'خطای داخلی در سرور رخ داده است.',
      details: err.message || String(err)
    });
  });

  // ==================== APP INITIAL ENTRY ====================

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    
    // Serve static files at root and subdirectory prefix
    app.use(express.static(distPath));
    app.use('/app', express.static(distPath));
    
    // Serve index.html directly for /app and any subroutes to avoid redirect loops
    app.get('/app', async (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    app.get('/app/*', async (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    app.get('*', async (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Periodic real-time background sweep for expiring subscriptions
  setInterval(() => {
    try {
      SubscriptionService.checkAndExpireSubscriptions();
    } catch (e) {
      console.error('[SubscriptionSweep] Error running background expiration check:', e);
    }
  }, 60000);

  // Periodic background sweep for conversation cleanup (every 1 hour)
  setTimeout(() => {
    CleanupService.runConversationCleanup();
  }, 10000); // Run once shortly after boot
  
  setInterval(() => {
    try {
      CleanupService.runConversationCleanup();
    } catch (e) {
      console.error('[CleanupSweep] Error running background cleanup:', e);
    }
  }, 3600000); // 1 hour

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[g51.ir] Karizma Center running on port: ${PORT}`);
    // Non-blocking initialization of Karizma Coach local engine
    setTimeout(() => {
      try {
        coachEngine.initialize();
      } catch (e) {
        console.error('[CoachEngine] Failed to initialize coach engine:', e);
      }
    }, 100);
  });
}

startServer().catch((err) => {
  console.error('[g51.ir] Failed to start Karizma Center server:', err);
});
