function buildPayPalApplicationContext({ baseUrl, orderNumber, source = 'cart' }) {
  const resultUrl = new URL('/api/payments/result', baseUrl);
  resultUrl.searchParams.set('order_number', orderNumber);
  resultUrl.searchParams.set('source', source);
  resultUrl.searchParams.set('platform', 'paypal');

  const cancelUrl = new URL(resultUrl.toString());
  cancelUrl.searchParams.set('status', 'cancel');

  return {
    return_url: resultUrl.toString(),
    cancel_url: cancelUrl.toString(),
  };
}

module.exports = {
  buildPayPalApplicationContext,
};
