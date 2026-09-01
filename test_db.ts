import { DBEngine } from './src/server/db.js';
import { ScenarioItem } from './src/types.js';

async function run() {
  const existingScenarios = await DBEngine.readTable<ScenarioItem>('scenarios') || [];
  console.log('Total in DB:', existingScenarios.length);
}
run();
