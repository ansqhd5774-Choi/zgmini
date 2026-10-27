ZGMINI MARKET CALENDAR R21 - PC COLLECTOR SINGLE TXT (READ ONLY)

1. Extract the ZIP to any convenient folder on the PC.
2. Double-click MARKET_CALENDAR_R21_PC_SOURCE_EXPORT.cmd.
3. Upload ONLY this one file from the SAME folder:
   - MARKET_CALENDAR_R21_PC_SOURCE_EXPORT_RESULT.txt

The command locates the already registered ZGMINI-PC-Local-Core task's real
source directory and verifies the R20 approved HEAD, PC config, and parser.
It embeds the actual source as base64 in the result TXT, verifies its SHA256,
and does not create any separate .mjs file. The TXT alone is enough to fix R21.
It does NOT install R21, run collection, change Core/DB/config/task, stop any
process, acquire or remove the operating lock, publish, push, or merge.

Do not upload the copied PC collector to a public GitHub repository.
If the CMD says STOPPED, upload the result TXT for diagnosis.
Keep the original R21 installation package UNUSED until the revised candidate
has been built against the actual PC collector.

Branch: codex/zgmini-gpt-workspace-20261025
