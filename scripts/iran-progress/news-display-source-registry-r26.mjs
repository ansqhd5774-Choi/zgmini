// Read-only display-news feed registry mirroring the approved R3 source URLs.
// Deliberately separated from the score collector's transitive DB dependencies.
// tests/iran-news-collection-r26.test.mjs verifies parity with R3_FEEDS.
export const IRAN_DISPLAY_FEEDS_R26=Object.freeze([
 {id:'tasnim',url:'https://www.tasnimnews.ir/en',kind:'html'},
 {id:'govuk',url:'https://www.gov.uk/search/news-and-communications.atom?keywords=Iran&order=updated-newest',kind:'xml'},
 {id:'iaea-news',url:'https://www.iaea.org/feeds/topnews',kind:'xml'},
 {id:'iaea-statements',url:'https://www.iaea.org/feeds/dgstatements',kind:'xml'},
 {id:'bbc-middle-east',url:'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',kind:'xml'},
 {id:'aljazeera',url:'https://www.aljazeera.com/xml/rss/all.xml',kind:'xml'},
 {id:'un-middle-east',url:'https://news.un.org/feed/subscribe/en/news/region/middle-east/feed/rss.xml',kind:'xml'},
].map(spec=>Object.freeze(spec)));
