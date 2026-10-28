MARKET CALENDAR R29 - SAFE PC PRIVATE EARNINGS COLLECTOR V2

Reason for V2:
 The first installer stopped with R29_CORE_COLLECTOR_BASE_CHANGED_STOP.
 It did not modify any PC files. The current Core entrypoint is different
 from the old development snapshot and must be preserved.

V2 uses the verified, installed R27 official release-calendar collector instead.
 Exactly three PC source files are changed:
 - lib/earnings-api-calendar.mjs                 [new]
 - scripts/pc-writer/earnings-api-local.mjs     [new]
 - scripts/pc-writer/release-calendar.mjs       [R27 source replacement]

Requirements:
 - Previously installed R27 Treasury TIC parser and collector SHA still match.
 - Existing Core task, clean protected source and config.source == PC HEAD.
 - Existing private providers.env already contains EARNINGS_API_KEY.

Steps:
 1. Extract the entire V2 ZIP preserving folders.
 2. Run MARKET_CALENDAR_R29_PC_PRIVATE_APPLY_V2.cmd once.
 3. Read MARKET_CALENDAR_R29_PC_PRIVATE_APPLY_V2_RESULT.txt.
    Success decision: R29_V2_PC_PRIVATE_INPUT_COLLECTOR_INSTALLED_NO_FORCED_COLLECTION
    Any other result: STOP and send the result TXT. Do not rerun blindly.

Safety:
 - V2 preserves existing Core entrypoint, schedule, DB schema and D1 output.
 - Installer creates a backup and verifies exact source/hash/lock before write.
 - Installer does not run the collector or publisher and does not push GitHub.
 - Existing normal PC Core schedule triggers private 14-day API collection.
 - API key remains in the existing PC providers.env, never in ZIP/logs.
 - Vendor dates remain VENDOR_UNVERIFIED and are not published to the site.
