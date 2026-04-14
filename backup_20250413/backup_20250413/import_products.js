const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// 读取产品信息文件
const productsData = JSON.parse(fs.readFileSync('/Users/davis/Desktop/产品照片/产品信息.json', 'utf8'));
const products = productsData.products;

// 连接数据库
const db = new sqlite3.Database('/Users/davis/zisha-ecommerce/src/lib/db/database.sqlite');

// 分类映射
const categoryMap = {
  '紫砂壶': 1,
  '紫砂茶杯': 2,
  '紫砂茶叶罐': 3,
  '套装': 4
};

// 批量插入产品
db.serialize(() => {
  // 开始事务
  db.run('BEGIN TRANSACTION');
  
  const stmt = db.prepare(`
    INSERT INTO products 
    (name, name_en, name_ar, price, original_price, stock, category_id, image, images, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  products.forEach((product, index) => {
    // 映射分类ID
    let categoryId = 1; // 默认紫砂壶
    if (product.category === '紫砂茶杯') categoryId = 2;
    else if (product.category === '紫砂茶叶罐') categoryId = 3;
    else if (product.category === '套装') categoryId = 4;
    
    // 生成英文和阿拉伯文名称（简单翻译）
    let nameEn = product.name;
    let nameAr = product.name;
    
    // 简单的英文翻译
    if (product.category === '紫砂壶') nameEn = product.name.replace('紫砂壶', 'Zisha Teapot');
    else if (product.category === '紫砂茶杯') nameEn = product.name.replace('紫砂茶杯', 'Zisha Tea Cup');
    else if (product.category === '紫砂茶叶罐') nameEn = product.name.replace('紫砂茶叶罐', 'Zisha Tea Caddy');
    else if (product.category === '套装') nameEn = product.name.replace('套装', 'Set');
    
    // 计算原价（比现价高20%）
    const originalPrice = Math.round(product.price * 1.2);
    
    // 执行插入
    stmt.run(
      product.name,
      nameEn,
      nameAr,
      product.price,
      originalPrice,
      product.stock,
      categoryId,
      product.images[0], // 主图使用第一张
      JSON.stringify(product.images),
      product.description
    );
    
    if ((index + 1) % 10 === 0) {
      console.log(`已插入 ${index + 1} 个产品`);
    }
  });
  
  stmt.finalize();
  
  // 提交事务
  db.run('COMMIT', (err) => {
    if (err) {
      console.error('事务提交失败:', err);
    } else {
      console.log(`成功插入 ${products.length} 个产品`);
    }
    
    // 关闭数据库
    db.close();
  });
});
