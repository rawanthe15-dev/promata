const test = require('node:test');
const assert = require('node:assert/strict');
const { parseAmount, toNumber } = require('../src/parse');

test('toNumber handles common separators', () => {
  assert.equal(toNumber('12'), 12);
  assert.equal(toNumber('12.50'), 12.5);
  assert.equal(toNumber('12,50'), 12.5);
  assert.equal(toNumber('1,234.56'), 1234.56);
  assert.equal(toNumber('1.234,56'), 1234.56);
  assert.equal(toNumber('1.500'), 1500);
  assert.equal(toNumber('1,500'), 1500);
  assert.equal(toNumber('0.500'), 0.5);
});

test('currency sign before the number', () => {
  assert.deepEqual(parseAmount('Commission €12.50 for order 4411'), { amount: 12.5, currency: 'EUR' });
  assert.deepEqual(parseAmount('you earned $ 1,200 this week'), { amount: 1200, currency: 'USD' });
  assert.deepEqual(parseAmount('R$45,90'), { amount: 45.9, currency: 'BRL' });
});

test('currency after the number', () => {
  assert.deepEqual(parseAmount('Payout: 12,50€'), { amount: 12.5, currency: 'EUR' });
  assert.deepEqual(parseAmount('350 RMB commission'), { amount: 350, currency: 'CNY' });
  assert.deepEqual(parseAmount('40 euro sent'), { amount: 40, currency: 'EUR' });
});

test('currency code before the number', () => {
  assert.deepEqual(parseAmount('EUR 40 paid'), { amount: 40, currency: 'EUR' });
});

test('takes the first amount in the message', () => {
  assert.deepEqual(parseAmount('€15 commission (order was €150)'), { amount: 15, currency: 'EUR' });
});

test('plain numbers only count when a keyword matches', () => {
  assert.equal(parseAmount('order 3 items'), null);
  assert.equal(parseAmount('order 3 items', { keywords: ['commission'] }), null);
  assert.deepEqual(
    parseAmount('Commission: 25', { keywords: ['commission'], defaultCurrency: 'GBP' }),
    { amount: 25, currency: 'GBP' },
  );
});

test('ignores messages without money', () => {
  assert.equal(parseAmount(''), null);
  assert.equal(parseAmount('thanks!'), null);
  assert.equal(parseAmount('see you at 5'), null);
  assert.equal(parseAmount('€0'), null);
});
