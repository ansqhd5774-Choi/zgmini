MARKET CALENDAR R30 - PC PRIVATE EARNINGS PROJECTION

This package installs exactly two files in the existing PC Core git checkout:
  lib/earnings-api-private-projection.mjs              (new)
  scripts/pc-writer/earnings-api-local.mjs             (updated)

It requires the verified R29 PC source commit:
  fc1543c500b3a79aecdb7e7066cd95979ecc92bb

1. Extract the entire ZIP to a new local folder.
2. Run MARKET_CALENDAR_R30_SAFE_WAIT_APPLY.cmd only once.
3. Upload MARKET_CALENDAR_R30_SAFE_WAIT_RESULT.txt and
   MARKET_CALENDAR_R30_PRIVATE_APPLY_RESULT.txt if created.

The launcher will wait for up to 20 minutes for a free Core lock and a
Ready task state. It retries ONLY verified clean lock races and stops on any
source, permissions, configuration, file, or result problem. No manual lock
deletion is allowed. If a previous run reported success, DO NOT rerun it.

No forced API call, private DB collection, scheduled task edit, DB schema edit,
public D1 output, live site deploy, or GitHub push is performed.

R30 transforms R29's 14-date private inputs into a single private PC input
on the NEXT successful scheduled collection. The API provider rights to
redistribute a raw public JSON feed remain unverified, so public output stays
unchanged. Existing source input and backups are preserved.
