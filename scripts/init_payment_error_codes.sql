-- 统一支付错误码配置

-- ========================================
-- PayPal 错误码
-- ========================================
INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('paypal', 'COMPLETED', 'SUCCESS', 'success', 100, '支付成功', 'Payment successful', 'الدفع ناجح');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('paypal', 'ORDER_ALREADY_CAPTURED', 'SUCCESS', 'success', 90, '订单已支付', 'Order already paid', 'الطلب مدفوع بالفعل');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('paypal', 'ORDER_NOT_APPROVED', 'PAYMENT_NOT_COMPLETED', 'fail', 50, '支付未完成，请重试', 'Payment not completed, please retry', 'الدفع لم يكتمل، يرجى المحاولة مرة أخرى');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('paypal', 'INSTRUMENT_DECLINED', 'CARD_DECLINED', 'fail', 40, '支付方式被拒绝，请更换银行卡', 'Payment method declined, please change card', 'تم رفض طريقة الدفع، يرجى تغيير البطاقة');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('paypal', 'PAYER_CANNOT_PAY', 'ACCOUNT_ERROR', 'fail', 30, '账户无法完成支付，请联系PayPal客服', 'Account cannot complete payment, contact PayPal support', 'لا يمكن للحساب إكمال الدفع، يرجى الاتصال بدعم PayPal');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('paypal', 'TRANSACTION_REFUSED', 'TRANSACTION_DECLINED', 'fail', 20, '交易被拒绝，请稍后重试', 'Transaction refused, please retry later', 'تم رفض المعاملة، يرجى المحاولة لاحقًا');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('paypal', 'PAYER_RISK', 'RISK_CONTROL', 'fail', 15, '交易存在风险，请更换支付方式', 'Transaction risk detected, please change payment method', 'تم اكتشاف مخاطر في المعاملة، يرجى تغيير طريقة الدفع');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('paypal', 'PAYER_ACTION_REQUIRED', 'RETRY', 'retry', 60, '需要买家操作，请刷新页面', 'Buyer action required, please refresh', 'يتطلب إجراء من المشتري، يرجى تحديث الصفحة');

-- HTTP 状态码
INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('paypal', 'HTTP_422', 'INVALID_REQUEST', 'fail', 10, '支付请求无效，请稍后重试', 'Invalid payment request, please retry', 'طلب الدفع غير صالح، يرجى المحاولة مرة أخرى');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('paypal', 'HTTP_500', 'SERVER_ERROR', 'retry', 5, 'PayPal服务器异常，请稍后重试', 'PayPal server error, please retry later', 'خطأ في خادم PayPal، يرجى المحاولة لاحقًا');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('paypal', 'HTTP_401', 'CONFIG_ERROR', 'fail', 1, '支付配置错误，请联系客服', 'Payment configuration error, contact support', 'خطأ في تكوين الدفع، يرجى الاتصال بالدعم');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('paypal', 'HTTP_403', 'PERMISSION_ERROR', 'fail', 1, '支付权限不足，请联系客服', 'Payment permission denied, contact support', 'تم رفض إذن الدفع، يرجى الاتصال بالدعم');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('paypal', 'HTTP_404', 'ORDER_NOT_FOUND', 'fail', 1, '订单不存在', 'Order not found', 'الطلب غير موجود');

