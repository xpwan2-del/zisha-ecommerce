-- 初始化特惠活动关联
-- 包含今日特惠、特惠商品、双重特惠

-- 今日特惠（promotion_id=1, 折扣20%）
-- 产品ID：1, 3, 5, 7, 9, 11, 13, 15
INSERT INTO product_promotions (product_id, promotion_id, original_price, promotion_price, status, created_at) VALUES
(1, 1, 1280, 1024, 'active', '2026-04-09 00:00:00'),
(3, 1, 980, 784, 'active', '2026-04-09 00:00:00'),
(5, 1, 1380, 1104, 'active', '2026-04-09 00:00:00'),
(7, 1, 880, 704, 'active', '2026-04-09 00:00:00'),
(9, 1, 1980, 1584, 'active', '2026-04-09 00:00:00'),
(11, 1, 1480, 1184, 'active', '2026-04-09 00:00:00'),
(13, 1, 1580, 1264, 'active', '2026-04-09 00:00:00'),
(15, 1, 980, 784, 'active', '2026-04-09 00:00:00');

-- 特惠商品（promotion_id=2, 折扣15%）
-- 产品ID：2, 4, 6, 8, 10, 12, 14, 16, 18, 20
INSERT INTO product_promotions (product_id, promotion_id, original_price, promotion_price, status, created_at) VALUES
(2, 2, 1580, 1343, 'active', '2026-04-09 00:00:00'),
(4, 2, 1180, 1003, 'active', '2026-04-09 00:00:00'),
(6, 2, 1080, 918, 'active', '2026-04-09 00:00:00'),
(8, 2, 1680, 1428, 'active', '2026-04-09 00:00:00'),
(10, 2, 1880, 1598, 'active', '2026-04-09 00:00:00'),
(12, 2, 1380, 1173, 'active', '2026-04-09 00:00:00'),
(14, 2, 1280, 1088, 'active', '2026-04-09 00:00:00'),
(16, 2, 128, 109, 'active', '2026-04-09 00:00:00'),
(18, 2, 138, 117, 'active', '2026-04-09 00:00:00'),
(20, 2, 218, 185, 'active', '2026-04-09 00:00:00');

-- 双重特惠（同时参加两个活动）
-- 产品ID：17, 19, 21, 22
-- 今日特惠（20%）+ 特惠商品（15%）
INSERT INTO product_promotions (product_id, promotion_id, original_price, promotion_price, status, created_at) VALUES
(17, 1, 158, 126, 'active', '2026-04-09 00:00:00'),
(17, 2, 158, 134, 'active', '2026-04-09 00:00:00'),
(19, 1, 188, 150, 'active', '2026-04-09 00:00:00'),
(19, 2, 188, 160, 'active', '2026-04-09 00:00:00'),
(21, 1, 168, 134, 'active', '2026-04-09 00:00:00'),
(21, 2, 168, 143, 'active', '2026-04-09 00:00:00'),
(22, 1, 148, 118, 'active', '2026-04-09 00:00:00'),
(22, 2, 148, 126, 'active', '2026-04-09 00:00:00');

-- 记录活动关联日志
-- 今日特惠绑定日志
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) VALUES
('promotion', 'bind', 1, '西施紫砂壶', '{"promotion_id": 1, "promotion_name": "今日特惠", "discount": 20, "promotion_price": 1024}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 3, '石瓢紫砂壶', '{"promotion_id": 1, "promotion_name": "今日特惠", "discount": 20, "promotion_price": 784}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 5, '秦权紫砂壶', '{"promotion_id": 1, "promotion_name": "今日特惠", "discount": 20, "promotion_price": 1104}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 7, '水平紫砂壶', '{"promotion_id": 1, "promotion_name": "今日特惠", "discount": 20, "promotion_price": 704}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 9, '鱼化龙紫砂壶', '{"promotion_id": 1, "promotion_name": "今日特惠", "discount": 20, "promotion_price": 1584}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 11, '菊瓣紫砂壶', '{"promotion_id": 1, "promotion_name": "今日特惠", "discount": 20, "promotion_price": 1184}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 13, '海棠紫砂壶', '{"promotion_id": 1, "promotion_name": "今日特惠", "discount": 20, "promotion_price": 1264}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 15, '扁壶紫砂壶', '{"promotion_id": 1, "promotion_name": "今日特惠", "discount": 20, "promotion_price": 784}', 'system', '2026-04-09 00:00:00');

-- 特惠商品绑定日志
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) VALUES
('promotion', 'bind', 2, '掇球紫砂壶', '{"promotion_id": 2, "promotion_name": "特惠商品", "discount": 15, "promotion_price": 1343}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 4, '仿古紫砂壶', '{"promotion_id": 2, "promotion_name": "特惠商品", "discount": 15, "promotion_price": 1003}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 6, '井栏紫砂壶', '{"promotion_id": 2, "promotion_name": "特惠商品", "discount": 15, "promotion_price": 918}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 8, '潘壶紫砂壶', '{"promotion_id": 2, "promotion_name": "特惠商品", "discount": 15, "promotion_price": 1428}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 10, '松竹梅紫砂壶', '{"promotion_id": 2, "promotion_name": "特惠商品", "discount": 15, "promotion_price": 1598}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 12, '竹节紫砂壶', '{"promotion_id": 2, "promotion_name": "特惠商品", "discount": 15, "promotion_price": 1173}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 14, '瓜棱紫砂壶', '{"promotion_id": 2, "promotion_name": "特惠商品", "discount": 15, "promotion_price": 1088}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 16, '圆口紫砂茶杯', '{"promotion_id": 2, "promotion_name": "特惠商品", "discount": 15, "promotion_price": 109}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 18, '直口紫砂茶杯', '{"promotion_id": 2, "promotion_name": "特惠商品", "discount": 15, "promotion_price": 117}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 20, '八方紫砂茶杯', '{"promotion_id": 2, "promotion_name": "特惠商品", "discount": 15, "promotion_price": 185}', 'system', '2026-04-09 00:00:00');

-- 双重特惠绑定日志
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) VALUES
('promotion', 'bind', 17, '撇口紫砂茶杯', '{"promotion_id": 1, "promotion_name": "今日特惠", "discount": 20, "promotion_price": 126, "note": "双重特惠"}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 17, '撇口紫砂茶杯', '{"promotion_id": 2, "promotion_name": "特惠商品", "discount": 15, "promotion_price": 134, "note": "双重特惠"}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 19, '花口紫砂茶杯', '{"promotion_id": 1, "promotion_name": "今日特惠", "discount": 20, "promotion_price": 150, "note": "双重特惠"}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 19, '花口紫砂茶杯', '{"promotion_id": 2, "promotion_name": "特惠商品", "discount": 15, "promotion_price": 160, "note": "双重特惠"}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 21, '斗笠紫砂茶杯', '{"promotion_id": 1, "promotion_name": "今日特惠", "discount": 20, "promotion_price": 134, "note": "双重特惠"}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 21, '斗笠紫砂茶杯', '{"promotion_id": 2, "promotion_name": "特惠商品", "discount": 15, "promotion_price": 143, "note": "双重特惠"}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 22, '铃铛紫砂茶杯', '{"promotion_id": 1, "promotion_name": "今日特惠", "discount": 20, "promotion_price": 118, "note": "双重特惠"}', 'system', '2026-04-09 00:00:00'),
('promotion', 'bind', 22, '铃铛紫砂茶杯', '{"promotion_id": 2, "promotion_name": "特惠商品", "discount": 15, "promotion_price": 126, "note": "双重特惠"}', 'system', '2026-04-09 00:00:00');
