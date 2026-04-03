-- SQLite 初始化脚本

-- 创建分类表
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建商品表
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2) DEFAULT 0,
    stock INTEGER NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    image VARCHAR(255) NOT NULL,
    images TEXT DEFAULT '[]',
    video VARCHAR(255) DEFAULT '',
    description TEXT NOT NULL,
    features TEXT DEFAULT '[]',
    specifications TEXT DEFAULT '{}',
    shipping TEXT DEFAULT '{}',
    after_sale TEXT DEFAULT '{}',
    is_limited BOOLEAN DEFAULT false,
    discount INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    level VARCHAR(20) DEFAULT 'regular',
    points INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    referral_code VARCHAR(20) UNIQUE,
    referred_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建地址表
CREATE TABLE IF NOT EXISTS addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    country VARCHAR(50) NOT NULL,
    city VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    postal_code VARCHAR(20),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建订单表
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    shipping_fee DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending',
    order_status VARCHAR(20) DEFAULT 'pending',
    shipping_address_id INTEGER REFERENCES addresses(id),
    coupon_code VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建订单商品表
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    specifications TEXT DEFAULT '{}'
);

-- 创建优惠券表
CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    min_spend DECIMAL(10,2) DEFAULT 0,
    max_discount DECIMAL(10,2),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    user_limit INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建用户优惠券表
CREATE TABLE IF NOT EXISTS user_coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    coupon_id INTEGER REFERENCES coupons(id),
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建壶型表
CREATE TABLE IF NOT EXISTS teapot_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    images TEXT DEFAULT '[]',
    min_capacity INTEGER NOT NULL,
    max_capacity INTEGER NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建泥料表
CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    color VARCHAR(20) NOT NULL,
    description TEXT,
    price_modifier DECIMAL(10,2) DEFAULT 0,
    stock INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建定制订单表
CREATE TABLE IF NOT EXISTS custom_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    teapot_type_id INTEGER REFERENCES teapot_types(id),
    material_id INTEGER REFERENCES materials(id),
    capacity INTEGER NOT NULL,
    engraving TEXT,
    engraving_font VARCHAR(50),
    engraving_position VARCHAR(50),
    pattern VARCHAR(255),
    pattern_position VARCHAR(50),
    preview_image VARCHAR(255),
    order_status VARCHAR(20) DEFAULT 'pending',
    shipping_address_id INTEGER REFERENCES addresses(id),
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建评价表
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER REFERENCES products(id),
    user_id INTEGER REFERENCES users(id),
    rating INTEGER NOT NULL,
    comment TEXT,
    images TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建推荐表
CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER REFERENCES users(id),
    referee_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    reward_points INTEGER DEFAULT 0,
    reward_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建活动类别表
CREATE TABLE IF NOT EXISTS activity_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    icon VARCHAR(255) NOT NULL,
    color VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建活动标识关联表
CREATE TABLE IF NOT EXISTS product_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    activity_category_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_category_id) REFERENCES activity_categories(id) ON DELETE CASCADE
);

-- 创建一元购活动表
CREATE TABLE IF NOT EXISTS lucky_draws (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    total_equity INTEGER NOT NULL, -- 总等份
    price_per_equity DECIMAL(10,2) DEFAULT 1.00, -- 每份价格
    current_equity INTEGER DEFAULT 0, -- 当前已售等份
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled
    winner_id INTEGER, -- 中奖用户ID
    winning_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 创建一元购订单表
CREATE TABLE IF NOT EXISTS lucky_draw_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lucky_draw_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    equity_count INTEGER NOT NULL, -- 购买等份数
    total_amount DECIMAL(10,2) NOT NULL,
    equity_numbers TEXT NOT NULL, -- 购买的等份号码，逗号分隔
    status VARCHAR(20) DEFAULT 'completed', -- pending, completed, refunded
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lucky_draw_id) REFERENCES lucky_draws(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建唯一索引，确保一个产品在同一活动类别中只出现一次
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_activity_unique ON product_activities(product_id, activity_category_id);

-- 创建系统配置表（存储首页模块开关等配置）
CREATE TABLE IF NOT EXISTS system_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建翻译表
CREATE TABLE IF NOT EXISTS translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key VARCHAR(255) NOT NULL,
    language VARCHAR(10) NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(key, language)
);

