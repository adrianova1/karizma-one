import { ScenarioMatchCandidate, CoachFallbackItem, CoachScenario } from './CoachTypes.js';
import { CoachLoader } from './CoachLoader.js';
import { PersianNormalizer } from './PersianNormalizer.js';
import { ToneDistributor } from './ToneDistributor.js';

export interface RankingResult {
  matchedScenario: CoachScenario | null;
  fallbackItem: CoachFallbackItem | null;
  confidenceScore: number;
  isFallback: boolean;
  matchType: string;
}

export class RankingEngine {
  private static MIN_CONFIDENCE_THRESHOLD = 40;

  /**
   * Calculates a richness score for a scenario based on:
   * 1. 5-tone structure completeness
   * 2. Canonical / Featured status
   * 3. Usable dialogue candidates pool size (>= 3)
   * 4. Presence of technique, tips, bodyLanguage, and nextMove metadata
   */
  static getRichnessScore(scenario: CoachScenario): number {
    if (!scenario) return 0;

    let distinctCount = 0;
    if (scenario.responses) {
      const seenResp = new Set<string>();
      const toneKeys = [
        'direct', 'friendly', 'charismatic', 'emotional', 'funny',
        'tone_1', 'tone_2', 'tone_3', 'tone_4', 'tone_5',
        'psychology', 'confident', 'mature', 'mysterious'
      ];
      for (const k of toneKeys) {
        const val = (scenario.responses as any)[k];
        if (typeof val === 'string' && val.trim().length >= 3) {
          const clean = ToneDistributor.cleanDialogue(val);
          if (clean.length >= 3 && !seenResp.has(clean)) {
            seenResp.add(clean);
          }
        }
      }
      distinctCount = seenResp.size;
    }

    let richness = 0;

    // 1. Structure completeness (5 tones)
    if (distinctCount >= 5) {
      richness += 5.0;
    } else if (distinctCount >= 4) {
      richness += 4.0;
    } else if (distinctCount >= 3) {
      richness += 3.0;
    } else if (distinctCount >= 2) {
      richness += 1.5;
    } else if (distinctCount === 1) {
      richness += 0.5;
    }

    // 2. Canonical status
    const isCanonical = scenario.id.startsWith('scen_');
    if (isCanonical) {
      richness += 3.0;
    }

    // 3. Dialogue candidate pool size
    const candidatesList = ToneDistributor.extractAllCandidates(scenario, null);
    if (candidatesList.length >= 4) {
      richness += 2.0;
    } else if (candidatesList.length >= 3) {
      richness += 1.0;
    }

    // 4. Metadata completeness
    if (scenario.technique && scenario.technique.trim().length > 3) richness += 0.5;
    if (scenario.tips && scenario.tips.trim().length > 3) richness += 0.5;
    if (scenario.bodyLanguage && scenario.bodyLanguage.trim().length > 3) richness += 0.5;
    if (scenario.nextMove && scenario.nextMove.trim().length > 3) richness += 0.5;

    return Number(richness.toFixed(2));
  }

  /**
   * Evaluates candidates, applies richness boosting to prioritize comprehensive scenarios,
   * and decides whether to return top candidate or fallback.
   */
  static rankAndSelect(candidates: ScenarioMatchCandidate[], rawQuery: string): RankingResult {
    if (candidates.length > 0) {
      // Re-rank candidates taking richness into account
      const scoredCandidates = candidates.map(candidate => {
        const richness = this.getRichnessScore(candidate.scenario);
        const matchScore = candidate.scoreBreakdown.totalScore;
        
        // Boost factor: gives rich scenarios preference over single-reply scenarios with similar relevance
        let finalRankScore = matchScore + (richness * 1.5);
        
        // Exact trigger match retains significant weight
        if (candidate.matchedBy === 'exact_trigger' || candidate.scoreBreakdown.exactTriggerScore > 0) {
          finalRankScore += 50.0;
        }

        return {
          candidate,
          richness,
          finalRankScore
        };
      });

      scoredCandidates.sort((a, b) => b.finalRankScore - a.finalRankScore);

      const top = scoredCandidates[0];
      const topCandidate = top.candidate;

      const isHighConfidence =
        topCandidate.matchedBy === 'exact_trigger' ||
        topCandidate.scoreBreakdown.exactTriggerScore > 0 ||
        topCandidate.scoreBreakdown.phraseScore >= 4.0 ||
        topCandidate.scoreBreakdown.aliasScore >= 3.0 ||
        topCandidate.scoreBreakdown.keywordScore >= 3.0 ||
        topCandidate.scoreBreakdown.totalScore >= 3.0 ||
        (topCandidate.confidenceScore >= this.MIN_CONFIDENCE_THRESHOLD &&
          (topCandidate.scoreBreakdown.keywordScore >= 1.5 ||
           topCandidate.scoreBreakdown.tokenOverlapScore >= 1.5 ||
           topCandidate.scoreBreakdown.trigramSimilarityScore >= 0.35));

      if (isHighConfidence) {
        return {
          matchedScenario: topCandidate.scenario,
          fallbackItem: null,
          confidenceScore: Math.max(topCandidate.confidenceScore, 80),
          isFallback: false,
          matchType: topCandidate.matchedBy
        };
      }
    }

    // Select suitable Fallback matrix
    const fallbackItem = this.selectFallbackMatrix(rawQuery);
    return {
      matchedScenario: null,
      fallbackItem,
      confidenceScore: 75,
      isFallback: true,
      matchType: 'fallback_matrix'
    };
  }

  /**
   * Selects best matching fallback matrix based on query keywords
   */
  private static selectFallbackMatrix(rawQuery: string): CoachFallbackItem {
    const fallbacks = CoachLoader.getFallbacks();
    const normalizedQuery = PersianNormalizer.normalize(rawQuery);
    const queryTokens = PersianNormalizer.tokenize(rawQuery);
    const queryTokenSet = new Set(queryTokens);

    for (const item of fallbacks) {
      for (const trig of item.triggers || []) {
        const normTrig = PersianNormalizer.normalize(trig);
        if (!normTrig) continue;

        // Exact match or token match or word-bounded phrase match
        if (
          normalizedQuery === normTrig ||
          queryTokenSet.has(normTrig) ||
          normalizedQuery.startsWith(normTrig + ' ') ||
          normalizedQuery.endsWith(' ' + normTrig) ||
          normalizedQuery.includes(' ' + normTrig + ' ')
        ) {
          return item;
        }
      }
    }

    // Default fallback if no topic trigger matched
    const defaultFallback = fallbacks.find(f => f.topic === 'general_default') || fallbacks[0];
    return defaultFallback;
  }
}

