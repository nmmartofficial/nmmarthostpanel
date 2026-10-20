import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizePOSPaymentAmounts } from './calculations.js';
import { runPOSCheckoutOnce } from './atomicCheckout.js';

test('calculates exact cash tender and no change', () => {
  assert.deepEqual(
    summarizePOSPaymentAmounts({ Cash: '125.00', UPI: '', Card: 0 }, 125),
    {
      isValid: true,
      error: '',
      paidTotal: 125,
      changeReturn: 0,
      remainingToPay: 0,
      paymentMethod: 'cash'
    }
  );
});

test('returns change only from cash after digital tender is applied', () => {
  const summary = summarizePOSPaymentAmounts({ Cash: '40', UPI: '70', Card: '0' }, 100);
  assert.equal(summary.isValid, true);
  assert.equal(summary.paidTotal, 110);
  assert.equal(summary.changeReturn, 10);
  assert.equal(summary.paymentMethod, 'mixed');
});

test('rejects negative, malformed, unsupported, and insufficient tender', () => {
  assert.equal(summarizePOSPaymentAmounts({ Cash: '-1' }, 10).error, 'INVALID_PAYMENT_AMOUNT');
  assert.equal(summarizePOSPaymentAmounts({ Cash: 'abc' }, 10).error, 'INVALID_PAYMENT_AMOUNT');
  assert.equal(summarizePOSPaymentAmounts({ Cash: 10, Credit: 1 }, 10).error, 'INVALID_PAYMENT_METHOD');
  assert.equal(summarizePOSPaymentAmounts({ Cash: 9 }, 10).error, 'INSUFFICIENT_PAYMENT');
});

test('rejects digital overpayment rather than displaying it as cash change', () => {
  const summary = summarizePOSPaymentAmounts({ UPI: 110 }, 100);
  assert.equal(summary.isValid, false);
  assert.equal(summary.error, 'NON_CASH_PAYMENT_EXCEEDS_TOTAL');
  assert.equal(summary.changeReturn, 0);
});

test('allows a genuine zero-payable sale without inventing tender', () => {
  const summary = summarizePOSPaymentAmounts({ Cash: 0, UPI: 0, Card: 0 }, 0);
  assert.equal(summary.isValid, true);
  assert.equal(summary.paidTotal, 0);
});

test('prevents concurrent checkout submissions and unlocks after failure', async () => {
  const inFlightRef = { current: false };
  let releaseSubmission;
  const pendingSubmission = new Promise((resolve) => { releaseSubmission = resolve; });
  let callCount = 0;

  const first = runPOSCheckoutOnce(inFlightRef, async () => {
    callCount += 1;
    await pendingSubmission;
  });
  const duplicate = await runPOSCheckoutOnce(inFlightRef, async () => {
    callCount += 1;
  });

  assert.equal(duplicate, false);
  assert.equal(callCount, 1);
  releaseSubmission();
  assert.equal(await first, true);
  assert.equal(inFlightRef.current, true);

  inFlightRef.current = false;
  await assert.rejects(
    runPOSCheckoutOnce(inFlightRef, async () => { throw new Error('payment failed'); }),
    /payment failed/
  );
  assert.equal(inFlightRef.current, false);
});
