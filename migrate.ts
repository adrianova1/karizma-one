import * as fs from 'fs';
import * as path from 'path';
import { db } from './src/db/index.js';
import * as schema from './src/db/schema.js';

const DATA_DIR = path.join(process.cwd(), 'data');

async function migrate() {
  const tableMap: any = {
    'users': schema.users,
    'plans': schema.plans,
    'subscriptions': schema.subscriptions,
    'knowledge_cards': schema.knowledgeCards,
    'prompts': schema.prompts,
    'settings': schema.settings,
    'content_items': schema.contentItems,
    'notifications': schema.notifications,
    'audit_logs': schema.auditLogs,
    'receipts': schema.receipts,
    'bank_deposits': schema.bankDeposits,
    'conversations': schema.conversations,
    'tracking_events': schema.trackingEvents,
    'skill_reports': schema.skillReports,
    'scenarios': schema.scenarios,
    'techniques': schema.techniques,
    'dialogues': schema.dialogues,
    'body_languages': schema.bodyLanguageGuides,
    'mistakes': schema.mistakePatterns,
    'ai_traces': schema.aiTraces,
  };

  for (const tableName of Object.keys(tableMap)) {
    const table = tableMap[tableName];
    const filePath = path.join(DATA_DIR, `${tableName}.json`);
    
    if (fs.existsSync(filePath)) {
      console.log(`Migrating ${tableName}...`);
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(raw);
        
        if (Array.isArray(data) && data.length > 0) {
          await db.transaction(async (tx) => {
            // Delete existing to avoid duplicates if run multiple times
            await tx.delete(table);
            
            const chunkSize = 100;
            for (let i = 0; i < data.length; i += chunkSize) {
              const chunk = data.slice(i, i + chunkSize).map((item: any) => {
                const newItem = { ...item };
                for (const key of Object.keys(newItem)) {
                  if (typeof newItem[key] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(newItem[key])) {
                    newItem[key] = new Date(newItem[key]);
                  }
                }
                return newItem;
              });
              await tx.insert(table).values(chunk);
            }
          });
          console.log(`Successfully migrated ${data.length} records into ${tableName}`);
        } else {
          console.log(`No records to migrate for ${tableName}`);
        }
      } catch (err) {
        console.error(`Error migrating ${tableName}:`, err);
      }
    }
  }
  console.log('Migration complete!');
  process.exit(0);
}

migrate();
