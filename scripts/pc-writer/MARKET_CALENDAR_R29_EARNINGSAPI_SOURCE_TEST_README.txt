MARKET CALENDAR R29 - EARNINGSAPI.COM READ-ONLY SOURCE TEST
Date: 2026-10-28

1. Extract the entire ZIP to one folder on the Windows PC.
2. Run MARKET_CALENDAR_R29_EARNINGSAPI_SOURCE_TEST.cmd once.
3. When it finishes, upload only:
   MARKET_CALENDAR_R29_EARNINGSAPI_SOURCE_TEST_RESULT.txt

What it does:
- Reads EARNINGS_API_KEY from the EXISTING private providers.env in
  E:\ZGmini\data\pc-writer\ (or the approved ZGMINI_PC_HOME).
- Requests 14 individual New York dates, using 14 API calls at most.
- Saves only response counts, priority ticker names and status codes in the TXT.
- Does not write source response bodies, API key, other existing credentials,
  database records, scheduled tasks, GitHub branches or published site data.
- HTTP 401/403/429 and unexpected responses stop without an automatic retry.

Important: This checks API authentication and actual response coverage only.
Vendor dates remain UNVERIFIED; this does not authorize commercial replication
of the raw data feed or activate the R29 calendar collector.

Never upload providers.env, its backup, the API key, or terminal screenshots
that might show the key. Only the generated RESULT.txt is needed.
