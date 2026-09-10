import { PersianNormalizer } from '../coach/PersianNormalizer.js';

export function normalizePersian(text: string): string {
  return PersianNormalizer.normalize(text);
}

export interface CompressHistoryOptions {
  maxRecentTurns?: number;
  maxCharsPerMsg?: number;
}

export class ConversationMemoryEngine {
  /**
   * Compresses recent turns of a conversation history
   */
  public static compressAndSummarizeHistory(
    messages: Array<{ role: string; content: string }>,
    options?: CompressHistoryOptions
  ): Array<{ role: string; content: string }> {
    if (!Array.isArray(messages)) return [];

    const maxRecentTurns = options?.maxRecentTurns || 4;
    const maxCharsPerMsg = options?.maxCharsPerMsg || 220;

    const recent = messages.slice(-maxRecentTurns * 2);

    return recent.map(msg => ({
      role: msg.role,
      content: msg.content.length > maxCharsPerMsg 
        ? msg.content.substring(0, maxCharsPerMsg) + '...'
        : msg.content
    }));
  }
}
