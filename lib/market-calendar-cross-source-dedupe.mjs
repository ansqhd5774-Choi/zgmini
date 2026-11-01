// Display-only deduplication of the BEA/Census jointly published trade release.
// Keep stored observations and distinct report reference periods untouched.
const TRADE_RELEASE=/^U\.S\. International Trade in Goods and Services(?:,\s*|\s*·\s*)(January|February|March|April|May|June|July|August|September|October|November|December) (20\d{2})$/i;
const SOURCE_ID=/^(bea|census)-u-s-international-trade-in-goods-and-services-(january|february|march|april|may|june|july|august|september|october|november|december)-(20\d{2})$/;

function tradeReleaseKey(item){
 if(!item||(item.source!=='bea'&&item.source!=='census')||typeof item.date!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(item.date))return null;
 const title=typeof item.title==='string'?TRADE_RELEASE.exec(item.title):null;
 const id=typeof item.id==='string'?SOURCE_ID.exec(item.id):null;
 if(!title||!id||id[1]!==item.source||id[2]!==title[1].toLowerCase()||id[3]!==title[2])return null;
 return item.date+':'+id[2]+'-'+id[3];
}

export function collapseCrossSourceTradeDuplicates(events){
 if(!Array.isArray(events))return [];
 const verifiedBea=new Set(events.filter(item=>item?.source==='bea').map(tradeReleaseKey).filter(Boolean));
 // Prefer the BEA row for precisely matched same-day/same-period pairs.
 // All Census rows lacking an identical BEA match are still displayed.
 return events.filter(item=>item?.source!=='census'||!verifiedBea.has(tradeReleaseKey(item)));
}
