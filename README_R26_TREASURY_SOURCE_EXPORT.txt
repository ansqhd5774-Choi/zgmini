ZGMINI MARKET CALENDAR - R26 U.S. TREASURY SOURCE READ-ONLY EXPORT

1) Extract ALL files from the ZIP into ONE new folder on your Windows PC.
2) Run MARKET_CALENDAR_R26_TREASURY_SOURCE_EXPORT.cmd ONCE.
3) Upload MARKET_CALENDAR_R26_TREASURY_SOURCE_EXPORT_RESULT.txt in ChatGPT.

SINGLE OFFICIAL SOURCE:
https://www.treasurydirect.gov/xml/TreasuryCUSIPRelease.xml

The weekly Treasury CUSIP release is linked from the official
TreasuryDirect Auction Announcements page:
https://www.treasurydirect.gov/auctions/auction-announcements/

This read-only operation captures exactly one original XML response,
its HTTP status, exact byte length, content type and SHA256 checksum.
The complete XML is included as Base64 in the result TXT. This is
needed to verify real element names, date meaning, and whether an
auction is already announced before writing any collector or parser.

READ-ONLY SAFETY:
- No existing PC Core, Git, config, SQLite, D1, tasks or publisher access.
- No schedule generation, no collector invocation, no publication.
- No second URL, alternate host, redirects, or forced retries.
- No inference from the usual Treasury auction weekday pattern.
- Future announced vs. tentative dates must be separated after inspection.
