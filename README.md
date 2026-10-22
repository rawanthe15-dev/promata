# WhatsApp commission log

Reads one WhatsApp group through a linked device (like WhatsApp Web) and logs every commission payment into a spreadsheet, `commissions.xlsx`, with a **Commissions** sheet (date, time, sender, amount, currency, message) and a **Monthly totals** sheet.

It only reads. It never sends messages, read receipts or "online" status. Running it twice never logs the same message twice.

> **Heads-up:** this uses an unofficial WhatsApp Web library, which is against WhatsApp's terms. Only reading is lower risk than sending, but WhatsApp can still ban numbers that use unofficial clients. Use it at your own risk.

## 1. Install (once)

1. Install **Node.js** (the "LTS" version) from <https://nodejs.org>.
2. Download this folder and open a terminal in it (Windows: right-click the folder → *Open in Terminal*; Mac: right-click → *New Terminal at Folder*).
3. Run:

   ```
   npm install
   ```

## 2. Link WhatsApp and pick the group (once)

```
npm run groups
```

The first time, a QR code appears. On your phone: **WhatsApp → Settings → Linked devices → Link a device**, and scan it. It then prints all your group names.

This also creates `config.json`. Open it and paste the exact group name:

```json
{
  "groupName": "Commissions 💸",
  "keywords": [],
  "onlyFrom": [],
  "defaultCurrency": "EUR",
  "historyLimit": 5000,
  "phoneNumber": ""
}
```

| Setting           | What it does                                                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `groupName`       | The group to read.                                                                                                                                   |
| `keywords`        | Only count messages containing one of these words, e.g. `["commission", "payout"]`. Empty = every message with an amount in it.                      |
| `onlyFrom`        | Only count messages from these people (contact name or phone number), e.g. `["Alex", "+31612345678"]`. Use `"Me"` for your own messages. Empty = anyone. |
| `defaultCurrency` | Used when a message has a keyword and a plain number but no currency sign ("commission 25").                                                         |
| `historyLimit`    | How many past messages to read each run.                                                                                                             |
| `phoneNumber`     | Can't scan a QR code? Put your number here with country code (e.g. `"31612345678"`) and you'll get an 8-character code to enter under *Link with phone number instead*. |

## 3. Log your commissions

```
npm start
```

Reads the group, adds any new commissions to `commissions.xlsx`, prints your recent monthly totals, and exits. Run it whenever you want to update, e.g. once a week.

Or keep it running and log payments as they arrive:

```
npm run watch
```

(Ctrl+C to stop. On a computer that sleeps, just use `npm start` now and then instead.)

## What counts as a commission

The first amount in a message that has a currency next to it: `€12.50`, `12,50€`, `$1,200`, `350 RMB`, `EUR 40`, `40 euro`. If your group writes amounts differently, adjust `src/parse.js` or set `keywords` + `defaultCurrency`.

Your full log also lives in `data/commissions.json`. The spreadsheet is rebuilt from it every run, so edit your own copy of the spreadsheet, not this one.

## Good to know

- **Keep the `.wwebjs_auth` folder private.** It's your logged-in WhatsApp session; anyone who has it can read your chats. To unlink, remove the device under *Linked devices* on your phone and delete that folder.
- **Old messages:** a newly linked device only gets part of the chat history from your phone. If the first run finds fewer old messages than expected, wait a few minutes and run `npm start` again.
- WhatsApp unlinks devices after a while without use, or if your phone is offline for more than 14 days. Just link again.
- If WhatsApp Web changes and the script stops working, update the library with `npm install whatsapp-web.js@latest`.
