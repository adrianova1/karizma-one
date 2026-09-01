/**
 * Karizma Center DB
 * High-performance JSON File-backed persistent database with in-memory caching
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { 
  User, Plan, Subscription, KnowledgeCard, PromptTemplate, PromptHistory, 
  Conversation, AuditLog, Setting, Notification, ContentItem, Receipt, 
  SearchCache, AICache, ImportJob, StatisticsRecord, Role, ScenarioItem 
} from '../types.js';
import { PRESEEDED_SCENARIOS } from '../data/scenarios.js';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'karizma-salt-key-2026').digest('hex');
}

// In-Memory Cache for fast sub-millisecond table operations
const tableCache = new Map<string, { data: any[]; mtime: number }>();

export class DBEngine {
  private static getFilePath(tableName: string): string {
    return path.join(DATA_DIR, `${tableName}.json`);
  }

  static async readTable<T>(tableName: string): Promise<T[]> {
    try {
      const filePath = this.getFilePath(tableName);
      if (!fs.existsSync(filePath)) {
        return [];
      }

      const stat = fs.statSync(filePath);
      const cached = tableCache.get(tableName);
      if (cached && cached.mtime === stat.mtimeMs) {
        return cached.data as T[];
      }

      const raw = fs.readFileSync(filePath, 'utf8');
      if (!raw || raw.trim().length === 0) {
        tableCache.set(tableName, { data: [], mtime: stat.mtimeMs });
        return [];
      }

      let parsed: T[];
      try {
        parsed = JSON.parse(raw) as T[];
      } catch (parseErr) {
        const sanitized = raw.replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g, '');
        parsed = JSON.parse(sanitized) as T[];
      }

      tableCache.set(tableName, { data: parsed, mtime: stat.mtimeMs });
      return parsed as T[];
    } catch (e) {
      console.warn(`[DBEngine] Error reading JSON table ${tableName}:`, e);
      return [];
    }
  }

  static async writeTable<T>(tableName: string, data: T[]): Promise<void> {
    try {
      const filePath = this.getFilePath(tableName);
      const tempPath = `${filePath}.tmp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const jsonString = JSON.stringify(data, null, 2);
      
      fs.writeFileSync(tempPath, jsonString, 'utf8');
      fs.renameSync(tempPath, filePath);
      
      const stat = fs.statSync(filePath);
      tableCache.set(tableName, { data: JSON.parse(JSON.stringify(data)), mtime: stat.mtimeMs });
    } catch (e) {
      console.error(`[DBEngine] Error writing JSON table ${tableName}:`, e);
      // Fallback direct write
      try {
        const filePath = this.getFilePath(tableName);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      } catch (err) {
        console.error(`[DBEngine] Direct write fallback failed for ${tableName}:`, err);
      }
    }
  }

  static async findById<T extends { id?: string }>(tableName: string, id: string): Promise<T | null> {
    const data = await this.readTable<T>(tableName);
    return data.find(item => item.id === id) || null;
  }

  static async insertRecord<T extends { id?: string }>(tableName: string, record: T): Promise<void> {
    const data = await this.readTable<T>(tableName);
    data.push(record);
    await this.writeTable(tableName, data);
  }

  static async updateRecord<T extends { id?: string } = any>(tableName: string, id: string, partialData: Partial<T> | Record<string, any>): Promise<void> {
    const data = await this.readTable<T>(tableName);
    const index = data.findIndex((item: any) => item.id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...partialData };
      await this.writeTable(tableName, data);
    }
  }

  static async deleteRecord(tableName: string, id: string): Promise<void> {
    const data = await this.readTable<any>(tableName);
    const filtered = data.filter(item => item.id !== id);
    await this.writeTable(tableName, filtered);
  }

  /**
   * Seed all initial default data for standalone / server deployment
   */
  static async initializeSeed(): Promise<void> {
    try {
      // 1. Seed Users (admin & user)
      const users = await this.readTable<User>('users');
      const adminIdx = users.findIndex(u => u.username.toLowerCase() === 'admin');
      if (adminIdx === -1) {
        console.log('[DBEngine Seed] Seeding default admin user...');
        const adminUser: User = {
          id: 'u_1001',
          username: 'admin',
          passwordHash: hashPassword('123456'),
          role: Role.ADMIN,
          phoneNumber: '09123456789',
          preferences: {
            autoCopy: true,
            gender: 'unspecified'
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        users.push(adminUser);
      } else {
        if (!users[adminIdx].passwordHash) {
          users[adminIdx].passwordHash = hashPassword('123456');
        }
        users[adminIdx].role = Role.ADMIN;
      }

      const demoIdx = users.findIndex(u => u.username.toLowerCase() === 'user');
      if (demoIdx === -1) {
        console.log('[DBEngine Seed] Seeding default demo user...');
        const demoUser: User = {
          id: 'u_1002',
          username: 'user',
          passwordHash: hashPassword('123456'),
          role: Role.USER,
          phoneNumber: '09120000000',
          preferences: {
            autoCopy: true,
            gender: 'unspecified'
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        users.push(demoUser);
      }
      await this.writeTable('users', users);
      
      // 2. Seed Plans
      const defaultPlans: Plan[] = [
        {
          id: 'p1',
          name: 'طرح برنزی (۷ روزه)',
          price: 99000,
          description: 'اعتبار یک هفته کامل! شامل سهمیه ۱۰۰ پیام هوشمند، تولید ۵ لحن همزمان، تمام سناریوها، آکادمی و کمک فوری ۱۰ ثانیه‌ای.',
          maxQueries: 100,
          maxKnowledgeCards: 500,
          durationDays: 7,
          maxScenarios: 100,
          quizLimitPerDay: 20,
          academyAccess: 'unlimited',
          historyRetentionDays: 7,
          badge: '۷ روزه اقتصادی',
          features: [
            '۱۰۰ کوئری هوشمند مربی کاریزما',
            'تولید ۵ لحن همزمان و کمک فوری ۱۰ ثانیه‌ای',
            'دسترسی به تمامی سناریوهای روانشناسی',
            'دسترسی به مقالات و آزمون‌های آکادمی',
            'حفظ تاریخچه گفتگوها تا ۷ روز',
            'مدت زمان اعتبار: ۷ روز کامل'
          ],
          createdAt: new Date().toISOString()
        },
        {
          id: 'p2',
          name: 'طرح نقره‌ای (۱۵ روزه)',
          price: 249000,
          description: 'محبوب‌ترین طرح نیم‌ماهه! شامل سهمیه ۵۰۰ پیام هوشمند، تولید ۵ لحن همزمان، جعبه لایتنر، آکادمی کامل و سناریوها.',
          maxQueries: 500,
          maxKnowledgeCards: 1500,
          durationDays: 15,
          maxScenarios: 300,
          quizLimitPerDay: 50,
          academyAccess: 'unlimited',
          historyRetentionDays: 15,
          badge: 'محبوب‌ترین طرح (۱۵ روزه)',
          features: [
            '۵۰۰ کوئری هوشمند مربی کاریزما',
            'دسترسی کامل به جعبه لایتنر و کارت‌های دانش',
            'پاسخ‌دهی پیشرفته با ۵ لحن همزمان',
            'دسترسی کامل به بانک سناریوها و آزمون‌ها',
            'حفظ تاریخچه گفتگوها تا ۱۵ روز',
            'مدت زمان اعتبار: ۱۵ روز کامل'
          ],
          createdAt: new Date().toISOString()
        },
        {
          id: 'p3',
          name: 'طرح طلایی (یک ماهه VIP)',
          price: 599000,
          description: 'دسترسی جامع ۳۰ روزه با سهمیه فوق‌العاده ۵,۰۰۰ پیام، پشتیبانی اختصاصی VIP و دسترسی بدون محدودیت به تمامی امکانات اپلیکیشن.',
          maxQueries: 5000,
          maxKnowledgeCards: 9999,
          durationDays: 30,
          maxScenarios: 999,
          quizLimitPerDay: 999,
          academyAccess: 'unlimited',
          historyRetentionDays: 30,
          badge: 'پیشنهاد ویژه VIP (۳۰ روزه)',
          features: [
            '۵,۰۰۰ کوئری هوشمند مربی کاریزما (نامحدود)',
            'دسترسی کامل بدون محدودیت به تمامی بخش‌ها',
            'دسترسی به جعبه لایتنر و کارت‌های طلایی',
            'پشتیبانی اختصاصی VIP و آنالیز تصویر چت‌ها',
            'حفظ تاریخچه گفتگوها تا ۳۰ روز',
            'مدت زمان اعتبار: یک ماه کامل (۳۰ روز)'
          ],
          createdAt: new Date().toISOString()
        }
      ];

      const plans = await this.readTable<Plan>('plans');
      if (plans.length === 0) {
        console.log('[DBEngine Seed] Seeding default plans...');
        await this.writeTable('plans', defaultPlans);
      }

      // 3. Seed default active subscriptions for test accounts
      const subscriptions = await this.readTable<Subscription>('subscriptions');
      if (subscriptions.length === 0) {
        console.log('[DBEngine Seed] Seeding default subscriptions...');
        const now = new Date();
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const defaultSubs: Subscription[] = [
          {
            id: 'sub_admin_vip',
            userId: 'u_1001',
            planId: 'p3',
            startDate: now.toISOString(),
            endDate: endDate.toISOString(),
            status: 'active',
            queryCount: 0,
            createdAt: now.toISOString()
          },
          {
            id: 'sub_user_gold',
            userId: 'u_1002',
            planId: 'p3',
            startDate: now.toISOString(),
            endDate: endDate.toISOString(),
            status: 'active',
            queryCount: 0,
            createdAt: now.toISOString()
          }
        ];
        await this.writeTable('subscriptions', defaultSubs);
      }

      // 4. Seed Scenarios Database (Protected from overwriting production bank)
      const scenariosPath = path.join(DATA_DIR, 'scenarios.json');
      const coachScenariosPath = path.join(DATA_DIR, 'coach', 'scenarios.json');
      const backupScenariosPath = path.join(DATA_DIR, 'scenarios.backup.json');

      const fileAlreadyExists = fs.existsSync(scenariosPath) || fs.existsSync(coachScenariosPath) || fs.existsSync(backupScenariosPath);

      if (!fileAlreadyExists) {
        // Only run on a completely fresh install when no scenario file exists at all on disk
        if (PRESEEDED_SCENARIOS && PRESEEDED_SCENARIOS.length > 0) {
          console.log(`[DBEngine Seed] Fresh installation detected. Seeding initial ${PRESEEDED_SCENARIOS.length} scenarios...`);
          const now = new Date().toISOString();
          const seededScenarios: ScenarioItem[] = PRESEEDED_SCENARIOS.map(s => {
            const charismaticAns = s.answers.find(a => a.style.includes('مقتدر') || a.style.includes('کاریزماتیک') || a.style.includes('آلفا') || a.style.includes('قاطع'))?.text || s.answers[0]?.text || '';
            const funnyAns = s.answers.find(a => a.style.includes('شوخ') || a.style.includes('کل‌کل') || a.style.includes('فان') || a.style.includes('طنز'))?.text || s.answers[1]?.text || '';
            const confidentAns = s.answers.find(a => a.style.includes('صمیمی') || a.style.includes('دوستانه') || a.style.includes('گرم'))?.text || s.answers[2]?.text || '';
            const mysteriousAns = s.answers.find(a => a.style.includes('عاطفی') || a.style.includes('مرموز') || a.style.includes('تحلیلی'))?.text || s.answers[3]?.text || '';
            const matureAns = s.answers.find(a => a.style.includes('سنگین') || a.style.includes('متین') || a.style.includes('دیپلماتیک'))?.text || s.answers[4]?.text || '';

            return {
              id: s.id,
              title: s.title,
              situation: s.context,
              opponentLine: s.emotion,
              environment: s.category,
              genderContext: 'general',
              goal: s.analysis.bestAnswer || 'جذابیت و کنترل مکالمه',
              difficulty: (s.difficulty === 'آسان' ? 'easy' : s.difficulty === 'متوسط' ? 'medium' : 'hard') as any,
              responses: {
                charismatic: charismaticAns,
                funny: funnyAns,
                confident: confidentAns,
                mysterious: mysteriousAns,
                mature: matureAns
              },
              technique: s.analysis.reason,
              bodyLanguage: s.analysis.bodyLanguage,
              teachingNote: `گام بعدی: ${s.analysis.nextStep} | سوال پیگیری: ${s.analysis.followUpQuestion}`,
              createdAt: now,
              updatedAt: now,
              views: 0,
              likes: 0
            };
          });
          await this.writeTable('scenarios', seededScenarios);
        }
      } else {
        console.log('[DBEngine Seed] Existing Scenario Bank detected on disk. Preserving production data without seeding.');
      }

      // 5. Seed Knowledge Cards for Leitner and RAG
      const knowledgeCards = await this.readTable<KnowledgeCard>('knowledge_cards');
      if (knowledgeCards.length === 0 && PRESEEDED_SCENARIOS && PRESEEDED_SCENARIOS.length > 0) {
        console.log(`[DBEngine Seed] Seeding knowledge cards for Leitner and RAG...`);
        const now = new Date().toISOString();
        const seededCards: KnowledgeCard[] = PRESEEDED_SCENARIOS.slice(0, 30).map(s => ({
          id: 'kc_' + s.id,
          title: s.title,
          content: `موقعیت: ${s.context}\nپاسخ برتر: ${s.analysis.bestAnswer}\nتحلیل روانشناسی: ${s.analysis.reason}\nزبان بدن: ${s.analysis.bodyLanguage}`,
          normalizedContent: s.title + ' ' + s.context + ' ' + s.analysis.reason,
          category: s.category,
          keywords: [s.category, s.difficulty, 'کاریزما', 'فن بیان', 'روانشناسی'],
          tags: ['کاریزما', 'جذابیت کلامی', 'فن بیان', 'سناریو کاربردی'],
          views: 0,
          createdAt: now,
          updatedAt: now
        }));
        await this.writeTable('knowledge_cards', seededCards);
      }

      // 6. Seed Default Settings
      const settings = await this.readTable<Setting>('settings');
      const defaultSettings: Setting[] = [
        { id: 'st_1', key: 'admin_card_number', value: '۶۰۳۷-۹۹۷۵-۱۲۳۴-۵۶۷۸', description: 'شماره کارت بانکی واریز وجه', updatedAt: new Date().toISOString() },
        { id: 'st_2', key: 'admin_card_holder', value: 'مدیریت مرکز کاریزما', description: 'نام صاحب حساب بانکی', updatedAt: new Date().toISOString() },
        { id: 'st_3', key: 'admin_card_bank', value: 'بانک ملی ایران', description: 'نام بانک', updatedAt: new Date().toISOString() },
        { id: 'st_4', key: 'educational_channel_primary_url', value: 'https://t.me/karizma_center', description: 'لینک کانال آموزشی تلگرام', updatedAt: new Date().toISOString() },
        { id: 'st_5', key: 'educational_channel_title', value: 'کانال VIP آموزش کاریزما و نفوذ کلام', description: 'عنوان کانال آموزشی', updatedAt: new Date().toISOString() },
      ];

      let settingsChanged = false;
      for (const ds of defaultSettings) {
        if (!settings.find(s => s.key === ds.key)) {
          settings.push(ds);
          settingsChanged = true;
        }
      }
      if (settingsChanged) {
        await this.writeTable('settings', settings);
      }

      // 7. Seed Default High-Quality Prompt Templates
      const prompts = await this.readTable<PromptTemplate>('prompts');
      if (prompts.length === 0) {
        console.log('[DBEngine Seed] Seeding default professional prompt templates...');
        const now = new Date().toISOString();
        const defaultPrompts: PromptTemplate[] = [
          {
            id: 'pr_main_karizma',
            name: 'الگوی جامع مربی ارشد کاریزما (۵ لحن اختصاصی)',
            systemInstruction: `شما «مربی ارشد هوش کلامی و جذابیت ارتباطی مرکز کاریزما» هستید؛ بزرگ‌ترین و معتبرترین مرجع مهندسی کلام، روابط بین‌فردی، شوخ‌طبعی، دلبری و کاریزما در ایران.

رسالت شما:
ارائه پاسخ‌های زنده، طبیعی، محاوره‌ای، خوش‌ریتم و دقیقاً متناسب با فرهنگ و ادبیات روابط مدرن در جامعه ایران (چه پسر و چه دختر).

اصول طلایی پاسخگویی:
۱. ادبیات ۱۰۰٪ محاوره‌ای، صمیمی، هوشمندانه، بدون تکلف و بدون غلط املایی.
۲. تطبیق کامل با جنسیت کاربر و مخاطب هدف با رعایت عزت‌نفس و پرستیژ بالا.
۳. پرهیز مطلق از کلیشه‌ها، پند و اندرزهای طولانی، یا جملات ترجمه‌ای و کتابی.
۴. ارائه پاسخ در ۵ لحن متمایز همراه با نکته اجرا و تحلیل روانشناسی مربی.`,
            templateText: `[دستورالعمل سیستمی مربی کاریزما]
شما دستیار ارشد هوش کلامی مرکز کاریزما هستید. با تکیه بر اطلاعات و پایگاه دانش زیر، موقعیت کاربر را تحلیل کرده و ۵ پاسخ آماده و کاربردی ارائه دهید.

[پایگاه دانش مرجع]:
{{CONTEXT}}

[چالش و پیام کاربر]:
"{{QUESTION}}"

[فرمت خروجی الزامی]:
پاسخ را مستقیماً بدون هیچ‌گونه مقدمه یا توضیح اضافی با ۵ لحن زیر ارائه دهید:

🔥 **لحن ۱: مقتدر و آلفا:**
«متن پیام قاطع، محکم، کوتاه و بدون نیاز به تایید»
📌 نکته اجرا: (زبان بدن و لحن صدا)

😊 **لحن ۲: صمیمی و دوستانه:**
«متن پیام گرم، خاکی، پرانرژی و راحت»
📌 نکته اجرا: (لبخند و تون صدا)

😎 **لحن ۳: باکلاس و کاریزماتیک:**
«متن پیام شیک، سنجیده، رازآلود و پرستیژ بالا»
📌 نکته اجرا: (آرامش کلامی و مکث طلایی)

❤️ **لحن ۴: احساسی و عاطفی:**
«متن پیام عمیق، همدلانه و متصل‌کننده قلب‌ها»
📌 نکته اجرا: (لحن نرم و توجه عمیق)

😂 **لحن ۵: شوخ‌طبع و کل‌کل + تحلیل مربی:**
«متن پیام طنز، رندانه و بازیگوشانه»
📌 نکته اجرا: (پوزخند خونسرد و شوخ‌طبعی)
🧠 تحلیل مربی: (روانشناسی پشت این موقعیت و راهکار برتری در مکالمه)`,
            isActive: true,
            createdAt: now,
            updatedAt: now
          },
          {
            id: 'pr_chat_flirt',
            name: 'الگوی مکالمات چت، استوری و جذب عاطفی (Flirting & Banter)',
            systemInstruction: `شما متخصص تعاملات چتی اینستاگرام و تلگرام، پاسخ به استوری‌ها، ایجاد کنجکاوی و شوخ‌طبعی جذاب هستید. پاسخ‌ها باید کوتاه، گیرا، دارای قلاب کلامی (Hook) و ایجادکننده میل به ادامه مکالمه باشند.`,
            templateText: `[پایگاه دانش ارتباطی]:
{{CONTEXT}}

[پیام یا استوری مخاطب]:
"{{QUESTION}}"

پاسخ را در قالب ۵ لحن اختصاصی مرکز کاریزما بنویسید.`,
            isActive: false,
            createdAt: now,
            updatedAt: now
          },
          {
            id: 'pr_workplace_boundary',
            name: 'الگوی کاریزما در محیط کار و مذاکره (قاطعیت و پرستیژ سازمانی)',
            systemInstruction: `شما مشاور فن بیان حرفه‌ای در محیط کار، مذاکرات و جلسات اداری هستید. آموزش نه گفتن محکم و شیک، تعیین حد و مرز محترمانه و ارتقای پرستیژ بدون تنش یا ابراز ضعف.`,
            templateText: `[پایگاه دانش مذاکره]:
{{CONTEXT}}

[موقعیت یا درخواست کاری]:
"{{QUESTION}}"

پاسخ را در قالب ۵ لحن اختصاصی مرکز کاریزما بنویسید.`,
            isActive: false,
            createdAt: now,
            updatedAt: now
          }
        ];
        await this.writeTable('prompts', defaultPrompts);
      }
    } catch (e) {
      console.error('[DBEngine Seed] Error during seed:', e);
    }
  }
}

// Automatically initialize seed on module load
DBEngine.initializeSeed();
