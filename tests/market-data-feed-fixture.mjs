import fs from 'node:fs';

// Exercise the PC collector with an input store that performs the same write/read
// handoff as production. Public GET remains a stored-data-only route.
export function marketDataFeedFixtureSource() {
  const source = fs.readFileSync(new URL('../worker/market-data-feed.ts', import.meta.url), 'utf8');
  return source + `
async function GET() {
  let saved;
  const store = {
    async writeInput(id, body, storedAt) { saved = {body, storedAt}; },
    async readInput() { return saved; }
  };
  return collectMarketDataFeed(env, store, new Date().valueOf());
}
`;
}
