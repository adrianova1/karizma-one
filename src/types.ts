export enum Role {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

export type CoachingMode = 
  | 'reply_generator' 
  | 'starter' 
  | 'coach' 
  | 'confidence' 
  | 'body_language' 
  | 'story_starter' 
  | 'shit_test'
  | 'emergency';

export interface CoachingModeInfo {
  id: string;
  title: string;
  shortTitle: string;
  icon: string;
  description: string;
  placeholder: string;
  samplePrompts: string[];
}

export interface UserPreferences {
  autoCopy?: boolean;
  gender?: 'male' | 'female' | 'unspecified';
  preferredTone?: string;
  notificationsEnabled?: boolean;
}

export interface User {
  id: string;
  username: string;
  passwordHash?: string;
  role: Role | string;
  phoneNumber?: string;
  preferences?: UserPreferences;
  xp?: number;
  streak?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  maxQueries: number;
  maxKnowledgeCards: number;
  durationDays: number;
  maxScenarios?: number;
  quizLimitPerDay?: number;
  academyAccess?: string;
  historyRetentionDays?: number;
  badge?: string;
  features: string[];
  createdAt?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'expired' | 'pending' | 'canceled';
  startDate: string;
  endDate: string;
  queriesUsed: number;
  receiptNumber?: string;
  paymentProofUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface KnowledgeCard {
  id: string;
  title: string;
  category: string;
  content: string;
  normalizedContent?: string;
  tags?: string[];
  keywords: string[];
  summary?: string;
  difficulty?: string;
  views?: number;
  likes?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScenarioItem {
  id: string;
  title: string;
  situation: string;
  opponentLine?: string;
  environment?: string;
  difficulty?: string;
  goal?: string;
  context?: string;
  category?: string;
  triggers: string[];
  keywords: string[];
  aliases: string[];
  user_input_patterns?: string[];
  responses: {
    charismatic: string;
    funny: string;
    confident: string;
    mysterious: string;
    mature: string;
  };
  technique?: string;
  bodyLanguage?: string;
  teachingNote?: string;
  tips?: string;
  nextMove?: string;
  likes?: number;
  views?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  systemInstruction: string;
  templateText: string;
  searchThreshold?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromptHistory {
  id: string;
  userId: string;
  prompt: string;
  response: string;
  mode?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  mode?: CoachingMode | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  mode?: string;
  tone?: string;
  structuredResponses?: {
    charismatic?: string;
    funny?: string;
    confident?: string;
    mysterious?: string;
    mature?: string;
  };
  matchedScenarioId?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  ip: string;
  details: string;
  createdAt: string;
}

export interface Setting {
  id: string;
  key: string;
  value: any;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ContentItem {
  id: string;
  title: string;
  category: string;
  content: string;
  authorId?: string;
  views?: number;
  createdAt?: string;
}

export interface Receipt {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  receiptNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  paymentDate?: string;
  adminNote?: string;
  createdAt: string;
}

export interface SearchCache {
  id: string;
  query: string;
  results: any;
  expiresAt: number;
}

export interface AICache {
  id: string;
  hash: string;
  response: any;
  expiresAt: number;
}

export interface ImportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total: number;
  processed: number;
  failedCount: number;
  createdAt: string;
}

export interface StatisticsRecord {
  id: string;
  type: string;
  date: string;
  value: number;
}

export interface TrackingEvent {
  id?: string;
  eventType: string;
  timestamp?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface Ticket {
  id: string;
  userId: string;
  title: string;
  status: 'open' | 'answered' | 'closed';
  createdAt: string;
  updatedAt?: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

export interface AITraceRecord {
  id: string;
  userId: string;
  query: string;
  response: string;
  latencyMs: number;
  timestamp: string;
}
