ZGMINI MARKET CALENDAR R44 - PC stored-input mapping (READ ONLY)

1. Unzip this package to one folder on the Windows PC.
2. Double-click MARKET_CALENDAR_R44_STORED_INPUT_MAP.cmd.
3. Open MARKET_CALENDAR_R44_STORED_INPUT_RESULT.txt in the same folder.
4. Send that one TXT file to the development assistant.

The CMD and .mjs file must remain together. Do not copy the CMD alone.

Scope:
- Reads the existing PC Core SQLite and known R43 local input paths.
- Does NOT call any API, collect or publish data, modify Core SQLite,
  change Git/config/schedulers, or create/rewrite input files.
- The result reports counts and dates only, never private raw ticker data,
  vendor calendar bodies, credentials or security identifiers.
- The source file remains on the PC; only the result TXT is created here.
- If a result TXT already exists it is preserved and the CMD stops.

This is not a new benchmark simulation. It identifies whether the input
fields needed to run the already implemented R43 formula exist in the
current PC data, without changing the live site.
