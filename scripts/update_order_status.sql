-- 创建 delivery_logs 表（物流轨迹记录）
CREATE TABLE IF NOT EXISTS delivery_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  sub_status VARCHAR(20) NOT NULL COMMENT 'shipping/delivering/signed',
  carrier VARCHAR(50),
  tracking_number VARCHAR(100),
  location VARCHAR(200),
  description TEXT,
  occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_delivery_order ON delivery_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_status ON delivery_logs(sub_status);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking ON delivery_logs(tracking_number);

-- 更新 order_status_configs 表（新增 reviewing 状态）
INSERT OR IGNORE INTO order_status_configs (status_code, status_name, status_type, is_final, sort_order) VALUES
('reviewing', 'order_status_reviewing', 'main', 0, 5);

-- 更新 order_status_transitions 表（新增规则）
INSERT OR IGNORE INTO order_status_transitions (from_status, to_status, event_code, event_name, is_allowed) VALUES
('shipped', 'reviewing', 'user_confirm', '用户确认收货', 1),
('reviewing', 'completed', 'review_complete', '评价完成', 1),
('reviewing', 'completed', 'auto_complete', '超时自动完成', 1),
('reviewing', 'refunding', 'refund_request', '申请退款', 1),
('refunding', 'paid', 'refund_reject', '退款被拒绝', 1);

-- 插入测试数据（订单#58的物流轨迹）
INSERT INTO delivery_logs (order_id, sub_status, carrier, tracking_number, location, description, occurred_at) VALUES
(58, 'shipping', 'DHL Express', '1234567890', 'Shanghai, China', '包裹已从上海发出，正在运输中', '2026-04-25 10:00:00'),
(58, 'delivering', 'DHL Express', '1234567890', 'Dubai Marina, UAE', '包裹正在派送中，预计今日送达', '2026-04-26 08:00:00');

PRINT 'Database update completed!';
PRINT 'Created: delivery_logs table';
PRINT 'Updated: order_status_configs (added reviewing)';
PRINT 'Updated: order_status_transitions (added 5 new rules)';
PRINT 'Inserted: test delivery logs for order #58';