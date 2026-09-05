/**
 * Karizma Center Types
 * TypeScript type safety definitions
 */

export enum Role {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user'
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: Role;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  gender?: 'male' | 'female' | 'unspecified';
  preferredTone?: 'charismatic' | 'funny' | 'confident' | 'mysterious' | 'mature';
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  autoCopy?: boolean;
}

export interface ScenarioItem {
  id: string;
  title: string;
  situation: string;
  opponentLine?: string;
  environment?: string; // e.g. instagram, street, whatsapp, cafe, work
  category?: string;
  genderContext?: 'male_to_female' | 'female_to_male' | 'general';
  goal?: string; // e.g. date, friendship, boundary_setting, intimacy
  difficulty?: 'easy' | 'medium' | 'hard';
  triggers?: string[];
  aliases?: string[];
  keywords?: string[];
  responses: {
    direct?: string | string[];
    funny: string | string[];
    charismatic: string | string[];
    emotional?: string | string[];
    psychology?: string | string[];
    confident?: string | string[];
    mysterious?: string | string[];
    mature?: string | string[];
    friendly?: string | string[];
    psychological_analysis?: string | string[];
    [key: string]: string | string[] | undefined;
  };
  technique?: string;
  bodyLanguage?: string;
  teachingNote?: string;
  tips?: string;
  nextMove?: string;
  createdAt: string;
  updatedAt: string;
  views?: number;
  likes?: number;
}

export interface TechniqueItem {
  id: string;
  title: string;
  category: 'curiosity_hook' | 'emotional_framing' | 'teasing' | 'storytelling' | 'confidence_frame';
  categoryTitle: string;
  explanation: string;
  example: string;
  createdAt: string;
}

export interface DialogueTemplate {
  id: string;
  title: string;
  category: 'opening' | 'followup' | 'silence_recovery' | 'rejection_handling';
  categoryTitle: string;
  templateText: string;
  notes: string;
  createdAt: string;
}

export interface BodyLanguageGuide {
  id: string;
  title: string;
  category: string;
  dos: string[];
  donts: string[];
  context: string;
  createdAt: string;
}

export interface MistakePattern {
  id: string;
  title: string;
  wrongApproach: string;
  correctApproach: string;
  reason: string;
  createdAt: string;
}

export interface AIScenarioAnalysis {
  situation: string;
  environment: string;
  channel: string;
  intent: string;
  confidence: string;
}

export interface AIToneResponse {
  tone: 'charismatic' | 'funny' | 'confident' | 'mysterious' | 'mature';
  title: string;
  reply: string;
  whyWorks: string;
  nextMove: string;
  riskLevel: 'پایین' | 'متوسط' | 'بالا';
}

export interface AIScenarioRecommendations {
  bodyLanguage: string;
  timing: string;
  mistakesToAvoid: string;
}

export interface AIScenarioQueryResponse {
  analysis: AIScenarioAnalysis;
  responses: AIToneResponse[];
  recommendations: AIScenarioRecommendations;
  sources?: string[];
}

export interface ImportColumnMapping {
  scenario_title?: string;
  situation?: string;
  opponent_line?: string;
  environment?: string;
  goal?: string;
  tone_charismatic?: string;
  tone_funny?: string;
  tone_confident?: string;
  tone_mysterious?: string;
  tone_mature?: string;
  technique?: string;
  body_language?: string;
  teaching_note?: string;
}

export interface ImportPreviewRow {
  index: number;
  raw: Record<string, any>;
  mapped: Partial<ScenarioItem>;
  status: 'valid' | 'duplicate' | 'invalid';
  reason?: string;
}

export interface ImportResultReport {
  jobId: string;
  fileName: string;
  totalRows: number;
  importedRows: number;
  skippedDuplicates: number;
  failedRows: number;
  errors: string[];
  createdAt: string;
}

