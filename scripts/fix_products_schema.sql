-- 添加描述字段的多语言版本
ALTER TABLE products ADD COLUMN description_en TEXT;
ALTER TABLE products ADD COLUMN description_ar TEXT;

-- 更新现有数据，将中文描述复制到其他语言
UPDATE products SET description_en = description WHERE description_en IS NULL;
UPDATE products SET description_ar = description WHERE description_ar IS NULL;

-- 验证
SELECT id, name, substr(description, 1, 30) as desc_cn, 
       substr(description_en, 1, 30) as desc_en,
       substr(description_ar, 1, 30) as desc_ar
FROM products LIMIT 3;
