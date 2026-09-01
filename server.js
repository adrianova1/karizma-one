/**
 * Karizma Center - Production Entry Point
 * Compatible with ES Module scope and Phusion Passenger / Cloud Run containers.
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Force production mode
process.env.NODE_ENV = 'production';

const productionBundlePath = path.join(__dirname, 'dist', 'server.cjs');

if (fs.existsSync(productionBundlePath)) {
  console.log('[g51.ir Host Bridge] Starting Karizma Center from production bundle...');
  // Load the compiled CommonJS bundle
  require('./dist/server.cjs');
} else {
  console.error('[g51.ir Host Bridge] Error: Production bundle was not found at:', productionBundlePath);
  console.error('[g51.ir Host Bridge] Please run "npm run build" first to generate the distribution files.');
  
  // Minimal fallback server to show a helpful message instead of crashing silently
  try {
    const express = (await import('express')).default;
    const app = express();
    const PORT = process.env.PORT || 3000;
    
    app.get('*', (req, res) => {
      res.status(500).send(`
        <div style="font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 50px; direction: rtl;">
          <h1 style="color: #e11d48;">خطای آماده‌سازی سرور g51.ir</h1>
          <p style="color: #334155; font-size: 18px;">پوشه توزیع (dist) پیدا نشد. لطفاً دستور <strong>npm run build</strong> را روی هاست اجرا کنید تا پروژه کامپایل شود.</p>
          <p style="color: #64748b; font-size: 14px;">در صورت عدم دسترسی به SSH، محتویات فولدر dist کامپایل شده را آپلود نمایید.</p>
        </div>
      `);
    });
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[g51.ir Host Bridge] Temporary fallback server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('[g51.ir Host Bridge] Failed to load express fallback:', err);
  }
}


