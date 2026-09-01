import { CoachScenario } from './CoachTypes.js';
import { PersianNormalizer } from './PersianNormalizer.js';

export interface IndexedPhrase {
  phrase: string;
  scenarioId: string;
  wordCount: number;
  length: number;
  isTrigger: boolean;
}

export class CoachIndex {
  private invertedIndex: Map<string, Set<string>> = new Map(); // token -> Set<scenarioId>
  private exactTriggerMap: Map<string, string> = new Map(); // normalizedTrigger -> scenarioId
  private exactAliasMap: Map<string, string> = new Map(); // normalizedAlias -> scenarioId
  private phraseMap: Map<string, IndexedPhrase> = new Map(); // normalizedPhrase -> IndexedPhrase
  private sortedPhrases: IndexedPhrase[] = [];
  private scenarioMap: Map<string, CoachScenario> = new Map(); // scenarioId -> CoachScenario

  /**
   * Helper to ensure only substantive phrases (not stop-words or generic question frames) are indexed for containment
   */
  private static isSubstantivePhrase(phrase: string): boolean {
    const norm = PersianNormalizer.normalize(phrase).trim();
    if (!norm || norm.length < 4) return false;
    if (PersianNormalizer.GENERIC_CARRIER_PHRASES.has(norm)) return false;
    const words = norm.split(' ').filter(Boolean);
    if (words.length === 1) {
      return norm.length >= 4;
    }
    const nonGenericWords = words.filter(w => !PersianNormalizer.GENERIC_CARRIER_PHRASES.has(w));
    return nonGenericWords.length > 0;
  }

  /**
   * Build in-memory index from scenario list
   */
  buildIndex(scenarios: CoachScenario[]): void {
    this.invertedIndex.clear();
    this.exactTriggerMap.clear();
    this.exactAliasMap.clear();
    this.phraseMap.clear();
    this.sortedPhrases = [];

    for (const scenario of scenarios) {
      this.scenarioMap.set(scenario.id, scenario);

      // Index Triggers
      for (const trigger of scenario.triggers || []) {
        const normTrigger = PersianNormalizer.normalize(trigger);
        if (normTrigger) {
          const isCanonical = scenario.id.startsWith('scen_');
          if (!this.exactTriggerMap.has(normTrigger) || isCanonical) {
            this.exactTriggerMap.set(normTrigger, scenario.id);
          }
          if (CoachIndex.isSubstantivePhrase(normTrigger)) {
            const words = normTrigger.split(' ').filter(Boolean);
            const item: IndexedPhrase = {
              phrase: normTrigger,
              scenarioId: scenario.id,
              wordCount: words.length,
              length: normTrigger.length,
              isTrigger: true
            };
            const existing = this.phraseMap.get(normTrigger);
            if (!existing || isCanonical || item.wordCount > existing.wordCount) {
              this.phraseMap.set(normTrigger, item);
            }
          }
        }
      }

      // Index Aliases
      for (const alias of scenario.aliases || []) {
        const normAlias = PersianNormalizer.normalize(alias);
        if (normAlias) {
          this.exactAliasMap.set(normAlias, scenario.id);
          if (CoachIndex.isSubstantivePhrase(normAlias)) {
            const words = normAlias.split(' ').filter(Boolean);
            const item: IndexedPhrase = {
              phrase: normAlias,
              scenarioId: scenario.id,
              wordCount: words.length,
              length: normAlias.length,
              isTrigger: false
            };
            if (!this.phraseMap.has(normAlias)) {
              this.phraseMap.set(normAlias, item);
            }
          }
        }
      }

      // Index Tokens (Title, Situation, Keywords, Triggers, Aliases)
      const textToTokenize = [
        scenario.title,
        scenario.situation,
        scenario.category,
        ...(scenario.triggers || []),
        ...(scenario.aliases || []),
        ...(scenario.keywords || [])
      ].join(' ');

      const tokens = PersianNormalizer.tokenize(textToTokenize);

      for (const token of tokens) {
        if (!this.invertedIndex.has(token)) {
          this.invertedIndex.set(token, new Set());
        }
        this.invertedIndex.get(token)!.add(scenario.id);

        const stem = PersianNormalizer.stem(token);
        if (stem && stem !== token && stem.length >= 3) {
          if (!this.invertedIndex.has(stem)) {
            this.invertedIndex.set(stem, new Set());
          }
          this.invertedIndex.get(stem)!.add(scenario.id);
        }
      }
    }

    console.log(`[CoachIndex] Built index for ${this.scenarioMap.size} scenarios with ${this.invertedIndex.size} indexed tokens & ${this.phraseMap.size} unique phrases.`);
  }

  /**
   * Lookup scenario by exact normalized trigger or alias match
   */
  findExact(normalizedQuery: string): { scenario: CoachScenario; isTrigger: boolean } | null {
    const triggerScId = this.exactTriggerMap.get(normalizedQuery);
    if (triggerScId) {
      const sc = this.scenarioMap.get(triggerScId);
      if (sc) return { scenario: sc, isTrigger: true };
    }

    const aliasScId = this.exactAliasMap.get(normalizedQuery);
    if (aliasScId) {
      const sc = this.scenarioMap.get(aliasScId);
      if (sc) return { scenario: sc, isTrigger: false };
    }

    return null;
  }

  /**
   * Lookup scenario by trigger containment (find longest matching phrase within query)
   */
  findContainedPhrase(normalizedQuery: string): { scenario: CoachScenario; phrase: string; isTrigger: boolean } | null {
    // 1. Fast O(1) N-Gram Subphrase Lookup from longest to shortest
    const words = normalizedQuery.split(' ').filter(Boolean);
    const maxLen = Math.min(words.length, 12);

    for (let len = maxLen; len >= 1; len--) {
      for (let i = 0; i <= words.length - len; i++) {
        const sub = words.slice(i, i + len).join(' ');
        if (sub.length < 3 || !CoachIndex.isSubstantivePhrase(sub)) continue;
        const matchedItem = this.phraseMap.get(sub);
        if (matchedItem) {
          const sc = this.scenarioMap.get(matchedItem.scenarioId);
          if (sc) {
            return { scenario: sc, phrase: matchedItem.phrase, isTrigger: matchedItem.isTrigger };
          }
        }
      }
    }

    return null;
  }

  /**
   * Lookup scenario by exact normalized trigger match (legacy compatibility)
   */
  findByTrigger(normalizedQuery: string): CoachScenario | null {
    const exact = this.findExact(normalizedQuery);
    if (exact) return exact.scenario;

    const contained = this.findContainedPhrase(normalizedQuery);
    if (contained) return contained.scenario;

    return null;
  }

  /**
   * Get scenario by ID
   */
  getById(id: string): CoachScenario | null {
    return this.scenarioMap.get(id) || null;
  }

  getScenarioById(id: string): CoachScenario | null {
    return this.getById(id);
  }

  /**
   * Get candidate scenario IDs matching query tokens
   */
  getCandidatesForTokens(tokens: string[]): CoachScenario[] {
    const candidateIds = new Set<string>();

    for (const token of tokens) {
      const ids = this.invertedIndex.get(token);
      if (ids) {
        ids.forEach(id => candidateIds.add(id));
      }
    }

    const candidates: CoachScenario[] = [];
    candidateIds.forEach(id => {
      const sc = this.scenarioMap.get(id);
      if (sc) candidates.push(sc);
    });

    return candidates;
  }

  /**
   * Get all scenarios
   */
  getAll(): CoachScenario[] {
    return Array.from(this.scenarioMap.values());
  }
}
