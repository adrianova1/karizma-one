import { CoachIndex } from './CoachIndex.js';
import { PersianNormalizer } from './PersianNormalizer.js';
import { CoachScenario, ScenarioMatchCandidate, MatchScoreBreakdown } from './CoachTypes.js';

export class QueryMatcher {
  private index: CoachIndex;

  constructor(index: CoachIndex) {
    this.index = index;
  }

  /**
   * Layered match pipeline:
   * 1. Exact trigger/alias match
   * 2. Phrase containment (longest substring)
   * 3. Trigram similarity over triggers and aliases
   * 4. BM25 / token overlap over inverted index
   */
  public match(rawQuery: string): ScenarioMatchCandidate[] {
    if (!rawQuery || typeof rawQuery !== 'string') {
      return [];
    }

    const { coreQuery, originalQuery } = PersianNormalizer.extractCoreQuery(rawQuery);
    const normCore = PersianNormalizer.normalize(coreQuery);
    const normOriginal = PersianNormalizer.normalize(originalQuery);

    const candidatesMap = new Map<string, ScenarioMatchCandidate>();

    // 1. Exact Trigger or Alias Matching
    const exactQueryVariants = [normCore, normOriginal].filter(Boolean);
    for (const q of exactQueryVariants) {
      const exactMatches = this.index.findExactMatches(q);
      for (const m of exactMatches) {
        if (!candidatesMap.has(m.scenario.id)) {
          const breakdown: MatchScoreBreakdown = {
            exactTriggerScore: m.isTrigger ? 10.0 : 8.0,
            phraseScore: 0,
            aliasScore: m.isTrigger ? 0 : 8.0,
            trigramSimilarityScore: 1.0,
            tokenOverlapScore: 5.0,
            keywordScore: 3.0,
            categoryScore: 2.0,
            penaltyScore: 0,
            totalScore: m.isTrigger ? 15.0 : 13.0
          };
          candidatesMap.set(m.scenario.id, {
            scenario: m.scenario,
            confidenceScore: 98,
            scoreBreakdown: breakdown,
            matchedBy: 'exact_trigger'
          });
        }
      }
    }

    // 2. Phrase Containment Matching (longest substantive phrase)
    for (const q of exactQueryVariants) {
      const contained = this.index.findContainedPhrase(q);
      if (contained && !candidatesMap.has(contained.scenario.id)) {
        const breakdown: MatchScoreBreakdown = {
          exactTriggerScore: 0,
          phraseScore: contained.phrase.length >= 8 ? 8.0 : 5.0,
          aliasScore: 0,
          trigramSimilarityScore: 0.8,
          tokenOverlapScore: 4.0,
          keywordScore: 2.0,
          categoryScore: 1.0,
          penaltyScore: 0,
          totalScore: 10.0
        };
        candidatesMap.set(contained.scenario.id, {
          scenario: contained.scenario,
          confidenceScore: 90,
          scoreBreakdown: breakdown,
          matchedBy: 'phrase_containment'
        });
      }
    }

    // 3. Token Overlap & Trigram Similarity Candidates
    const queryTokens = PersianNormalizer.tokenize(normCore.length >= 3 ? normCore : normOriginal);
    const tokenCandidates = this.index.getCandidatesForTokens(queryTokens);

    for (const sc of tokenCandidates) {
      if (candidatesMap.has(sc.id)) continue;

      // Compute token overlap ratio
      const scText = [sc.title, sc.situation, ...(sc.triggers || []), ...(sc.keywords || [])].join(' ');
      const scTokens = new Set(PersianNormalizer.tokenize(scText));

      let overlapCount = 0;
      for (const t of queryTokens) {
        if (scTokens.has(t)) overlapCount++;
      }
      const tokenRatio = queryTokens.length > 0 ? overlapCount / queryTokens.length : 0;

      // Compute best trigram similarity across triggers
      let maxTrigram = 0;
      for (const trig of sc.triggers || []) {
        const sim = PersianNormalizer.computeTrigramSimilarity(normCore, trig);
        if (sim > maxTrigram) maxTrigram = sim;
      }
      for (const al of sc.aliases || []) {
        const sim = PersianNormalizer.computeTrigramSimilarity(normCore, al);
        if (sim > maxTrigram) maxTrigram = sim;
      }

      const totalScore = (tokenRatio * 6.0) + (maxTrigram * 5.0);
      if (totalScore >= 3.0 || maxTrigram >= 0.55 || tokenRatio >= 0.6) {
        const confidence = Math.min(95, Math.round((maxTrigram * 50) + (tokenRatio * 45)));
        candidatesMap.set(sc.id, {
          scenario: sc,
          confidenceScore: Math.max(confidence, 45),
          scoreBreakdown: {
            exactTriggerScore: 0,
            phraseScore: 0,
            aliasScore: 0,
            trigramSimilarityScore: Number(maxTrigram.toFixed(2)),
            tokenOverlapScore: Number((tokenRatio * 5.0).toFixed(2)),
            keywordScore: 2.0,
            categoryScore: 1.0,
            penaltyScore: 0,
            totalScore: Number(totalScore.toFixed(2))
          },
          matchedBy: maxTrigram >= 0.6 ? 'alias_trigram' : 'bm25_token'
        });
      }
    }

    return Array.from(candidatesMap.values());
  }
}
