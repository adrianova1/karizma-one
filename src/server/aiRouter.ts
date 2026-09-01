import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { DBEngine } from './db.js';
import { Setting } from '../types.js';

// ============================================================================
// 1. Zod Validation Schemas & TypeScript Definitions
// ============================================================================

export const ExcelOptionsSchema = z.object({
  data: z.union([
    z.string(), // Base64 string or CSV string
    z.array(z.record(z.string(), z.unknown())), // Array of JSON objects
    z.array(z.array(z.unknown())) // Array of arrays (rows)
  ]).optional(),
  fileName: z.string().optional(),
  sheetName: z.string().optional(),
  maxRows: z.number().int().positive().optional().default(500),
  outputFormat: z.enum(['markdown', 'json', 'csv']).optional().default('markdown')
}).optional();

export type ExcelOptions = z.infer<typeof ExcelOptionsSchema>;

export const AIRequestOptionsSchema = z.object({
  promptText: z.string()
    .min(1, 'متن پرامپت نمی‌تواند خالی باشد.')
    .max(128000, 'طول پرامپت بیش از حد مجاز است (حداکثر ۱۲۸۰۰۰ کاراکتر).'),
  
  systemInstruction: z.string()
    .min(1, 'دستورالعمل سیستمی نمی‌تواند خالی باشد.')
    .max(64000, 'دستورالعمل سیستمی بیش از حد مجاز است.'),
  
  temperature: z.number().min(0).max(2.0).optional().default(0.75),
  top_p: z.number().min(0).max(1.0).optional(),
  top_k: z.number().int().positive().optional(),
  presence_penalty: z.number().min(-2.0).max(2.0).optional(),
  frequency_penalty: z.number().min(-2.0).max(2.0).optional(),
  max_tokens: z.number().int().positive().max(32768).optional().default(3500),
  minResponseLength: z.number().int().nonnegative().optional().default(10),
  
  // Preferred Provider & Custom Model Override
  provider: z.enum(['gemini', 'openai', 'claude', 'groq', 'openrouter', 'custom']).optional(),
  model: z.string().optional(),

  // Excel Processing Integration
  excelData: z.union([
    z.string(), // Base64 encoded or raw string
    z.array(z.record(z.string(), z.unknown())),
    z.array(z.array(z.unknown()))
  ]).optional(),
  excelOptions: ExcelOptionsSchema,

  // Security & Tracking Metadata
  userId: z.string().optional(),
  clientIp: z.string().optional(),
  signal: z.instanceof(AbortSignal).optional()
});

export type AIRequestOptions = z.infer<typeof AIRequestOptionsSchema>;

export type ProviderName = 'gemini' | 'openai' | 'claude' | 'groq' | 'openrouter' | 'custom';

export interface AIProviderResponse {
  text: string;
  providerUsed: ProviderName;
  modelUsed: string;
  durationMs: number;
  excelProcessed?: boolean;
  excelSummary?: string;
}

export interface AIStreamChunk {
  text: string;
  isFinished: boolean;
  providerUsed: ProviderName;
  modelUsed: string;
}

export type AIErrorType = 
  | 'authentication_error'      // 401, 403, API_KEY_INVALID, PERMISSION_DENIED
  | 'quota_rate_limit_error'    // 429, RESOURCE_EXHAUSTED, Quota Exceeded
  | 'model_not_found_error'     // 404, NOT_FOUND, model does not exist
  | 'timeout_error'             // Timeout, ETIMEDOUT, Aborted
  | 'network_error'             // ECONNREFUSED, ENOTFOUND, fetch failed
  | 'server_error'              // 500, 502, 503, 504, UNAVAILABLE, Overloaded
  | 'validation_error'          // Empty / malformed response
  | 'aborted_error'             // Client disconnect or explicit abort
  | 'rate_limit_exceeded'       // Internal sliding-window rate limit reached
  | 'excel_parse_error'         // Invalid or corrupt Excel file format
  | 'unknown_error';

export interface DetailedErrorInfo {
  provider: ProviderName;
  model: string;
  httpStatus: number | string;
  errorCode: string;
  apiErrorMessage: string;
  errorType: AIErrorType;
  timestamp: string;
}

export interface ProviderHealthStatus {
  name: ProviderName;
  qualityScore: number;
  baseQualityScore: number;
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  cooldownUntil?: number;
  lastErrorType?: AIErrorType;
  lastDetailedError?: DetailedErrorInfo;
  lastSuccess?: string;
  lastError?: string;
}

export interface CallState {
  totalCalls: number;
  maxCalls: number;
}

export interface AIProvider {
  name: ProviderName;
  call(options: AIRequestOptions, callState: CallState): Promise<AIProviderResponse>;
  stream?(
    options: AIRequestOptions, 
    callState: CallState, 
    onChunk: (chunk: string) => void
  ): Promise<AIProviderResponse>;
}

export interface ExcelParseResult {
  success: boolean;
  text: string;
  rowCount: number;
  columnCount: number;
  sheetNames: string[];
  error?: string;
}

// ============================================================================
// 2. Excel (XLSX) Data Parsing & Processing Engine
// ============================================================================

