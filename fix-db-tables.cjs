const Database = require('better-sqlite3');
const db = new Database('./src/lib/db/database.sqlite');
db.pragma('journal_mode = WAL');

const cols = db.prepare('PRAGMA table_info(products)').all();
if (!cols.some(c => c.name === 'publish_status')) {
  db.exec("ALTER TABLE products ADD COLUMN publish_status VARCHAR(20) DEFAULT 'published'");
  console.log('Added publish_status to products');
} else {
  console.log('publish_status already exists');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS review_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    audit_status VARCHAR(20) DEFAULT 'pending',
    audit_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
  )
`);
console.log('review_images table ready');

db.exec(`
  CREATE TABLE IF NOT EXISTS coupon_usage_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    coupon_id INTEGER NOT NULL,
    total_coupon_discount REAL DEFAULT 0,
    order_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
  )
`);
console.log('coupon_usage_stats table ready');

db.close();
console.log('All DB operations complete');
