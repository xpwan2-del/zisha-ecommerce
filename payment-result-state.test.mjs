import assert from 'node:assert/strict';
import { derivePaymentResultState } from './src/lib/payment-result-state.ts';

const forgedSuccess = derivePaymentResultState({
  status: 'success',
  order: {
    id: 181,
    order_number: 'ORD177808398335778',
    order_status: 'pending',
    payment_status: 'pending',
  },
});

assert.equal(forgedSuccess.paymentStatus, 'fail');
assert.equal(forgedSuccess.errorCode, 'PAYMENT_NOT_CONFIRMED');

const realSuccess = derivePaymentResultState({
  status: 'success',
  order: {
    id: 181,
    order_number: 'ORD177808398335778',
    order_status: 'paid',
    payment_status: 'paid',
  },
});

assert.equal(realSuccess.paymentStatus, 'success');
assert.equal(realSuccess.errorCode, undefined);

console.log('payment-result-state tests passed');
