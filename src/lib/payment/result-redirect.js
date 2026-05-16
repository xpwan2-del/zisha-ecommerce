function buildPaymentResultRedirectPath({ status, orderId, orderNumber, source, platform }) {
  const params = new URLSearchParams();
  params.set('status', status);
  params.set('order_number', orderNumber);
  params.set('source', source || 'cart');
  params.set('platform', platform || '');
  params.set('order_id', String(orderId));

  return `/payment-result?${params.toString()}`;
}

module.exports = {
  buildPaymentResultRedirectPath,
};
