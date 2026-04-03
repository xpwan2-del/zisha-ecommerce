-- 创建数据库
CREATE DATABASE IF NOT EXISTS zisha_ecommerce;

-- 连接到数据库
\c zisha_ecommerce;

-- 创建分类表
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建商品表
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2) DEFAULT 0,
    stock INTEGER NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    image VARCHAR(255) NOT NULL,
    images JSONB DEFAULT '[]',
    video VARCHAR(255) DEFAULT '',
    description TEXT NOT NULL,
    features JSONB DEFAULT '[]',
    specifications JSONB DEFAULT '{}',
    shipping JSONB DEFAULT '{}',
    after_sale JSONB DEFAULT '{}',
    is_limited BOOLEAN DEFAULT false,
    discount INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
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
    id SERIAL PRIMARY KEY,
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
    id SERIAL PRIMARY KEY,
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
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    specifications JSONB DEFAULT '{}'
);

-- 创建优惠券表
CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
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
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    coupon_id INTEGER REFERENCES coupons(id),
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建壶型表
CREATE TABLE IF NOT EXISTS teapot_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    images JSONB DEFAULT '[]',
    min_capacity INTEGER NOT NULL,
    max_capacity INTEGER NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建泥料表
CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
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
    id SERIAL PRIMARY KEY,
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
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    user_id INTEGER REFERENCES users(id),
    rating INTEGER NOT NULL,
    comment TEXT,
    images JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建推荐表
CREATE TABLE IF NOT EXISTS recommendations (
    id SERIAL PRIMARY KEY,
    referrer_id INTEGER REFERENCES users(id),
    referee_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    reward_points INTEGER DEFAULT 0,
    reward_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_custom_orders_user_id ON custom_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_referrer_id ON recommendations(referrer_id);

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

INSERT INTO products (name, name_en, name_ar, price, original_price, stock, category_id, image, images, description, features) VALUES
('经典石瓢壶', 'Classic Shi Piao Teapot', 'إبريق شيه پياو الكلاسيكي', 300, 350, 20, 1, 'https://neeko-copilot.bytedance.net/api/text2image?prompt=zisha%20teapot%20shi%20piao%20style&size=square_hd', '[]', '经典石瓢壶，传统工艺制作', '[]'),
('西施壶', 'Xi Shi Teapot', 'إبريق شي شي', 350, 400, 15, 1, 'https://neeko-copilot.bytedance.net/api/text2image?prompt=zisha%20teapot%20xi%20shi%20style&size=square_hd', '[]', '西施壶，造型优美', '[]'),
('精美茶杯', 'Elegant Teacup', 'فنجان شاي راقي', 50, 60, 50, 2, 'https://neeko-copilot.bytedance.net/api/text2image?prompt=ceramic%20teacup%20chinese%20style&size=square_hd', '[]', '精美陶瓷茶杯', '[]'),
('茶叶罐', 'Tea Caddy', 'علبة شاي', 80, 100, 30, 3, 'https://neeko-copilot.bytedance.net/api/text2image?prompt=tea%20caddy%20ceramic&size=square_hd', '[]', '密封茶叶罐', '[]');
