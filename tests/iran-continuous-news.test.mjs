import {test} from 'node:test';import assert from 'node:assert/strict';
import {newsLinks,parseNews,newsSignal} from '../scripts/iran-progress/continuous-news.mjs';
import {collectContinuousNews,storedNewsSignals} from '../scripts/iran-progress/continuous-news.mjs';
import {openStore} from '../scripts/iran-progress/store.mjs';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
test('discovery removes stale, unrelated and duplicate URLs; newest first',()=>{
 const h='/en/news/2026/10/12/3720700/iran-tanker /en/news/2026/10/12/3720700/iran-tanker /en/news/2026/09/01/123/iran-old /en/news/2026/10/11/123/iran-talks /en/news/2026/10/12/123/football';
 const urls=newsLinks(h,Date.UTC(2026,9,12));assert.equal(urls.length,2);assert.match(urls[0],/2026\/10\/12/);
});
test('explicit maritime harm uses existing -20 rule while conditional forecasts do not',()=>{
 const url='https://www.tasnimnews.ir/en/news/2026/10/12/3720700/iran-tanker';
 const article=parseNews('<title>Another Tanker Catches Fire in Strait of Hormuz after Hitting Sea Mine - Politics news - Tasnim News Agency</title><meta name="description" content="IRGC Navy announced a tanker caught fire after striking a sea mine in the Strait of Hormuz.">',url);
 assert.equal(newsSignal(article).delta,-20);assert.equal(article.date,'2026-10-12');
 assert.equal(newsSignal({...article,title:'Hormuz disruption could worsen',summary:'Iran officials said tanker losses may happen if conflict continues.'}).accepted,false);
});
test('ordinary unrelated diplomatic contacts do not create a peace signal',()=>{
 assert.equal(newsSignal({title:'Iran offers to contribute to Saudi-Yemen dialogue',summary:'Iran offers diplomatic assistance to neighboring countries.'}).accepted,false);
});
test('stored receipts verify signals and completed articles are not fetched twice',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iran-news-')),store=openStore(path.join(dir,'iran.sqlite'));
 const url='https://www.tasnimnews.ir/en/news/2026/10/12/3720700/iran-tanker';let requests=0;
 const fetcher=async input=>{requests++;return new Response(input===url?'<title>Tanker Catches Fire in Hormuz after Hitting Sea Mine</title><meta name="description" content="IRGC Navy announced a tanker caught fire after striking a sea mine in Hormuz.">':'<a href="/en/news/2026/10/12/3720700/iran-tanker">Iran</a>');};
 try{const first=await collectContinuousNews(store,{now:Date.UTC(2026,9,12),fetcher,wait:async()=>{}});assert.equal(first.accepted,1);assert.equal(storedNewsSignals(store).length,1);const second=await collectContinuousNews(store,{now:Date.UTC(2026,9,12),fetcher,wait:async()=>{}});assert.equal(second.attempted,0);assert.equal(requests,3);}finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
});
