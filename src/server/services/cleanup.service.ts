import { DBEngine } from '../db.js';
import { Conversation } from '../../types.js';

export class CleanupService {
  /**
   * Periodic background cleanup for expired/stale conversations
   */
  static runConversationCleanup(): void {
    try {
      const conversations = DBEngine.list<Conversation>('conversations');
      const now = Date.now();
      const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

      let cleanedCount = 0;
      for (const conv of conversations) {
        if (!conv.updatedAt && !conv.createdAt) continue;
        const lastActivity = new Date(conv.updatedAt || conv.createdAt).getTime();
        if (now - lastActivity > MAX_AGE_MS) {
          DBEngine.delete('conversations', conv.id);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`[CleanupService] Cleaned up ${cleanedCount} expired conversations.`);
      }
    } catch (err) {
      console.error('[CleanupService] Failed to run conversation cleanup:', err);
    }
  }
}
