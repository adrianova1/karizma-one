import { DBEngine } from '../db.js';
import { AITraceRecord } from '../../types.js';

export interface LogTraceOptions {
  provider?: string;
  model?: string;
  latencyMs?: number;
  status?: string;
  error?: string;
  query?: string;
  response?: string;
  userId?: string;
}

export class AIService {
  /**
   * Logs an execution trace into the ai_traces table for admin observability.
   * Completely local with zero external API calls.
   */
  public static async logTrace(options: LogTraceOptions): Promise<void> {
    try {
      const trace: AITraceRecord = {
        id: 'trace_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        userId: options.userId || 'anonymous',
        query: options.query || options.model || 'local-coach-query',
        response: options.error ? `Error: ${options.error}` : (options.status || 'success'),
        latencyMs: options.latencyMs || 0,
        timestamp: new Date().toISOString()
      };

      await DBEngine.insertRecord('ai_traces', trace);
    } catch (err) {
      // Non-blocking trace logging
      console.error('[AIService] Failed to record AI trace:', err);
    }
  }
}
