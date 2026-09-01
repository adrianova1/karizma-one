import { DBEngine } from '../db.js';
import { Conversation, Subscription, Plan, Notification } from '../../types.js';
import * as crypto from 'crypto';

export class CleanupService {
  static async runConversationCleanup() {
    try {
      const plans = await DBEngine.readTable<Plan>('plans');
      const subscriptions = await DBEngine.readTable<Subscription>('subscriptions');
      const conversations = await DBEngine.readTable<Conversation>('conversations');
      const notifications = await DBEngine.readTable<Notification>('notifications');
      let dbUpdated = false;
      let notifsUpdated = false;

      // Map plan IDs to retention days
      const retentionMap = new Map<string, number>();
      for (const p of plans) {
        if (p.historyRetentionDays) {
          retentionMap.set(p.id, p.historyRetentionDays);
        } else {
          // default to 7 days if not set
          retentionMap.set(p.id, 7); 
        }
      }

      // Map user IDs to their max retention days based on active subscriptions
      const userRetention = new Map<string, number>();
      for (const sub of subscriptions) {
        if (sub.status === 'active') {
          const days = retentionMap.get(sub.planId) || 7;
          const existing = userRetention.get(sub.userId) || 0;
          if (days > existing) {
            userRetention.set(sub.userId, days);
          }
        }
      }

      const now = Date.now();
      const activeConversations = [];
      const deletedCountMap = new Map<string, number>();

      for (const conv of conversations) {
        // Find retention days for user, default 3 days if no active subscription
        const days = userRetention.get(conv.userId) || 3; 
        const retentionMs = days * 24 * 60 * 60 * 1000;
        
        const convDate = new Date(conv.createdAt).getTime();
        
        if (now - convDate > retentionMs) {
          // Delete this conversation
          const count = deletedCountMap.get(conv.userId) || 0;
          deletedCountMap.set(conv.userId, count + 1);
          dbUpdated = true; await DBEngine.deleteRecord('conversations', conv.id);
        } else {
          activeConversations.push(conv);
        }
      }

      if (dbUpdated) {
        // skip bulk rewrite
        
        // Notify users
        for (const [userId, count] of deletedCountMap.entries()) {
          const days = userRetention.get(userId) || 3;
          const newNotif = {
            id: 'notif_' + crypto.randomBytes(8).toString('hex'),
            userId,
            title: 'پاکسازی خودکار تاریخچه گفتگو',
            message: `تعداد ${count} گفتگوی قدیمی شما (مربوط به بیش از ${days} روز پیش) بر اساس قوانین اشتراک کاربری شما پاکسازی شد تا سرعت و عملکرد سیستم حفظ شود.`,
            read: false,
            createdAt: new Date().toISOString()
          };
          await DBEngine.insertRecord('notifications', newNotif);
          
          notifsUpdated = true;
        }
        
        if (notifsUpdated) {
          // bulk write removed
        }
        
        console.log(`[CleanupService] Auto-cleanup complete. Removed ${conversations.length - activeConversations.length} old conversations.`);
      }
      
    } catch (err) {
      console.error('[CleanupService] Error running cleanup:', err);
    }
  }
}
