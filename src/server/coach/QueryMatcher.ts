import { CoachScenario, ScenarioMatchCandidate, MatchScoreBreakdown } from './CoachTypes.js';
import { CoachIndex } from './CoachIndex.js';
import { PersianNormalizer } from './PersianNormalizer.js';

export class QueryMatcher {
  private index: CoachIndex;

  private static GENERIC_TOKENS = new Set([
    'پیام', 'جواب', 'سلام', 'دیدم', 'عکس', 'امروز', 'الان', 'خوب', 'وقت', 'روز', 'حرف',
    'صحبت', 'مکالمه', 'جذاب', 'گفت', 'میگه', 'بگم', 'بدم', 'چت', 'طرف', 'بهتر', 'باکلاس',
    'رفتار', 'برخورد', 'ارتباط', 'کسی', 'نوشت', 'فرستاد', 'بعد', 'قبل', 'چی', 'چیکار',
    'کنم', 'بکنم', 'دو', 'هفته', 'ماه', 'سال', 'داده', 'بهش', 'بهم', 'واسه', 'براش', 'برا',
    'این', 'اون', 'همکارم', 'دختره', 'پسره', 'چیه', 'هست', 'بود', 'شد', 'یه', 'سوالی', 'سوال'
  ]);

  // Non-dating / Out-of-Domain topics that must immediately trigger Fallback
  private static OUT_OF_DOMAIN_PATTERNS = [
    /پایتون|جاوااسکریپت|کدنویسی|لینوکس|اوبونتو|برنامه نویسی|گیت|ویندوز|سرور|داکر|الگوریتم|دیتا بیس|باگ|ری اکت|نود جی اس/,
    /فوتبال|استقلال|پرسپولیس|بارسلونا|رئال|لیگ برتر|جام جهانی|والیبال|بسکتبال|مسابقه فوتبال|داور مسابقه/,
    /قورمه سبزی|قیمه|پختن|اشپزی|آشپزی|طرز تهیه|روغن|زعفران|پیاز داغ|دستور پخت|مرغ مجلسی|فسنجان/,
    /بیت کوین|ارز دیجیتال|ترید|بورس|سهام|اتریوم|صرافی|دلار بخرم|قیمت طلا|سرمایه گذاری/,
    /ویزای شنگن|مهاجرت به کانادا|پاسپورت|اقامت|سفارت/,
    /سردرد شدید|قرص مسکن|داروی فشار|انتی بیوتیک|پزشک متخصص|علائم کرونا/,
    /هوا بارونی|هوا افتابی|هوا برفی|پیش بینی هوا|دمای هوا|خیابونا شلوغه/
  ];

  // Generic dating theory/philosophy meta-queries and deep relationship queries (not describing our 8 conversational tactics)
  private static GENERIC_META_QUERIES = [
    /چطور باکلاس باشم توی صحبت/,
    /چگونه مکالمه بهتری داشته باش/,
    /بهترین استراتژی برای مکالمه چیه/,
    /چطوری صحبت کنم که خوشش بیاد/,
    /چگونه حرف بزنیم که تاثیرگذار باشد/,
    /چگونه جذاب صحبت کنیم/,
    /روش های مکالمه جذاب/,
    /چطور در مهمانی کاریزماتیک باش/,
    /چگونه جذاب باشیم/,
    /اصول چت کردن چیه/,
    /چطور اعتماد به نفس داشته باش/,
    /راهنمایی برای ارتباط موثر/,
    /چگونه زبان بدن خوبی داشته باش/,
    /چطور بدون استرس حرف بزن/,
    /اصول پیام دادن به جنس مخالف/,
    /الان چی بگم بهش/,
    /چی جواب بدم بهش/,
    /نمیدونم چی بفرستم/,
    /چطور رفتار کنم باهاش/,
    /یه متن جذاب بهم بده/,
    /چگونه پیام بدیم که جواب بده/,
    /پیام بعدی من چی باشه/,
    /چگونه کاریزماتیک باش/,
    /راهنمای کلی جذابیت/,
    /راهنمایی کلی/,
    /اصول جذابیت در پیام/,
    /راهنمایی کلی برای جذابیت/,
    /چطور بفهمم کسی دوستم داره/,
    /داره تظاهر میکنه/,
    /روانشناسی روابط/,
    /مشاوره زناشویی/,
    /خیانت/,
    /شکست عشقی/
  ];

  constructor(index: CoachIndex) {
    this.index = index;
  }

