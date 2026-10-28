MARKET CALENDAR R29 - EARNINGSAPI.COM KEY REGISTRATION
Date: 2026-10-28

1. Extract all files in this ZIP into one folder.
2. Double-click MARKET_CALENDAR_R29_EARNINGSAPI_KEY_REGISTER.cmd.
3. Paste the free EarningsAPI.com API key and press Enter.
   The secret input is intentionally hidden. The program never prints the key.
4. Look for R29 EARNINGS API KEY REGISTRATION: PASS.

Requirements:
- Existing E:\ZGmini\runtime\node.exe
- Existing E:\ZGmini\data\pc-writer\providers.env
  (or existing ZGMINI_PC_HOME\providers.env if that environment is configured)
- Run using the same Windows account as the PC scheduled collector.

Safety:
- The only provider setting changed is EARNINGS_API_KEY in providers.env.
- Existing provider entries are preserved and a private backup of the previous
  providers.env is retained in the same credential folder when a change occurs.
- Missing target file or runtime -> STOP without creating a replacement.
- No API request, scheduled collection, DB publication or Cloudflare deployment.
- The R29 collector is still disabled until data rights and source verification
  conditions are satisfied and a separate approved installation is completed.
- Never send the API key, providers.env or its backup to chat or GitHub.
