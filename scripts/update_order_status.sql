BEGIN TRANSACTION;

ALTER TABLE orders ADD COLUMN after_sale_status TEXT DEFAULT 'none';
ALTER TABLE orders ADD COLUMN refund_from_status TEXT;

UPDATE orders
SET after_sale_status = CASE
  WHEN order_status IN ('refunding_payment', 'refunding') THEN 'requested'
  WHEN order_status = 'refunded' THEN 'completed'
  ELSE 'none'
END
WHERE after_sale_status IS NULL OR after_sale_status = '';

CREATE TABLE IF NOT EXISTS order_status_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status_code VARCHAR(30) NOT NULL,
  status_name VARCHAR(100) NOT NULL,
  status_type VARCHAR(20) NOT NULL,
  status_description TEXT,
  is_final INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(status_code, status_type)
);

DELETE FROM order_status_configs;

INSERT INTO order_status_configs (status_code, status_name, status_type, status_description, is_final, sort_order) VALUES
('pending', '待付款', 'order', '订单已创建，等待用户完成支付。', 0, 1),
('paid', '待发货', 'order', '订单已支付，等待商家发货。', 0, 2),
('shipped', '待收货', 'order', '商家已发货，等待用户收货。', 0, 3),
('refunding_payment', '待处理退款', 'order', '用户已申请退款，等待管理员审核。', 0, 4),
('refunding', '退款中', 'order', '管理员已同意退款，正在等待支付通道退款结果。', 0, 5),
('delivered', '待评价', 'order', '用户已确认收货，订单待评价或待自动完成。', 0, 6),
('completed', '已完成', 'order', '订单已完成，进入终态。', 1, 7),
('cancelled', '已取消', 'order', '订单已取消，进入终态。', 1, 8),
('refunded', '已退款', 'order', '退款成功，库存和优惠券已返还，进入终态。', 1, 9),
('unpaid', '未支付', 'payment', '订单尚未支付。', 0, 10),
('paid', '已支付', 'payment', '支付已完成。', 0, 11),
('refunding', '退款中', 'payment', '已发起退款，等待支付平台确认。', 0, 12),
('refunded', '已退款', 'payment', '支付平台已确认退款成功。', 1, 13),
('failed', '支付失败', 'payment', '支付未成功完成。', 1, 14),
('none', '无售后', 'after_sale', '当前订单没有售后流程。', 0, 15),
('requested', '已申请', 'after_sale', '用户已发起退款/售后申请。', 0, 16),
('approved', '已同意', 'after_sale', '管理员已同意售后申请。', 0, 17),
('rejected', '已拒绝', 'after_sale', '管理员已拒绝售后申请。', 0, 18),
('returning', '退货中', 'after_sale', '售后流程进入退货/退款执行阶段。', 0, 19),
('completed', '售后完成', 'after_sale', '售后流程已处理完成。', 1, 20);

DELETE FROM order_status_transitions;

INSERT INTO order_status_transitions (from_status, to_status, event_code, event_name, is_allowed, remark) VALUES
('pending', 'paid', 'pay_success', '支付成功', 1, '支付通道确认成功后进入待发货'),
('pending', 'cancelled', 'user_cancel', '用户取消', 1, '待付款订单可由用户取消'),
('pending', 'cancelled', 'timeout_cancel', '超时取消', 1, '待付款超时自动取消'),
('pending', 'cancelled', 'admin_cancel', '管理员取消', 1, '管理员可取消待付款订单'),
('paid', 'shipped', 'merchant_ship', '商家发货', 1, '商家发货后进入待收货'),
('paid', 'refunding_payment', 'refund_request', '申请退款', 1, '待发货订单可申请退款'),
('paid', 'cancelled', 'admin_cancel', '管理员取消', 1, '管理员可取消待发货订单'),
('shipped', 'delivered', 'user_confirm', '确认收货', 1, '用户确认收货后进入待评价'),
('shipped', 'refunding_payment', 'refund_request', '申请退款', 1, '待收货订单可申请退款'),
('refunding_payment', 'refunding', 'refund_approve', '同意退款', 1, '管理员审核通过后进入退款中'),
('refunding_payment', 'paid', 'refund_reject', '拒绝退款(原待发货)', 1, '若来源状态为 paid 则回退 paid'),
('refunding_payment', 'shipped', 'refund_reject', '拒绝退款(原待收货)', 1, '若来源状态为 shipped 则回退 shipped'),
('refunding', 'refunded', 'refund_success', '退款成功', 1, '支付平台确认退款完成'),
('delivered', 'completed', 'auto_complete', '自动完成', 1, '收货后自动完成');

COMMIT;
