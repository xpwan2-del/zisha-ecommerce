const sqlite3 = require('sqlite3');
const fs = require('fs');

// 读取SQL初始化脚本
const sqlScript = fs.readFileSync('./src/lib/db/init-sqlite.sql', 'utf8');

// 连接到SQLite数据库
const db = new sqlite3.Database('./zisha-ecommerce.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  console.log('Connected to SQLite database');
  
  // 先删除所有表（如果存在）
  const dropTables = `
    DROP TABLE IF EXISTS lucky_draw_orders;
    DROP TABLE IF EXISTS lucky_draws;
    DROP TABLE IF EXISTS product_activities;
    DROP TABLE IF EXISTS activity_categories;
    DROP TABLE IF EXISTS translations;
    DROP TABLE IF EXISTS system_configs;
    DROP TABLE IF EXISTS recommendations;
    DROP TABLE IF EXISTS reviews;
    DROP TABLE IF EXISTS custom_orders;
    DROP TABLE IF EXISTS materials;
    DROP TABLE IF EXISTS teapot_types;
    DROP TABLE IF EXISTS user_coupons;
    DROP TABLE IF EXISTS coupons;
    DROP TABLE IF EXISTS order_items;
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS addresses;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS about;
    DROP TABLE IF EXISTS contact;
  `;
  
  db.exec(dropTables, (err) => {
    if (err) {
      console.error('Error dropping tables:', err);
      return;
    }
    console.log('Tables dropped successfully');
    
    // 执行SQL脚本
    db.exec(sqlScript, (err) => {
      if (err) {
        console.error('Error executing SQL script:', err);
      } else {
        console.log('Database initialized successfully');
      }
      
      // 关闭数据库连接
      db.close();
    });
  });
});