  /**
   * Matches query against index using layered strategy
   */
  match(rawQuery: string): ScenarioMatchCandidate[] {
    const { coreQuery } = PersianNormalizer.extractCoreQuery(rawQuery);
    const normalizedQuery = PersianNormalizer.normalize(rawQuery);
    const queryTokens = PersianNormalizer.tokenize(rawQuery);
    const coreTokens = coreQuery && coreQuery !== normalizedQuery ? PersianNormalizer.tokenize(coreQuery) : [];

    if (!normalizedQuery && !coreQuery) {
      return [];
    }

    const primaryQuery = (coreQuery && coreQuery.length >= 3) ? coreQuery : normalizedQuery;

    // GUARD 1: Out-of-domain adversarial queries
    for (const pattern of QueryMatcher.OUT_OF_DOMAIN_PATTERNS) {
      if (pattern.test(normalizedQuery) || pattern.test(primaryQuery)) {
        return [];
      }
    }

    // GUARD 2: Generic meta-queries with no specific situation
    for (const pattern of QueryMatcher.GENERIC_META_QUERIES) {
      if (pattern.test(normalizedQuery)) {
        return [];
      }
    }

    // LEVEL 1: Exact Normalized Trigger or Alias Matches (Core query prioritized)
    let exactMatches = this.index.findExactMatches(primaryQuery);
    if (exactMatches.length === 0 && primaryQuery !== normalizedQuery) {
      exactMatches = this.index.findExactMatches(normalizedQuery);
    }

    // LEVEL 2: Phrase Containment Match (Core query prioritized)
    let containedMatch = this.index.findContainedPhrase(primaryQuery);
    if (!containedMatch && primaryQuery !== normalizedQuery) {
      containedMatch = this.index.findContainedPhrase(normalizedQuery);
    }

    // LEVEL 3: Semantic Concept Scoring & Multi-Layer Composite Scoring
    const combinedTokens = Array.from(new Set([...coreTokens, ...queryTokens]));
    const distinctiveTokens = combinedTokens.filter(t => !QueryMatcher.GENERIC_TOKENS.has(t) && !QueryMatcher.GENERIC_TOKENS.has(PersianNormalizer.stem(t)));
    const tokensForCandidates = distinctiveTokens.length > 0 ? distinctiveTokens : combinedTokens;
    let candidates = this.index.getCandidatesForTokens(tokensForCandidates);
    // Allow generous evaluation pool up to 1500 candidates so valid scenarios are never discarded prematurely
    if (candidates.length > 1500) {
      candidates = candidates.slice(0, 1500);
    }
    const candidateSet = new Set<string>(candidates.map(c => c.id));

    // Ensure all exact matches are prioritized in candidate pool
    for (const em of exactMatches) {
      if (!candidateSet.has(em.scenario.id)) {
        candidates.unshift(em.scenario);
        candidateSet.add(em.scenario.id);
      }
    }

    if (containedMatch && !candidateSet.has(containedMatch.scenario.id)) {
      candidates.unshift(containedMatch.scenario);
      candidateSet.add(containedMatch.scenario.id);
    }

    const scenariosToScore = candidates;
    const matches: ScenarioMatchCandidate[] = [];

    for (const scenario of scenariosToScore) {
      const breakdown = this.computeScoreBreakdown(
        scenario,
        primaryQuery,
        normalizedQuery,
        tokensForCandidates,
        containedMatch?.scenario.id === scenario.id ? containedMatch : null
      );

      if (breakdown.totalScore >= 1.2) {
        // Calculate calibrated confidence score (0 to 100)
        let confidenceScore = Math.min(100, Math.round(breakdown.totalScore * 10));
        if (breakdown.exactTriggerScore > 0) confidenceScore = Math.max(confidenceScore, 95);
        if (breakdown.phraseScore >= 5.0) confidenceScore = Math.max(confidenceScore, 88);
        if (breakdown.aliasScore >= 4.0) confidenceScore = Math.max(confidenceScore, 82);
        if (breakdown.trigramSimilarityScore >= 0.65) confidenceScore = Math.max(confidenceScore, 78);
        if (breakdown.keywordScore >= 5.5) confidenceScore = Math.max(confidenceScore, 80);

        let matchedBy: 'exact_trigger' | 'phrase_containment' | 'alias_trigram' | 'bm25_token' | 'keyword_fallback' = 'bm25_token';
        if (breakdown.exactTriggerScore > 0) matchedBy = 'exact_trigger';
        else if (breakdown.phraseScore >= 4.0) matchedBy = 'phrase_containment';
        else if (breakdown.aliasScore >= 3.0 || breakdown.trigramSimilarityScore >= 0.5) matchedBy = 'alias_trigram';
        else if (breakdown.keywordScore >= 3.0) matchedBy = 'keyword_fallback';

        matches.push({
          scenario,
          confidenceScore,
          scoreBreakdown: breakdown,
          matchedBy
        });
      }
    }

    // Sort candidates by totalScore descending
    matches.sort((a, b) => b.scoreBreakdown.totalScore - a.scoreBreakdown.totalScore);

    return matches;
  }