export class ExcelProcessor {
  /**
   * Safe parser for converting Excel / CSV / Base64 / Array data into clean text representation
   */
  public static parseExcelInput(
    rawInput: unknown,
    options?: ExcelOptions
  ): ExcelParseResult {
    try {
      if (!rawInput) {
        return {
          success: false,
          text: '',
          rowCount: 0,
          columnCount: 0,
          sheetNames: [],
          error: 'داده فایلی برای پردازش ارسال نشده است.'
        };
      }

      const maxRows = options?.maxRows ?? 500;
      const outputFormat = options?.outputFormat ?? 'markdown';
      const requestedSheetName = options?.sheetName;

      let workbook: XLSX.WorkBook | null = null;

      // 1. Array of JSON objects or array of arrays
      if (Array.isArray(rawInput)) {
        if (rawInput.length === 0) {
          return { success: true, text: 'جدول اکسل خالی است.', rowCount: 0, columnCount: 0, sheetNames: ['Sheet1'] };
        }

        const sheet = XLSX.utils.json_to_sheet(rawInput as Record<string, unknown>[]);
        workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
      } 
      // 2. Base64 string or Binary Buffer or CSV Text
      else if (typeof rawInput === 'string') {
        const cleanStr = rawInput.trim();

        // Check if string is Base64 data URL
        if (cleanStr.startsWith('data:') || /^[A-Za-z0-9+/=]+$/.test(cleanStr.replace(/\s/g, '').substring(0, 100))) {
          const base64Data = cleanStr.includes('base64,') ? cleanStr.split('base64,')[1] : cleanStr;
          const buffer = Buffer.from(base64Data, 'base64');
          workbook = XLSX.read(buffer, { type: 'buffer' });
        } else {
          // Plain text / CSV format
          workbook = XLSX.read(cleanStr, { type: 'string' });
        }
      } else if (Buffer.isBuffer(rawInput) || rawInput instanceof Uint8Array) {
        workbook = XLSX.read(rawInput, { type: 'buffer' });
      }

      if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        return {
          success: false,
          text: '',
          rowCount: 0,
          columnCount: 0,
          sheetNames: [],
          error: 'فایل اکسل ارسالی ساختار معتبری ندارد یا خالی است.'
        };
      }

      const sheetNames = workbook.SheetNames;
      const targetSheetName = (requestedSheetName && sheetNames.includes(requestedSheetName))
        ? requestedSheetName
        : sheetNames[0];

      const worksheet = workbook.Sheets[targetSheetName];
      if (!worksheet) {
        return {
          success: false,
          text: '',
          rowCount: 0,
          columnCount: 0,
          sheetNames,
          error: `برگه (Sheet) با نام "${targetSheetName}" در فایل اکسل یافت نشد.`
        };
      }

      // Convert worksheet to JSON rows for formatting
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
      const rowCount = rawRows.length;
      const sampleRow = rawRows[0] || {};
      const columnCount = Object.keys(sampleRow).length;

      const trimmedRows = rawRows.slice(0, maxRows);
      let formattedText = '';

      if (outputFormat === 'json') {
        formattedText = JSON.stringify(trimmedRows, null, 2);
      } else if (outputFormat === 'csv') {
        formattedText = XLSX.utils.sheet_to_csv(worksheet);
      } else {
        // Default: Markdown Table
        if (trimmedRows.length > 0) {
          const headers = Object.keys(trimmedRows[0]);
          const headerLine = `| ${headers.join(' | ')} |`;
          const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;
          const dataLines = trimmedRows.map(row => {
            const vals = headers.map(h => String(row[h] ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' '));
            return `| ${vals.join(' | ')} |`;
          });
          formattedText = [headerLine, separatorLine, ...dataLines].join('\n');
        } else {
          formattedText = 'جدول فاقد داده است.';
        }
      }

      if (rowCount > maxRows) {
        formattedText += `\n\n[هشدار سیستم: تعداد کل سطرهای اکسل ${rowCount} عدد است، اما به دلیل محدودیت پردازش، فقط ${maxRows} سطر اول درج شد.]`;
      }

      const fileNameNotice = options?.fileName ? `نام فایل: ${options.fileName} | ` : '';
      const summaryHeader = `--- داده‌های استخراج شده از اکسل (${fileNameNotice}برگه: ${targetSheetName} | تعداد سطر: ${rowCount}) ---\n`;

      return {
        success: true,
        text: summaryHeader + formattedText,
        rowCount,
        columnCount,
        sheetNames
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        text: '',
        rowCount: 0,
        columnCount: 0,
        sheetNames: [],
        error: `خطا در خواندن فایل اکسل: ${msg}`
      };
    }
  }
}

// Helper export for direct usage
export function parseExcelFileToPrompt(excelData: unknown, options?: ExcelOptions): ExcelParseResult {
  return ExcelProcessor.parseExcelInput(excelData, options);
}

// ============================================================================
// 3. Security: Anti-Prompt Injection, Sanitization & In-Memory Rate Limiting
// ============================================================================

export function sanitizeLog(text: unknown): string {
  if (!text) return '';
  return String(text)
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_GEMINI_KEY]')
    .replace(/sk-[0-9A-Za-z-_]{32,}/g, '[REDACTED_OPENAI_KEY]')
    .replace(/sk-ant-api[0-9A-Za-z-_]{32,}/g, '[REDACTED_CLAUDE_KEY]')
    .replace(/gsk_[0-9A-Za-z-_]{20,}/g, '[REDACTED_GROQ_KEY]')
    .replace(/sk-or-v1-[0-9A-Za-z-_]{20,}/g, '[REDACTED_OPENROUTER_KEY]')
    .replace(/key=[^&\s]+/gi, 'key=[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9-_.]+/gi, 'Bearer [REDACTED]')
    .replace(/apiKey=[^&\s]+/gi, 'apiKey=[REDACTED]');
}

export function sanitizePromptInput(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFKC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .trim();
}

export class AIRateLimiter {
  private static requests = new Map<string, number[]>();
  private static readonly WINDOW_MS = 60_000;
  private static readonly MAX_REQUESTS_PER_WINDOW = 35;

  public static isAllowed(identifier: string): boolean {
    if (!identifier) return true;
    const now = Date.now();
    const timestamps = this.requests.get(identifier) || [];
    
    const validTimestamps = timestamps.filter(t => now - t < this.WINDOW_MS);
    
    if (validTimestamps.length >= this.MAX_REQUESTS_PER_WINDOW) {
      this.requests.set(identifier, validTimestamps);
      return false;
    }
    
    validTimestamps.push(now);
    this.requests.set(identifier, validTimestamps);
    return true;
  }

  public static cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.requests.entries()) {
      const valid = timestamps.filter(t => now - t < this.WINDOW_MS);
      if (valid.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, valid);
      }
    }
  }
}

setInterval(() => AIRateLimiter.cleanup(), 300_000).unref();

// ============================================================================
// 4. Error Classification & Structured Diagnostic Logging
// ============================================================================

