R34: PC-stored earnings HTML-only output -> existing Cloudflare D1.

1. Extract the complete ZIP to a local folder.
2. Double-click MARKET_CALENDAR_R34_EARNINGS_SYNC.cmd once.
3. It writes MARKET_CALENDAR_R34_EARNINGS_SYNC_RESULT.txt in this folder.
4. Only R34_D1_SYNC_VERIFIED or R34_D1_ALREADY_SYNCED proves success.
5. Check https://zgmini.kr/market-calendar/ (company earnings filter).

The CMD uses the already installed E:\ZGmini\runtime\node.exe and the
existing PC D1 credentials. It does not ask for or include an API key.
The script waits up to 20 minutes for the existing Core lock without deleting
or bypassing it. It makes zero EarningsAPI calls, performs no collection or
calculation, touches no scheduled task, source file or Git branch, and writes
only the key market-calendar:earnings-display-html in the existing D1 table.
It checks the D1 stored row byte-for-byte after a write. Do not repeat on a
failed permission, source, data, or D1 readback result; share the result TXT.

GitHub -> Cloudflare auto-deployment is separate from D1 data syncing.
Updating an existing D1 row does not require an unnecessary code deployment.
