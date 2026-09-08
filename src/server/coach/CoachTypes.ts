export type ToneResponsePool = string | string[];

export type CanonicalToneKey = 'charismatic' | 'funny' | 'confident' | 'mysterious' | 'mature';

export interface CoachToneResponses {
  charismatic?: ToneResponsePool;
  funny?: ToneResponsePool;
  confident?: ToneResponsePool;
  mysterious?: ToneResponsePool;
  mature?: ToneResponsePool;
  [key: string]: ToneResponsePool | undefined;
}

export interface CoachScenario {
  id: string;
  title: string;
  category: string;
  situation: string;
  context?: string;
  user_input_patterns?: string[];
  triggers: string[];
  aliases: string[];
  keywords: string[];
  responses: CoachToneResponses;
  tips?: string;
  technique?: string;
  bodyLanguage?: string;
  nextMove?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  likes?: number;
  views?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CoachFallbackItem {
  topic: string;
  triggers: string[];
  responses: CoachToneResponses;
  tip?: string;
  analysis?: string;
}

export interface CoachCategory {
  id: string;
  title: string;
  description: string;
}

export interface MatchScoreBreakdown {
  exactTriggerScore: number;
  phraseScore: number;
  aliasScore: number;
  trigramSimilarityScore: number;
  tokenOverlapScore: number;
  keywordScore: number;
  categoryScore: number;
  penaltyScore: number;
  totalScore: number;
}

export interface ScenarioMatchCandidate {
  scenario: CoachScenario;
  confidenceScore: number; // 0 - 100
  scoreBreakdown: MatchScoreBreakdown;
  matchedBy: 'exact_trigger' | 'phrase_containment' | 'alias_trigram' | 'bm25_token' | 'keyword_fallback';
}

export interface ProcessedCoachQueryOptions {
  conversationId?: string | null;
  customSystemPrompt?: string;
  history?: { role: string; content: string }[];
  selectedTone?: string;
  tone?: string;
  mode?: string;
  rotationSeed?: number;
}

export interface CoachResultStructured {
  analysis: {
    situation: string;
    environment: string;
    channel: string;
    intent: string;
    confidence: string;
  };
  responses: Array<{
    tone: CanonicalToneKey;
    title: string;
    reply: string;
    whyWorks: string;
    nextMove: string;
    riskLevel: string;
    scenarioId?: string;
    source?: string;
    chunk?: string;
  }>;
  recommendations: {
    bodyLanguage: string;
    timing: string;
    mistakesToAvoid: string;
  };
  sources: string[];
}

export interface CoachEngineResult {
  structuredData: CoachResultStructured;
  answer: string;
  sourceCards: any[];
  usedLLM: boolean;
  pipelineLog: {
    normalizedQuery: string;
    tokens: string[];
    bm25Results: Array<{ id: string; title: string; score: number }>;
    reRankedTopResult: string;
    matchedScenarioId?: string;
    selectedScenarioId?: string;
    selectedScenarioSource?: string;
    selectedChunk?: string;
    matchType?: string;
    confidenceScore: number;
    responseScenarioIds?: Record<string, string>;
    provenanceMatch?: boolean;
    usedLLM: false;
  };
}
