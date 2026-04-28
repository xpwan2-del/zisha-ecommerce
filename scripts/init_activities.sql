-- 初始化活动图标关联（完全随机）
-- 随机选择30个产品，每个产品关联1-3个活动

-- 活动分类ID：6=包邮, 8=环保材料, 9=平台推荐, 10=大师定制

-- 随机选择的产品ID和对应的活动
-- 产品23: 鸡心紫砂茶杯 - 包邮(6)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (23, 6, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 23, '鸡心紫砂茶杯', '{"activity_category_id": 6, "activity_name": "包邮"}', 'system', '2026-04-09 00:00:00');

-- 产品8: 潘壶紫砂壶 - 环保材料(8), 平台推荐(9)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (8, 8, '2026-04-09 00:00:00');
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (8, 9, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 8, '潘壶紫砂壶', '{"activity_category_id": 8, "activity_name": "环保材料"}', 'system', '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 8, '潘壶紫砂壶', '{"activity_category_id": 9, "activity_name": "平台推荐"}', 'system', '2026-04-09 00:00:00');

-- 产品41: 茶盘茶具套装 - 大师定制(10), 包邮(6)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (41, 10, '2026-04-09 00:00:00');
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (41, 6, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 41, '茶盘茶具套装', '{"activity_category_id": 10, "activity_name": "大师定制"}', 'system', '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 41, '茶盘茶具套装', '{"activity_category_id": 6, "activity_name": "包邮"}', 'system', '2026-04-09 00:00:00');

-- 产品12: 竹节紫砂壶 - 环保材料(8)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (12, 8, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 12, '竹节紫砂壶', '{"activity_category_id": 8, "activity_name": "环保材料"}', 'system', '2026-04-09 00:00:00');

-- 产品29: 匏尊紫砂壶 - 平台推荐(9), 大师定制(10), 包邮(6)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (29, 9, '2026-04-09 00:00:00');
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (29, 10, '2026-04-09 00:00:00');
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (29, 6, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 29, '匏尊紫砂壶', '{"activity_category_id": 9, "activity_name": "平台推荐"}', 'system', '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 29, '匏尊紫砂壶', '{"activity_category_id": 10, "activity_name": "大师定制"}', 'system', '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 29, '匏尊紫砂壶', '{"activity_category_id": 6, "activity_name": "包邮"}', 'system', '2026-04-09 00:00:00');

-- 产品35: 葫芦紫砂茶叶罐 - 环保材料(8), 包邮(6)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (35, 8, '2026-04-09 00:00:00');
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (35, 6, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 35, '葫芦紫砂茶叶罐', '{"activity_category_id": 8, "activity_name": "环保材料"}', 'system', '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 35, '葫芦紫砂茶叶罐', '{"activity_category_id": 6, "activity_name": "包邮"}', 'system', '2026-04-09 00:00:00');

-- 产品47: 紫砂茶垫 - 包邮(6)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (47, 6, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 47, '紫砂茶垫', '{"activity_category_id": 6, "activity_name": "包邮"}', 'system', '2026-04-09 00:00:00');

-- 产品3: 石瓢紫砂壶 - 平台推荐(9), 大师定制(10)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (3, 9, '2026-04-09 00:00:00');
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (3, 10, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 3, '石瓢紫砂壶', '{"activity_category_id": 9, "activity_name": "平台推荐"}', 'system', '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 3, '石瓢紫砂壶', '{"activity_category_id": 10, "activity_name": "大师定制"}', 'system', '2026-04-09 00:00:00');

-- 产品19: 花口紫砂茶杯 - 环保材料(8), 平台推荐(9)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (19, 8, '2026-04-09 00:00:00');
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (19, 9, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 19, '花口紫砂茶杯', '{"activity_category_id": 8, "activity_name": "环保材料"}', 'system', '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 19, '花口紫砂茶杯', '{"activity_category_id": 9, "activity_name": "平台推荐"}', 'system', '2026-04-09 00:00:00');

-- 产品26: 容天紫砂壶 - 大师定制(10)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (26, 10, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 26, '容天紫砂壶', '{"activity_category_id": 10, "activity_name": "大师定制"}', 'system', '2026-04-09 00:00:00');

-- 产品44: 紫砂茶夹 - 包邮(6)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (44, 6, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 44, '紫砂茶夹', '{"activity_category_id": 6, "activity_name": "包邮"}', 'system', '2026-04-09 00:00:00');

-- 产品6: 井栏紫砂壶 - 环保材料(8), 平台推荐(9), 包邮(6)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (6, 8, '2026-04-09 00:00:00');
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (6, 9, '2026-04-09 00:00:00');
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (6, 6, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 6, '井栏紫砂壶', '{"activity_category_id": 8, "activity_name": "环保材料"}', 'system', '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 6, '井栏紫砂壶', '{"activity_category_id": 9, "activity_name": "平台推荐"}', 'system', '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 6, '井栏紫砂壶', '{"activity_category_id": 6, "activity_name": "包邮"}', 'system', '2026-04-09 00:00:00');

-- 产品33: 竹节紫砂茶叶罐 - 大师定制(10)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (33, 10, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 33, '竹节紫砂茶叶罐', '{"activity_category_id": 10, "activity_name": "大师定制"}', 'system', '2026-04-09 00:00:00');

-- 产品49: 紫砂茶针 - 包邮(6)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (49, 6, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 49, '紫砂茶针', '{"activity_category_id": 6, "activity_name": "包邮"}', 'system', '2026-04-09 00:00:00');

-- 产品14: 瓜棱紫砂壶 - 平台推荐(9), 环保材料(8)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (14, 9, '2026-04-09 00:00:00');
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (14, 8, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 14, '瓜棱紫砂壶', '{"activity_category_id": 9, "activity_name": "平台推荐"}', 'system', '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 14, '瓜棱紫砂壶', '{"activity_category_id": 8, "activity_name": "环保材料"}', 'system', '2026-04-09 00:00:00');

-- 产品38: 一壶四杯套装 - 大师定制(10), 包邮(6)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (38, 10, '2026-04-09 00:00:00');
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (38, 6, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 38, '一壶四杯套装', '{"activity_category_id": 10, "activity_name": "大师定制"}', 'system', '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 38, '一壶四杯套装', '{"activity_category_id": 6, "activity_name": "包邮"}', 'system', '2026-04-09 00:00:00');

-- 产品45: 紫砂茶匙 - 包邮(6)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (45, 6, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 45, '紫砂茶匙', '{"activity_category_id": 6, "activity_name": "包邮"}', 'system', '2026-04-09 00:00:00');

-- 产品10: 松竹梅紫砂壶 - 环保材料(8), 大师定制(10)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (10, 8, '2026-04-09 00:00:00');
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (10, 10, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 10, '松竹梅紫砂壶', '{"activity_category_id": 8, "activity_name": "环保材料"}', 'system', '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 10, '松竹梅紫砂壶', '{"activity_category_id": 10, "activity_name": "大师定制"}', 'system', '2026-04-09 00:00:00');

-- 产品31: 圆筒紫砂茶叶罐 - 平台推荐(9), 包邮(6)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (31, 9, '2026-04-09 00:00:00');
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (31, 6, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 31, '圆筒紫砂茶叶罐', '{"activity_category_id": 9, "activity_name": "平台推荐"}', 'system', '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 31, '圆筒紫砂茶叶罐', '{"activity_category_id": 6, "activity_name": "包邮"}', 'system', '2026-04-09 00:00:00');

-- 产品42: 紫砂茶漏 - 包邮(6)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (42, 6, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 42, '紫砂茶漏', '{"activity_category_id": 6, "activity_name": "包邮"}', 'system', '2026-04-09 00:00:00');

-- 产品27: 子冶石瓢紫砂壶 - 大师定制(10), 平台推荐(9)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (27, 10, '2026-04-09 00:00:00');
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (27, 9, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 27, '子冶石瓢紫砂壶', '{"activity_category_id": 10, "activity_name": "大师定制"}', 'system', '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 27, '子冶石瓢紫砂壶', '{"activity_category_id": 9, "activity_name": "平台推荐"}', 'system', '2026-04-09 00:00:00');

-- 产品50: 紫砂茶拨 - 包邮(6)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (50, 6, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 50, '紫砂茶拨', '{"activity_category_id": 6, "activity_name": "包邮"}', 'system', '2026-04-09 00:00:00');

-- 产品36: 鼓形紫砂茶叶罐 - 环保材料(8), 大师定制(10)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (36, 8, '2026-04-09 00:00:00');
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (36, 10, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 36, '鼓形紫砂茶叶罐', '{"activity_category_id": 8, "activity_name": "环保材料"}', 'system', '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 36, '鼓形紫砂茶叶罐', '{"activity_category_id": 10, "activity_name": "大师定制"}', 'system', '2026-04-09 00:00:00');

-- 产品48: 紫砂茶则 - 包邮(6)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (48, 6, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 48, '紫砂茶则', '{"activity_category_id": 6, "activity_name": "包邮"}', 'system', '2026-04-09 00:00:00');

-- 产品13: 海棠紫砂壶 - 平台推荐(9), 环保材料(8), 包邮(6)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (13, 9, '2026-04-09 00:00:00');
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (13, 8, '2026-04-09 00:00:00');
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (13, 6, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 13, '海棠紫砂壶', '{"activity_category_id": 9, "activity_name": "平台推荐"}', 'system', '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 13, '海棠紫砂壶', '{"activity_category_id": 8, "activity_name": "环保材料"}', 'system', '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 13, '海棠紫砂壶', '{"activity_category_id": 6, "activity_name": "包邮"}', 'system', '2026-04-09 00:00:00');

-- 产品40: 功夫茶具套装 - 大师定制(10), 平台推荐(9)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (40, 10, '2026-04-09 00:00:00');
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (40, 9, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 40, '功夫茶具套装', '{"activity_category_id": 10, "activity_name": "大师定制"}', 'system', '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 40, '功夫茶具套装', '{"activity_category_id": 9, "activity_name": "平台推荐"}', 'system', '2026-04-09 00:00:00');

-- 产品46: 紫砂茶漏托架 - 包邮(6)
INSERT INTO product_activities (product_id, activity_category_id, created_at) VALUES (46, 6, '2026-04-09 00:00:00');
INSERT INTO activity_logs (activity_type, action, target_id, target_name, details, operator_name, created_at) 
VALUES ('activity_category', 'bind', 46, '紫砂茶漏托架', '{"activity_category_id": 6, "activity_name": "包邮"}', 'system', '2026-04-09 00:00:00');
