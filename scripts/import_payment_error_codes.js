const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(process.cwd(), 'src/lib/db/database.sqlite');
const sourcesDir = path.join(process.cwd(), 'scripts/payment_error_sources');

function toOriginalCode(kind, code) {
  const trimmed = String(code || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('NAME:') || trimmed.startsWith('ISSUE:') || trimmed.startsWith('HTTP_')) return trimmed;
  if (kind === 'NAME') return `NAME:${trimmed}`;
  if (kind === 'ISSUE') return `ISSUE:${trimmed}`;
  return trimmed;
}

function readJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(dir, f));
}

function readSource(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed;
}

function upsert(db, row) {
  const sql = `
    INSERT INTO payment_error_codes
      (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(platform, original_code) DO UPDATE SET
      unified_code = excluded.unified_code,
      error_type = excluded.error_type,
      priority = excluded.priority,
      message_zh = excluded.message_zh,
      message_en = excluded.message_en,
      message_ar = excluded.message_ar,
      is_active = 1
  `;

  return new Promise((resolve, reject) => {
    db.run(
      sql,
      [
        row.platform,
        row.original_code,
        row.unified_code,
        row.error_type || 'fail',
        row.priority || 0,
        row.message_zh || null,
        row.message_en || null,
        row.message_ar || null
      ],
      function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
}

async function main() {
  const files = readJsonFiles(sourcesDir);
  if (files.length === 0) {
    console.log('No source files found:', sourcesDir);
    return;
  }

  const db = new sqlite3.Database(dbPath);

  try {
    let total = 0;
    for (const file of files) {
      const data = readSource(file);
      for (const item of data) {
        const platform = String(item.platform || 'paypal').trim();
        const originalCode = toOriginalCode(item.code_kind, item.code || item.original_code);
        if (!platform || !originalCode) continue;
        await upsert(db, {
          platform,
          original_code: originalCode,
          unified_code: item.unified_code || item.unifiedCode || 'UNKNOWN_ERROR',
          error_type: item.error_type || item.errorType || 'fail',
          priority: item.priority || 0,
          message_zh: item.message_zh,
          message_en: item.message_en,
          message_ar: item.message_ar
        });
        total++;
      }
    }

    console.log(`Upserted ${total} rows into payment_error_codes`);
  } finally {
    db.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

