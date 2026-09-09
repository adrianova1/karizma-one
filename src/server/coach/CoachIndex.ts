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
  private exactTriggerMap: Map<string, string[]> = new Map(); // normalizedTrigger -> scenarioId[]
  private exactAliasMap: Map<string, string[]> = new Map(); // normalizedAlias -> scenarioId[]
  private phraseMap: Map<string, IndexedPhrase> = new Map(); // normalizedPhrase -> IndexedPhrase
  private sortedPhrases: IndexedPhrase[] = [];
  private scenarioMap: Map<string, CoachScenario> = new Map(); // scenarioId -> CoachScenario

  private static readonly VULGAR_REGEX = /کیر|کسکش|جنده|کونی|ممه|سکس|سیکتیر|تریاک|شیره|هروئین|شیشه|کراک|کوکائین|حشیش|عرق سگی|پفیوز|گاومیش|عنتر/i;

  /**
   * Helper to ensure only substantive phrases (not stop-words or generic single words) are indexed for containment
   */
  public static isSubstantivePhrase(phrase: string): boolean {
    const norm = PersianNormalizer.normalize(phrase).trim();
    if (!norm || norm.length < 4) return false;
    if (this.VULGAR_REGEX.test(norm)) return false;
    if (PersianNormalizer.GENERIC_CARRIER_PHRASES.has(norm)) return false;

    // Check if phrase ends with or equals a pure question carrier like 'چی بگم' or 'چیکار کنم'
    for (const carrier of PersianNormalizer.GENERIC_CARRIER_PHRASES) {
      if (norm === carrier || norm.endsWith(' ' + carrier)) {
        const remaining = norm.slice(0, norm.length - carrier.length).trim();
        if (!remaining || remaining.length < 4 || PersianNormalizer.GENERIC_CARRIER_PHRASES.has(remaining)) {
          return false;
        }
      }
    }

    const words = norm.split(' ').filter(Boolean);
    if (words.length === 1) {
      return norm.length >= 6 && !PersianNormalizer.isStopWord(norm);
    }
    const nonGenericWords = words.filter(w => !PersianNormalizer.GENERIC_CARRIER_PHRASES.has(w) && !PersianNormalizer.isStopWord(w));
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

    const JUNK_CARRIER_TITLES = new Set([
      'چی بگم',
      'راستی چی بگم',
      'آخه چی بگم',
      'خدایی چی بگم',
      'یه سوال، چی بگم',
      'یه سوال چی بگم',
      'چیکار کنم',
      'چی جواب بدم'
    ]);

    for (const scenario of scenarios) {
      // 1. Skip vulgar / inappropriate scenarios
      const combinedText = `${scenario.title} ${scenario.situation} ${JSON.stringify(scenario.responses || {})}`;
      if (CoachIndex.VULGAR_REGEX.test(combinedText)) {
        continue;
      }

      // 2. Skip junk scenarios that are purely carrier phrases or meme shit-tests
      const cleanTitle = scenario.title.trim();
      if (JUNK_CARRIER_TITLES.has(cleanTitle)) {
        continue;
      }

      // Skip uncurated meme test-sheets with identical repetitive retorts
      if (scenario.category === 'شیت تست' && scenario.responses) {
        const res = scenario.responses as any;
        if (res.charismatic && res.charismatic === res.funny && res.charismatic === res.confident) {
          if (cleanTitle.startsWith('یه سوال، مگه') || cleanTitle.includes('چی میچسبه') || cleanTitle.includes('خوب شد نیستی')) {
            continue;
          }
        }
      }

      this.scenarioMap.set(scenario.id, scenario);

      // Index Triggers
      for (const trigger of scenario.triggers || []) {
        const normTrigger = PersianNormalizer.normalize(trigger);
        if (normTrigger && CoachIndex.isSubstantivePhrase(normTrigger)) {
          const isCore = ['scen_1', 'scen_2', 'scen_3', 'scen_4', 'scen_5', 'scen_6', 'scen_7', 'scen_8'].includes(scenario.id);
          const trigList = this.exactTriggerMap.get(normTrigger) || [];
          if (isCore) {
            trigList.unshift(scenario.id);
          } else {
            trigList.push(scenario.id);
          }
          this.exactTriggerMap.set(normTrigger, trigList);

          const words = normTrigger.split(' ').filter(Boolean);
          const item: IndexedPhrase = {
            phrase: normTrigger,
            scenarioId: scenario.id,
            wordCount: words.length,
            length: normTrigger.length,
            isTrigger: true
          };
          const existing = this.phraseMap.get(normTrigger);
          if (!existing || isCore || item.wordCount > existing.wordCount) {
            this.phraseMap.set(normTrigger, item);
          }
        }
      }

      // Index Aliases
      for (const alias of scenario.aliases || []) {
        const normAlias = PersianNormalizer.normalize(alias);
        if (normAlias && CoachIndex.isSubstantivePhrase(normAlias)) {
          const aliasList = this.exactAliasMap.get(normAlias) || [];
          aliasList.push(scenario.id);
          this.exactAliasMap.set(normAlias, aliasList);

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
   * Lookup scenario by exact normalized trigger or alias match (returns premier match)
   */
  findExact(normalizedQuery: string): { scenario: CoachScenario; isTrigger: boolean } | null {
    const matches = this.findExactMatches(normalizedQuery);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Lookup all scenarios matching exact normalized trigger or alias
   */
  findExactMatches(normalizedQuery: string): Array<{ scenario: CoachScenario; isTrigger: boolean }> {
    const results: Array<{ scenario: CoachScenario; isTrigger: boolean }> = [];
    const seen = new Set<string>();

    const triggerScIds = this.exactTriggerMap.get(normalizedQuery);
    if (triggerScIds) {
      for (const scId of triggerScIds) {
        if (!seen.has(scId)) {
          seen.add(scId);
          const sc = this.scenarioMap.get(scId);
          if (sc) results.push({ scenario: sc, isTrigger: true });
        }
      }
    }

    const aliasScIds = this.exactAliasMap.get(normalizedQuery);
    if (aliasScIds) {
      for (const scId of aliasScIds) {
        if (!seen.has(scId)) {
          seen.add(scId);
          const sc = this.scenarioMap.get(scId);
          if (sc) results.push({ scenario: sc, isTrigger: false });
        }
      }
    }

    return results;
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
