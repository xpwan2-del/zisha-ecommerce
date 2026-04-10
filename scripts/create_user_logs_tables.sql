-- 创建用户操作日志表
CREATE TABLE user_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL,  -- 'address_create', 'address_update', 'address_delete', 'profile_update', 'password_change', 'login', 'logout'
    target_table VARCHAR(50),          -- 'addresses', 'users'
    target_id INTEGER,                 -- 被修改记录的ID
    field_name VARCHAR(100),           -- 被修改的字段（多个字段用逗号分隔）
    old_value TEXT,                    -- 旧值（JSON格式存储多个字段）
    new_value TEXT,                    -- 新值（JSON格式存储多个字段）
    ip_address VARCHAR(50),            -- IP地址
    user_agent TEXT,                   -- 浏览器User-Agent
    device_info TEXT,                  -- 设备信息（手机型号、操作系统等）
    location_info TEXT,                -- 地理位置信息（可选）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_user_logs_user_id ON user_logs(user_id);
CREATE INDEX idx_user_logs_action_type ON user_logs(action_type);
CREATE INDEX idx_user_logs_created_at ON user_logs(created_at);
CREATE INDEX idx_user_logs_target_table ON user_logs(target_table);

-- 创建积分记录表
CREATE TABLE points_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    change_type VARCHAR(50) NOT NULL,  -- 'earn', 'spend', 'refund', 'expire', 'adjust'
    points INTEGER NOT NULL,           -- 变动积分（正数增加，负数减少）
    before_points INTEGER NOT NULL,    -- 变动前积分
    after_points INTEGER NOT NULL,     -- 变动后积分
    source_type VARCHAR(50),           -- 'order', 'promotion', 'referral', 'activity', 'manual'
    source_id INTEGER,                 -- 来源ID（订单ID、活动ID等）
    description TEXT,                  -- 描述
    operator_name VARCHAR(100),        -- 操作人（system或管理员）
    ip_address VARCHAR(50),            -- IP地址
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_points_logs_user_id ON points_logs(user_id);
CREATE INDEX idx_points_logs_change_type ON points_logs(change_type);
CREATE INDEX idx_points_logs_created_at ON points_logs(created_at);
CREATE INDEX idx_points_logs_source ON points_logs(source_type, source_id);

-- 验证表创建
SELECT 'user_logs table created' as status;
SELECT 'points_logs table created' as status;
