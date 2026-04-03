-- 创建活动类别表
CREATE TABLE IF NOT EXISTS activity_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    icon VARCHAR(255) NOT NULL, -- 图标名称，如 'fire', 'star', 'gift' 等
    color VARCHAR(50) NOT NULL, -- 颜色代码，如 '#FF5733'
    status VARCHAR(20) DEFAULT 'active', -- active/inactive
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建活动标识关联表
CREATE TABLE IF NOT EXISTS product_activities (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    activity_category_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_category_id) REFERENCES activity_categories(id) ON DELETE CASCADE
);

-- 创建唯一索引，确保一个产品在同一活动类别中只出现一次
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_activity_unique ON product_activities(product_id, activity_category_id);

-- 插入初始活动类别
INSERT INTO activity_categories (name, name_en, name_ar, icon, color, status) VALUES
('限时特惠', 'Limited Time Offer', 'عرض لفترة محدودة', 'fire', '#FF5733', 'active'),
('新品上市', 'New Arrival', 'وصل جديد', 'star', '#33FF57', 'active'),
('畅销商品', 'Bestseller', 'الأكثر مبيعًا', 'trophy', '#3357FF', 'active'),
('独家定制', 'Exclusive', 'حصري', 'crown', '#FF33F1', 'active'),
('库存有限', 'Limited Stock', 'مخزون محدود', 'alert-circle', '#FFB733', 'active'),
('包邮', 'Free Shipping', 'شحن مجاني', 'truck', '#33C1FF', 'active'),
('一元购抽奖', 'Lucky Draw', 'سحب النعمة', 'gift', '#FF3366', 'active')
ON CONFLICT DO NOTHING;