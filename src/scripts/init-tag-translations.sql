-- =============================================
-- 促销/活动标签翻译和样式配置初始化脚本
-- 数据库：src/lib/db/database.sqlite
-- 运行：sqlite3 src/lib/db/database.sqlite < src/scripts/init-tag-translations.sql
-- =============================================

-- Step 1: 为所有主题添加统一的促销/活动标签样式配置
-- 标签样式在所有主题中保持一致（固定值）

-- 促销标签样式（所有主题相同）
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('chinese', 'promotionBadgeBg', 'linear-gradient(135deg, #EF4444, rgba(239, 68, 68, 0.6))');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('chinese', 'promotionBadgeText', '#FFFFFF');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('chinese', 'promotionFinalBadgeBg', '#EF4444');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('chinese', 'promotionFinalBadgeText', '#FFFFFF');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('chinese', 'limitedBadgeBg', '#D4AF37');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('chinese', 'limitedBadgeText', '#FFFFFF');

INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEastern', 'promotionBadgeBg', 'linear-gradient(135deg, #EF4444, rgba(239, 68, 68, 0.6))');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEastern', 'promotionBadgeText', '#FFFFFF');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEastern', 'promotionFinalBadgeBg', '#EF4444');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEastern', 'promotionFinalBadgeText', '#FFFFFF');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEastern', 'limitedBadgeBg', '#D4AF37');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEastern', 'limitedBadgeText', '#FFFFFF');

INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('amazon', 'promotionBadgeBg', 'linear-gradient(135deg, #EF4444, rgba(239, 68, 68, 0.6))');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('amazon', 'promotionBadgeText', '#FFFFFF');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('amazon', 'promotionFinalBadgeBg', '#EF4444');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('amazon', 'promotionFinalBadgeText', '#FFFFFF');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('amazon', 'limitedBadgeBg', '#D4AF37');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('amazon', 'limitedBadgeText', '#FFFFFF');

INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEasternLuxury', 'promotionBadgeBg', 'linear-gradient(135deg, #EF4444, rgba(239, 68, 68, 0.6))');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEasternLuxury', 'promotionBadgeText', '#FFFFFF');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEasternLuxury', 'promotionFinalBadgeBg', '#EF4444');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEasternLuxury', 'promotionFinalBadgeText', '#FFFFFF');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEasternLuxury', 'limitedBadgeBg', '#D4AF37');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEasternLuxury', 'limitedBadgeText', '#FFFFFF');

-- 活动标签样式（所有主题相同，按 ID 区分）
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('chinese', 'activityBadge1', '#FF5733');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('chinese', 'activityBadge2', '#33FF57');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('chinese', 'activityBadge3', '#3357FF');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('chinese', 'activityBadge4', '#FF33F1');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('chinese', 'activityBadge5', '#FFB733');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('chinese', 'activityBadge6', '#33C1FF');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('chinese', 'activityBadge7', '#FF3366');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('chinese', 'activityBadge8', '#2ECC71');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('chinese', 'activityBadge9', '#3498DB');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('chinese', 'activityBadge10', '#E74C3C');

INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEastern', 'activityBadge1', '#FF5733');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEastern', 'activityBadge2', '#33FF57');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEastern', 'activityBadge3', '#3357FF');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEastern', 'activityBadge4', '#FF33F1');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEastern', 'activityBadge5', '#FFB733');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEastern', 'activityBadge6', '#33C1FF');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEastern', 'activityBadge7', '#FF3366');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEastern', 'activityBadge8', '#2ECC71');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEastern', 'activityBadge9', '#3498DB');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEastern', 'activityBadge10', '#E74C3C');

INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('amazon', 'activityBadge1', '#FF5733');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('amazon', 'activityBadge2', '#33FF57');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('amazon', 'activityBadge3', '#3357FF');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('amazon', 'activityBadge4', '#FF33F1');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('amazon', 'activityBadge5', '#FFB733');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('amazon', 'activityBadge6', '#33C1FF');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('amazon', 'activityBadge7', '#FF3366');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('amazon', 'activityBadge8', '#2ECC71');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('amazon', 'activityBadge9', '#3498DB');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('amazon', 'activityBadge10', '#E74C3C');

INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEasternLuxury', 'activityBadge1', '#FF5733');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEasternLuxury', 'activityBadge2', '#33FF57');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEasternLuxury', 'activityBadge3', '#3357FF');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEasternLuxury', 'activityBadge4', '#FF33F1');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEasternLuxury', 'activityBadge5', '#FFB733');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEasternLuxury', 'activityBadge6', '#33C1FF');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEasternLuxury', 'activityBadge7', '#FF3366');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEasternLuxury', 'activityBadge8', '#2ECC71');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEasternLuxury', 'activityBadge9', '#3498DB');
INSERT OR IGNORE INTO theme_color_configs (theme_key, config_key, config_value) VALUES 
('middleEasternLuxury', 'activityBadge10', '#E74C3C');

-- Step 2: 添加 UI 翻译文本

-- 翻译文本（中文）
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('promotion.final_discount', 'zh', '最终折扣');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('promotion.off_sale', 'zh', 'OFF SALE');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('promotion.calculation', 'zh', '促销叠加计算');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('promotion.exclusive', 'zh', '独占');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('promotion.stackable', 'zh', '可叠加');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('inventory.stock', 'zh', '库存');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('inventory.in_stock', 'zh', '件有货');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('inventory.out_of_stock', 'zh', '缺货');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('inventory.limited', 'zh', '库存有限');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('inventory.low_stock', 'zh', '库存紧张');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('product.new', 'zh', '新品');

-- 翻译文本（英文）
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('promotion.final_discount', 'en', 'Final Discount');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('promotion.off_sale', 'en', 'OFF SALE');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('promotion.calculation', 'en', 'Promotion Calculation');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('promotion.exclusive', 'en', 'Exclusive');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('promotion.stackable', 'en', 'Stackable');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('inventory.stock', 'en', 'Stock');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('inventory.in_stock', 'en', 'in stock');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('inventory.out_of_stock', 'en', 'Out of Stock');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('inventory.limited', 'en', 'Limited Stock');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('inventory.low_stock', 'en', 'Low Stock');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('product.new', 'en', 'New');

-- 翻译文本（阿拉伯文）
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('promotion.final_discount', 'ar', 'خصم نهائي');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('promotion.off_sale', 'ar', 'تخفيض');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('promotion.calculation', 'ar', 'حساب التخفيضات');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('promotion.exclusive', 'ar', 'حصري');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('promotion.stackable', 'ar', 'قابل للجمع');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('inventory.stock', 'ar', 'المخزون');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('inventory.in_stock', 'ar', 'متوفر');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('inventory.out_of_stock', 'ar', 'غير متوفر');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('inventory.limited', 'ar', 'مخزون محدود');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('inventory.low_stock', 'ar', 'مخزون منخفض');
INSERT OR IGNORE INTO translations (key, language, value) VALUES 
('product.new', 'ar', 'جديد');

-- Step 3: 验证数据
SELECT '标签样式配置数' as item, COUNT(*) as count FROM theme_color_configs WHERE config_key LIKE '%Badge%';
SELECT '翻译文本数' as item, COUNT(*) as count FROM translations WHERE key LIKE 'promotion.%' OR key LIKE 'inventory.%' OR key LIKE 'product.%';
