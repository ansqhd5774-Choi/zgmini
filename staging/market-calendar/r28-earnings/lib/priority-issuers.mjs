// R28 first-wave official issuer research registry, NOT an operational source
// registry. These public IR pointers must never be imported into
// EARNINGS_SOURCES without independently verified commercial redistribution
// and automated access permissions.
export const PRIORITY_EARNINGS_ISSUERS=Object.freeze([
 {tier:1,ticker:'NVDA',cik:'1045810',company:'NVIDIA',
  irUrl:'https://investor.nvidia.com/events-and-presentations/events-and-presentations/default.aspx',
  machineFeedUrl:'https://investor.nvidia.com/rss/Event.aspx?LanguageId=1',
  feedEvidenceUrl:'https://investor.nvidia.com/investor-resources/rss/default.aspx',
  rightsUrl:'https://www.nvidia.com/en-us/about-nvidia/terms-of-service/',rightsStatus:'EXCLUDED_RIGHTS'},
 {tier:1,ticker:'AAPL',cik:'320193',company:'Apple',
  irUrl:'https://investor.apple.com/investor-relations/default.aspx',machineFeedUrl:null,
  feedEvidenceUrl:null,rightsUrl:'https://www.apple.com/legal/internet-services/terms/site.html',
  rightsStatus:'EXCLUDED_RIGHTS'},
 {tier:1,ticker:'MSFT',cik:'789019',company:'Microsoft',
  irUrl:'https://www.microsoft.com/en-us/investor/default',machineFeedUrl:null,
  feedEvidenceUrl:null,rightsUrl:'https://www.microsoft.com/en-us/legal/intellectualproperty/copyright/permissions',
  rightsStatus:'RESEARCHING'},
 {tier:1,ticker:'GOOGL',cik:'1652044',company:'Alphabet',
  irUrl:'https://abc.xyz/investor/events/default.aspx',machineFeedUrl:null,
  feedEvidenceUrl:null,rightsUrl:'https://policies.google.com/terms',rightsStatus:'RESEARCHING'},
 {tier:1,ticker:'AMZN',cik:'1018724',company:'Amazon',
  irUrl:'https://ir.aboutamazon.com/events/',machineFeedUrl:null,
  feedEvidenceUrl:null,rightsUrl:null,rightsStatus:'RESEARCHING'},
 {tier:1,ticker:'META',cik:'1326801',company:'Meta',
  irUrl:'https://investor.atmeta.com/investor-events/',machineFeedUrl:null,
  feedEvidenceUrl:null,rightsUrl:null,rightsStatus:'RESEARCHING'},
 {tier:1,ticker:'TSLA',cik:'1318605',company:'Tesla',
  irUrl:'https://ir.tesla.com/',machineFeedUrl:null,
  feedEvidenceUrl:null,rightsUrl:null,rightsStatus:'RESEARCHING'},
 {tier:1,ticker:'AVGO',cik:'1730168',company:'Broadcom',
  irUrl:'https://investors.broadcom.com/company-information/past-events',machineFeedUrl:null,
  feedEvidenceUrl:null,rightsUrl:null,rightsStatus:'RESEARCHING'},
]);