-- ========================================
-- Stripe 错误码
-- ========================================
INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('stripe', 'card_declined', 'CARD_DECLINED', 'fail', 40, '银行卡被拒绝，请更换银行卡', 'Card declined, please change card', 'تم رفض البطاقة، يرجى تغيير البطاقة');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('stripe', 'insufficient_funds', 'INSUFFICIENT_FUNDS', 'fail', 35, '银行卡余额不足', 'Insufficient funds', 'رصيد غير كافٍ');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('stripe', 'expired_card', 'CARD_EXPIRED', 'fail', 30, '银行卡已过期，请更换银行卡', 'Card expired, please change card', 'البطاقة منتهية الصلاحية، يرجى تغيير البطاقة');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('stripe', 'incorrect_cvc', 'CVC_ERROR', 'fail', 25, '安全码错误，请检查卡背面安全码', 'Incorrect CVC, please check card security code', 'رمز الأمان غير صحيح، يرجى التحقق من رمز الأمان');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('stripe', 'processing_error', 'PROCESSING_ERROR', 'fail', 20, '支付处理错误，请稍后重试', 'Processing error, please retry', 'خطأ في المعالجة، يرجى المحاولة لاحقًا');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('stripe', 'lost_card', 'CARD_LOST', 'fail', 10, '银行卡已挂失，请联系银行', 'Card reported lost, contact bank', 'البطاقة معلنة مفقودة، يرجى الاتصال بالبنك');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('stripe', 'stolen_card', 'CARD_STOLEN', 'fail', 10, '银行卡被盗用，请联系银行', 'Card reported stolen, contact bank', 'تم الإبلاغ عن سرقة البطاقة، يرجى الاتصال بالبنك');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('stripe', 'charge_disputed', 'CHARGE_DISPUTED', 'fail', 5, '支付争议中，请联系客服', 'Payment disputed, contact support', 'نزاع الدفع، يرجى الاتصال بالدعم');

-- ========================================
-- Alipay 错误码
-- ========================================
INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('alipay', 'ACQ.TRADE_HAS_CLOSED', 'TRADE_CLOSED', 'fail', 40, '交易已关闭，请重新下单', 'Trade closed, please reorder', 'تم إغلاق المعاملة، يرجى إعادة الطلب');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('alipay', 'ACQ.PAYMENT_FAIL', 'PAYMENT_FAILED', 'fail', 35, '支付失败，请稍后重试', 'Payment failed, please retry', 'فشل الدفع، يرجى المحاولة لاحقًا');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('alipay', 'ACQ.BuyerArrearage', 'INSUFFICIENT_FUNDS', 'fail', 30, '买家余额不足', 'Buyer insufficient funds', 'رصيد المشتري غير كافٍ');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('alipay', 'ACQ.EXIST_FORBIDDEN_CARD', 'CARD_FORBIDDEN', 'fail', 25, '银行卡受限，请更换支付方式', 'Card forbidden, please change payment method', 'البطاقة محظورة، يرجى تغيير طريقة الدفع');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('alipay', 'ACQ.TRADE_BUYER_NOT_MATCHED', 'BUYER_MISMATCH', 'fail', 20, '买家账号不匹配', 'Buyer account mismatch', 'عدم تطابق حساب المشتري');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('alipay', 'ACQ.TRADE_HAS_FINISHED', 'TRADE_FINISHED', 'fail', 15, '交易已结束', 'Trade finished', 'انتهت المعاملة');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('alipay', 'ACQ.CONTEXT_INCONSISTENT', 'CONTEXT_ERROR', 'fail', 10, '交易上下文不一致，请重新支付', 'Context inconsistent, please retry', 'عدم اتساق سياق المعاملة، يرجى إعادة الدفع');

-- 通用成功状态
INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('alipay', 'TRADE_SUCCESS', 'SUCCESS', 'success', 100, '支付成功', 'Payment successful', 'الدفع ناجح');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('stripe', 'succeeded', 'SUCCESS', 'success', 100, '支付成功', 'Payment successful', 'الدفع ناجح');

-- 未知错误
INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('paypal', 'UNKNOWN_ERROR', 'UNKNOWN_ERROR', 'fail', 0, '支付失败，请稍后重试', 'Payment failed, please retry later', 'فشل الدفع، يرجى المحاولة لاحقًا');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('stripe', 'unknown_error', 'UNKNOWN_ERROR', 'fail', 0, '支付失败，请稍后重试', 'Payment failed, please retry later', 'فشل الدفع، يرجى المحاولة لاحقًا');

INSERT OR IGNORE INTO payment_error_codes (platform, original_code, unified_code, error_type, priority, message_zh, message_en, message_ar) VALUES
('alipay', 'UNKNOWN_ERROR', 'UNKNOWN_ERROR', 'fail', 0, '支付失败，请稍后重试', 'Payment failed, please retry later', 'فشل الدفع، يرجى المحاولة لاحقًا');