export interface AITraceRecord {
  id: string;
  provider: 'gemini' | 'openrouter' | 'groq' | 'fallback';
  model: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  status: 'success' | 'failed';
  error?: string;
  createdAt: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number; // in Tomans
  description: string;
  maxQueries: number;
  maxKnowledgeCards: number;
  durationDays?: number;
  maxScenarios?: number;
  quizLimitPerDay?: number;
  academyAccess?: 'none' | 'basic' | 'pro' | 'unlimited';
  badge?: string;
  allowedCoachModes?: string[];
  allowVisionAnalysis?: boolean;
  allowVoiceCoach?: boolean;
  features?: string[];
  historyRetentionDays?: number; // Automatic conversation cleanup limit
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled';
  queryCount?: number;
  createdAt: string;
  planName?: string;
  username?: string;
}

export interface UserLevelInfo {
  level: number;
  title: string;
  minXP: number;
  maxXP: number;
  badgeIcon: string;
  color: string;
}

export interface CertificateRequirement {
  id: string;
  title: string;
  minXP: number;
  requiredCourseIds: string[];
  minQuizScore: number;
  issuedAt?: string;
  serialNumber?: string;
}

export interface KnowledgeCard {
  id: string;
  title: string;
  content: string;
  normalizedContent: string;
  keywords: string[];
  tags: string[];
  category: string;
  createdAt: string;
  updatedAt: string;
  views: number;
}

export interface PromptTemplate {
  id: string;
  name: string;
  systemInstruction: string;
  templateText: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface PromptHistory {
  id: string;
  promptId: string;
  userId: string;
  inputs: Record<string, string>;
  outputText: string;
  createdAt: string;
}

export type CoachingMode = 
  | 'reply_generator'     // Mode 1: Reply Generator
  | 'starter'             // Mode 2: Conversation Starter
  | 'coach'               // Mode 3: Conversation Coach
  | 'scenario'            // Mode 4: Scenario Generator
  | 'analyzer'            // Mode 5: Conversation Analyzer
  | 'profile'             // Mode 6: Profile Analyzer
  | 'body_language'       // Mode 7: Body Language Coach
  | 'voice'               // Mode 8: Voice Coach
  | 'story'               // Mode 9: Story Reply Generator
  | 'live_coach';         // Mode 10: Live Coach / Emergency

export interface CoachingModeInfo {
  id: CoachingMode;
  title: string;
  shortTitle: string;
  icon: string;
  description: string;
  placeholder: string;
  samplePrompts: string[];
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mode?: CoachingMode;
  isSubscriptionAlert?: boolean;
  structuredData?: AIScenarioQueryResponse;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
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
  value: string;
  description: string;
  updatedAt: string;
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
  excerpt: string;
  body: string;
  type: 'article' | 'media';
  url?: string;
  status: 'draft' | 'published';
  createdAt: string;
}

export interface Receipt {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  traceNumber: string;
  refId: string;
  status: 'success' | 'failed' | 'pending';
  createdAt: string;
  senderCard?: string;
  planId?: string;
}

export interface BankDeposit {
  id: string;
  senderCard: string;
  amount: number;
  isAssigned: boolean;
  createdAt: string;
}

export interface SearchCache {
  id: string;
  query: string;
  resultsJson: string;
  createdAt: string;
}

export interface AICache {
  id: string;
  promptHash: string;
  responseText: string;
  createdAt: string;
}

export interface ImportJob {
  id: string;
  fileName: string;
  totalRows: number;
  processedRows: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  logMessages: string[];
  createdAt: string;
}

export interface StatisticsRecord {
  id: string;
  metricKey: string;
  metricValue: number;
  recordedDate: string;
}

export interface TrackingEvent {
  id: string;
  eventName: string;
  category?: 'academy' | 'coach' | 'scenarios' | 'leitner' | 'auth' | 'general';
  metadata?: Record<string, any>;
  userId?: string;
  timestamp: string;
}

export interface Ticket {
  id: string;
  userId: string;
  subject: string;
  status: 'open' | 'answered' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: string; // 'user' or 'admin'
  message: string;
  createdAt: string;
}
