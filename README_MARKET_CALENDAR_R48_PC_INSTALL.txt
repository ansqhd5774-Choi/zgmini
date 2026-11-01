ZGMINI R48 - CURRENT CORE WRAPPER R45 INSTALL
==============================================

R47 confirmed that the actual scheduled Core wrapper is not the old R38
origin-assignment format. R48 resolves the active Core script through the
scheduled WScript wrapper, then uses the original R46 strict source gates.

1. Extract ALL files from this ZIP to ONE NEW folder on the Windows PC.
2. When the normal Core job is not active, run
   MARKET_CALENDAR_R48_PC_APPLY.cmd ONCE.
3. Read MARKET_CALENDAR_R48_PC_APPLY_RESULT.txt in that SAME folder.
4. Only decision R46_R45_PC_INSTALLED_NO_FORCED_COLLECTION means the
   four R45 source files were installed and the local source SHA updated.
5. After an EXISTING normal B1 scheduled collection, run
   MARKET_CALENDAR_R48_PC_VERIFY.cmd. Read the separate verify TXT.

Keep BOTH CMD files and ALL .mjs files together. Do not copy CMD alone.
Existing RESULT.txt files are preserved; rename before another run.

R48 checks scheduled task, referenced executable script, Git HEAD/config,
protected file cleanliness, approved R45 anchors and sidecar checksum.
It respects quota-runner.lock and local-cycle.lock. Failure or ambiguity
stops without relaxing gates. Never bypass a STOP by moving source files.

No extra API calls, forced collection, DB writes, scheduler edits,
remote Git push, publication or R43 rating changes are allowed.
Original source and config backups remain PC-private under the existing
market-calendar-r46-backups folder if the guarded install begins writing.

If the modern wrapper is built dynamically and R48 cannot verify the
actual script, the CMD reports a coded STOP with structure-only counts.
Neither ZIP nor result logs expose private full PC paths or credentials.
