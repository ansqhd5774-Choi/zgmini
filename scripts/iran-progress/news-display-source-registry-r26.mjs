// Private display-news registry only; the R3 score collector keeps its own
// approved feeds unchanged. The two unreliable IAEA discovery routes have
// been retired from scheduled DISPLAY collection (2026-10-28), not from R3.
export const IRAN_DISPLAY_FEEDS_R26=Object.freeze([
 {id:'tasnim',url:'https://www.tasnimnews.ir/en',kind:'html'},
 {id:'govuk',url:'https://www.gov.uk/search/news-and-communications.atom?keywords=Iran&order=updated-newest',kind:'xml'},
 {id:'guardian-iran',url:'https://www.theguardian.com/world/iran/rss',kind:'xml'},
 {id:'dw-world',url:'https://rss.dw.com/xml/rss-en-world',kind:'xml'},
 {id:'bbc-middle-east',url:'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',kind:'xml'},
 {id:'aljazeera',url:'https://www.aljazeera.com/xml/rss/all.xml',kind:'xml'},
 {id:'un-middle-east',url:'https://news.un.org/feed/subscribe/en/news/region/middle-east/feed/rss.xml',kind:'xml'},
].map(spec=>Object.freeze(spec)));
