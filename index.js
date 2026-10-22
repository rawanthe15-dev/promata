// WhatsApp commission logger.
//
//   npm run groups   list your WhatsApp groups (to find the exact name)
//   npm start        read the group's history, log new commissions, exit
//   npm run watch    same, then keep running and log new ones as they arrive
//
// Read-only: it never sends messages, read receipts or "online" status.

const fs = require('node:fs');
const path = require('node:path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { parseAmount, matchesKeyword } = require('./src/parse');
const store = require('./src/store');

const CONFIG_FILE = path.join(__dirname, 'config.json');
const EXAMPLE_CONFIG_FILE = path.join(__dirname, 'config.example.json');

const TEXT_TYPES = ['chat', 'image', 'video', 'document'];

const mode = process.argv[2] || 'sync';
if (!['sync', 'watch', 'groups'].includes(mode)) {
  console.error(`Unknown mode "${mode}". Use: sync, watch or groups.`);
  process.exit(1);
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.copyFileSync(EXAMPLE_CONFIG_FILE, CONFIG_FILE);
    console.log('Created config.json - open it and set "groupName" to your commission group.');
  }
  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  return {
    groupName: '',
    keywords: [],
    onlyFrom: [],
    defaultCurrency: 'EUR',
    historyLimit: 5000,
    phoneNumber: '',
    ...config,
  };
}

const config = loadConfig();
let shuttingDown = false;
if (mode !== 'groups' && !config.groupName) {
  console.error('Set "groupName" in config.json first. Run "npm run groups" to see the exact names.');
  process.exit(1);
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
  puppeteer: {
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined,
    // Chrome refuses to start as root (e.g. on a VPS) without this.
    args: process.getuid && process.getuid() === 0 ? ['--no-sandbox'] : [],
  },
  pairWithPhoneNumber: { phoneNumber: String(config.phoneNumber).replace(/\D/g, '') },
});

client.on('qr', (qr) => {
  console.log('\nLink this script to WhatsApp: on your phone open WhatsApp > Settings > Linked devices >');
  console.log('Link a device, and scan this QR code:\n');
  qrcode.generate(qr, { small: true });
});

client.on('code', (code) => {
  console.log('\nLink this script to WhatsApp: on your phone open WhatsApp > Settings > Linked devices >');
  console.log(`Link a device > "Link with phone number instead", and enter this code:  ${code}\n`);
});

client.on('authenticated', () => console.log('Linked. Loading chats...'));

client.on('auth_failure', (msg) => {
  console.error(`WhatsApp login failed: ${msg}`);
  console.error('Delete the .wwebjs_auth folder and run again to link from scratch.');
  process.exit(1);
});

client.on('disconnected', (reason) => {
  if (shuttingDown) return;
  console.error(`Disconnected from WhatsApp (${reason}).`);
  process.exit(1);
});

client.on('ready', async () => {
  try {
    await client.sendPresenceUnavailable();

    if (mode === 'groups') {
      await listGroups();
      return shutdown(0);
    }

    const group = await findGroup(config.groupName);
    const records = store.load();
    await syncHistory(group, records);

    if (mode === 'watch') {
      watch(group, records);
    } else {
      await shutdown(0);
    }
  } catch (err) {
    console.error(err.message || err);
    await shutdown(1);
  }
});

async function listGroups() {
  const groups = (await client.getChats()).filter((c) => c.isGroup);
  if (!groups.length) return console.log('No groups found on this account.');
  console.log('\nYour groups (copy the exact name into "groupName" in config.json):\n');
  for (const g of groups) console.log(`  ${g.name}`);
  console.log('');
}

async function findGroup(name) {
  const groups = (await client.getChats()).filter((c) => c.isGroup);
  const match = groups.find((g) => g.name === name) || groups.find((g) => g.name.toLowerCase() === name.toLowerCase());
  if (!match) {
    const close = groups.filter((g) => g.name.toLowerCase().includes(name.toLowerCase().slice(0, 4)));
    const hint = close.length ? ` Did you mean: ${close.map((g) => `"${g.name}"`).join(', ')}?` : '';
    throw new Error(`No group called "${name}".${hint} Run "npm run groups" to list them.`);
  }
  return match;
}