-- 创建关于我们表
CREATE TABLE IF NOT EXISTS about (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    images TEXT DEFAULT '[]',
    video_url VARCHAR(255),
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建联系我们表
CREATE TABLE IF NOT EXISTS contact (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    images TEXT DEFAULT '[]',
    video_url VARCHAR(255),
    address TEXT,
    email VARCHAR(255),
    phone VARCHAR(100),
    opening_hours TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_custom_orders_user_id ON custom_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_referrer_id ON recommendations(referrer_id);

-- 插入初始活动类别
INSERT INTO activity_categories (name, name_en, name_ar, icon, color, status) VALUES
('限时特惠', 'Limited Time Offer', 'عرض لفترة محدودة', 'fire', '#FF5733', 'active'),
('新品上市', 'New Arrival', 'وصل جديد', 'star', '#33FF57', 'active'),
('畅销商品', 'Bestseller', 'الأكثر مبيعًا', 'trophy', '#3357FF', 'active'),
('独家定制', 'Exclusive', 'حصري', 'crown', '#FF33F1', 'active'),
('库存有限', 'Limited Stock', 'مخزون محدود', 'alert-circle', '#FFB733', 'active'),
('包邮', 'Free Shipping', 'شحن مجاني', 'truck', '#33C1FF', 'active'),
('一元购抽奖', 'Lucky Draw', 'سحب النعمة', 'gift', '#FF3366', 'active');

-- 插入测试数据
INSERT INTO categories (name, name_en, name_ar, description, priority) VALUES
('紫砂壶', 'Zisha Teapot', 'إبريق زيشا', '传统紫砂壶', 1),
('茶杯', 'Teacup', 'فنجان شاي', '精美茶杯', 2),
('茶叶罐', 'Tea Caddy', 'علبة شاي', '茶叶 storage', 3),
('套装', 'Set', 'مجموعة', '茶壶套装', 4);

INSERT INTO teapot_types (name, name_en, name_ar, images, min_capacity, max_capacity, base_price, description) VALUES
('石瓢', 'Shi Piao', 'شيه پياو', '[]', 150, 300, 300, '经典壶型'),
('西施', 'Xi Shi', 'شي شي', '[]', 100, 250, 350, '最受欢迎'),
('井栏', 'Jing Lan', 'جينغ لان', '[]', 200, 400, 400, '方器代表'),
('仿古', 'Fang Gu', 'فانغ Гу', '[]', 180, 350, 380, '经典器型');

INSERT INTO materials (name, name_en, name_ar, color, description, price_modifier, stock) VALUES
('紫泥', 'Zi Ni', 'زي ني', '#8B4513', '经典紫泥', 0, 100),
('红泥', 'Hong Ni', 'هونغ ني', '#CD5C5C', '透气性好', 50, 80),
('段泥', 'Duan Ni', 'دوان ني', '#D2B48C', '适合浅色茶', 100, 60),
('天青泥', 'Tian Qing Ni', 'تيان تشينغ ني', '#708090', '稀有泥料', 300, 30);

-- 插入首页模块配置（默认全部开启）
INSERT INTO system_configs (config_key, config_value, description) VALUES
('module_hero', 'true', '首页Hero横幅模块'),
('module_categories', 'true', '产品分类模块'),
('module_featured_products', 'true', '精选产品模块'),
('module_about', 'true', '关于我们模块'),
('module_testimonials', 'true', '客户评价模块'),
('module_contact', 'true', '联系我们模块'),
('module_customize', 'false', '定制功能模块（需要开启才能显示定制页面）'),
('module_lucky_draw', 'false', '一元购抽奖模块（需要开启才能显示一元购页面）');

INSERT INTO products (name, name_en, name_ar, price, original_price, stock, category_id, image, images, description, features) VALUES
('经典石瓢壶', 'Classic Shi Piao Teapot', 'إبريق شيه پياو الكلاسيكي', 300, 350, 20, 1, 'https://neeko-copilot.bytedance.net/api/text2image?prompt=zisha%20teapot%20shi%20piao%20style&size=square_hd', '[]', '经典石瓢壶，传统工艺制作', '[]'),
('西施壶', 'Xi Shi Teapot', 'إبريق شي شي', 350, 400, 15, 1, 'https://neeko-copilot.bytedance.net/api/text2image?prompt=zisha%20teapot%20xi%20shi%20style&size=square_hd', '[]', '西施壶，造型优美', '[]'),
('精美茶杯', 'Elegant Teacup', 'فنجان شاي راقي', 50, 60, 50, 2, 'https://neeko-copilot.bytedance.net/api/text2image?prompt=ceramic%20teacup%20chinese%20style&size=square_hd', '[]', '精美陶瓷茶杯', '[]'),
('茶叶罐', 'Tea Caddy', 'علبة شاي', 80, 100, 30, 3, 'https://neeko-copilot.bytedance.net/api/text2image?prompt=tea%20caddy%20ceramic&size=square_hd', '[]', '密封茶叶罐', '[]');