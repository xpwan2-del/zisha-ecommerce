import assert from 'node:assert/strict';
import { buildPaymentSuccessPersistence } from './src/lib/payment/payment-success-persistence.ts';

const persistence = buildPaymentSuccessPersistence({
  orderId: 181,
  orderNumber: 'ORD177808398335778',
  detectedPlatform: 'paypal',
  transactionId: 'PAYID-TEST-001',
  platformOrderId: '8ET26888DT517323T',
  amount: 59.13,
});

assert.equal(persistence.orderUpdate.referenceId, '8ET26888DT517323T');
assert.equal(persistence.orderUpdate.paymentStatus, 'paid');
assert.equal(persistence.orderPayment.transactionId, 'PAYID-TEST-001');
assert.equal(persistence.orderPayment.paymentStatus, 'paid');
assert.equal(persistence.orderPayment.amount, 59.13);

console.log('payment-success-persistence tests passed');
