import { AIScenarioQueryResponse, AIToneResponse, AITraceRecord } from '../../types.js';
import { DBEngine } from '../db.js';

export class AIService {
  /**
   * Helper to parse or build structured scenario response from raw RAG answer
   */
  static parseOrCreateStructuredResponse(rawAnswer: string, userQuestion: string, pipelineLog?: any): AIScenarioQueryResponse {
    let parsed: any = null;

    // Try extracting JSON if model returned JSON block
    try {
      const jsonMatch = rawAnswer.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      parsed = null;
    }

    if (parsed && parsed.responses && Array.isArray(parsed.responses) && parsed.responses.length >= 3) {
      return {
        analysis: {
          situation: parsed.analysis?.situation || userQuestion,
          environment: parsed.analysis?.environment || 'چت / آنلاین',
          channel: parsed.analysis?.channel || 'متنی',
          intent: parsed.analysis?.intent || 'شروع یا تداوم گفتگو',
          confidence: parsed.analysis?.confidence || '95%'
        },
        responses: parsed.responses.map((r: any) => ({
          tone: r.tone || 'charismatic',
          title: r.title || 'پاسخ پیشنهادی',
          reply: r.reply || r.text || '',
          whyWorks: r.whyWorks || 'حفظ جذابیت و پرستیژ کلامی',
          nextMove: r.nextMove || 'منتظر پاسخ طرف مقابل بمانید',
          riskLevel: r.riskLevel || 'پایین'
        })),
        recommendations: {
          bodyLanguage: parsed.recommendations?.bodyLanguage || 'لحن آرام، بدون عجله و لبخند ملایم',
          timing: parsed.recommendations?.timing || 'ارسال پاسخ با ۱۰ الی ۲۰ دقیقه مکث',
          mistakesToAvoid: parsed.recommendations?.mistakesToAvoid || 'پرهیز از پیام‌های پشت سر هم و توجیه‌کردن'
        },
        sources: parsed.sources || []
      };
    }

    // Extract exact 5 tone quotes from answer or provide calibrated canonical fallback
    const tCharismatic = this.extractToneBlock(rawAnswer, ['لحن ۱', 'کاریزماتیک', 'باکلاس', 'شیک', '✨', '😎']) || 
      `«آدم‌های باکیفیت ترجیح میدن گفتگوهاشون ارزش وقت گذاشتن داشته باشه... سلام و روزت بخیر.»`;
    const tFunny = this.extractToneBlock(rawAnswer, ['لحن ۲', 'شوخ', 'رندانه', 'طنز', 'کل‌کل', '😂', '😜']) || 
      `«فکر کردم رفتی المپیک مدال بگیری و برگردی! به هر حال خوش اومدی به دنیای آنلاین.»`;
    const tConfident = this.extractToneBlock(rawAnswer, ['لحن ۳', 'مقتدر', 'قاطع', 'آلفا', 'مرزبندی', '🔥', '🦁']) || 
      `«من برای زمان و تمرکزم ارزش قائلم؛ هر وقت فرصت کافی بود با تمرکز صحبت می‌کنیم.»`;
    const tMysterious = this.extractToneBlock(rawAnswer, ['لحن ۴', 'مرموز', 'پرکشش', 'کنجکاوی', 'دوپهلو', '🎭', '🔮']) || 
      `«یه حس کنجکاوی خاص توی پیامت هست؛ کنجکاو شدم بدونم پشت این صحبت‌ها چه ماجراییه.»`;
    const tMature = this.extractToneBlock(rawAnswer, ['لحن ۵', 'متین', 'پخته', 'دیپلماتیک', 'باوقار', '👑', '🕊️']) || 
      `«درک می‌کنم که مشغله‌های روزمره پیش میاد؛ هر زمان وقتت آزاد و با آرامش بود گفتگو می‌کنیم.»`;

    const coachAnalysis = this.extractCoachAnalysis(rawAnswer) || 
      'با حفظ آرامش، خونسردی و شوخ‌طبعی هوشمندانه، کنترل هر موقعیتی در دستان شما خواهد بود.';

    const defaultReplies: AIToneResponse[] = [
      {
        tone: 'charismatic',
        title: '✨ کاریزماتیک و باکلاس',
        reply: tCharismatic,
        whyWorks: 'جذابیت بالا، خونسردی، فریم مسلط و ارتباط باوقار بدون نیاز به تایید',
        nextMove: 'اجازه دهید مخاطب به انرژی آرام و باکلاس شما پاسخ دهد',
        riskLevel: 'پایین'
      },
      {
        tone: 'funny',
        title: '😂 شوخ‌طبع و رندانه',
        reply: tFunny,
        whyWorks: 'شکستن یخ مکالمه، پوزخند خونسرد و شوخ‌طبعی رندانه',
        nextMove: 'فضا را سبک نگه دارید و بحث را بیش از حد جدی نکنید',
        riskLevel: 'پایین'
      },
      {
        tone: 'confident',
        title: '🔥 مقتدر و قاطع',
        reply: tConfident,
        whyWorks: 'مرزبندی محکم، عدم توجیه و نشان دادن ارزش وقت شخصی با اقتدار',
        nextMove: 'منتظر پاسخ بمانید و از ارسال پیام‌های پیگیری و عجولانه خودداری کنید',
        riskLevel: 'پایین'
      },
      {
        tone: 'mysterious',
        title: '🎭 مرموز و پرکشش',
        reply: tMysterious,
        whyWorks: 'ایجاد کشش روانی، کنجکاوی، مکث طلایی و جذابیت پنهان',
        nextMove: 'کارت‌های خود را یکجا رو نکنید و بگذارید او به دنبال کشف شما باشد',
        riskLevel: 'پایین'
      },
      {
        tone: 'mature',
        title: '👑 متین و پخته',
        reply: tMature,
        whyWorks: 'پختگی، پرستیژ اجتماعی، احترام متقابل و پاسخ دیپلماتیک',
        nextMove: 'با طمانینه و متانت به مکالمه ادامه دهید',
        riskLevel: 'پایین'
      }
    ];

    return {
      analysis: {
        situation: userQuestion.length > 60 ? userQuestion.substring(0, 57) + '...' : userQuestion,
        environment: pipelineLog?.queryAnalysis?.location || 'چت آنلاین',
        channel: 'پیام متنی',
        intent: pipelineLog?.queryAnalysis?.intent || 'ارتباط کاریزماتیک',
        confidence: pipelineLog?.finalConfidenceScore || '95%'
      },
      responses: defaultReplies,
      recommendations: {
        bodyLanguage: 'حفظ تماس چشمی ملایم، قامت گشوده، مکث سنجیده و تن صدای آرام و شمرده',
        timing: 'بین ۵ تا ۱۵ دقیقه بعد پاسخ دهید تا پیام شتاب‌زده به نظر نرسد',
        mistakesToAvoid: 'پرهیز از ارسال چند پیام کوتاه متوالی، التماس صمیمیت، توجیه کردن یا لحن دفاعی'
      },
      sources: pipelineLog?.bm25Results?.map((r: any) => r.title) || []
    };
  }

