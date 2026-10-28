// Minimal copy of the confirmed 2026-10-28 Treasury XML element hierarchy.
export function mockTreasuryXml({auctionDay='2026-11-02',cusip='912797WX1'}={}){
 return `<?xml version="1.0" encoding="UTF-8"?>
<Data>
 <TreasuryCUSIPRelease>
  <OfferingDescription>
   <SecurityDescription>26-Week Bill</SecurityDescription>
   <SecurityTermDay>182</SecurityTermDay>
   <SecurityType>Bill</SecurityType>
   <CashManagementBill>N</CashManagementBill>
   <Reopening>N</Reopening>
   <CUSIP>${cusip}</CUSIP>
  </OfferingDescription>
  <Dates>
   <AnnouncementDate>2026-10-29</AnnouncementDate>
   <CompetitiveAuctionCloseDate>${auctionDay}</CompetitiveAuctionCloseDate>
   <IssueDate>2026-11-05</IssueDate>
   <OriginalIssueDate>2026-11-05</OriginalIssueDate>
  </Dates>
 </TreasuryCUSIPRelease>
 <TreasuryCUSIPReleaseAdditionalDocuments>
  <TreasuryCUSIPReleaseXMLSchemaURL>https://www.treasurydirect.gov/xsd/DFS-TreasuryCUSIPRelease-v20251210-0850aET.xsd</TreasuryCUSIPReleaseXMLSchemaURL>
 </TreasuryCUSIPReleaseAdditionalDocuments>
</Data>`;
}
