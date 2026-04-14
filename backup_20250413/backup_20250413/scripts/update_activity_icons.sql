-- 修改表结构：添加icon_url字段，删除icon_name字段
ALTER TABLE activity_categories ADD COLUMN icon_url TEXT;

-- 更新活动分类表，设置icon_url
UPDATE activity_categories SET icon_url = '/icons/activity/fire.svg' WHERE id = 1;
UPDATE activity_categories SET icon_url = '/icons/activity/gift.svg' WHERE id = 2;
UPDATE activity_categories SET icon_url = '/icons/activity/truck.svg' WHERE id = 3;
UPDATE activity_categories SET icon_url = '/icons/activity/refresh-cw.svg' WHERE id = 4;
UPDATE activity_categories SET icon_url = '/icons/activity/star.svg' WHERE id = 5;
UPDATE activity_categories SET icon_url = '/icons/activity/crown.svg' WHERE id = 6;
UPDATE activity_categories SET icon_url = '/icons/activity/clock.svg' WHERE id = 7;
UPDATE activity_categories SET icon_url = '/icons/activity/tag.svg' WHERE id = 8;
UPDATE activity_categories SET icon_url = '/icons/activity/shield-check.svg' WHERE id = 9;
UPDATE activity_categories SET icon_url = '/icons/activity/heart.svg' WHERE id = 10;

-- 验证更新结果
SELECT id, name, name_en, icon_url FROM activity_categories;
