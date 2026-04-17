export interface MessageSet {
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
  [key: string]: string;
}

export interface Messages {
  zh: MessageSet;
  en: MessageSet;
  ar: MessageSet;
}

export const messages: Messages = {
  zh: {
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
  },
  en: {
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
  },
  ar: {
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
  },
};

export function getMessage(key: keyof MessageSet, lang: string = 'zh'): string {
  const langMessages = messages[lang as keyof Messages] || messages.zh;
  return langMessages[key] || langMessages.PRODUCT_NOT_FOUND;
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
