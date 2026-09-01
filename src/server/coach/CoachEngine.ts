import { CoachLoader } from './CoachLoader.js';
import { CoachIndex } from './CoachIndex.js';
import { QueryMatcher } from './QueryMatcher.js';
import { RankingEngine } from './RankingEngine.js';
import { ResponseSelector } from './ResponseSelector.js';
import { PersianNormalizer } from './PersianNormalizer.js';
import { CoachEngineResult, ProcessedCoachQueryOptions } from './CoachTypes.js';

export class CoachEngine {
  private static instance: CoachEngine;
  private index: CoachIndex;
  private matcher: QueryMatcher;
  private initialized = false;

  private constructor() {
    this.index = new CoachIndex();
    this.matcher = new QueryMatcher(this.index);
  }

  public static getInstance(): CoachEngine {
    if (!CoachEngine.instance) {
      CoachEngine.instance = new CoachEngine();
    }
    return CoachEngine.instance;
  }

  /**
   * Initializes Coach Engine & builds in-memory indices
   */
  public initialize(): void {
    if (this.initialized) return;

    const { scenarios } = CoachLoader.loadData();
    this.index.buildIndex(scenarios);
    this.matcher = new QueryMatcher(this.index);
    this.initialized = true;

    console.log('🚀 [CoachEngine] Karizma Coach Local Non-AI Engine initialized successfully!');
  }

  /**
   * Reload data from disk and rebuild index dynamically
   */
  public reindex(): void {
    CoachLoader.reload();
    const scenarios = CoachLoader.getScenarios();
    this.index = new CoachIndex();
    this.index.buildIndex(scenarios);
    this.matcher = new QueryMatcher(this.index);
    this.initialized = true;
    console.log(`🚀 [CoachEngine] Reindexed ${scenarios.length} scenarios successfully!`);
  }

  /**
   * Process incoming user query purely locally without external AI APIs
   */
  public processQuery(rawQuery: string, options?: ProcessedCoachQueryOptions): CoachEngineResult {
    if (!this.initialized) {
      this.initialize();
    }

    const { cleanText, extractedTone } = PersianNormalizer.stripMetadataTags(rawQuery || '');
    const cleanQuery = cleanText.trim();
    if (!cleanQuery) {
      return ResponseSelector.formatResult(null, CoachLoader.getFallbacks()[0], 'پرسش خالی', 100, options);
    }

    const resolvedOptions: ProcessedCoachQueryOptions = {
      ...options,
      selectedTone: options?.selectedTone || options?.tone || (extractedTone as any),
      tone: options?.tone || options?.selectedTone || (extractedTone as any)
    };

    // Layered Matching
    const candidates = this.matcher.match(cleanQuery);

    // Ranking and Selection
    const ranked = RankingEngine.rankAndSelect(candidates, cleanQuery);

    // Format & Return Result
    return ResponseSelector.formatResult(
      ranked.matchedScenario,
      ranked.fallbackItem,
      cleanQuery,
      ranked.confidenceScore,
      resolvedOptions,
      ranked.matchType
    );
  }
}

export const coachEngine = CoachEngine.getInstance();