  private static extractToneBlock(text: string, keywords: string[]): string | null {
    if (!text) return null;
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = keywords.some(k => line.includes(k));
      if (match) {
        // 1. Check if the line itself contains quotes
        const quoteMatch = line.match(/«([^»]+)»/) || line.match(/"([^"]+)"/);
        if (quoteMatch && quoteMatch[1].trim().length > 5) {
          return `«${quoteMatch[1].trim()}»`;
        }

        // 2. Check the next 1-3 lines for quotes or bold response
        for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
          const nextLine = lines[j].trim();
          if (nextLine.startsWith('🔥') || nextLine.startsWith('😊') || nextLine.startsWith('😎') || nextLine.startsWith('❤️') || nextLine.startsWith('😂')) {
            break;
          }
          const nextQuote = nextLine.match(/«([^»]+)»/) || nextLine.match(/"([^"]+)"/);
          if (nextQuote && nextQuote[1].trim().length > 5) {
            return `«${nextQuote[1].trim()}»`;
          }
          if (nextLine.startsWith('«') || (nextLine.length > 8 && !nextLine.startsWith('📌') && !nextLine.startsWith('🧠'))) {
            const clean = nextLine.replace(/^[«"]/, '').replace(/[»"]$/, '').trim();
            return `«${clean}»`;
          }
        }
      }
    }

    return null;
  }

  private static extractCoachAnalysis(text: string): string | null {
    if (!text) return null;
    const match = text.match(/(?:🧠|تحلیل مربی:|نکته مربی:)\s*([^\n]+)/);
    if (match && match[1].trim().length > 10) {
      return match[1].trim();
    }
    return null;
  }

  /**
   * Log AI Trace
   */
  static async logTrace(trace: Omit<AITraceRecord, 'id' | 'createdAt'>): Promise<void> {
    try {
      const newRecord: AITraceRecord = {
        ...trace,
        id: 'tr_' + Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toISOString()
      };
      await DBEngine.insertRecord('ai_traces', newRecord);
    } catch (e) {
      console.error('Failed to log AI trace:', e);
    }
  }
}
