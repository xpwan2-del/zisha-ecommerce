export interface MessageSet {
  // 通用错误码
  UNAUTHORIZED: string;
  FORBIDDEN: string;
  INTERNAL_ERROR: string;
  MISSING_PARAMS: string;
  INVALID_PARAMS: string;
  NOT_FOUND: string;
  
  // 业务错误码
  INSUFFICIENT_STOCK: string;
  OUT_OF_STOCK: string;
  PRODUCT_NOT_FOUND: string;
  CART_ITEM_NOT_FOUND: string;
  CART_EMPTY: string;
  CART_MERGE_PARTIAL: string;
  CART_MERGE_SUCCESS: string;
  ORDER_NOT_FOUND: string;
  ORDER_CREATE_FAILED: string;
  PAYMENT_FAILED: string;
  PAYMENT_TIMEOUT: string;
  ADDRESS_NOT_FOUND: string;
  COUPON_INVALID: string;
  COUPON_EXPIRED: string;
  COUPON_ALREADY_USED: string;
  STOCK_LOCK_FAILED: string;
  BUY_NOW_STOCK_ERROR: string;
  BUY_NOW_FAILED: string;
  ADDED_TO_CART: string;
  ADD_TO_CART_FAILED: string;
  CART_UPDATE_FAILED: string;
  CART_REMOVE_FAILED: string;
  CART_CLEARED: string;
  CART_ITEM_REMOVED: string;
  STOCK_ADJUSTED: string;
  STOCK_ADJUST_FAILED: string;
  CHECK_CREATED: string;
  CHECK_CREATE_FAILED: string;
  CHECK_COMPLETED: string;
  CHECK_FAILED: string;
  DB_SAVED: string;
  DB_DELETE_FAILED: string;
  UNKNOWN_ERROR: string;
  STOCK_LIMIT: string;
  SELECT_ONE_PRODUCT: string;
  EMAIL_ALREADY_EXISTS: string;
  REGISTRATION_FAILED: string;
  INVALID_ACTION: string;
  INVALID_ORDER_STATUS: string;
  REFRESH_TOKEN_REQUIRED: string;
  INVALID_REFRESH_TOKEN: string;
  USER_NOT_FOUND: string;
  INVALID_CREDENTIALS: string;
  PROMOTION_EXPIRED: string;
  [key: string]: string;
}

export interface Messages {
  zh: MessageSet;
  en: MessageSet;
  ar: MessageSet;
}