export function parseAndClassifyError(
  err: unknown,
  provider: ProviderName,
  model: string
): DetailedErrorInfo {
  const errObj = typeof err === 'object' && err !== null ? (err as Record<string, unknown>) : {};
  const rawMsg = String(errObj.message || err || '');
  const cleanMsg = sanitizeLog(rawMsg);

  let httpStatus: number | string = 
    (typeof errObj.status === 'number' || typeof errObj.status === 'string' ? errObj.status : null) ||
    (typeof errObj.statusCode === 'number' || typeof errObj.statusCode === 'string' ? errObj.statusCode : null) ||
    'N/A';

  if (httpStatus === 'N/A') {
    const statusMatch = cleanMsg.match(/\b(400|401|403|404|429|500|502|503|504)\b/);
    if (statusMatch) {
      httpStatus = parseInt(statusMatch[1], 10);
    }
  }

  let errorCode = String(errObj.code || '');
  if (!errorCode) {
    if (cleanMsg.includes('RESOURCE_EXHAUSTED')) errorCode = 'RESOURCE_EXHAUSTED';
    else if (cleanMsg.includes('API_KEY_INVALID')) errorCode = 'API_KEY_INVALID';
    else if (cleanMsg.includes('PERMISSION_DENIED')) errorCode = 'PERMISSION_DENIED';
    else if (cleanMsg.includes('NOT_FOUND') || httpStatus === 404) errorCode = 'MODEL_NOT_FOUND';
    else if (cleanMsg.includes('UNAVAILABLE') || httpStatus === 503) errorCode = 'SERVICE_UNAVAILABLE';
    else if (cleanMsg.includes('ETIMEDOUT') || cleanMsg.includes('Timeout') || cleanMsg.includes('timed out')) errorCode = 'TIMEOUT';
    else if (cleanMsg.includes('ECONNREFUSED') || cleanMsg.includes('fetch failed')) errorCode = 'NETWORK_ERROR';
    else if (cleanMsg.includes('aborted') || cleanMsg.includes('AbortError')) errorCode = 'ABORTED';
    else if (cleanMsg.includes('اکسل')) errorCode = 'EXCEL_ERROR';
    else if (httpStatus !== 'N/A') errorCode = `HTTP_${httpStatus}`;
    else errorCode = 'INTERNAL_ERROR';
  }

  let errorType: AIErrorType = 'unknown_error';
  const checkStr = (cleanMsg + ' ' + errorCode + ' ' + httpStatus).toLowerCase();

  if (
    httpStatus === 401 || 
    httpStatus === 403 || 
    checkStr.includes('api_key_invalid') || 
    checkStr.includes('permission_denied') || 
    checkStr.includes('unauthenticated') || 
    checkStr.includes('unauthorized') ||
    checkStr.includes('invalid_api_key')
  ) {
    errorType = 'authentication_error';
  } else if (
    httpStatus === 429 || 
    checkStr.includes('resource_exhausted') || 
    checkStr.includes('quota') || 
    checkStr.includes('rate limit') || 
    checkStr.includes('rate_limit') ||
    checkStr.includes('limit:')
  ) {
    errorType = 'quota_rate_limit_error';
  } else if (
    httpStatus === 404 || 
    checkStr.includes('not_found') || 
    checkStr.includes('does not exist') ||
    checkStr.includes('is not supported') ||
    checkStr.includes('decommissioned')
  ) {
    errorType = 'model_not_found_error';
  } else if (checkStr.includes('abort') || checkStr.includes('aborterror') || checkStr.includes('canceled')) {
    errorType = 'aborted_error';
  } else if (
    checkStr.includes('timeout') || 
    checkStr.includes('timed out') || 
    checkStr.includes('etimedout')
  ) {
    errorType = 'timeout_error';
  } else if (
    checkStr.includes('fetch failed') || 
    checkStr.includes('econnrefused') || 
    checkStr.includes('enotfound') || 
    checkStr.includes('network')
  ) {
    errorType = 'network_error';
  } else if (
    httpStatus === 500 || 
    httpStatus === 502 || 
    httpStatus === 503 || 
    httpStatus === 504 || 
    checkStr.includes('unavailable') || 
    checkStr.includes('overloaded') || 
    checkStr.includes('high demand')
  ) {
    errorType = 'server_error';
  } else if (checkStr.includes('اکسل')) {
    errorType = 'excel_parse_error';
  } else if (
    checkStr.includes('پاسخ دریافت شده') || 
    checkStr.includes('کیفیت یا طول لازم را ندارد') || 
    checkStr.includes('empty response')
  ) {
    errorType = 'validation_error';
  }

  return {
    provider,
    model,
    httpStatus,
    errorCode: String(errorCode),
    apiErrorMessage: cleanMsg,
    errorType,
    timestamp: new Date().toISOString()
  };
}

export function logDetailedAIError(info: DetailedErrorInfo): void {
  const isFatal = info.errorType === 'authentication_error';
  const msg = `[AI Engine Diagnostics] Provider: ${info.provider.toUpperCase()} | Model: ${info.model} | Status: ${info.httpStatus || info.errorType} | ${info.apiErrorMessage.slice(0, 150)}`;
  if (isFatal) {
    console.error(msg);
  } else {
    console.log(msg);
  }
}

const modelQuotaCooldown: Record<string, number> = {};

// ============================================================================
// 5. Quality Scoring, Cooldown Management & API Key Resolution
// ============================================================================

export const BASE_QUALITY_SCORES: Record<ProviderName, number> = {
  custom: 250,     // Primary Provider (Aval AI / Custom)
  gemini: 200,
  openai: 180,
  claude: 170,
  groq: 140,
  openrouter: 120
};

const providerHealthStore: Record<ProviderName, ProviderHealthStatus> = {
  gemini: { name: 'gemini', qualityScore: BASE_QUALITY_SCORES.gemini, baseQualityScore: BASE_QUALITY_SCORES.gemini, successCount: 0, failureCount: 0, consecutiveFailures: 0, status: 'healthy' },
  openai: { name: 'openai', qualityScore: BASE_QUALITY_SCORES.openai, baseQualityScore: BASE_QUALITY_SCORES.openai, successCount: 0, failureCount: 0, consecutiveFailures: 0, status: 'healthy' },
  claude: { name: 'claude', qualityScore: BASE_QUALITY_SCORES.claude, baseQualityScore: BASE_QUALITY_SCORES.claude, successCount: 0, failureCount: 0, consecutiveFailures: 0, status: 'healthy' },
  groq: { name: 'groq', qualityScore: BASE_QUALITY_SCORES.groq, baseQualityScore: BASE_QUALITY_SCORES.groq, successCount: 0, failureCount: 0, consecutiveFailures: 0, status: 'healthy' },
  openrouter: { name: 'openrouter', qualityScore: BASE_QUALITY_SCORES.openrouter, baseQualityScore: BASE_QUALITY_SCORES.openrouter, successCount: 0, failureCount: 0, consecutiveFailures: 0, status: 'healthy' },
  custom: { name: 'custom', qualityScore: BASE_QUALITY_SCORES.custom, baseQualityScore: BASE_QUALITY_SCORES.custom, successCount: 0, failureCount: 0, consecutiveFailures: 0, status: 'healthy' }
};

export async function getAIKey(keyName: string, envVar: string, legacyFallbackKey?: string): Promise<string> {
  try {
    const settings = await DBEngine.readTable<Setting>('settings');
    const normalizedKey = keyName.toLowerCase();
    const aliases = [
      normalizedKey,
      `ai_${normalizedKey}`,
      `ai_${normalizedKey.replace(/_api_key$/, '_key')}`,
      normalizedKey.replace(/_api_key$/, '_key'),
      normalizedKey.replace(/^ai_/, '')
    ];
    const setting = settings.find(s => aliases.includes(s.key.toLowerCase()));
    if (setting && setting.value && setting.value.trim().length > 0) {
      return setting.value.trim();
    }
  } catch {
    // Graceful fallback to envVar
  }
  const envKey = (process.env[envVar] || '').trim();
  if (envKey) return envKey;
  if (legacyFallbackKey && !legacyFallbackKey.startsWith('gsk_Fe1xwr') && !legacyFallbackKey.startsWith('sk-or-v1-')) {
    return legacyFallbackKey.trim();
  }
  return '';
}

