// Pulls a money amount out of a WhatsApp message.
//
// Recognises amounts written with a currency sign or code, before or after
// the number: "€12.50", "12,50€", "$ 1,200", "350 RMB", "EUR 40", "40 euro".
// If `keywords` match and no currency is written, the first plain number is
// used with `defaultCurrency` ("commission 25" -> 25 EUR).

const SYMBOLS = {
  '€': 'EUR',
  '$': 'USD',
  '£': 'GBP',
  '¥': 'CNY',
  '₹': 'INR',
  '₦': 'NGN',
  '₱': 'PHP',
  '₺': 'TRY',
  'R$': 'BRL',
};

const WORDS = {
  eur: 'EUR',
  euro: 'EUR',
  euros: 'EUR',
  usd: 'USD',
  dollar: 'USD',
  dollars: 'USD',
  gbp: 'GBP',
  pound: 'GBP',
  pounds: 'GBP',
  cny: 'CNY',
  rmb: 'CNY',
  yuan: 'CNY',
  inr: 'INR',
  aud: 'AUD',
  cad: 'CAD',
  chf: 'CHF',
  sek: 'SEK',
  nok: 'NOK',
  dkk: 'DKK',
  pln: 'PLN',
  ngn: 'NGN',
};

const NUM = String.raw`\d+(?:[.,]\d+)*`;
const SYM = String.raw`R\$|[€$£¥₹₦₱₺]`;
const WORD = Object.keys(WORDS).join('|');

const PATTERNS = [
  // €12.50, $ 1,200
  { re: new RegExp(`(${SYM})\\s?(${NUM})`, 'u'), cur: 1, num: 2 },
  // 12,50€, 350 RMB, 40 euro
  { re: new RegExp(`(${NUM})\\s?(${SYM}|(?:${WORD})\\b)`, 'iu'), num: 1, cur: 2 },
  // EUR 40
  { re: new RegExp(`\\b(${WORD})\\s?(${NUM})`, 'iu'), cur: 1, num: 2 },
];

// "1.234,56" / "1,234.56" / "12,50" / "1.500" -> number.
// The last separator is a decimal point unless exactly three digits follow it.
function toNumber(raw) {
  const last = Math.max(raw.lastIndexOf('.'), raw.lastIndexOf(','));
  if (last === -1) return Number(raw);
  const intPart = raw.slice(0, last).replace(/[.,]/g, '');
  const fracPart = raw.slice(last + 1);
  if (fracPart.length === 3 && intPart !== '0') return Number(intPart + fracPart);
  return Number(`${intPart}.${fracPart}`);
}

function toCurrency(token) {
  return SYMBOLS[token] || WORDS[token.toLowerCase()];
}

function parseAmount(text, { keywords = [], defaultCurrency = 'EUR' } = {}) {
  if (!text) return null;

  let best = null;
  for (const p of PATTERNS) {
    const m = p.re.exec(text);
    if (m && (!best || m.index < best.index)) {
      best = { index: m.index, amount: toNumber(m[p.num]), currency: toCurrency(m[p.cur]) };
    }
  }
  if (best && best.amount > 0) return { amount: best.amount, currency: best.currency };

  if (keywords.length && matchesKeyword(text, keywords)) {
    const m = new RegExp(NUM).exec(text);
    if (m) {
      const amount = toNumber(m[0]);
      if (amount > 0) return { amount, currency: defaultCurrency };
    }
  }
  return null;
}

function matchesKeyword(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

module.exports = { parseAmount, matchesKeyword, toNumber };