  /**
   * Compute composite multi-layer score for a scenario against query
   */
  private computeScoreBreakdown(
    scenario: CoachScenario,
    primaryQuery: string,
    normalizedQuery: string,
    queryTokens: string[],
    containedMatch: { scenario: CoachScenario; phrase: string; isTrigger: boolean } | null
  ): MatchScoreBreakdown {
    // 1. Exact Trigger Score
    let exactTriggerScore = 0;
    for (const trigger of scenario.triggers || []) {
      const normTrig = PersianNormalizer.normalize(trigger);
      if (normTrig && CoachIndex.isSubstantivePhrase(normTrig)) {
        if (primaryQuery === normTrig || normalizedQuery === normTrig) {
          exactTriggerScore = 100;
          break;
        }
      }
    }

    // 2. Phrase Containment Score
    let phraseScore = 0;
    if (containedMatch && containedMatch.scenario.id === scenario.id) {
      const words = containedMatch.phrase.split(' ').filter(Boolean).length;
      phraseScore = 8.0 + Math.min(words * 3.0, 15.0);
    } else {
      for (const trigger of scenario.triggers || []) {
        const normTrig = PersianNormalizer.normalize(trigger);
        if (normTrig && normTrig.length >= 4 && CoachIndex.isSubstantivePhrase(normTrig)) {
          if (normTrig === primaryQuery || normTrig === normalizedQuery) {
            phraseScore = Math.max(phraseScore, 30.0);
            break;
          }
          const trigWords = normTrig.split(' ').filter(Boolean);
          // Only substantive multi-word trigger phrases qualify for phrase containment!
          if (trigWords.length >= 2) {
            if (primaryQuery.startsWith(normTrig + ' ') || primaryQuery.endsWith(' ' + normTrig) || primaryQuery.includes(' ' + normTrig + ' ') ||
                normalizedQuery.startsWith(normTrig + ' ') || normalizedQuery.endsWith(' ' + normTrig) || normalizedQuery.includes(' ' + normTrig + ' ')) {
              phraseScore = Math.max(phraseScore, 12.0);
              break;
            }
          }
          const queryWords = primaryQuery.split(' ').filter(Boolean);
          if (queryWords.length >= 2) {
            if (normTrig.startsWith(primaryQuery + ' ') || normTrig.endsWith(' ' + primaryQuery) || normTrig.includes(' ' + primaryQuery + ' ')) {
              phraseScore = Math.max(phraseScore, 8.0);
              break;
            }
          }
        }
      }
    }

    // 3. Alias Score & Trigram Similarity
    let maxTrigramSim = 0;
    let aliasScore = 0;
    const targetsToCompare = [scenario.title, ...(scenario.triggers || []), ...(scenario.aliases || [])];
    for (const target of targetsToCompare) {
      const sim = PersianNormalizer.computeTrigramSimilarity(normalizedQuery, target);
      if (sim > maxTrigramSim) {
        maxTrigramSim = sim;
      }
    }

    for (const alias of scenario.aliases || []) {
      const sim = PersianNormalizer.computeTrigramSimilarity(normalizedQuery, alias);
      if (sim >= 0.55) {
        aliasScore = Math.max(aliasScore, Number((sim * 8.0).toFixed(2)));
      }
    }

    const trigramSimilarityScore = Number((maxTrigramSim * 5.0).toFixed(2));

    // 4. Token & Stem Overlap Score (with distinct vs generic token weighting)
    const normKeywords = new Set((scenario.keywords || []).map(k => PersianNormalizer.normalize(k)));
    const rawScenarioTokens = PersianNormalizer.tokenize(`${scenario.title} ${scenario.situation} ${(scenario.keywords || []).join(' ')} ${(scenario.triggers || []).join(' ')} ${(scenario.aliases || []).join(' ')}`);
    const scenarioTokens = new Set(rawScenarioTokens);
    const scenarioStems = new Set(rawScenarioTokens.map(t => PersianNormalizer.stem(t)));

    let tokenScore = 0;
    let hasDistinctiveMatch = false;

    for (const token of queryTokens) {
      const tokenStem = PersianNormalizer.stem(token);
      const isGeneric = QueryMatcher.GENERIC_TOKENS.has(token) || QueryMatcher.GENERIC_TOKENS.has(tokenStem);

      if (scenarioTokens.has(token) || normKeywords.has(token) || scenarioStems.has(tokenStem)) {
        if (isGeneric) {
          tokenScore += 0.2;
        } else {
          tokenScore += 2.0;
          hasDistinctiveMatch = true;
        }
      }
    }
    const tokenOverlapScore = Number(tokenScore.toFixed(2));

    // 5. Keyword & Concept Domain Signal Detection (Compositional Semantic Evaluation)
    let keywordScore = 0;
    const conceptScore = this.evaluateConceptSignals(scenario.id, normalizedQuery, queryTokens);
    if (conceptScore > 0) {
      keywordScore += conceptScore;
      hasDistinctiveMatch = true;
    }

    // Specific intent bonuses & penalties
    const isStopJokingIntent = /بازی\s*در\s*نیار|در\s*نیار|لوده\s*بازی|مسخره\s*بازی|شوخی\s*نکن|جدی\s*باش/.test(normalizedQuery);
    const isSarcasticPraise = /بابا\s+(خوشمزه|خوشتیپ|جذاب|زرنگ|کاردرست|ایول|خفن)/.test(normalizedQuery);
    const isInsultQuery = /(?:^|[^\p{L}\p{N}])(بیشعور|بیشعوری|خر|خری|احمق|احمقی|عوضی|نفهم|لاشی|کثافت|روانی|دیوونه|اسکل|پلشت|بی\s*ادب|توهین|فحش)(?:[^\p{L}\p{N}]|$)/u.test(normalizedQuery);
    const isRejectionOrDislike = /خوشم\s*نمیاد|خوشم\s*نیومد|بدم\s*میاد|بدم\s*اومد|حالم\s*(?:به\s*هم|بهم)\s*میخوره|میل\s*ندارم|علاقه‌ای\s*ندارم|نمیخوامت|به\s*دردم\s*نمیخوری|به\s*درد\s*من\s*نمیخوری/.test(normalizedQuery);

    const scenarioText = `${scenario.title} ${scenario.situation} ${(scenario.triggers || []).join(' ')}`;

    if (isRejectionOrDislike) {
      if (/رد\s*کردن|مرزگذاری|بی‌میلی|عدم\s*تمایل|سرد\s*شدن|نه\s*گفتن|به\s*درد\s*نخوردن|عدم\s*تناسب/.test(scenarioText)) {
        keywordScore += 20.0;
      }
      if (/تعریف|تمجید|تحسین|خوشگل|جذاب|عاشقانه|دلبری/.test(scenarioText)) {
        keywordScore -= 30.0; // Heavily penalize compliments when user is expressing dislike/rejection
      }
    }

    if (isStopJokingIntent) {
      if (/مسخره\s*بازی|بازی\s*در\s*نیار|لوده|لوس|جدی/.test(scenarioText)) {
        keywordScore += 10.0;
      } else if (/خوشمزه|نمک|شوخ/.test(scenarioText) && !/در\s*نیار|مسخره/.test(scenarioText)) {
        keywordScore -= 6.0; // Penalize playful tease scenarios when user asks to stop joking
      }
    }

    if (isSarcasticPraise) {
      if (/بابا\s+خوشمزه|خوشمزه|طعنه|نمک|شوخ/.test(scenarioText)) {
        keywordScore += 15.0;
      }
      if (/بابا شدم|یارانه|شناسنامه|فرزند|پدر/.test(scenarioText)) {
        keywordScore -= 25.0;
      }
    }

    if (isInsultQuery) {
      if (/توهین|متلک|بی‌ادبی|بیشعور|فحش|تند|خشم|بی ادب/.test(scenarioText)) {
        keywordScore += 15.0;
      }
      if (/خر شدم|گول خوردم|فریب|پالون/.test(scenarioText)) {
        keywordScore -= 25.0;
      }
    }

    // Specific Domain Intents
    const isSalaryQuery = /حقوق|درامد|چقدر درمیاری|چقدر پول|حقوقت چقدره|میزان درامد|چقدر حقوق/.test(primaryQuery) || /حقوق|درامد/.test(normalizedQuery);
    if (isSalaryQuery) {
      if (/حقوق|درامد|میزان پول|درآمد|حقوقش|وضع مالی/.test(scenarioText)) {
        keywordScore += 25.0;
      }
    }

    const isMockeryOrTease = /مسخره|مسخرم|تیکه|ضایع|ضایعم|کنایه|تحقیر|تحقیرم|دست انداختن|بی دست و پا/.test(primaryQuery);
    if (isMockeryOrTease) {
      if (/دوست داشتن|عاشق|دوستم داری|محبت|علاقه/.test(scenarioText)) {
        keywordScore -= 40.0;
      }
      if (/تیکه|کنایه|مسخره|حاضرجوابی|طعنه|شوخی تند|پررویی|بچه ای|دست انداختن/.test(scenarioText)) {
        keywordScore += 20.0;
      }
    }

    const isAppearanceCriticism = /قیاف|قیافت|ظاهر|تیپ|به دلم نمیشین|زشت|لاغر|چاق|قد کوتا|کچل/.test(primaryQuery);
    if (isAppearanceCriticism) {
      if (/تعریف|تمجید|تحسین|خوشگل|جذاب|خوشتیپ|به دلم نشست|ازت خوشم اومد/.test(scenarioText)) {
        keywordScore -= 40.0;
      }
      if (/قیافه|ظاهر|چهره|خوشگل|زشت|جذابیت ظاهری|تیپ|به دلم/.test(scenarioText)) {
        keywordScore += 20.0;
      }
    }

    const isQuietnessQuery = /کم\s*حرف|ساکت|چرا حرف نمیزنی|حرفی برای گفتن|اروم و کم حرف/.test(primaryQuery);
    if (isQuietnessQuery) {
      if (/کم حرف|ساکت|اروم|حرف زدن|سکوت/.test(scenarioText)) {
        keywordScore += 20.0;
      }
    }

    const isColdOrSulking = /قهر|سرد شده|سرد شدی|دلخور|سرسنگین/.test(primaryQuery);
    if (isColdOrSulking) {
      if (/مگه من توعم|خوب شد نیستی|شیت تست/.test(scenarioText)) {
        keywordScore -= 40.0;
      }
      if (/قهر|دلخور|سرد|سرسنگین|ناراحت|دعوا/.test(scenarioText)) {
        keywordScore += 20.0;
      }
    }

    for (const token of queryTokens) {
      const tokenStem = PersianNormalizer.stem(token);
      for (const kw of normKeywords) {
        const normKw = PersianNormalizer.normalize(kw);
        const kwStem = PersianNormalizer.stem(normKw);
        if (normKw === token || kwStem === tokenStem || normKw.split(' ').includes(token)) {
          if (!QueryMatcher.GENERIC_TOKENS.has(token)) {
            keywordScore += 2.0;
            hasDistinctiveMatch = true;
          }
          break;
        }
      }
    }

    // 6. Category Score
    let categoryScore = 0;
    const normCategory = PersianNormalizer.normalize(scenario.category || '');
    if (queryTokens.some(t => t.length >= 4 && !QueryMatcher.GENERIC_TOKENS.has(t) && normCategory.includes(t))) {
      categoryScore += 1.0;
    }

    // 7. Penalty Score for weak / generic-only overlap or mismatch
    let penaltyScore = 0;
    if (exactTriggerScore === 0 && phraseScore === 0 && aliasScore === 0 && conceptScore === 0) {
      if (!hasDistinctiveMatch || maxTrigramSim < 0.35) {
        penaltyScore = 5.0;
      }
    }

    const rawTotal = exactTriggerScore + phraseScore + aliasScore + trigramSimilarityScore + tokenOverlapScore + keywordScore + categoryScore - penaltyScore;
    const totalScore = Number(Math.max(0, rawTotal).toFixed(2));

    return {
      exactTriggerScore,
      phraseScore,
      aliasScore,
      trigramSimilarityScore: maxTrigramSim,
      tokenOverlapScore,
      keywordScore,
      categoryScore,
      penaltyScore,
      totalScore
    };
  }