export function evaluateAndRefreshProviderHealth(providerName: ProviderName): ProviderHealthStatus {
  const health = providerHealthStore[providerName];
  const now = Date.now();

  if (health.cooldownUntil && now >= health.cooldownUntil) {
    console.info(`[AI Router Health] Cooldown elapsed for provider ${providerName}. Restoring healthy status.`);
    health.cooldownUntil = undefined;
    health.status = health.consecutiveFailures > 2 ? 'degraded' : 'healthy';
    health.qualityScore = Math.max(health.baseQualityScore - 15, 75);
  }

  return health;
}

function recordProviderSuccess(providerName: ProviderName): void {
  const health = providerHealthStore[providerName];
  health.successCount++;
  health.consecutiveFailures = 0;
  health.cooldownUntil = undefined;
  health.qualityScore = Math.min(250, Math.max(health.baseQualityScore, health.qualityScore + 5));
  health.status = 'healthy';
  health.lastSuccess = new Date().toISOString();
}

function recordProviderFailure(
  providerName: ProviderName,
  errorInput: DetailedErrorInfo | string
): void {
  const info: DetailedErrorInfo = typeof errorInput === 'string' 
    ? parseAndClassifyError(new Error(errorInput), providerName, 'default')
    : errorInput;

  if (info.apiErrorMessage.includes('یافت نشد') || info.apiErrorMessage.includes('تنظیم نشده')) {
    return;
  }

  const health = providerHealthStore[providerName];
  health.failureCount++;
  health.consecutiveFailures++;
  health.lastErrorType = info.errorType;
  health.lastDetailedError = info;
  health.lastError = info.apiErrorMessage;

  const now = Date.now();

  switch (info.errorType) {
    case 'quota_rate_limit_error':
      health.cooldownUntil = now + 45_000;
      health.qualityScore = Math.max(25, health.baseQualityScore - 60);
      health.status = 'degraded';
      break;

    case 'authentication_error':
      health.cooldownUntil = now + 120_000;
      health.qualityScore = 0;
      health.status = 'unhealthy';
      break;

    case 'model_not_found_error':
      health.cooldownUntil = now + 15_000;
      health.qualityScore = Math.max(30, health.qualityScore - 20);
      health.status = 'degraded';
      break;

    case 'timeout_error':
    case 'network_error':
      health.qualityScore = Math.max(35, health.qualityScore - 15);
      if (health.consecutiveFailures >= 3) {
        health.cooldownUntil = now + 30_000;
        health.status = 'unhealthy';
      } else if (health.consecutiveFailures >= 1) {
        health.status = 'degraded';
      }
      break;

    case 'server_error':
      health.cooldownUntil = now + 30_000;
      health.qualityScore = Math.max(30, health.qualityScore - 20);
      health.status = 'degraded';
      break;

    default:
      health.qualityScore = Math.max(20, health.qualityScore - 15);
      if (health.consecutiveFailures >= 3) {
        health.status = 'unhealthy';
      }
      break;
  }
}

function validateResponseQuality(text: string | undefined | null, minLength: number): string {
  if (!text) {
    throw new Error('پاسخ دریافت شده از مدل خالی است.');
  }
  const trimmed = text.trim();
  if (trimmed.length < minLength) {
    throw new Error(`پاسخ دریافتی کیفیت یا طول لازم را ندارد (طول: ${trimmed.length} کاراکتر، حداقل: ${minLength} کاراکتر).`);
  }
  return trimmed;
}

// ============================================================================
// 6. Provider Implementations (Gemini [Default], OpenAI, Claude, Groq, OpenRouter, Custom)
// ============================================================================

/**
 * 1. Gemini Provider (Primary Default Provider)
 */
export class GeminiProvider implements AIProvider {
  name = 'gemini' as const;

  async call(options: AIRequestOptions, callState: CallState): Promise<AIProviderResponse> {
    const apiKeysRaw = await getAIKey('gemini_api_key', 'GEMINI_API_KEY');
    if (!apiKeysRaw) {
      throw new Error('کلید API گوگل (Gemini) در تنظیمات سیستم یا Environment Variable یافت نشد.');
    }
    const apiKeys = apiKeysRaw.split(',').map(k => k.trim()).filter(k => k.length > 0);
    const minLength = options.minResponseLength ?? 10;
    const startTime = Date.now();

    const settings = await DBEngine.readTable<Setting>('settings');
    const customModel = options.model || settings.find(s => s.key === 'ai_gemini_model' || s.key === 'gemini_model' || s.key === 'ai_custom_model')?.value?.trim();

    const now = Date.now();
    const defaultModels = [
      'gemini-3.7-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash',
      'gemini-flash-lite-latest'
    ];

    const rawModels = [
      ...(customModel && customModel.startsWith('gemini') ? [customModel] : []),
      ...defaultModels
    ];
    
    const uniqueModels = Array.from(new Set(rawModels));
    const modelsToTry = uniqueModels.sort((a, b) => {
      const cdA = modelQuotaCooldown[a] && modelQuotaCooldown[a] > now ? 1 : 0;
      const cdB = modelQuotaCooldown[b] && modelQuotaCooldown[b] > now ? 1 : 0;
      return cdA - cdB;
    });

    let lastError: Error | null = null;
    let lastErrorInfo: DetailedErrorInfo | null = null;

    for (const apiKey of apiKeys) {
      if (callState.totalCalls >= callState.maxCalls) break;
      if (options.signal?.aborted) throw new Error('درخواست توسط کاربر یا کلاینت متوقف شد.');

      const client = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });

