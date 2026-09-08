import { CoachScenario, CoachFallbackItem, CoachEngineResult, CoachResultStructured, ProcessedCoachQueryOptions } from './CoachTypes.js';
import { ToneDistributor } from './ToneDistributor.js';
import { CoachLoader } from './CoachLoader.js';

export class ResponseSelector {
  /**
   * Formats scenario or fallback into complete CoachEngineResult with the 5 canonical tone responses
   * and strict provenance tracking.
   */
  static formatResult(
    scenario: CoachScenario | null,
    fallback: CoachFallbackItem | null,
    query: string,
    confidenceScore: number,
    options?: ProcessedCoachQueryOptions,
    matchType: string = 'bm25_token'
  ): CoachEngineResult {
    const isScenario = !!scenario;
    const selectedScenarioId = isScenario ? scenario!.id : (fallback?.topic || 'default_fallback');
    const selectedScenarioSource = isScenario ? 'canonical_60k' : 'fallback_matrix';
    const selectedChunk = isScenario ? CoachLoader.getChunkForScenarioId(scenario!.id) : 'fallback';
    const title = isScenario ? scenario!.title : (fallback?.topic || 'راهنمای هوش کلامی کاریزما');

    // Use ToneDistributor to strictly extract the 5 Canonical Tones from the selected scenario
    const distributed = ToneDistributor.distribute(scenario, fallback, selectedScenarioId, query);

    const charismaticReply = distributed.charismaticReply;
    const funnyReply = distributed.funnyReply;
    const confidentReply = distributed.confidentReply;
    const mysteriousReply = distributed.mysteriousReply;
    const matureReply = distributed.matureReply;

    const techniqueText = distributed.technique;
    const bodyLangText = isScenario ? (scenario!.bodyLanguage || 'استقرار مقتدرانه، سر بالا و نگاه مطمئن.') : 'ژست گشوده، لبخند خونسرد و تن صدای آرام.';
    const nextMoveText = distributed.nextMove;

    // Verify exact provenance invariant for all 5 tones
    const responseScenarioIds: Record<string, string> = {
      charismatic: distributed.scenarioId,
      funny: distributed.scenarioId,
      confident: distributed.scenarioId,
      mysterious: distributed.scenarioId,
      mature: distributed.scenarioId
    };

    const provenanceMatch = Object.values(responseScenarioIds).every(id => id === selectedScenarioId);
    if (!provenanceMatch) {
      console.warn(`[ResponseSelector] Provenance mismatch detected: selectedScenarioId=${selectedScenarioId}, distributedIds=${JSON.stringify(responseScenarioIds)}`);
    }

    // Construct 5 Canonical Tone Array for Structured JSON Response
    const responsesArray: Array<{
      tone: import('./CoachTypes.js').CanonicalToneKey;
      title: string;
      reply: string;
      whyWorks: string;
      nextMove: string;
      riskLevel: string;
      scenarioId: string;
      source: 'canonical_60k' | 'fallback_matrix';
      chunk: string;
    }> = [
      {
        tone: 'charismatic',
        title: '👑 لحن ۱: کاریزماتیک و باکلاس',
        reply: charismaticReply,
        whyWorks: 'نشان دادن ارزش شخصی بالا، پرستیژ کلامی و جذابیت سنجیده بدون رفتارهای نیازمندانه',
        nextMove: 'اجازه دهید اشتیاق گفتگو در طرف مقابل زنده بماند',
        riskLevel: 'پایین',
        scenarioId: distributed.scenarioId,
        source: distributed.source,
        chunk: selectedChunk
      },
      {
        tone: 'funny',
        title: '😂 لحن ۲: شوخ‌طبع و رندانه',
        reply: funnyReply,
        whyWorks: 'شکستن یخ مکالمه با رندی و بازیگوشی هوشمندانه برای تلطیف فضای ارتباط',
        nextMove: 'فضا را پرانرژی و مفرح نگه دارید',
        riskLevel: 'پایین',
        scenarioId: distributed.scenarioId,
        source: distributed.source,
        chunk: selectedChunk
      },
      {
        tone: 'confident',
        title: '🔥 لحن ۳: مقتدر و با اعتماد به نفس',
        reply: confidentReply,
        whyWorks: 'صراحت لهجه، تعیین مرزهای شفاف و هدایت مکالمه با قاطعیت و آرامش',
        nextMove: nextMoveText,
        riskLevel: 'پایین',
        scenarioId: distributed.scenarioId,
        source: distributed.source,
        chunk: selectedChunk
      },
      {
        tone: 'mysterious',
        title: '🔮 لحن ۴: مرموز و پرکشش',
        reply: mysteriousReply,
        whyWorks: 'برانگیختن حس کنجکاوی و اشتیاق بدون لو دادن سریع همه اطلاعات',
        nextMove: 'با ملایمت و صبوری پاسخ او را دریافت کنید',
        riskLevel: 'پایین',
        scenarioId: distributed.scenarioId,
        source: distributed.source,
        chunk: selectedChunk
      },
      {
        tone: 'mature',
        title: '💎 لحن ۵: متین و پخته',
        reply: matureReply,
        whyWorks: 'پاسخ دیپلماتیک، باوقار و عمیق برای مدیریت هوشمندانه و اصیل تعامل',
        nextMove: 'مکالمه را با تعادل و احترام هدایت کنید',
        riskLevel: 'پایین',
        scenarioId: distributed.scenarioId,
        source: distributed.source,
        chunk: selectedChunk
      }
    ];

    // Filter responses if user explicitly selected a single tone
    let finalResponsesArray = responsesArray;
    if (options?.selectedTone && options.selectedTone !== 'all') {
      const toneMap: Record<string, string> = {
        'charismatic': 'charismatic',
        'funny': 'funny',
        'confident': 'confident',
        'mysterious': 'mysterious',
        'mature': 'mature',
        // Persian mappings
        'کاریزماتیک': 'charismatic',
        'باکلاس': 'charismatic',
        'جذاب': 'charismatic',
        'شوخ': 'funny',
        'شوخ‌طبع': 'funny',
        'شوخ طبع': 'funny',
        'طنز': 'funny',
        'رندانه': 'funny',
        'مقتدر': 'confident',
        'قاطع': 'confident',
        'آلفا': 'confident',
        'مرموز': 'mysterious',
        'پرکشش': 'mysterious',
        'متین': 'mature',
        'متین و پخته': 'mature',
        'پخته': 'mature',
        // Backward compatibility mappings
        'direct': 'confident',
        'alpha': 'confident',
        'friendly': 'charismatic',
        'emotional': 'mysterious',
        'flirty': 'mysterious',
        'humorous': 'funny',
        'witty': 'funny',
        'psychology': 'mature',
        'deep': 'mature',
        'diplomatic': 'mature'
      };
      const mappedTone = toneMap[options.selectedTone] || options.selectedTone;
      const filtered = responsesArray.filter(r => r.tone === mappedTone);
      if (filtered.length > 0) {
        finalResponsesArray = filtered;
      } else {
        console.warn(`[ResponseSelector] Telemetry warning: options.selectedTone '${options.selectedTone}' could not be matched in canonical tones array.`);
      }
    }

    const structuredData: CoachResultStructured = {
      analysis: {
        situation: query.length > 60 ? query.substring(0, 57) + '...' : query,
        environment: isScenario ? scenario!.category : 'چت آنلاین',
        channel: 'پیام متنی / شفاهی',
        intent: 'ارتباط کاریزماتیک و مدیریت فریم',
        confidence: `${confidenceScore}%`
      },
      responses: finalResponsesArray,
      recommendations: {
        bodyLanguage: bodyLangText,
        timing: 'بین ۵ تا ۱۵ دقیقه بعد پاسخ دهید تا پیام شتاب‌زده به نظر نرسد',
        mistakesToAvoid: 'پرهیز از ارسال چند پیام کوتاه متوالی، التماس صمیمیت، توجیه کردن یا لحن دفاعی'
      },
      sources: [title]
    };

    // Format 5-Tone Markdown String Answer with explicit headers and markers matching UI parser
    const answerMarkdown = [
      `👑 **لحن ۱: کاریزماتیک و باکلاس:**`,
      `«${charismaticReply.replace(/^[«"]/, '').replace(/[»"]$/, '')}»`,
      `📌 نکته اجرا: آرامش کلامی، مکث طلایی سنجیده، نگاه عمیق و زبان بدن مسلط.`,
      ``,
      `😂 **لحن ۲: شوخ‌طبع و رندانه:**`,
      `«${funnyReply.replace(/^[«"]/, '').replace(/[»"]$/, '')}»`,
      `📌 نکته اجرا: پوزخند خونسرد، شکستن یخ با شوخی هوشمندانه به همراه کنترل شرایط.`,
      ``,
      `🔥 **لحن ۳: مقتدر و با اعتماد به نفس:**`,
      `«${confidentReply.replace(/^[«"]/, '').replace(/[»"]$/, '')}»`,
      `📌 نکته اجرا: قاطعیت و وقار، صدای شمرده و بدون شتاب‌زدگی یا عذرخواهی بی‌مورد.`,
      ``,
      `🔮 **لحن ۴: مرموز و پرکشش:**`,
      `«${mysteriousReply.replace(/^[«"]/, '').replace(/[»"]$/, '')}»`,
      `📌 نکته اجرا: برانگیختن کنجکاوی، مکث معنادار و لحن پرکشش و مبهم.`,
      ``,
      `💎 **لحن ۵: متین و پخته:**`,
      `«${matureReply.replace(/^[«"]/, '').replace(/[»"]$/, '')}»`,
      `📌 نکته اجرا: ${techniqueText} | ${nextMoveText}`
    ].join('\n');

    return {
      structuredData,
      answer: answerMarkdown,
      sourceCards: isScenario ? [{
        id: scenario!.id,
        title: scenario!.title,
        content: scenario!.situation,
        category: scenario!.category,
        keywords: scenario!.keywords,
        chunk: selectedChunk
      }] : [],
      usedLLM: false,
      pipelineLog: {
        normalizedQuery: query,
        tokens: [],
        bm25Results: [{ id: isScenario ? scenario!.id : 'fb', title, score: confidenceScore }],
        reRankedTopResult: title,
        matchedScenarioId: isScenario ? scenario!.id : undefined,
        selectedScenarioId: isScenario ? scenario!.id : undefined,
        selectedScenarioSource,
        selectedChunk,
        matchType,
        confidenceScore,
        responseScenarioIds,
        provenanceMatch,
        usedLLM: false
      }
    };
  }
}
