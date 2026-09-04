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

    // Extract exact 5 tone quotes from markdown formatted answer
    const t1 = this.extractToneBlock(rawAnswer, ['لحن ۱', 'مقتدر', 'آلفا', 'قاطع', '🔥']) || 
      `«سرم شلوغ بود، ولی چت باکیفیت رو به چت عجله‌ای ترجیح میدم.»`;
    const t2 = this.extractToneBlock(rawAnswer, ['لحن ۲', 'صمیمی', 'دوستانه', 'گرم', '😊']) || 
      `«سلام و ارادت! حسابی سرم شلوغ بود، امیدوارم حالت عالی باشه.»`;
    const t3 = this.extractToneBlock(rawAnswer, ['لحن ۳', 'باکلاس', 'کاریزماتیک', 'شیک', '😎']) || 
      `«آدم‌های جذاب معمولاً دیر به دیر ولی اثرگذار میان روی خط... سلام و وقتت بخیر.»`;
    const t4 = this.extractToneBlock(rawAnswer, ['لحن ۴', 'احساسی', 'عاطفی', 'عمیق', '❤️']) || 
      `«دلم می‌خواست با تمرکز و حس خوب باهات حرف بزنم نه هول‌هولکی؛ برات بهترین‌ها رو می‌خوام.»`;
    const t5 = this.extractToneBlock(rawAnswer, ['لحن ۵', 'شوخ', 'کل‌کل', 'کل کل', 'طنز', '😂']) || 
      `«فکر کردم رفتی تو افق محو شدی! داشتم آماده می‌شدم اعلام مفقودی کنم.»`;

    const coachAnalysis = this.extractCoachAnalysis(rawAnswer) || 
      'با حفظ آرامش، خونسردی و شوخ‌طبعی هوشمندانه، کنترل هر موقعیتی در دستان شما خواهد بود.';

    const defaultReplies: AIToneResponse[] = [
      {
        tone: 'charismatic',
        title: '🔥 مقتدر و آلفا',
        reply: t1,
        whyWorks: 'نشان دادن ارزش وقت، اقتدار کلامی و حفظ پرستیژ بالا بدون نیاز به تایید',
        nextMove: 'منتظر پاسخ بمانید و از ارسال پیام‌های توجیهی خودداری کنید',
        riskLevel: 'پایین'
      },
      {
        tone: 'confident',
        title: '😊 صمیمی و دوستانه',
        reply: t2,
        whyWorks: 'ایجاد حس امنیت، گرما، انرژی مثبت و رفاقت واقعی',
        nextMove: 'مکالمه را به سمت موضوعات مورد علاقه طرفین هدایت کنید',
        riskLevel: 'پایین'
      },
      {
        tone: 'mature',
        title: '😎 باکلاس و کاریزماتیک',
        reply: t3,
        whyWorks: 'جذابیت بالا، رازآلود بودن و برانگیختن کنجکاوی طرف مقابل با مکث طلایی',
        nextMove: 'اجازه دهید او برای شنیدن ادامه گفتگو مشتاق بماند',
        riskLevel: 'پایین'
      },
      {
        tone: 'mysterious',
        title: '❤️ احساسی و عاطفی',
        reply: t4,
        whyWorks: 'درک متقابل، عمق عاطفی، توجه قلبی و ایجاد اتصال حسی',
        nextMove: 'با آرامش و ملایمت اجازه دهید حس خوب در فضا جاری شود',
        riskLevel: 'پایین'
      },
      {
        tone: 'funny',
        title: '😂 شوخ‌طبع و کل‌کل',
        reply: t5,
        whyWorks: 'شکستن یخ مکالمه، پوزخند خونسرد و شوخ‌طبعی جذاب',
        nextMove: 'فضا را سبک نگه دارید و بحث را بیش از حد جدی نکنید',
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
