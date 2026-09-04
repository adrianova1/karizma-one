/**
 * Shared Persian Normalizer & Utility
 * Single Source of Truth for Persian String Normalization
 */

export function normalizePersian(text: string): string {
  if (!text) return '';
  let normalized = text.toLowerCase();

  // Replace Arabic characters with Persian equivalents
  normalized = normalized.replace(/\u064a/g, '\u06cc'); // ي -> ی
  normalized = normalized.replace(/\u0649/g, '\u06cc'); // ى -> ی
  normalized = normalized.replace(/\u0626/g, '\u06cc'); // ئ -> ی
  normalized = normalized.replace(/[\u06d2\u06cd]/g, '\u06cc'); // Urdu/Kashmiri ye -> ی
  normalized = normalized.replace(/\u0643/g, '\u06a9'); // ك -> ک
  normalized = normalized.replace(/\u0629/g, '\u0647'); // ة -> ه
  normalized = normalized.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627'); // آ/أ/إ/ٱ -> ا
  normalized = normalized.replace(/\u0624/g, '\u0648'); // ؤ -> و

  // Arabic numbers to English
  normalized = normalized.replace(/[\u0660-\u0669]/g, (m) => String(m.charCodeAt(0) - 1632));
  // Persian numbers to English
  normalized = normalized.replace(/[\u06f0-\u06f9]/g, (m) => String(m.charCodeAt(0) - 1776));

  // Remove diacritics
  normalized = normalized.replace(/[\u064b-\u0652\u0670]/g, '');

  // Normalize spaces & Half-spaces (ZWNJ)
  normalized = normalized.replace(/[\u200c\u200b\u00a0]/g, ' ');
  normalized = normalized.replace(/\s+/g, ' ');

  // Strip punctuations & symbols
  normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»،؛؟\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ');
  normalized = normalized.replace(/\s+/g, ' ');

  return normalized.trim();
}

export class ConversationMemoryEngine {
  static cleanMessageNoise(text: string): string {
    if (!text) return '';
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^(سلام|سلام علیک|درود|ممنون|مرسی|دستت درد نکنه|خدا قوت|سلام عزیزم)[!.,\s]*/gi, '');
    cleaned = cleaned.replace(/(ممنون|مرسی|خیلی عالی بود|مفید بود)[!.,\s]*$/gi, '');
    return cleaned.trim();
  }

  static compressAndSummarizeHistory(
    messages: { role: string; content: string }[],
    options: { maxRecentTurns?: number; maxCharsPerMsg?: number } = {}
  ) {
    const maxRecentTurns = options.maxRecentTurns || 10;
    const maxCharsPerMsg = options.maxCharsPerMsg || 250;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        summary: 'هیچ سابقه گفتگویی یافت نشد.',
        compressedTurns: '',
        stats: { totalOriginalTurns: 0, retainedTurnsCount: 0 }
      };
    }

    const windowed = messages.length > 12 ? messages.slice(-12) : messages;
    const clean = windowed.map(m => {
      let content = this.cleanMessageNoise(m.content || '');
      if (content.length > maxCharsPerMsg) {
        content = content.substring(0, maxCharsPerMsg) + ' ...';
      }
      return `${m.role === 'user' ? 'کاربر' : 'مربی'}: ${content}`;
    }).slice(-maxRecentTurns);

    return {
      summary: clean.join('\n'),
      compressedTurns: clean.join('\n'),
      stats: {
        totalOriginalTurns: messages.length,
        retainedTurnsCount: clean.length
      }
    };
  }
}