      for (const model of modelsToTry) {
        if (callState.totalCalls >= callState.maxCalls) break;
        if (options.signal?.aborted) throw new Error('درخواست توسط کاربر یا کلاینت متوقف شد.');

        let attemptsForModel = 0;
        const maxAttempts = 2;

        while (attemptsForModel < maxAttempts) {
          if (callState.totalCalls >= callState.maxCalls) break;
          if (options.signal?.aborted) throw new Error('درخواست توسط کاربر یا کلاینت متوقف شد.');

          attemptsForModel++;
          callState.totalCalls++;
          let timeoutHandle: NodeJS.Timeout | null = null;

          try {
            const config: Record<string, unknown> = {
              systemInstruction: sanitizePromptInput(options.systemInstruction),
              temperature: options.temperature ?? 0.75,
            };

            if (options.top_p !== undefined) config.topP = options.top_p;
            if (options.top_k !== undefined) config.topK = options.top_k;
            if (options.max_tokens !== undefined) config.maxOutputTokens = options.max_tokens;

            const modelCallPromise = client.models.generateContent({
              model: model,
              contents: sanitizePromptInput(options.promptText),
              config: config
            });

            const modelTimeoutPromise = new Promise<never>((_, reject) => {
              timeoutHandle = setTimeout(() => reject(new Error('Timeout')), 22000);
            });

            const response = await Promise.race([modelCallPromise, modelTimeoutPromise]);
            if (timeoutHandle) clearTimeout(timeoutHandle);

            const validText = validateResponseQuality(response.text, minLength);
            
            console.log(`[Gemini] Success | Model: ${model} | API Calls: ${callState.totalCalls} | Latency: ${Date.now() - startTime}ms`);
            return {
              text: validText,
              providerUsed: 'gemini',
              modelUsed: model,
              durationMs: Date.now() - startTime
            };
          } catch (err: unknown) {
            if (timeoutHandle) clearTimeout(timeoutHandle);
            const errorInstance = err instanceof Error ? err : new Error(String(err));
            lastError = errorInstance;
            const errorInfo = parseAndClassifyError(err, 'gemini', model);
            lastErrorInfo = errorInfo;

            if (errorInfo.errorType === 'aborted_error') {
              throw errorInstance;
            }

            if (errorInfo.errorType === 'authentication_error') {
              logDetailedAIError(errorInfo);
              break;
            }

            const isHardQuota = errorInfo.apiErrorMessage.includes('Quota exceeded') ||
              errorInfo.apiErrorMessage.includes('RESOURCE_EXHAUSTED') ||
              errorInfo.apiErrorMessage.includes('PerDay') ||
              errorInfo.apiErrorMessage.includes('free_tier_requests');

            if (errorInfo.errorType === 'quota_rate_limit_error') {
              logDetailedAIError(errorInfo);
              if (isHardQuota || attemptsForModel >= maxAttempts) {
                modelQuotaCooldown[model] = Date.now() + 60000;
                console.log(`[Gemini] Quota exhausted on ${model}. Switching to next model...`);
                break;
              } else {
                console.log(`[Gemini] 429 Rate Limit on ${model}. Retrying in 1.5s...`);
                await new Promise(r => setTimeout(r, 1500));
                continue;
              }
            }

            if (errorInfo.errorType === 'server_error' || errorInfo.httpStatus === 503) {
              logDetailedAIError(errorInfo);
              console.warn(`[Gemini] Model ${model} high demand (${errorInfo.httpStatus || '503'}). Switching to next model...`);
              break;
            }

            if (errorInfo.errorType === 'timeout_error' && attemptsForModel < maxAttempts && callState.totalCalls < callState.maxCalls) {
              console.warn(`[Gemini] Timeout on ${model}. Retrying...`);
              continue;
            }

            logDetailedAIError(errorInfo);
            break;
          }
        }

        if (lastErrorInfo?.errorType === 'authentication_error') {
          break;
        }
      }
    }

    const finalErr = lastError || new Error('هیچ‌یک از کلیدهای API و مدل‌های Gemini پاسخ معتبری برنگرداندند.');
    if (lastErrorInfo) {
      Object.assign(finalErr, { detailedError: lastErrorInfo });
    }
    throw finalErr;
  }

  async stream(
    options: AIRequestOptions, 
    callState: CallState, 
    onChunk: (chunk: string) => void
  ): Promise<AIProviderResponse> {
    const apiKeysRaw = await getAIKey('gemini_api_key', 'GEMINI_API_KEY');
    if (!apiKeysRaw) {
      throw new Error('کلید API گوگل (Gemini) در تنظیمات سیستم یافت نشد.');
    }
    const apiKeys = apiKeysRaw.split(',').map(k => k.trim()).filter(k => k.length > 0);
    const startTime = Date.now();
    const model = options.model || 'gemini-3.7-flash';
    callState.totalCalls++;

    const client = new GoogleGenAI({
      apiKey: apiKeys[0],
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const streamConfig: Record<string, unknown> = {
      systemInstruction: sanitizePromptInput(options.systemInstruction),
      temperature: options.temperature ?? 0.75,
    };
    if (options.top_p !== undefined) streamConfig.topP = options.top_p;
    if (options.top_k !== undefined) streamConfig.topK = options.top_k;
    if (options.max_tokens !== undefined) streamConfig.maxOutputTokens = options.max_tokens;

    const responseStream = await client.models.generateContentStream({
      model: model,
      contents: sanitizePromptInput(options.promptText),
      config: streamConfig
    });

    let fullText = '';
    for await (const chunk of responseStream) {
      if (options.signal?.aborted) {
        throw new Error('استریم توسط کلاینت متوقف شد.');
      }
      const chunkText = chunk.text || '';
      if (chunkText) {
        fullText += chunkText;
        onChunk(chunkText);
      }
    }

    return {
      text: fullText,
      providerUsed: 'gemini',
      modelUsed: model,
      durationMs: Date.now() - startTime
    };
  }
}

/**
 * 2. OpenAI Provider
 */
export class OpenAIProvider implements AIProvider {
  name = 'openai' as const;

  async call(options: AIRequestOptions, callState: CallState): Promise<AIProviderResponse> {
    const apiKey = await getAIKey('openai_api_key', 'OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('کلید API OpenAI در تنظیمات سیستم یافت نشد.');
    }

    const minLength = options.minResponseLength ?? 10;
    const startTime = Date.now();
    const model = options.model || 'gpt-4o-mini';

    callState.totalCalls++;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const payload: Record<string, unknown> = {
        model,
        messages: [
          { role: 'system', content: sanitizePromptInput(options.systemInstruction) },
          { role: 'user', content: sanitizePromptInput(options.promptText) }
        ],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 3500
      };

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        const err = new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
        Object.assign(err, { status: res.status });
        throw err;
      }

      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      const answerText = data.choices?.[0]?.message?.content;
      const validText = validateResponseQuality(answerText, minLength);

      return {
        text: validText,
        providerUsed: 'openai',
        modelUsed: model,
        durationMs: Date.now() - startTime
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const info = parseAndClassifyError(err, 'openai', model);
      logDetailedAIError(info);
      const errorInstance = err instanceof Error ? err : new Error(String(err));
      Object.assign(errorInstance, { detailedError: info });
      throw errorInstance;
    }
  }
}

/**
 * 3. Anthropic Claude Provider
 */
export class ClaudeProvider implements AIProvider {
  name = 'claude' as const;

  async call(options: AIRequestOptions, callState: CallState): Promise<AIProviderResponse> {
    const apiKey = await getAIKey('claude_api_key', 'ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('کلید API سیستم Claude/Anthropic یافت نشد.');
    }

    const minLength = options.minResponseLength ?? 10;
    const startTime = Date.now();
    const model = options.model || 'claude-3-5-haiku-latest';

    callState.totalCalls++;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const payload: Record<string, unknown> = {
        model,
        system: sanitizePromptInput(options.systemInstruction),
        messages: [
          { role: 'user', content: sanitizePromptInput(options.promptText) }
        ],
        max_tokens: options.max_tokens ?? 3500,
        temperature: options.temperature ?? 0.7
      };

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        const err = new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
        Object.assign(err, { status: res.status });
        throw err;
      }