const contactCache = new Map();

async function senderOf(msg) {
  if (msg.fromMe) return { name: 'Me', ids: ['me'] };
  const key = msg.author || msg.from;
  if (!contactCache.has(key)) {
    let contact = null;
    try {
      contact = await msg.getContact();
    } catch {
      // Fall back to the raw id below.
    }
    const number = contact?.number || key.split('@')[0];
    const name = contact?.name || contact?.pushname || number;
    contactCache.set(key, { name, ids: [contact?.name, contact?.pushname, number].filter(Boolean) });
  }
  return contactCache.get(key);
}

function senderAllowed(sender) {
  if (!config.onlyFrom.length) return true;
  return config.onlyFrom.some((wanted) => {
    const w = String(wanted).toLowerCase();
    const digits = w.replace(/\D/g, '');
    return sender.ids.some((id) => {
      const v = id.toLowerCase();
      return v === w || (digits.length >= 6 && v.replace(/\D/g, '').endsWith(digits));
    });
  });
}

// Turns a message into a commission record, or null if it isn't one.
async function toRecord(msg) {
  if (!TEXT_TYPES.includes(msg.type)) return null;
  const text = (msg.body || '').trim();
  if (!text) return null;
  if (config.keywords.length && !matchesKeyword(text, config.keywords)) return null;

  const money = parseAmount(text, config);
  if (!money) return null;

  const sender = await senderOf(msg);
  if (!senderAllowed(sender)) return null;

  return {
    id: msg.id._serialized,
    timestamp: msg.timestamp,
    sender: sender.name,
    amount: money.amount,
    currency: money.currency,
    message: text.replace(/\s*\n\s*/g, ' / '),
  };
}

async function syncHistory(group, records) {
  console.log(`Reading up to ${config.historyLimit} messages from "${group.name}"...`);
  const messages = await group.fetchMessages({ limit: config.historyLimit });

  const found = [];
  for (const msg of messages) {
    const record = await toRecord(msg);
    if (record) found.push(record);
  }

  const added = store.merge(records, found);
  store.save(records);
  await store.writeWorkbook(records);

  console.log(`Checked ${messages.length} messages: ${found.length} commissions, ${added} new.`);
  printTotals(records);
}

function watch(group, records) {
  const groupId = group.id._serialized;
  console.log('Watching for new commissions. Press Ctrl+C to stop.');

  client.on('message_create', async (msg) => {
    const remote = typeof msg.id.remote === 'string' ? msg.id.remote : msg.id.remote?._serialized;
    if (remote !== groupId) return;
    try {
      const record = await toRecord(msg);
      if (!record || !store.merge(records, [record])) return;
      store.save(records);
      await store.writeWorkbook(records);
      console.log(`+ ${record.amount.toFixed(2)} ${record.currency} from ${record.sender}`);
    } catch (err) {
      console.error(`Couldn't log a message: ${err.message || err}`);
    }
  });

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
}

function printTotals(records) {
  const totals = store.monthlyTotals(records).slice(-6);
  if (!totals.length) return;
  console.log('\nRecent months:');
  for (const t of totals) {
    console.log(`  ${t.month}  ${t.total.toFixed(2).padStart(12)} ${t.currency}  (${t.count} payments)`);
  }
  console.log(`\nSpreadsheet: ${store.XLSX_FILE}\n`);
}

async function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    await client.destroy();
  } catch {
    // Already closed.
  }
  process.exit(code);
}

console.log('Starting WhatsApp...');
client.initialize().catch((err) => {
  console.error(`Couldn't start WhatsApp Web: ${err.message || err}`);
  process.exit(1);
});
