-- 物流轨迹记录表
CREATE TABLE IF NOT EXISTS delivery_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  sub_status VARCHAR(20) NOT NULL COMMENT '物流子状态：shipping(运输中), delivering(派送中), signed(已签收)',
  carrier VARCHAR(50) COMMENT '快递公司',
  tracking_number VARCHAR(100) COMMENT '快递单号',
  location VARCHAR(200) COMMENT '当前位置描述',
  description TEXT COMMENT '物流描述',
  occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '发生时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- 索引
CREATE INDEX idx_delivery_order ON delivery_logs(order_id);
CREATE INDEX idx_delivery_status ON delivery_logs(sub_status);
CREATE INDEX idx_delivery_tracking ON delivery_logs(tracking_number);

-- 插入初始测试数据（订单#58的物流轨迹）
INSERT INTO delivery_logs (order_id, sub_status, carrier, tracking_number, location, description, occurred_at) VALUES
(58, 'shipping', 'DHL Express', '1234567890', 'Dubai, UAE', '包裹已从上海发出，正在运输中', '2026-04-25 10:00:00'),
(58, 'delivering', 'DHL Express', '1234567890', 'Dubai Marina', '包裹正在派送中，预计今日送达', '2026-04-26 08:00:00');