export const messages: Messages = {
  zh: {
    // 通用错误码
    UNAUTHORIZED: '请先登录',
    FORBIDDEN: '无权操作',
    INTERNAL_ERROR: '服务器内部错误',
    MISSING_PARAMS: '缺少必需参数',
    INVALID_PARAMS: '参数无效',
    NOT_FOUND: '资源不存在',
    EMAIL_ALREADY_EXISTS: '邮箱已被注册',
    REGISTRATION_FAILED: '注册失败',
    INVALID_ACTION: '无效操作',
    INVALID_ORDER_STATUS: '订单状态不支持此操作',
    REFRESH_TOKEN_REQUIRED: '缺少刷新令牌',
    INVALID_REFRESH_TOKEN: '刷新令牌无效或已过期',
    USER_NOT_FOUND: '用户不存在',
    INVALID_CREDENTIALS: '邮箱或密码错误',
    PROMOTION_EXPIRED: '活动已结束，请返回商品页重新购买',
    // 业务错误码
    INSUFFICIENT_STOCK: '库存不足',
    OUT_OF_STOCK: '已售罄',
    PRODUCT_NOT_FOUND: '商品不存在',
    CART_ITEM_NOT_FOUND: '购物车商品不存在',
    CART_EMPTY: '购物车为空',
    CART_MERGE_PARTIAL: '部分商品库存不足，未能全部合并',
    CART_MERGE_SUCCESS: '购物车合并成功',
    ORDER_NOT_FOUND: '订单不存在',
    ORDER_CREATE_FAILED: '订单创建失败',
    PAYMENT_FAILED: '支付失败',
    PAYMENT_TIMEOUT: '支付超时',
    ADDRESS_NOT_FOUND: '收货地址不存在',
    COUPON_INVALID: '优惠券无效',
    COUPON_EXPIRED: '优惠券已过期',
    COUPON_ALREADY_USED: '优惠券已使用',
    STOCK_LOCK_FAILED: '库存锁定失败',
    BUY_NOW_STOCK_ERROR: '库存不足，无法购买',
    BUY_NOW_FAILED: '操作失败，请重试',
    ADDED_TO_CART: '已添加到购物车',
    ADD_TO_CART_FAILED: '添加失败',
    CART_UPDATE_FAILED: '更新数量失败',
    CART_REMOVE_FAILED: '移除商品失败',
    CART_CLEARED: '购物车已清空',
    CART_ITEM_REMOVED: '商品已从购物车移除',
    STOCK_ADJUSTED: '库存调整成功',
    STOCK_ADJUST_FAILED: '库存调整失败',
    CHECK_CREATED: '盘点任务已创建',
    CHECK_CREATE_FAILED: '创建盘点任务失败',
    CHECK_COMPLETED: '盘点完成，库存已调整',
    CHECK_FAILED: '盘点操作失败',
    DB_SAVED: '数据库已更新',
    DB_DELETE_FAILED: '删除失败',
    UNKNOWN_ERROR: '未知错误',
    STOCK_LIMIT: '库存不足，仅剩 {stock} 件',
    SELECT_ONE_PRODUCT: '请至少选择一个商品',
  },
  en: {
    // 通用错误码
    UNAUTHORIZED: 'Unauthorized - Please login',
    FORBIDDEN: 'Forbidden - No access permission',
    INTERNAL_ERROR: 'Internal server error',
    MISSING_PARAMS: 'Missing required parameters',
    INVALID_PARAMS: 'Invalid parameters',
    NOT_FOUND: 'Resource not found',
    EMAIL_ALREADY_EXISTS: 'Email already exists',
    REGISTRATION_FAILED: 'Registration failed',
    INVALID_ACTION: 'Invalid action',
    INVALID_ORDER_STATUS: 'Invalid order status for this action',
    REFRESH_TOKEN_REQUIRED: 'Refresh token required',
    INVALID_REFRESH_TOKEN: 'Invalid or expired refresh token',
    USER_NOT_FOUND: 'User not found',
    INVALID_CREDENTIALS: 'Invalid email or password',
    PROMOTION_EXPIRED: 'Promotion has ended, please go back and repurchase',
    // 业务错误码
    INSUFFICIENT_STOCK: 'Insufficient stock',
    OUT_OF_STOCK: 'Out of stock',
    PRODUCT_NOT_FOUND: 'Product not found',
    CART_ITEM_NOT_FOUND: 'Cart item not found',
    CART_EMPTY: 'Cart is empty',
    CART_MERGE_PARTIAL: 'Some items were not merged due to insufficient stock',
    CART_MERGE_SUCCESS: 'Cart merged successfully',
    ORDER_NOT_FOUND: 'Order not found',
    ORDER_CREATE_FAILED: 'Failed to create order',
    PAYMENT_FAILED: 'Payment failed',
    PAYMENT_TIMEOUT: 'Payment timeout',
    ADDRESS_NOT_FOUND: 'Address not found',
    COUPON_INVALID: 'Invalid coupon',
    COUPON_EXPIRED: 'Coupon expired',
    COUPON_ALREADY_USED: 'Coupon already used',
    STOCK_LOCK_FAILED: 'Failed to lock stock',
    BUY_NOW_STOCK_ERROR: 'Insufficient stock, cannot purchase',
    BUY_NOW_FAILED: 'Operation failed, please retry',
    ADDED_TO_CART: 'Added to cart',
    ADD_TO_CART_FAILED: 'Failed to add',
    CART_UPDATE_FAILED: 'Failed to update quantity',
    CART_REMOVE_FAILED: 'Failed to remove item',
    CART_CLEARED: 'Cart cleared',
    CART_ITEM_REMOVED: 'Item removed from cart',
    STOCK_ADJUSTED: 'Stock adjusted successfully',
    STOCK_ADJUST_FAILED: 'Failed to adjust stock',
    CHECK_CREATED: 'Check task created',
    CHECK_CREATE_FAILED: 'Failed to create check task',
    CHECK_COMPLETED: 'Check completed and inventory adjusted',
    CHECK_FAILED: 'Check operation failed',
    DB_SAVED: 'Database updated',
    DB_DELETE_FAILED: 'Failed to delete',
    UNKNOWN_ERROR: 'Unknown error',
    STOCK_LIMIT: 'Only {stock} available',
    SELECT_ONE_PRODUCT: 'Please select at least one product',
  },
  ar: {
    // 通用错误码
    UNAUTHORIZED: 'الرجاء تسجيل الدخول',
    FORBIDDEN: 'غير مصرح',
    INTERNAL_ERROR: 'خطأ داخلي في الخادم',
    MISSING_PARAMS: 'معلمات مفقودة',
    INVALID_PARAMS: 'معلمات غير صالحة',
    NOT_FOUND: 'غير موجود',
    EMAIL_ALREADY_EXISTS: 'البريد الإلكتروني مسجل بالفعل',
    REGISTRATION_FAILED: 'فشل التسجيل',
    INVALID_ACTION: 'إجراء غير صالح',
    INVALID_ORDER_STATUS: 'حالة الطلب لا تدعم هذا الإجراء',
    REFRESH_TOKEN_REQUIRED: 'رمز التحديث مطلوب',
    INVALID_REFRESH_TOKEN: 'رمز التحديث غير صالح أو منتهي الصلاحية',
    USER_NOT_FOUND: 'المستخدم غير موجود',
    INVALID_CREDENTIALS: 'بريد إلكتروني أو كلمة مرور غير صالحة',
    PROMOTION_EXPIRED: 'انتهى العرض، يرجى العودة وإعادة الشراء',
    // 业务错误码
    INSUFFICIENT_STOCK: 'المخزون غير كافٍ',
    OUT_OF_STOCK: 'نفد المخزون',
    PRODUCT_NOT_FOUND: 'المنتج غير موجود',
    CART_ITEM_NOT_FOUND: 'عنصر السلة غير موجود',
    CART_EMPTY: 'السلة فارغة',
    CART_MERGE_PARTIAL: 'بعض العناصر لم يتم دمجها بسبب عدم كفاية المخزون',
    CART_MERGE_SUCCESS: 'تم دمج السلة بنجاح',
    ORDER_NOT_FOUND: 'الطلب غير موجود',
    ORDER_CREATE_FAILED: 'فشل في إنشاء الطلب',
    PAYMENT_FAILED: 'فشل الدفع',
    PAYMENT_TIMEOUT: 'انتهت مهلة الدفع',
    ADDRESS_NOT_FOUND: 'العنوان غير موجود',
    COUPON_INVALID: 'كوبون غير صالح',
    COUPON_EXPIRED: 'انتهت صلاحية الكوبون',
    COUPON_ALREADY_USED: 'تم استخدام الكوبون بالفعل',
    STOCK_LOCK_FAILED: 'فشل في قفل المخزون',
    BUY_NOW_STOCK_ERROR: 'المخزون غير كافٍ، لا يمكن الشراء',
    BUY_NOW_FAILED: 'فشلت العملية، يرجى إعادة المحاولة',
    ADDED_TO_CART: 'تمت الإضافة إلى السلة',
    ADD_TO_CART_FAILED: 'فشل في الإضافة',
    CART_UPDATE_FAILED: 'فشل في تحديث الكمية',
    CART_REMOVE_FAILED: 'فشل في إزالة العنصر',
    CART_CLEARED: 'تم إفراغ السلة',
    CART_ITEM_REMOVED: 'تمت إزالة العنصر من السلة',
    STOCK_ADJUSTED: 'تم تعديل المخزون بنجاح',
    STOCK_ADJUST_FAILED: 'فشل في تعديل المخزون',
    CHECK_CREATED: 'تم إنشاء مهمة الجرد',
    CHECK_CREATE_FAILED: 'فشل في إنشاء مهمة الجرد',
    CHECK_COMPLETED: 'اكتمل الجرد وتم تعديل المخزون',
    CHECK_FAILED: 'فشلت عملية الجرد',
    DB_SAVED: 'تم تحديث قاعدة البيانات',
    DB_DELETE_FAILED: 'فشل في الحذف',
    UNKNOWN_ERROR: 'خطأ غير معروف',
    STOCK_LIMIT: 'المخزون المتاح فقط {stock}',
    SELECT_ONE_PRODUCT: 'الرجاء تحديد منتج واحد على الأقل',
  },
};

export function getMessage(key: keyof MessageSet, lang: string = 'zh'): string {
  const langMessages = messages[lang as keyof Messages] || messages.zh;
  return langMessages[key] || langMessages.UNKNOWN_ERROR;
}

export function getMessageWithParams(
  key: keyof MessageSet,
  lang: string = 'zh',
  params: Record<string, string | number> = {}
): string {
  let message = getMessage(key, lang);
  Object.entries(params).forEach(([k, v]) => {
    message = message.replace(`{${k}}`, String(v));
  });
  return message;
}