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

  private static KNOWN_BOILERPLATES = [
    'زیبایی و جذابیت واقعی در نگاه و کلام تحسین‌کننده شماست',
    'انرژی مثبت و بیان سنجیده‌ت توجه من رو جلب کرد',
    'گفتگوی حضوری همیشه حس و حال واقعی‌تری داره',
    'کیفیت و تمرکز کامل روی مکالمه برام اولویت داره به سرعت پاسخگویی',
    'سلیقه و نگاه دقیق شما در کلامت کاملاً پیداست',
    'ارتباط با ارزش نیاز به حضور ذهن کامل داره',
    'عمیق بودن گفتگو برام مهم‌تر از شتاب در پاسخ دادنه',
    'پاسخهای متناسب',
    'علت این تست',
    'علت تست',
    'اشتباه بزرگ',
    'مرحله قرار اول به بعد'
  ];

  /**
   * Calculates a richness score for a scenario based on:
   * 1. 5-tone structure completeness
   * 2. Canonical / Core foundation status
   * 3. Authentic non-boilerplate dialogue
   * 4. Usable dialogue candidates pool size (>= 3)
   * 5. Presence of technique, tips, bodyLanguage, and nextMove metadata
   */
  static getRichnessScore(scenario: CoachScenario): number {
    if (!scenario) return 0;

    let distinctCount = 0;
    let hasBoilerplate = false;

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
          for (const bp of RankingEngine.KNOWN_BOILERPLATES) {
            if (val.includes(bp)) {
              hasBoilerplate = true;
              break;
            }
          }
        }
      }
      distinctCount = seenResp.size;
    }

    let richness = 0;

    // 1. Structure completeness (5 tones)
    if (distinctCount >= 5) {
      richness += 25.0;
    } else if (distinctCount >= 4) {
      richness += 18.0;
    } else if (distinctCount >= 3) {
      richness += 10.0;
    } else if (distinctCount >= 2) {
      richness += 3.0;
    } else if (distinctCount <= 1) {
      richness -= 10.0;
    }

    // 2. Penalize test boilerplate and truncated titles
    if (hasBoilerplate) {
      richness -= 35.0;
    }
    if (scenario.title && (scenario.title.endsWith(' خی') || scenario.title.endsWith('...'))) {
      richness -= 15.0;
    }
    if (scenario.situation && scenario.situation.includes('مگه نه؟')) {
      richness -= 10.0;
    }

    // 3. Foundation Core Status
    const isCore = ['scen_1', 'scen_2', 'scen_3', 'scen_4', 'scen_5', 'scen_6', 'scen_7', 'scen_8', 'scen_intimacy_request_1', 'scen_playful_gift_teasing_1', 'scen_distress_hopelessness_1'].includes(scenario.id);
    if (isCore) {
      richness += 20.0;
    }

    // 4. Usable dialogue candidate pool size
    const candidatesList = ToneDistributor.extractAllCandidates(scenario, null);
    if (candidatesList.length >= 4) {
      richness += 4.0;
    } else if (candidatesList.length >= 3) {
      richness += 2.0;
    }

    // 5. Metadata completeness
    if (scenario.technique && scenario.technique.trim().length > 3) richness += 1.0;
    if (scenario.tips && scenario.tips.trim().length > 3) richness += 1.0;
    if (scenario.bodyLanguage && scenario.bodyLanguage.trim().length > 3) richness += 1.0;
    if (scenario.nextMove && scenario.nextMove.trim().length > 3) richness += 1.0;

    return Number(richness.toFixed(2));
  }

  /**
   * Evaluates candidates, applies richness boosting to prioritize comprehensive scenarios,
   * performs rotation across high-scoring peers, and decides whether to return top candidate or fallback.
   */
  static rankAndSelect(candidates: ScenarioMatchCandidate[], rawQuery: string, rotationIndex: number = 0): RankingResult {
    if (candidates.length > 0) {
      // Re-rank candidates taking richness and dialogue authenticity into account
      const scoredCandidates = candidates.map(candidate => {
        const richness = this.getRichnessScore(candidate.scenario);
        const matchScore = candidate.scoreBreakdown.totalScore;
        
        let finalRankScore = matchScore + (richness * 1.5);
        
        // Exact trigger match retains decisive weight
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

      // Candidate rotation among top cluster
      const topScore = scoredCandidates[0].finalRankScore;
      const topCluster = scoredCandidates.filter(c => 
        c.finalRankScore >= topScore * 0.88 ||
        (c.candidate.scoreBreakdown.exactTriggerScore > 0 && c.finalRankScore >= topScore - 25)
      );

      const chosenIndex = topCluster.length > 1 ? (Math.abs(rotationIndex) % topCluster.length) : 0;
      const chosen = topCluster[chosenIndex];
      const topCandidate = chosen.candidate;

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

