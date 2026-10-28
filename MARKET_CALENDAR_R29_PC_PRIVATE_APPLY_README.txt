MARKET CALENDAR R29 - PC PRIVATE EARNINGS API COLLECTOR

Purpose:
 Connect the existing PC Core run to EarningsAPI private raw input storage.
 Read 14 NY-calendar days at most once per NY day (14 API calls/day).
 Do not create a new scheduled task or publish vendor rows to the D1/site.

Requirements:
 - R27 Treasury TIC PC source still unchanged; protected sources clean.
 - Existing E:\ZGmini\data\pc-writer\config.json; source=active HEAD.
 - Existing providers.env with EARNINGS_API_KEY already registered.
 - Existing PC Core task ZGMINI-PC-Local-Core unchanged.

Install:
 1. Unzip the ENTIRE ZIP into one folder, preserving subfolders.
 2. Run MARKET_CALENDAR_R29_PC_PRIVATE_APPLY.cmd once.
 3. Read MARKET_CALENDAR_R29_PC_PRIVATE_APPLY_RESULT.txt.
    Success: R29_PC_PRIVATE_INPUT_COLLECTOR_INSTALLED_NO_FORCED_COLLECTION
    Any other decision: STOP, do not retry blindly. Send the result TXT.

Safety:
 - Exactly 3 PC source files change: one existing collect-local.mjs and two
   newly added earnings modules. Existing source is backed up.
 - The installer checks known R27 hashes, the Core task identity, clean
   protected source, PC config and exclusive local-cycle lock.
 - No immediate collection, API request, DB write, D1 publication, Cloudflare
   change, scheduler change, or GitHub push during the installer.
 - The NEXT NORMAL Core scheduled run performs daily private data collection.
 - All records remain VENDOR_UNVERIFIED; no fictional reporting clock times.
 - Never upload the API key, providers.env, or credentials backup.

Why site publication is held:
 The provider allows own-site display and offers a DB sync example, but its
 terms prohibit republication of the proprietary data feed. Current public
 D1 JSON redistribution needs a separate compliant presentation decision.
