const SAFE_TABLE_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export const DATABASE_READONLY_TABLES = new Set([
  'admin_audit_logs',
  'addresses',
  'categories',
  'coupons',
  'exchange_rates',
  'home_modules',
  'inventory_check_items',
  'inventory_checks',
  'materials',
  'payment_webhook_events',
  'product_price',
  'products',
  'promotions',
  'review_replies',
  'reviews',
  'system_configs',
  'teapot_types',
  'theme_colors',
  'translations'
]);

export const DATABASE_MUTATION_BLOCKLIST = new Set([
  'admin_audit_logs',
  'addresses',
  'inventory_check_items',
  'inventory_checks',
  'inventory_transactions',
  'order_items',
  'orders',
  'payment_webhook_events',
  'payments',
  'product_price',
  'products',
  'users'
]);

export function isSafeTableName(table: string) {
  return SAFE_TABLE_NAME.test(table) && !table.startsWith('sqlite_');
}

export function isSafeColumnName(column: string) {
  return SAFE_TABLE_NAME.test(column);
}

export function isDatabaseTableReadable(table: string) {
  return isSafeTableName(table) && DATABASE_READONLY_TABLES.has(table);
}

export function isDatabaseTableMutable(table: string) {
  return isDatabaseTableReadable(table) && !DATABASE_MUTATION_BLOCKLIST.has(table);
}
