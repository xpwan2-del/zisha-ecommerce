-- 插入状态配置
INSERT INTO order_status_configs (status_code, status_name, status_type, is_final, sort_order) VALUES
('pending', 'order_status_pending', 'main', 0, 1),
('paid', 'order_status_paid', 'main', 0, 2),
('processing', 'order_status_processing', 'main', 0, 3),
('shipped', 'order_status_shipped', 'main', 0, 4),
('reviewing', 'order_status_reviewing', 'main', 0, 5),
('delivered', 'order_status_delivered', 'main', 0, 6),
('completed', 'order_status_completed', 'main', 1, 7),
('cancelled', 'order_status_cancelled', 'main', 1, 8),
('refunding', 'order_status_refunding', 'main', 0, 9),
('refunded', 'order_status_refunded', 'main', 1, 10);

-- 插入状态转换规则
INSERT INTO order_status_transitions (from_status, to_status, event_code, event_name, is_allowed) VALUES
-- 待支付状态
('pending', 'paid', 'pay_success', '支付成功', 1),
('pending', 'cancelled', 'user_cancel', '用户取消', 1),
('pending', 'cancelled', 'timeout_cancel', '超时取消', 1),
-- 已支付状态
('paid', 'processing', 'merchant_confirm', '商家确认', 1),
('paid', 'cancelled', 'admin_cancel', '管理员取消', 1),
('paid', 'refunding', 'refund_request', '申请退款', 1),
-- 处理中状态
('processing', 'shipped', 'merchant_ship', '商家发货', 1),
('processing', 'cancelled', 'merchant_cancel', '商家取消', 1),
-- 已发货状态
('shipped', 'reviewing', 'user_confirm', '用户确认收货', 1),
('shipped', 'refunding', 'refund_request', '申请退款', 1),
-- 待评价状态（新增）
('reviewing', 'completed', 'review_complete', '评价完成', 1),
('reviewing', 'completed', 'auto_complete', '超时自动完成', 1),
('reviewing', 'refunding', 'refund_request', '申请退款', 1),
-- 已收货状态
('delivered', 'completed', 'auto_complete', '超时自动完成', 1),
('delivered', 'refunding', 'refund_request', '申请退款', 1),
-- 退款中状态
('refunding', 'refunded', 'refund_success', '退款成功', 1),
('refunding', 'paid', 'refund_reject', '退款被拒绝', 1);