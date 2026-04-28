-- PayPal 错误码配置
INSERT OR IGNORE INTO paypal_error_codes (error_code, error_issue, error_type, priority, message_zh, message_en, message_ar) VALUES
('COMPLETED', NULL, 'success', 100, '支付成功', 'Payment successful', 'الدفع ناجح');

INSERT OR IGNORE INTO paypal_error_codes (error_code, error_issue, error_type, priority, message_zh, message_en, message_ar) VALUES
('ORDER_ALREADY_CAPTURED', 'ORDER_ALREADY_CAPTURED', 'success', 90, '订单已支付', 'Order already paid', 'الطلب مدفوع بالفعل');

INSERT OR IGNORE INTO paypal_error_codes (error_code, error_issue, error_type, priority, message_zh, message_en, message_ar) VALUES
('ORDER_NOT_APPROVED', 'ORDER_NOT_APPROVED', 'fail', 50, '支付未完成，请重试', 'Payment not completed, please retry', 'الدفع لم يكتمل، يرجى المحاولة مرة أخرى');

INSERT OR IGNORE INTO paypal_error_codes (error_code, error_issue, error_type, priority, message_zh, message_en, message_ar) VALUES
('INSTRUMENT_DECLINED', 'INSTRUMENT_DECLINED', 'fail', 40, '支付方式被拒绝，请更换银行卡', 'Payment method declined, please change card', 'تم رفض طريقة الدفع، يرجى تغيير البطاقة');

INSERT OR IGNORE INTO paypal_error_codes (error_code, error_issue, error_type, priority, message_zh, message_en, message_ar) VALUES
('PAYER_CANNOT_PAY', 'PAYER_CANNOT_PAY', 'fail', 30, '账户无法完成支付，请联系PayPal客服', 'Account cannot complete payment, contact PayPal support', 'لا يمكن للحساب إكمال الدفع، يرجى الاتصال بدعم PayPal');

INSERT OR IGNORE INTO paypal_error_codes (error_code, error_issue, error_type, priority, message_zh, message_en, message_ar) VALUES
('TRANSACTION_REFUSED', 'TRANSACTION_REFUSED', 'fail', 20, '交易被拒绝，请稍后重试', 'Transaction refused, please retry later', 'تم رفض المعاملة، يرجى المحاولة لاحقًا');

INSERT OR IGNORE INTO paypal_error_codes (error_code, error_issue, error_type, priority, message_zh, message_en, message_ar) VALUES
('TRANSACTION_REFUSED_BY_PAYER_RISK', 'PAYER_RISK', 'fail', 15, '交易存在风险，请更换支付方式', 'Transaction risk detected, please change payment method', 'تم اكتشاف مخاطر في المعاملة، يرجى تغيير طريقة الدفع');

INSERT OR IGNORE INTO paypal_error_codes (error_code, error_issue, error_type, priority, message_zh, message_en, message_ar) VALUES
('PAYER_ACTION_REQUIRED', 'PAYER_ACTION_REQUIRED', 'retry', 60, '需要买家操作，请刷新页面', 'Buyer action required, please refresh', 'يتطلب إجراء من المشتري، يرجى تحديث الصفحة');

INSERT OR IGNORE INTO paypal_error_codes (error_code, error_issue, error_type, priority, message_zh, message_en, message_ar) VALUES
('HTTP_422', NULL, 'fail', 10, '支付请求无效，请稍后重试', 'Invalid payment request, please retry', 'طلب الدفع غير صالح، يرجى المحاولة مرة أخرى');

INSERT OR IGNORE INTO paypal_error_codes (error_code, error_issue, error_type, priority, message_zh, message_en, message_ar) VALUES
('HTTP_500', NULL, 'retry', 5, 'PayPal服务器异常，请稍后重试', 'PayPal server error, please retry later', 'خطأ في خادم PayPal، يرجى المحاولة لاحقًا');

INSERT OR IGNORE INTO paypal_error_codes (error_code, error_issue, error_type, priority, message_zh, message_en, message_ar) VALUES
('HTTP_401', NULL, 'fail', 1, '支付配置错误，请联系客服', 'Payment configuration error, contact support', 'خطأ في تكوين الدفع، يرجى الاتصال بالدعم');

INSERT OR IGNORE INTO paypal_error_codes (error_code, error_issue, error_type, priority, message_zh, message_en, message_ar) VALUES
('HTTP_403', NULL, 'fail', 1, '支付权限不足，请联系客服', 'Payment permission denied, contact support', 'تم رفض إذن الدفع، يرجى الاتصال بالدعم');

INSERT OR IGNORE INTO paypal_error_codes (error_code, error_issue, error_type, priority, message_zh, message_en, message_ar) VALUES
('HTTP_404', NULL, 'fail', 1, '订单不存在', 'Order not found', 'الطلب غير موجود');

INSERT OR IGNORE INTO paypal_error_codes (error_code, error_issue, error_type, priority, message_zh, message_en, message_ar) VALUES
('UNKNOWN_ERROR', NULL, 'fail', 0, '支付失败，请稍后重试', 'Payment failed, please retry later', 'فشل الدفع، يرجى المحاولة لاحقًا');
