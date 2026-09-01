# گزارش ارزیابی و بنچمارک مربی محلی کاریزما (Coach Engine Benchmark Report)

**تاریخ و زمان اجرا:** `2026-09-01T14:19:45.359Z`  
**موتور مورد تست:** `Karizma Coach Local Non-AI Engine v1.0.0`  
**تعداد سناریوها:** `60000` | **تعداد فال‌بک‌ها:** `7` | **تعداد دسته‌بندی‌ها:** `7`  
**زمان شروع اولیه (Cold Start):** `9108.346 ms`

---

## ۱. نتایج کلی بنچمارک (Overall Summary)

| شاخص | مقدار |
|---|---|
| **تعداد کل آزمون‌ها (Total Tests)** | **122** |
| **تعداد آزمون‌های موفق (Passed)** | **122** |
| **تعداد آزمون‌های ناموفق (Failed)** | **0** |
| **نرخ موفقیت کلی (Pass Rate)** | **100%** |
| **دقت تطبیق دقیق (Exact Trigger Accuracy)** | **100%** |
| **دقت تطبیق مترادف‌ها (Alias Accuracy)** | **100%** |
| **دقت نرمال‌سازی فارسی/عربی** | **100%** |
| **دقت کلمات کلیدی (Keyword Accuracy)** | **100%** |
| **دقت تطبیق فازی/تری‌گرام (Fuzzy Accuracy)** | **100%** |
| **دقت واریانت‌های کل‌کل (Teasing Variations)** | **100%** |
| **نرخ فال‌بک ناخواسته / نرخ منفی کاذب (False Negative)** | **0%** |
| **نرخ مثبت کاذب (False Positive Rate)** | **0%** |
| **نرخ کلی هدایت به فال‌بک (Fallback Rate)** | **7.38%** |

---

## ۲. عملکرد و تاخیر (Latency & Throughput)

سنجش انجام‌شده بر روی **۱۰۰۰ درخواست متوالی** و **۵۰ درخواست همزمان**:

- **میانگین تاخیر (Average Latency):** `42.6 ms`
- **P50 Latency:** `0.113 ms`
- **P95 Latency:** `189.762 ms`
- **P99 Latency:** `258.041 ms`
- **حداکثر تاخیر (Max Latency):** `317.605 ms`
- **حداقل تاخیر (Min Latency):** `0.064 ms`
- **تست ۵۰ درخواست همزمان:** `1528.905 ms`

---

## ۳. ارزیابی پاسخ‌های ۵ لحن (Five-Tone Audit)

- **کامل بودن ۵ لحن در تمام سناریوها:** ✅ تایید شد
- **تست تنوع و چرخش پاسخ‌ها (Repetition Test):** در ۱۰ بار فراخوانی پیاپی یک عبارت، `1` پاسخ مجزا دریافت شد (چرخش پویا فعال نیست و پاسخ‌ها ثابت هستند).

---

## ۴. تایید عدم فراخوانی AI خارجی (Zero AI Call Verification)

- **وضعیت فراخوانی خارجی:** ✅ تایید شد (۰ درخواست خارجی)
- **مسیر اجرای زنده:**
  - `POST /api/ai/query (src/server/routes/ai.routes.ts)`
  - `coachEngine.processQuery() (src/server/coach/CoachEngine.ts)`
  - `PersianNormalizer.normalize() & tokenize()`
  - `CoachIndex.findByTrigger() & getCandidatesForTokens()`
  - `QueryMatcher.match() (exact trigger + trigram + token overlap)`
  - `RankingEngine.rankAndSelect()`
  - `ResponseSelector.formatResult()`
  - `AIService.logTrace() (local DB write to data/conversations.json & memory trace)`

---

## ۵. دسته‌بندی خطاهای شناسایی‌شده (Failure Classification)

| نوع شکست | تعداد |
|---|---|
| **CONTENT_GAP** (کمبود سناریو/تریگر برای واریانت‌های خاص مانند بچه‌ای/کل‌کل) | 0 |
| **RANKING_FAILURE** (انتخاب سناریوی نامناسب در ابهام) | 0 |
| **FALSE_NEGATIVE** (عدم شناسایی و هدایت به فال‌بک) | 0 |
| **FALSE_POSITIVE** (شناسایی اشتباه ورودی نامرتبط) | 0 |
| **TRIGGER_FAILURE** | 0 |
| **ALIAS_FAILURE** | 0 |
| **KEYWORD_FAILURE** | 0 |
| **FUZZY_MATCH_FAILURE** | 0 |
| **TONE_MAPPING_FAILURE** | 0 |

---

## ۶. لیست موارد ناموفق (Failed Test Cases)


