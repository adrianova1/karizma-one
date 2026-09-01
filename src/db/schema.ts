import { pgTable, text, timestamp, boolean, integer, jsonb, numeric } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(), // admin, moderator, user
  phoneNumber: text('phone_number'),
  preferences: jsonb('preferences'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const scenarios = pgTable('scenarios', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  situation: text('situation').notNull(),
  opponentLine: text('opponent_line'),
  environment: text('environment'),
  genderContext: text('gender_context'),
  goal: text('goal'),
  difficulty: text('difficulty'),
  responses: jsonb('responses').notNull(), // charismatic, funny, etc.
  technique: text('technique'),
  bodyLanguage: text('body_language'),
  teachingNote: text('teaching_note'),
  views: integer('views').default(0),
  likes: integer('likes').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const techniques = pgTable('techniques', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  categoryTitle: text('category_title').notNull(),
  explanation: text('explanation').notNull(),
  example: text('example').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const dialogues = pgTable('dialogues', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  categoryTitle: text('category_title').notNull(),
  templateText: text('template_text').notNull(),
  notes: text('notes').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const bodyLanguageGuides = pgTable('body_language_guides', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  dos: jsonb('dos').notNull(), // string[]
  donts: jsonb('donts').notNull(), // string[]
  context: text('context').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const mistakePatterns = pgTable('mistake_patterns', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  wrongApproach: text('wrong_approach').notNull(),
  correctApproach: text('correct_approach').notNull(),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const plans = pgTable('plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  price: integer('price').notNull(),
  description: text('description').notNull(),
  maxQueries: integer('max_queries').notNull(),
  maxKnowledgeCards: integer('max_knowledge_cards').notNull(),
  durationDays: integer('duration_days'),
  maxScenarios: integer('max_scenarios'),
  quizLimitPerDay: integer('quiz_limit_per_day'),
  academyAccess: text('academy_access'),
  badge: text('badge'),
  allowedCoachModes: jsonb('allowed_coach_modes'), // string[]
  allowVisionAnalysis: boolean('allow_vision_analysis').default(false),
  allowVoiceCoach: boolean('allow_voice_coach').default(false),
  features: jsonb('features'), // string[]
  historyRetentionDays: integer('history_retention_days'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  planId: text('plan_id').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  status: text('status').notNull(), // active, expired, cancelled
  queryCount: integer('query_count').default(0),
  planName: text('plan_name'),
  username: text('username'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const knowledgeCards = pgTable('knowledge_cards', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  normalizedContent: text('normalized_content').notNull(),
  keywords: jsonb('keywords').notNull(), // string[]
  tags: jsonb('tags').notNull(), // string[]
  category: text('category').notNull(),
  views: integer('views').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const prompts = pgTable('prompts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  systemInstruction: text('system_instruction').notNull(),
  templateText: text('template_text').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const promptHistory = pgTable('prompt_history', {
  id: text('id').primaryKey(),
  promptId: text('prompt_id').notNull(),
  userId: text('user_id').notNull(),
  inputs: jsonb('inputs').notNull(),
  outputText: text('output_text').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  messages: jsonb('messages').notNull(), // array of objects
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  username: text('username').notNull(),
  action: text('action').notNull(),
  ip: text('ip').notNull(),
  details: text('details').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const settings = pgTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  description: text('description').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const contentItems = pgTable('content_items', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  excerpt: text('excerpt').notNull(),
  body: text('body').notNull(),
  type: text('type').notNull(),
  url: text('url'),
  status: text('status').notNull(), // draft, published
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const receipts = pgTable('receipts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  subscriptionId: text('subscription_id').notNull(),
  amount: numeric('amount').notNull(), // using numeric for financial
  traceNumber: text('trace_number').notNull(),
  refId: text('ref_id').notNull(),
  status: text('status').notNull(),
  senderCard: text('sender_card'),
  planId: text('plan_id'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const bankDeposits = pgTable('bank_deposits', {
  id: text('id').primaryKey(),
  senderCard: text('sender_card').notNull(),
  amount: numeric('amount').notNull(),
  isAssigned: boolean('is_assigned').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const aiTraces = pgTable('ai_traces', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  latencyMs: integer('latency_ms').notNull(),
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  status: text('status').notNull(),
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const trackingEvents = pgTable('tracking_events', {
  id: text('id').primaryKey(),
  eventName: text('event_name').notNull(),
  category: text('category'),
  metadata: jsonb('metadata'),
  userId: text('user_id'),
  timestamp: timestamp('timestamp').notNull()
});

export const skillReports = pgTable('skill_reports', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  reportType: text('report_type'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const tickets = pgTable('tickets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  subject: text('subject').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const ticketMessages = pgTable('ticket_messages', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id').notNull(),
  senderId: text('sender_id').notNull(),
  senderRole: text('sender_role').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
});
