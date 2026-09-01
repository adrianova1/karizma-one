import * as fs from 'fs';
import * as path from 'path';
import { db } from './src/db/index.js';
import * as schema from './src/db/schema.js';

const DATA_DIR = path.join(process.cwd(), 'data');

function readTable(tableName) {
  const filePath = path.join(DATA_DIR, `${tableName}.json`);
  if (!fs.existsSync(filePath)) return [];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

async function run() {
  console.log('Migrating users...');
  const users = readTable('users');
  if (users.length > 0) {
    for (const u of users) {
      await db.insert(schema.users).values({
        id: u.id,
        username: u.username,
        passwordHash: u.passwordHash,
        role: u.role,
        phoneNumber: u.phoneNumber || null,
        preferences: u.preferences || null,
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt),
      }).onConflictDoNothing();
    }
  }

  console.log('Migrating plans...');
  const plans = readTable('plans');
  if (plans.length > 0) {
    for (const p of plans) {
      await db.insert(schema.plans).values({
        id: p.id,
        name: p.name,
        price: p.price,
        description: p.description,
        maxQueries: p.maxQueries,
        maxKnowledgeCards: p.maxKnowledgeCards,
        durationDays: p.durationDays || null,
        maxScenarios: p.maxScenarios || null,
        quizLimitPerDay: p.quizLimitPerDay || null,
        academyAccess: p.academyAccess || null,
        badge: p.badge || null,
        allowedCoachModes: p.allowedCoachModes || null,
        allowVisionAnalysis: p.allowVisionAnalysis || false,
        allowVoiceCoach: p.allowVoiceCoach || false,
        features: p.features || null,
        createdAt: new Date(p.createdAt || new Date()),
      }).onConflictDoNothing();
    }
  }

  console.log('Migrating subscriptions...');
  const subscriptions = readTable('subscriptions');
  if (subscriptions.length > 0) {
    for (const s of subscriptions) {
      await db.insert(schema.subscriptions).values({
        id: s.id,
        userId: s.userId,
        planId: s.planId,
        startDate: new Date(s.startDate),
        endDate: new Date(s.endDate),
        status: s.status,
        queryCount: s.queryCount || 0,
        planName: s.planName || null,
        username: s.username || null,
        createdAt: new Date(s.createdAt || new Date()),
      }).onConflictDoNothing();
    }
  }

  console.log('Migrating knowledge cards...');
  const cards = readTable('knowledge_cards');
  if (cards.length > 0) {
    for (const c of cards) {
      await db.insert(schema.knowledgeCards).values({
        id: c.id,
        title: c.title,
        content: c.content,
        normalizedContent: c.normalizedContent,
        keywords: c.keywords,
        tags: c.tags,
        category: c.category,
        views: c.views || 0,
        createdAt: new Date(c.createdAt || new Date()),
        updatedAt: new Date(c.updatedAt || new Date()),
      }).onConflictDoNothing();
    }
  }

  console.log('Migrating prompts...');
  const prompts = readTable('prompts');
  if (prompts.length > 0) {
    for (const p of prompts) {
      await db.insert(schema.prompts).values({
        id: p.id,
        name: p.name,
        systemInstruction: p.systemInstruction,
        templateText: p.templateText,
        isActive: p.isActive,
        createdAt: new Date(p.createdAt || new Date()),
      }).onConflictDoNothing();
    }
  }

  console.log('Migrating settings...');
  const settings = readTable('settings');
  if (settings.length > 0) {
    for (const s of settings) {
      await db.insert(schema.settings).values({
        id: s.id,
        key: s.key,
        value: s.value,
        description: s.description,
        updatedAt: new Date(s.updatedAt || new Date()),
      }).onConflictDoNothing();
    }
  }

  console.log('Migrating content items...');
  const contents = readTable('content_items');
  if (contents.length > 0) {
    for (const c of contents) {
      await db.insert(schema.contentItems).values({
        id: c.id,
        title: c.title,
        excerpt: c.excerpt,
        body: c.body,
        type: c.type,
        url: c.url || null,
        status: c.status,
        createdAt: new Date(c.createdAt || new Date()),
      }).onConflictDoNothing();
    }
  }

  console.log('Migrating notifications...');
  const notifications = readTable('notifications');
  if (notifications.length > 0) {
    for (const n of notifications) {
      await db.insert(schema.notifications).values({
        id: n.id,
        userId: n.userId,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        createdAt: new Date(n.createdAt || new Date()),
      }).onConflictDoNothing();
    }
  }

  console.log('Migrating audit logs...');
  const audits = readTable('audit_logs');
  if (audits.length > 0) {
    for (const a of audits) {
      await db.insert(schema.auditLogs).values({
        id: a.id,
        userId: a.userId,
        username: a.username,
        action: a.action,
        ip: a.ip,
        details: a.details,
        createdAt: new Date(a.createdAt || new Date()),
      }).onConflictDoNothing();
    }
  }

  console.log('Migrating receipts...');
  const receipts = readTable('receipts');
  if (receipts.length > 0) {
    for (const r of receipts) {
      await db.insert(schema.receipts).values({
        id: r.id,
        userId: r.userId,
        subscriptionId: r.subscriptionId,
        amount: r.amount.toString(),
        traceNumber: r.traceNumber,
        refId: r.refId,
        status: r.status,
        senderCard: r.senderCard || null,
        planId: r.planId || null,
        createdAt: new Date(r.createdAt || new Date()),
      }).onConflictDoNothing();
    }
  }

  console.log('Migrating conversations...');
  const convos = readTable('conversations');
  if (convos.length > 0) {
    for (const c of convos) {
      await db.insert(schema.conversations).values({
        id: c.id,
        userId: c.userId,
        title: c.title,
        messages: c.messages,
        createdAt: new Date(c.createdAt || new Date()),
      }).onConflictDoNothing();
    }
  }

  console.log('Done migrating data.');
  process.exit(0);
}

run().catch(console.error);