      const data = await res.json() as { content?: Array<{ text?: string }> };
      const answerText = data.content?.[0]?.text;
      const validText = validateResponseQuality(answerText, minLength);

      return {
        text: validText,
        providerUsed: 'claude',
        modelUsed: model,
        durationMs: Date.now() - startTime
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const info = parseAndClassifyError(err, 'claude', model);
      logDetailedAIError(info);
      const errorInstance = err instanceof Error ? err : new Error(String(err));
      Object.assign(errorInstance, { detailedError: info });
      throw errorInstance;
    }
  }
}

/**
 * 4. Groq Provider
 */
export class GroqProvider implements AIProvider {
  name = 'groq' as const;

  async call(options: AIRequestOptions, callState: CallState): Promise<AIProviderResponse> {
    const apiKeysRaw = await getAIKey('groq_api_key', 'GROQ_API_KEY');
    if (!apiKeysRaw) {
      throw new Error('کلید API سیستم Groq در تنظیمات یا Environment Variable یافت نشد.');
    }
    const apiKeys = apiKeysRaw.split(',').map(k => k.trim()).filter(k => k.length > 0);
    const minLength = options.minResponseLength ?? 10;
    const startTime = Date.now();

    const modelsToTry = [
      options.model || 'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant'
    ];
    let lastError: Error | null = null;
    let lastErrorInfo: DetailedErrorInfo | null = null;

    for (const apiKey of apiKeys) {
      if (callState.totalCalls >= callState.maxCalls) break;
      if (options.signal?.aborted) throw new Error('درخواست توسط کلاینت لغو شد.');

      for (const model of modelsToTry) {
        if (callState.totalCalls >= callState.maxCalls) break;
        if (options.signal?.aborted) throw new Error('درخواست توسط کلاینت لغو شد.');

        let attemptsForModel = 0;
        const maxAttempts = 2;

        while (attemptsForModel < maxAttempts) {
          if (callState.totalCalls >= callState.maxCalls) break;

          attemptsForModel++;
          callState.totalCalls++;
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            if (options.signal) {
              options.signal.addEventListener('abort', () => controller.abort(), { once: true });
            }

            const payload: Record<string, unknown> = {
              model: model,
              messages: [
                { role: 'system', content: sanitizePromptInput(options.systemInstruction) },
                { role: 'user', content: sanitizePromptInput(options.promptText) }
              ],
              temperature: options.temperature ?? 0.7,
              max_tokens: options.max_tokens ?? 3500
            };

            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload),
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
              const errText = await res.text();
              const err = new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
              Object.assign(err, { status: res.status });
              throw err;
            }

            const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
            const answerText = data.choices?.[0]?.message?.content;
            const validText = validateResponseQuality(answerText, minLength);

            console.log(`[Groq] Success | Model: ${model} | API Calls: ${callState.totalCalls} | Latency: ${Date.now() - startTime}ms`);
            return {
              text: validText,
              providerUsed: 'groq',
              modelUsed: model,
              durationMs: Date.now() - startTime
            };
          } catch (err: unknown) {
            const errorInstance = err instanceof Error ? err : new Error(String(err));
            lastError = errorInstance;
            const errorInfo = parseAndClassifyError(err, 'groq', model);
            lastErrorInfo = errorInfo;

            if (errorInfo.errorType === 'authentication_error') {
              logDetailedAIError(errorInfo);
              break;
            }
            if (errorInfo.errorType === 'quota_rate_limit_error' && attemptsForModel < maxAttempts && callState.totalCalls < callState.maxCalls) {
              console.warn(`[Groq] 429 Rate Limit on ${model}. Retrying in 2s...`);
              await new Promise(r => setTimeout(r, 2000));
              continue;
            }
            logDetailedAIError(errorInfo);
            break;
          }
        }
        if (lastErrorInfo?.errorType === 'authentication_error') break;
      }
    }

    const finalErr = lastError || new Error('هیچ‌یک از مدل‌های Groq با کلیدهای API ثبت‌شده پاسخ معتبری برنگرداندند.');
    if (lastErrorInfo) Object.assign(finalErr, { detailedError: lastErrorInfo });
    throw finalErr;
  }
}

/**
 * 5. OpenRouter Provider
 */
export class OpenRouterProvider implements AIProvider {
  name = 'openrouter' as const;

  async call(options: AIRequestOptions, callState: CallState): Promise<AIProviderResponse> {
    const apiKey = await getAIKey('openrouter_api_key', 'OPENROUTER_API_KEY');
    if (!apiKey) {
      throw new Error('کلید API سیستم OpenRouter در تنظیمات یا Environment Variable یافت نشد.');
    }

    const minLength = options.minResponseLength ?? 10;
    const startTime = Date.now();

    const modelsToTry = [
      options.model || 'meta-llama/llama-3.3-70b-instruct:free',
      'deepseek/deepseek-r1-distill-llama-70b:free'
    ];
    let lastError: Error | null = null;
    let lastErrorInfo: DetailedErrorInfo | null = null;

    for (const model of modelsToTry) {
      if (callState.totalCalls >= callState.maxCalls) break;
      if (options.signal?.aborted) throw new Error('درخواست توسط کلاینت لغو شد.');

      let attemptsForModel = 0;
      const maxAttempts = 2;

      while (attemptsForModel < maxAttempts) {
        if (callState.totalCalls >= callState.maxCalls) break;

        attemptsForModel++;
        callState.totalCalls++;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 14000);

          if (options.signal) {
            options.signal.addEventListener('abort', () => controller.abort(), { once: true });
          }

          const payload: Record<string, unknown> = {
            model: model,
            messages: [
              { role: 'system', content: sanitizePromptInput(options.systemInstruction) },
              { role: 'user', content: sanitizePromptInput(options.promptText) }
            ],
            temperature: options.temperature ?? 0.7,
            max_tokens: options.max_tokens ?? 3000
          };

          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'HTTP-Referer': 'https://karizmacenter.ir',
              'X-Title': 'Karizma Center AI',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!res.ok) {
            const errText = await res.text();
            const err = new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
            Object.assign(err, { status: res.status });
            throw err;
          }

          const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
          const answerText = data.choices?.[0]?.message?.content;
          const validText = validateResponseQuality(answerText, minLength);

          return {
            text: validText,
            providerUsed: 'openrouter',
            modelUsed: model,
            durationMs: Date.now() - startTime
          };
        } catch (err: unknown) {
          const errorInstance = err instanceof Error ? err : new Error(String(err));
          lastError = errorInstance;
          const errorInfo = parseAndClassifyError(err, 'openrouter', model);
          lastErrorInfo = errorInfo;

          if (errorInfo.errorType === 'authentication_error') {
            logDetailedAIError(errorInfo);
            break;
          }
          logDetailedAIError(errorInfo);
          break;
        }
      }
      if (lastErrorInfo?.errorType === 'authentication_error') break;
    }

    const finalErr = lastError || new Error('هیچ‌یک از مدل‌های OpenRouter پاسخ معتبری برنگرداندند.');
    if (lastErrorInfo) Object.assign(finalErr, { detailedError: lastErrorInfo });
    throw finalErr;
  }
}