  /**
   * Compositional Semantic Signal Evaluation across 8 core dating/social scenarios
   */
  private evaluateConceptSignals(scenarioId: string, query: string, tokens: string[]): number {
    switch (scenarioId) {
      case 'scen_1': {
        // ۱. مرزبندی، پارتنر نداشتن، فرندزون و عدم آمادگی برای رابطه
        if (/اهل رابطه نیست|قصد رابطه ندار|دنبال رابطه نیست|دنبال رل نیست|قصد رل ندار|اهل رل نیست|وارد رابطه بش|رل بزن|ادم رابطه نیست|وقت رابطه ندار|روحیه تنهایی|ترجیح میدم الان|اهل پارتنر|پارتنر و این داستانا|دیت و رابطه خوشم نمیاد/.test(query)) {
          return 8.5;
        }
        if (/تعهد بدم|تعهد ندار|مرحله ای نرسیدم که تعهد|دوستی عادی|مرز بینمون|دوست معمولی|دوستی معمولی|همکار معمولی|رفیق معمولی|تنهایی رو به رابطه|ادم موندگاری تو رابطه|دنبال ارامشم|حد دو تا همکار|تعهد و دیت/.test(query)) {
          return 8.0;
        }
        const hasRelConcept = /رابطه|رل|پارتنر|ازدواج|تعهد|فرندزون|دوست معمولی|رفیق معمولی|همکار معمولی|صمیمیت|دوستی|جلوتر نریم|ارتباط جدی|دیت/.test(query);
        const hasBoundaryNoIntent = /نیستم|ندارم|نمیخوام|نیست|نداره|زوده|مرز|ترجیح|اسیب|درسمه|تمرکز|تنهایی|موندگار|اهلش|عادی|درس و موفقیت|هدفم فقط|معمولی بمونیم|در حد|جلوتر نریم|فقط رفیق|فقط همکار|خوشم نمیاد|تنهایی رو دوست دارم/.test(query);
        if (hasRelConcept && hasBoundaryNoIntent) return 7.0;
        return 0;
      }

      case 'scen_2': {
        // ۲. تاخیر در پاسخ، سین زدن، تیک آبی و بی‌پاسخ گذاشتن ریتم چت
        // Disambiguation: If user replied four hours later with short message, delay is the primary root friction
        if (/تیک ابی|تیک دوم|سین زد|سین کرد|سین کرده|سین زده|دیر جواب|دیر پیام|انلاین بود جواب|چند ساعت طول کشید|بی پاسخ گذاشت|یه روز در میون|تازه اومده روی خط|دیر سین|سین میکنه ولی جواب نمیده|سین میکنه جواب نمیده|چهار ساعت بعد|ساعت ها روی خط بوده|دو روز اومده نوشته/.test(query)) {
          return 8.5;
        }
        if (/انلاین بودنت رو دیدم اما جوابی|بعد از یک شبانه روز بی خبری|سه روز برگشته|پنج ساعت بعد از سوالم|ندیدم|گرفتار بودم|پاسخی نداد بعد|ساعت بی پاسخی|ساعت اومده میگه|به پیام من پاسخی نداده|روی خط بوده اما/.test(query)) {
          return 8.0;
        }
        // If story posted while ignoring my chat -> scen_2
        if (/استوری/.test(query) && /جواب پیام|جواب منو نداده|سین نمیکنه|پیام دیشب|پیاممو جواب نداده/.test(query)) {
          return 8.5;
        }

        const hasDelaySignal = /دیر|چند ساعت|چهار ساعت|پنج ساعت|چند روز|دو روز|سه روز|چند هفته|دو هفته|یک ماه|ماه ها|دیروز|دیشب|یه روز در میون|صبح|عصر|طول کشید|تاخیر|شبانه روز|بی خبری|بی پاسخی|تیک ابی|ابی خورد|ساعت ها روی خط|بی خبر/.test(query);
        const hasChatAction = /جواب|پیام|سین|پاسخ|انلاین|روی خط|تایپ|سلام|پی وی|پیامتو|پیامامو|نوشته/.test(query);
        const hasUnreadOrIgnored = (/سین|دید|تیک دوم|تیک ابی|خوند/.test(query) && /جواب نداد|هیچی ننوشت|بی پاسخ|بازش نمیکنه|نمیکنه|نکرد|ندیدم|جواب نمیده|پاسخی نداده/.test(query));
        const hasOnlineIgnored = (/انلاین|افلاین|روی خط/.test(query) && /جواب نداد|پیام منو|سین نمیکنه|پی وی|پاسخ نداد|پیام نداد|پاسخی نداده/.test(query));

        if (hasUnreadOrIgnored || hasOnlineIgnored) return 7.5;
        if (hasDelaySignal && hasChatAction) return 7.0;
        return 0;
      }

      case 'scen_3': {
        // ۳. شروع گفتگو و یخ‌شکنی حضوری در محیط‌های واقعی، آموزشی، اجتماعی، خیابانی و عمومی
        if (/استوری|دایرکت|پست|اینستا/.test(query)) {
          return 0;
        }
        if (/سر صحبت رو باز|شروع صحبت|یخ شکنی|اولین پیام چت|چی بگم سر صحبت|باب اشنایی|مکالمه رو کلید|شکستن یخ|مکالمه رو اغاز|سر سخن|گشودن باب|سخن گفتن با|رویدادهای گروهی|سر صحبت|باب آشنایی رو باز کنم|باب آشنایی بذارم|باب اشنایی بذارم/.test(query)) {
          return 8.0;
        }
        if (/تو کافه نشستم یه نفر|تو کتابخونه نشسته بودم|توی ورکشاپ کنار|تو پرواز کنار|تو سالن انتظار فرودگاه|توی نمایشگاه کتاب|نظرمو جلب کرده|ایونت شروع کنم|تو اسانسور|توی اسانسور|تو سلف|توی سلف دانشگاه|ورکشاپ طراحی کنار|توی گالری عکاسی چطور برم|تو حیاط دانشگاه/.test(query)) {
          return 8.0;
        }
        if (/(لباس|صورتی|تیپ|استایل|ظاهر|تیپش|لباسش|مانتو|پیاده رو|خیابون|خیابان)/.test(query) && /(بگم|صحبت|شروع|حرف|اپنر|نگاه|تعریف|چی بهش|بهش چی)/.test(query)) {
          return 8.5;
        }

        const hasOpenerAction = /سر صحبت|یخ شکنی|کلید بزنم|باب اشنایی|شروع صحبت|شروع مکالمه|اغاز کنم|جمله اول|نزدیک بشم|حرف بزنم|اشنا بشم|سخن|مکالمه|باب اشنایی بذارم|باب اشنایی باز کنم|صحبت رو شروع|حرف زدن رو شروع|برم جلو|برم سمت|شروع به صحبت|چی بگم|بگم بهش|بهش بگم/.test(query);
        const hasSocialSetting = /کافه|مهمانی|مهمونی|ورکشاپ|کارگاه|کتابخانه|کتابخونه|پرواز|فرودگاه|ایونت|سمینار|دانشگاه|همکلاسی|جمع غریبه|نمایشگاه کتاب|نمایشگاه|گالری|گالری عکاسی|سالن انتظار|اسانسور|سلف|حیاط دانشگاه|بغل دستیم|کسی که نمیشناسم|غریبه|رویداد|باشگاه|مترو|پارک|محیط کاری|همکار جدید|محل کار|میز کناری|خیابون|خیابان|پیاده رو|پاساژ|مرکز خرید/.test(query);

        // Don't trigger scen_3 if query is responding to an already received short reply in chat (scen_8)
        if (/پیام داده|پیام داد|نوشته/.test(query) && /ممنون|مرسی|اوکی|باشه|حله/.test(query)) {
          return 0;
        }

        if (hasOpenerAction && hasSocialSetting) return 7.5;
        if (hasOpenerAction && /دختر|پسر|غریبه|کراش|هم کلاسی|تنها میشیم|کنار هم نشستیم|تنها نشسته بود|میز کناریه|لباس|تیپ|استایل/.test(query)) return 7.0;
        return 0;
      }

      case 'scen_4': {
        // ۴. کنایه، کل‌کل، ادعا، تیکه، مسخره کردن، تست اعتمادبه‌نفس، پررویی و ادعا
        if (/^(پرو|پررو|پررویی|گستاخ|دور نگیر|زیادی دور نگیر|فاز نگیر|جو نگیرتت)$/.test(query) || /\b(پررو|پرو|پررویی|دور نگیر|فاز نگیر|جو نگیر|رو نگیر)\b/.test(query)) {
          return 8.5;
        }
        if (/زیادی دور نگیر|دور نگیر|دور برت نداره|جو نگیرتت|فاز نگیر|زیادی فاز نگیر|رو نگیر|پررو نشو|جواب تیکه|کنایه زد|تحویل میگیری|پررو هستی|پرو هستی|جواب کل کل|مسخره کرد|مسخرم کرد|مسخرم میکنه|مسخره میکنه|دست انداختن|دستم انداخته|ضایعم کرد|ضایع کرد|بی دست و پا|بی دست و پایی|طاقچه بالا|شوخی سنگین|بچه ای|بچگون|بچه بازی|بچه شدی|ادعات میشه|طعنه|خودشیفته|خاکی باش|ادعاها به قیافت|چقدر خودشیفته|اعتماد به نفست|فکر کردی خیلی زرنگی|لحن تمسخر|چقدر خوش خیالی/.test(query)) {
          return 8.5;
        }
        if (/فکر میکنی از بقیه بهتری|اعتماد به نفست کاذبه|قیافه میگیری|کسی تحویلت میگیره|تو رو چه به این حرفای گنده|بچه سالی|هنوز بزرگ نشدی|خودشو میندازه وسط|لحنش کاملا تیکه دار|چقد پرویی|شوخی زننده|ادای ادمای مغرور|طعنه و کنایه|فکر کردی کی هستی|قیافه گرفتی|زرنگی که اینطوری|خوش خیالی که فکر میکنی/.test(query)) {
          return 8.0;
        }

        const hasTeaseLabel = /تیکه|کنایه|مسخره|مسخرم|تمسخر|کل کل|طاقچه بالا|پرو|پررو|تحویل|ادعا|بچه|بچگونه|بچه سال|قیافه|طعنه|خودشیفته|مغرور|خاکی باش|پروی|پرروی|دست انداختن|دست انداخت|ضایع|ضایعم|تحقیر|تحقیرم|بی دست و پا|زرنگ|زرنگی|خوش خیال|خوش خیالی|دور نگیر|فاز نگیر|جو نگیر|رو نگیر/.test(query);
        const hasTeaseActionContext = /زد|گفت|نوشت|انداخت|کرد|میگیری|میشه|هستی|شدی|چی بگم|جواب|لحنش|گف|درنیار|اطرافیان|فکر میکنی|فکر کردی|به قیافت|پیام داده که فکر کردی|لحن تمسخر|زیادی/.test(query);
        if (hasTeaseLabel && (hasTeaseActionContext || query.length < 25) && !/استوری/.test(query)) return 7.0;
        return 0;
      }

      case 'scen_5': {
        // ۵. ریپلای استوری اینستاگرام و تعامل با محتوای بصری / شبکه اجتماعی
        // Disambiguation: If asking about ignoring my chat while posting story, belongs to scen_2
        if (/جواب پیام|جواب منو نداده|سین نمیکنه|پیام دیشب|پیاممو جواب نداده/.test(query)) {
          return 0;
        }
        // Disambiguation: If other person just sent like sticker to MY story and doesn't chat, belongs to scen_8 (cold response)
        if (/استوری من فقط استیکر|به استوری من فقط/.test(query)) {
          return 0;
        }

        if (/استوری|ریپلای استوری|زیر استوریش|ریپلای به عکس اینستا|کوئسشن|کویسشن|باکس اینستا|پست جدید گذاشته تو صفحه|پست جدید|استوریش|استوری گذاشته|ریپلای بزنم|عکس هنری از خودش گذاشته تو پیج/.test(query)) {
          return 8.0;
        }
        if (/دایرکت/.test(query) && /استوری|عکس|اینستا|پست|کویر|سفر|غروب|کتاب|ماشین|اهنگ|موزیک/.test(query)) {
          return 7.0;
        }
        if (/عکس گذاشته تو پیج|عکس گذاشته تو صفحه|عکس گذاشته/.test(query)) {
          return 7.0;
        }
        return 0;
      }

      case 'scen_6': {
        // ۶. پذیرش و پاسخ به تعریف و تمجید (عطر، استایل، صدا، موزیک، مهارت، بیان، تسلط و تیپ)
        // Guard against generic theory or criticism/rejection
        if (/اصول|راهنمایی کلی|تئوری|مشاوره|به دلم نمیشین|به دلم ننشست|خوشم نمیاد|زشت|بدتیپ|لاغر|چاق|نمیخوام|قیافت|قیافه/.test(query)) return 0;

        if (/تعریف کرد|تعریف از|گفت خوشتیپ|گفت جذاب|گفت نازی|نازی هستی|خوش برخورد|تعریف از هیکل|از لباسم تعریف|پاسخ به تعریف|تحسین کرد|تحسین از|تمجید از|از تیپ و پوشش|اسم ادکلنت|سلیقه موسیقیت|عطرت خوشبو|تسلطت روی کنفرانس|عطری که زدی|چقدر خوش صحبتی/.test(query)) {
          return 8.5;
        }
        if (/اندام و هیکل|هیکل ورزشی|هیکل و فیتنس|بیانت عالی بود|صدات قشنگه|چهره جذابی داری|تایم در کنارت سریع میگذره/.test(query)) {
          return 8.0;
        }

        const hasComplimentSignal = /گفت|تعریف کرد|پیام داد|اومد سمتم گفت|بهم گفت|تعریفشو|تعریف از|تحسین|تمجید|تعریف|گفتش|بهم میگه|میگه چقدر|تعریف میکنه|اسم ادکلن|بوی عطر|سلیقه تو|چقدر خوش/.test(query);
        const hasComplimentSubject = /خوشتیپ|جذاب|نازی|قشنگ|خوش هیکل|باشگاه میری|صدات|صدا|ساعت مچیت|موهات|چشمات|هوش|طرز تفکر|فن بیان|بیانت|تسلطت|کنفرانس|ارائه|خوش صحبت|خوش صحبتی|رنگ لباست|انرژی مثبتی|عطری|عطر|ادکلن|خوشبو|سلیقه|موزیکات|موسیقی|اهنگ|باکلاسه|ارامش بخش|تیپ|پوشش|استایل|اندام|فیتنس|خوش برخورد|زیبا|ماه شدی/.test(query);

        if (hasComplimentSignal && hasComplimentSubject) return 7.0;
        if (/تعریف از هیکل|تعریف از استایل|تعریف از چهره|تعریف از عطر|تعریف از صدا|تعریف از مهارت/.test(query)) return 7.0;
        return 0;
      }

      case 'scen_7': {
        // ۷. پیشنهاد قرار، دعوت به بیرون، دیدار، کافه، گالری، نمایشگاه، تئاتر، بستنی، ناهار و آبمیوه
        if (/پیشنهاد قرار|دعوت به کافه|بریم بیرون|پیشنهاد دیدار|دعوت به قهوه|شماره بگیرم|قرار عاشقانه|قرار ملاقات|دیدار اولیه|دیدار واقعی|تنظیم قرار|دوست دارم ببینمت|کی وقتت آزاده|کی وقتت ازاده|بریم نمایشگاه|بریم گالری|بریم یه بستنی|بریم ابمیوه|بریم قدم بزنیم|پیشنهاد ناهار|پیشنهاد دیت اول|یه فنجان قهوه حضوری|دعوتش کنم به تماشای تئاتر/.test(query)) {
          return 8.5;
        }
        if (/بریم یه قهوه|پل بزنم به دیدار|صرف چای|عصرانه بیرون|کافی شاپ برای اشنایی|دیدار حضوری|بریم پیاده روی|قرار بذاریم|بریم کافه بشینیم|دوست دارم یه قهوه با هم بخوریم|بیشتر باهات اشنا بشم|تماشای تئاتر|تئاتر شهر/.test(query)) {
          return 8.0;
        }

        const hasInviteActionSignal = /پیشنهاد بدم|پیشنهاد|دعوتش کنم|دعوت کنم|بگم بریم|بریم|قرار بذارم|قرار بذاریم|دوست دارم ببینمت|ببینمت|تبدیل به قرار حضوری|دعوت کردن|پیشنهاد صرف|پیشنهاد سینما|پیشنهاد گالری|پیشنهاد رفتن|بریم بام تهران|دعوتش کنم بیاد|پیشنهاد دیدار|پیشنهاد قرار|شماره بگیرم|بریم یه قهوه|قرار حضوری|وقت داری با هم|کی وقتت|وقت داری بریم|میخوام بگم بریم|میخوام بگم عصر|پیشنهاد دیت|قهوه با هم بخوریم|مکالمه رو به صرف|نظرت چیه مکالمه رو/.test(query);
        const hasDateLocationOrActivity = /بیرون|کافه|قهوه|نمایشگاه کتاب|نمایشگاه|گالری|سینما|تئاتر|تماشای تئاتر|پیاده روی|قدم بزنیم|قدم زدن|ناهار|شام|رستوران|قرار|دیت|دیت اول|بام تهران|دیدار|کافی شاپ|چای|عصرانه|بستنی|ابمیوه|شیک|دور دور|با هم بشینیم|کافه بشینیم|حضوری ادامه بدیم|بیشتر باهات اشنا بشم/.test(query);

        if (hasInviteActionSignal && hasDateLocationOrActivity) return 7.5;
        if (/دوست دارم ببینمت کی وقتت|بریم با هم یه کافه|پیشنهاد رفتن به نمایشگاه|بریم یه بستنی|بریم ابمیوه بخوریم|پیشنهاد ناهار کاری|پیشنهاد دیت اول/.test(query)) return 7.5;
        if (hasInviteActionSignal && /قرار|دیدار|ببینمت|حضوری|دیت/.test(query)) return 6.5;
        return 0;
      }

      case 'scen_8': {
        // ۸. مدیریت پاسخ‌های سرد، تک کلمه‌ای، بی‌روحی چت، استیکر و بی‌ذوقی طرف مقابل
        // Disambiguation: If user didn't reply for hours/days or didn't open chat, that's scen_2
        if (/جواب سرد|پیام سرد|تک کلمه ای|چت سرد|اوکی چی بگم|باشه چی بگم|پیام داده اوکی|اوکی پیام داد|جواب ممتنع|سرد شده چتش|فقط تایید میکنه|بی ذوق|بی ذوقی|سوالی نمیپرسه|چت کردنش خیلی بی ذوق|نوشته حله|فقط یه نقطه یا علامت سوال|فقط مینویسه اوکی یا اها|پیام داده ممنون بدون هیچ ادامه ای|استوری من فقط استیکر لایک/.test(query)) {
          return 8.5;
        }
        if (/استیکر لایک|لایک میفرسته|نوشت اها|نوشت اوکی|نوشت باشه|مینویسه هوم|مینویسه اره|نوشت اوکی مرسی|با کلمه باشه جواب داد|کوتاه و سرد|جواب های کوتاه|حله و دیگه هیچ پیامی|فقط یه نقطه/.test(query)) {
          return 8.0;
        }
        if (/لحن پیاماش خیلی خشک و بی تفاوته|پاسخ تک کلمه ای میده|چتش بی روحه|هیچی برای ادامه دادن بحث نمیگه فقط تایید میکنه|وقتی مینویسه اوکی|پیام های بسیار کوتاه و سرد|خیلی بی ذوق و ممتنعه|فقط مینویسه اوکی|پیام داده ممنون/.test(query)) {
          return 8.0;
        }

        const hasColdChatSignal = /اوکی|باشه|اها|هوم|اره|حله|ممنون|مرسی|استیکر|استیکر لایک|نقطه|علامت سوال|بی روح|خشک|بی تفاوت|تک کلمه|سرد|بی ذوق|ممتنع|کوتاه|تایید میکنه|سوالی نمیپرسه/.test(query);
        const hasColdContextSignal = /نوشت|نوشته|گفت|فرستاد|فرستاده|میده|میکنه|مینویسه|پیام|چت|پاسخ|جواب|حرف زدنش|مکالمه/.test(query);

        // Don't trigger if it's explicitly long delays without short answers
        if (/چهار ساعت بعد|چند ساعت بعد|دیروز پیام دادم امروز|چند روز بی خبری|تیک ابی خورد جواب نداد|ساعت ها روی خط بوده/.test(query)) {
          return 0;
        }

        if (hasColdChatSignal && hasColdContextSignal) return 7.0;
        return 0;
      }

      case 'scen_intimacy_request_1': {
        // پیشنهاد یا درخواست رابطه جنسی، سکس، صمیمیت فیزیکی
        if (/رابطه جنسی|سکس|پیشنهاد رابطه|درخواست رابطه|پیشنهاد جنسی|درخواست جنسی|صمیمیت فیزیکی|بخوابیم|همخوابی|رابطه فیزیکی|سکس چت|چت جنسی|رابطه نامشروع|پیشنهاد نامشروع|درخواست نامشروع|پیشنهاد سکسی|اتاق خواب|با هم بخوابیم|بیای خونم|بیام خونت|رد کردن پیشنهاد رابطه|پیشنهاد سکس|درخواست سکس/.test(query)) {
          return 9.0;
        }
        if (/درخواست رابطه|پیشنهاد رابطه/.test(query) && /پسر|دختر|طرف|کراش|پارتنر|رد کنم|چی بگم|چیکار کنم|داره|داده|میخواد/.test(query)) {
          return 8.5;
        }
        const hasSexWord = /جنسی|سکس|سکسی|همخوابی|فیزیکی/.test(query);
        const hasProposalWord = /درخواست|پیشنهاد|تقاضا|میگه|داره|داده|میخواد|دعوت|رد کردن|پاسخ|واکنش|مرزبندی/.test(query);
        if (hasSexWord && hasProposalWord) return 8.5;
        if (hasSexWord) return 7.5;
        return 0;
      }

      case 'scen_playful_gift_teasing_1': {
        // شوخی، لوس‌بازی، تقاضای خوراکی، پاستیل، شکلات یا کادو
        if (/پاستیل|شکلات|کادو|خوراکی|لواشک|بستنی/.test(query)) {
          return 9.0;
        }
        if (/برام بخری|واسم بخری|چی میخری|باید بخری|لوس بازی|شت تست خوراکی/.test(query)) {
          return 8.5;
        }
        return 0;
      }

      default: {
        // Dynamic semantic concept matching for all scenarios in corpus
        const scenario = this.index.getScenarioById(scenarioId);
        if (scenario) {
          const scenarioKeywords = scenario.keywords || [];
          let dynamicScore = 0;
          for (const kw of scenarioKeywords) {
            const normKw = PersianNormalizer.normalize(kw);
            if (normKw && normKw.length >= 3 && query.includes(normKw)) {
              dynamicScore += 3.5;
            }
          }
          if (dynamicScore > 0) {
            return Math.min(dynamicScore, 8.5);
          }
        }
        return 0;
      }
    }
  }
}
