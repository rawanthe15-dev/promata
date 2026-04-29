# promata

Drop a Google Sheet of finds. Get a sharable link-in-bio page.

Like beacons.ai, but built for spreadsheet-driven catalogs of Weidian, Taobao, 1688, and shipping-agent links (Joyagoo, Sugargoo, CSSBuy, Pandabuy, Superbuy, etc).

## How it works

1. User pastes a Google Sheets URL on `/`.
2. Server reads the sheet via the Sheets API (`includeGridData=true`), pulls out **real hyperlinks** (the cells often display "LINK" but the URL lives in the cell's hyperlink property — CSV export drops these).
3. Each row becomes an item: name, prices, review, notes, image, plus a list of links auto-categorized by host (`Joyagoo`, `Weidian`, `Taobao`, etc).
4. User picks a username. If it's free, we save the page and redirect to `/{username}`.
5. The owner's browser gets a signed cookie token so they can `↻ refresh from sheet` later.

## Stack

- Next.js 15 App Router + Server Actions
- TypeScript, Tailwind CSS
- Neon Postgres + Drizzle ORM
- Deploys on Vercel (Fluid Compute, no edge runtime needed)

## Local setup

```bash
npm install
cp .env.example .env.local
# fill in DATABASE_URL and GOOGLE_API_KEY
npm run db:push    # create the pages table
npm run dev
```

### Required env vars

| Var              | Where to get it                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`   | Neon Postgres connection string. Provision via Vercel Marketplace → Neon, or sign up at neon.tech. |
| `GOOGLE_API_KEY` | Google Cloud Console → APIs & Services → enable **Google Sheets API** → create an API key.        |

The sheets users paste must be set to **Anyone with the link can view**. The API key doesn't need OAuth — public read works with just the key.

## Deploy on Vercel

1. Push this repo to GitHub (already done if you used the bootstrap).
2. Import into Vercel → it auto-detects Next.js.
3. Add the **Neon Postgres** integration from the Vercel Marketplace — it injects `DATABASE_URL` automatically.
4. Add `GOOGLE_API_KEY` as a Production + Preview env var.
5. Run `npm run db:push` once locally against the production `DATABASE_URL` to create the table (or wire up a migration step).

Done. Each deployment is a Fluid Compute serverless function on Node.js 24, which is exactly what this app wants — no edge-runtime gotchas with `node:crypto`.

## Routes

| Route          | What it does                                                                |
| -------------- | --------------------------------------------------------------------------- |
| `/`            | Landing — paste a sheet URL.                                                |
| `/preview`     | Server-fetches the sheet, shows extracted items, claim-username form.       |
| `/[username]`  | Public page. Owner sees a `↻ refresh from sheet` button (cookie-gated).     |

## Adding more agents

Edit `lib/agents.ts` — add an entry to the `AGENTS` map and a hostname regex to `HOST_RULES`. The detector matches on hostname, so `something.cssbuy.com` or `cssbuy.com/...` both work.

## License

MIT.