/**
 * 6. Custom OpenAI-Compatible Provider
 */
export class CustomProvider implements AIProvider {
  name = 'custom' as const;

  async call(options: AIRequestOptions, callState: CallState): Promise<AIProviderResponse> {
    // اول از کلیدهای Aval AI و Custom بخون
    const endpoint = await getAIKey('custom_ai_endpoint', 'CUSTOM_AI_ENDPOINT') 
      || 'https://api.avalai.ir/v1/chat/completions';
    
    const apiKey = await getAIKey('custom_ai_key', 'CUSTOM_AI_KEY') 
      || await getAIKey('avalai_api_key', 'AVALAI_API_KEY');

    if (!apiKey) {
      throw new Error('کلید API Aval AI / Custom تنظیم نشده است. لطفاً در تنظیمات یا .env وارد کنید.');
    }

    const minLength = options.minResponseLength ?? 10;
    const startTime = Date.now();
    // مدل پیشفرض ارزان و مناسب (بعداً میتونی عوض کنی)
    const model = options.model || 'gpt-4o-mini';

    callState.totalCalls++;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };

      const payload = {
        model,
        messages: [
          { role: 'system', content: sanitizePromptInput(options.systemInstruction) },
          { role: 'user', content: sanitizePromptInput(options.promptText) }
        ],
        temperature: options.temperature ?? 0.85,
        max_tokens: options.max_tokens ?? 3500,
        top_p: options.top_p ?? 0.95,
        presence_penalty: options.presence_penalty ?? 0.6,
        frequency_penalty: options.frequency_penalty ?? 0.55
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 300)}`);
      }

      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      const answerText = data.choices?.[0]?.message?.content;
      const validText = validateResponseQuality(answerText, minLength);

      return {
        text: validText,
        providerUsed: 'custom',
        modelUsed: model,
        durationMs: Date.now() - startTime
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const info = parseAndClassifyError(err, 'custom', model);
      logDetailedAIError(info);
      const errorInstance = err instanceof Error ? err : new Error(String(err));
      Object.assign(errorInstance, { detailedError: info });
      throw errorInstance;
    }
  }
}

// Instantiate Global Singletons
const registeredProvidersMap: Map<ProviderName, AIProvider> = new Map<ProviderName, AIProvider>([
  ['gemini', new GeminiProvider()],
  ['openai', new OpenAIProvider()],
  ['claude', new ClaudeProvider()],
  ['groq', new GroqProvider()],
  ['openrouter', new OpenRouterProvider()],
  ['custom', new CustomProvider()]
]);

// ============================================================================
// 7. Main Orchestrator: Dynamic Dispatcher & Failover Engine
// ============================================================================

/**
 * Validates request schema, processes Excel files if attached, and dispatches AI generation across providers with fallback
 */
export async function generateMultiProviderAIResponse(
  rawOptions: unknown
): Promise<AIProviderResponse> {
  try {
    // 1. Zod Schema Validation
    const parseResult = AIRequestOptionsSchema.safeParse(rawOptions);
    if (!parseResult.success) {
      const errorDetails = parseResult.error.issues.map(e => e.message).join(' | ');
      throw new Error(`خطای اعتبارسنجی ورودی هوش مصنوعی: ${errorDetails}`);
    }
    const options: AIRequestOptions = { ...parseResult.data };

    // 2. Sliding Window Rate Limiter
    const rateLimitIdentifier = options.userId || options.clientIp;
    if (rateLimitIdentifier && !AIRateLimiter.isAllowed(rateLimitIdentifier)) {
      throw new Error('تعداد درخواست‌های هوش مصنوعی شما بیش از حد مجاز در دقیقه است. لطفاً چند لحظه صبر کنید.');
    }

    // 3. Process Excel File if present in request
    let excelSummaryInfo = '';
    let isExcelProcessed = false;

    if (options.excelData) {
      const excelResult = ExcelProcessor.parseExcelInput(options.excelData, options.excelOptions);
      if (excelResult.success && excelResult.text) {
        options.promptText = `${options.promptText.trim()}\n\n${excelResult.text}`;
        isExcelProcessed = true;
        excelSummaryInfo = `برگه: ${excelResult.sheetNames.join(', ')} (${excelResult.rowCount} سطر)`;
      } else if (excelResult.error) {
        console.warn(`[AI Engine Router] Excel parsing warning: ${excelResult.error}`);
      }
    }

    // 4. Resolve Active Configured Providers - اولویت با Aval AI (Custom)
    const availableProviders: AIProvider[] = [];

    // اول Custom (Aval AI) رو بگذار
    const customProvider = registeredProvidersMap.get('custom')!;
    availableProviders.push(customProvider);

    // بعد اگر کاربر provider خاصی خواسته
    if (options.provider && registeredProvidersMap.has(options.provider) && options.provider !== 'custom') {
      availableProviders.push(registeredProvidersMap.get(options.provider)!);
    }

    // بعد بقیه (Gemini, Groq و ...) فقط اگر کلید داشته باشن
    for (const [name, p] of registeredProvidersMap.entries()) {
      if (!availableProviders.includes(p)) {
        if (name === 'gemini') {
          const key = await getAIKey('gemini_api_key', 'GEMINI_API_KEY');
          if (key) availableProviders.push(p);
        } else if (name === 'groq') {
          const key = await getAIKey('groq_api_key', 'GROQ_API_KEY');
          if (key) availableProviders.push(p);
        } else if (name === 'openrouter') {
          const key = await getAIKey('openrouter_api_key', 'OPENROUTER_API_KEY');
          if (key) availableProviders.push(p);
        } else if (name === 'openai') {
          const key = await getAIKey('openai_api_key', 'OPENAI_API_KEY');
          if (key) availableProviders.push(p);
        } else if (name === 'claude') {
          const key = await getAIKey('claude_api_key', 'ANTHROPIC_API_KEY');
          if (key) availableProviders.push(p);
        }
      }
    }

    for (const p of availableProviders) {
      evaluateAndRefreshProviderHealth(p.name);
    }

    // Sort providers so Gemini & requested provider remain top priority
    const sortedProviders = [...availableProviders].sort((a, b) => {
      const healthA = providerHealthStore[a.name];
      const healthB = providerHealthStore[b.name];
      const now = Date.now();

      const scoreA = (healthA.cooldownUntil && healthA.cooldownUntil > now) ? healthA.qualityScore - 100 : healthA.qualityScore;
      const scoreB = (healthB.cooldownUntil && healthB.cooldownUntil > now) ? healthB.qualityScore - 100 : healthB.qualityScore;

      return scoreB - scoreA;
    });

    const callState: CallState = { totalCalls: 0, maxCalls: 10 };
    const errors: string[] = [];

    for (const provider of sortedProviders) {
      if (callState.totalCalls >= callState.maxCalls) {
        console.warn(`[AI Engine Router] Maximum allowed API calls (${callState.maxCalls}) reached.`);
        break;
      }

      const currentHealth = providerHealthStore[provider.name];
      const inCooldown = currentHealth.cooldownUntil && currentHealth.cooldownUntil > Date.now();
      console.log(`[AI Engine Router] Selecting Provider: ${provider.name} (Quality Score: ${currentHealth.qualityScore}, Status: ${currentHealth.status}${inCooldown ? ', In Cooldown' : ''})`);

      try {
        const result = await provider.call(options, callState);
        recordProviderSuccess(provider.name);
        
        if (isExcelProcessed) {
          result.excelProcessed = true;
          result.excelSummary = excelSummaryInfo;
        }

        console.log(`[AI Engine Router] Success from ${result.providerUsed} (${result.modelUsed}) in ${result.durationMs}ms`);
        return result;
      } catch (err: unknown) {
        const errObj = typeof err === 'object' && err !== null ? (err as Record<string, unknown>) : {};
        const detailedErr: DetailedErrorInfo = (errObj.detailedError as DetailedErrorInfo) || parseAndClassifyError(err, provider.name, 'unknown');
        recordProviderFailure(provider.name, detailedErr);
        const logEntry = `${provider.name} (${detailedErr.errorType}): ${detailedErr.apiErrorMessage}`;
        console.error(`[AI Engine Router Failover] Provider ${provider.name} failed: [${detailedErr.errorType}] ${detailedErr.apiErrorMessage}.`);
        errors.push(logEntry);
      }
    }

    throw new Error(`تمامی ارائه‌دهندگان فعال هوش مصنوعی (Gemini, OpenAI, Claude, Groq, OpenRouter) با خطا مواجه شدند: ${errors.join(' | ')}`);
  } catch (fatalErr: unknown) {
    const message = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
    console.error('[AI Router Fatal Handling]', sanitizeLog(message));
    throw fatalErr;
  }
}

/**
 * Stream responses directly with chunk callback and client abort support
 */
export async function streamMultiProviderAIResponse(
  rawOptions: unknown,
  onChunk: (chunk: string) => void
): Promise<AIProviderResponse> {
  try {
    const parseResult = AIRequestOptionsSchema.safeParse(rawOptions);
    if (!parseResult.success) {
      throw new Error(`خطای اعتبارسنجی ورودی هوش مصنوعی: ${parseResult.error.issues.map(e => e.message).join(' | ')}`);
    }
    const options = { ...parseResult.data };

    if (options.excelData) {
      const excelResult = ExcelProcessor.parseExcelInput(options.excelData, options.excelOptions);
      if (excelResult.success && excelResult.text) {
        options.promptText = `${options.promptText.trim()}\n\n${excelResult.text}`;
      }
    }

    const gemini = registeredProvidersMap.get('gemini') as GeminiProvider;
    
    if (gemini && gemini.stream) {
      const callState: CallState = { totalCalls: 0, maxCalls: 2 };
      try {
        const res = await gemini.stream(options, callState, onChunk);
        recordProviderSuccess('gemini');
        return res;
      } catch (err) {
        console.warn('[AI Stream] Gemini streaming failed, falling back to standard generator:', err);
      }
    }

    const fullRes = await generateMultiProviderAIResponse(options);
    onChunk(fullRes.text);
    return fullRes;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[AI Stream Fatal Handling]', sanitizeLog(msg));
    throw err;
  }
}

/**
 * Expose Provider Health Statuses for Monitoring Dashboards
 */
export function getAIProvidersHealth(): ProviderHealthStatus[] {
  try {
    for (const name of registeredProvidersMap.keys()) {
      evaluateAndRefreshProviderHealth(name);
    }
    return Object.values(providerHealthStore);
  } catch {
    return [];
  }
}

/**
 * Test connectivity for all configured AI providers (used in Admin Panel)
 */
export async function testAllAIProviders(): Promise<Record<string, { status: 'ok' | 'error'; message: string; modelUsed?: string; durationMs?: number }>> {
  const testOptions: AIRequestOptions = {
    promptText: 'سلام! تست اتصال سیستم مرکز کاریزما. یک پاسخ کوتاه ۱ کلمه‌ای (مثلا: "تایید") بنویس.',
    systemInstruction: 'پاسخ بسیار کوتاه و فقط کلمه تایید بده.',
    temperature: 0.7,
    max_tokens: 50,
    minResponseLength: 1
  };

  const callState: CallState = { totalCalls: 0, maxCalls: 30 };
  const results: Record<string, { status: 'ok' | 'error'; message: string; modelUsed?: string; durationMs?: number }> = {};

  for (const [name, provider] of registeredProvidersMap.entries()) {
    let key = '';
    if (name === 'gemini') key = await getAIKey('gemini_api_key', 'GEMINI_API_KEY');
    else if (name === 'openai') key = await getAIKey('openai_api_key', 'OPENAI_API_KEY');
    else if (name === 'claude') key = await getAIKey('claude_api_key', 'ANTHROPIC_API_KEY');
    else if (name === 'groq') key = await getAIKey('groq_api_key', 'GROQ_API_KEY');
    else if (name === 'openrouter') key = await getAIKey('openrouter_api_key', 'OPENROUTER_API_KEY');
    else if (name === 'custom') key = await getAIKey('custom_ai_endpoint', 'CUSTOM_AI_ENDPOINT');

    if (!key) {
      results[name] = {
        status: 'error',
        message: 'کلید API تنظیم نشده است (اختیاری)'
      };
      continue;
    }

    try {
      const res = await provider.call(testOptions, callState);
      results[name] = {
        status: 'ok',
        message: 'اتصال موفق',
        modelUsed: res.modelUsed,
        durationMs: res.durationMs
      };
      recordProviderSuccess(name);
    } catch (err: unknown) {
      const errObj = typeof err === 'object' && err !== null ? (err as Record<string, unknown>) : {};
      const detailedErr: DetailedErrorInfo = (errObj.detailedError as DetailedErrorInfo) || parseAndClassifyError(err, name, 'test');
      results[name] = {
        status: 'error',
        message: detailedErr.apiErrorMessage || 'خطا در اتصال'
      };
      recordProviderFailure(name, detailedErr);
    }
  }

  return results;
}
