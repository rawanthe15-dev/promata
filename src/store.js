// Keeps every logged commission in data/commissions.json (so re-running never
// duplicates a message) and rebuilds commissions.xlsx from it.

const fs = require('node:fs');
const path = require('node:path');
const ExcelJS = require('exceljs');

const ROOT = path.join(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'data', 'commissions.json');
const XLSX_FILE = path.join(ROOT, 'commissions.xlsx');

function load() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function save(records) {
  records.sort((a, b) => a.timestamp - b.timestamp);
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2));
}

// Adds records whose message id isn't stored yet. Returns how many were new.
function merge(records, incoming) {
  const seen = new Set(records.map((r) => r.id));
  let added = 0;
  for (const r of incoming) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    records.push(r);
    added++;
  }
  return added;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

// Message time in the computer's local timezone.
function localParts(timestamp) {
  const d = new Date(timestamp * 1000);
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function monthlyTotals(records) {
  const totals = new Map();
  for (const r of records) {
    const { year, month } = localParts(r.timestamp);
    const key = `${year}-${pad(month + 1)}|${r.currency}`;
    const t = totals.get(key) || { month: `${year}-${pad(month + 1)}`, currency: r.currency, total: 0, count: 0 };
    t.total = Math.round((t.total + r.amount) * 100) / 100;
    t.count++;
    totals.set(key, t);
  }
  return [...totals.values()].sort((a, b) => a.month.localeCompare(b.month) || a.currency.localeCompare(b.currency));
}

async function writeWorkbook(records) {
  const wb = new ExcelJS.Workbook();

  const log = wb.addWorksheet('Commissions', { views: [{ state: 'frozen', ySplit: 1 }] });
  log.columns = [
    { header: 'Date', key: 'date', width: 12, style: { numFmt: 'yyyy-mm-dd' } },
    { header: 'Time', key: 'time', width: 7 },
    { header: 'Sender', key: 'sender', width: 22 },
    { header: 'Amount', key: 'amount', width: 12, style: { numFmt: '#,##0.00' } },
    { header: 'Currency', key: 'currency', width: 9 },
    { header: 'Message', key: 'message', width: 80 },
  ];
  for (const r of records) {
    const p = localParts(r.timestamp);
    log.addRow({
      // Date-only value at UTC midnight so Excel shows the local calendar day.
      date: new Date(Date.UTC(p.year, p.month, p.day)),
      time: p.time,
      sender: r.sender,
      amount: r.amount,
      currency: r.currency,
      message: r.message,
    });
  }
  log.getRow(1).font = { bold: true };
  log.autoFilter = { from: 'A1', to: 'F1' };

  const summary = wb.addWorksheet('Monthly totals', { views: [{ state: 'frozen', ySplit: 1 }] });
  summary.columns = [
    { header: 'Month', key: 'month', width: 10 },
    { header: 'Currency', key: 'currency', width: 9 },
    { header: 'Total', key: 'total', width: 14, style: { numFmt: '#,##0.00' } },
    { header: 'Payments', key: 'count', width: 10 },
  ];
  summary.addRows(monthlyTotals(records));
  summary.getRow(1).font = { bold: true };

  try {
    await wb.xlsx.writeFile(XLSX_FILE);
  } catch (err) {
    if (err.code === 'EBUSY' || err.code === 'EPERM') {
      throw new Error(`Couldn't update ${path.basename(XLSX_FILE)} - close it in Excel and run again.`);
    }
    throw err;
  }
}

module.exports = { load, save, merge, monthlyTotals, writeWorkbook, XLSX_FILE };
