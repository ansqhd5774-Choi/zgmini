ZGMINI ASSET R10 PC compatibility R2 — READ ONLY

1. ZIP contents must stay together in a new empty directory.
2. Run ASSET_R10_AUTO_PC_COMPAT_READONLY_R2.cmd once on the approved Windows PC.
3. Send only ASSET_R10_AUTO_PC_COMPAT_R2_RESULT_*.txt.

The R2 package reads existing config, Core task XML, the VBS launcher, Git source,
and the two latest summary reports. It makes no provider requests, D1 writes,
source/config changes, or task modifications. A result file is saved next to CMD.

READY_FOR_SELECTIVE_INSTALL_REVIEW means the operating source can be reviewed
for a minimal selective patch. It is NOT permission to auto-pull or replace it.
HOOK_PRESENT_RUNTIME_VERIFICATION_REQUIRED means the hook already exists but
its scheduled execution and exact D1 readback still need verification.
All STOP_* statuses require diagnosis before any operational change.

Do not run old R4 one-shot publication, install-local.mjs, install.mjs, git pull,
or ZGMINI-PC-Writer enable. Preserve 5-minute ZGMINI-PC-Local-Core task,
the approved local data, existing source SHA, and last valid D1 results.

Working branch: codex/api-site-integration-r1-20261026
Target implementation: PR #893, main 8a7634a5358cb19280725fe29a977ba4feb44be8
