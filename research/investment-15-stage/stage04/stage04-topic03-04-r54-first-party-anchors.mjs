/**
 * R54 follow-up to R53: repeat topics 03 and 04 concurrently using URLs
 * verified from the publishers' PUBLIC report pages on 2026-10-27.
 * These are static discovery anchors, NOT a live new-link discovery system.
 * Report values are deliberately not stored in code. Re-fetch on each run.
 */
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PUBLISHERS} from './stage04-four-publisher-r37-readonly.mjs';
import {officialReportUrl} from './stage04-topic01-r45-readonly.mjs';
import {TOPICS,rankReport,researchPublisher,inspectR53,runR53} from './stage04-topic03-04-r53-parallel.mjs';

const BASE=join(dirname(fileURLToPath(import.meta.url)),'..');

// Publisher first-party URLs only. Do not hardcode rates or use cached reports.
export const R54_VERIFIED_REPORT_URLS=Object.freeze({
  3:Object.freeze({
    TBRC:'https://www.thebusinessresearchcompany.com/report/passenger-car-global-market-report',
    SkyQuest:'https://www.skyquestt.com/report/passenger-cars-market',
    Precedence:'https://www.precedenceresearch.com/passenger-cars-market',
  }),
  4:Object.freeze({
    TBRC:'https://www.thebusinessresearchcompany.com/report/industrial-machinery-global-market-report',
    SkyQuest:'https://www.skyquestt.com/report/industrial-machinery-market',
    Precedence:'https://www.precedenceresearch.com/machine-tools-market',
  }),
});

export function verifiedAnchor(topic,p){
  const url=R54_VERIFIED_REPORT_URLS[topic.index]?.[p.id]??null;
  if(!url)return null;
  if(!officialReportUrl(url,p)||rankReport(topic,url)<=0)
    throw Error('R54_VERIFIED_ANCHOR_INVALID_'+topic.index+'_'+p.id);
  return url;
}

/**
 * No search engine/blocked site probing. A public first-party publisher link
 * is fetched LIVE and audited by inspectR53. Search discovery remains missing.
 */
export async function discoverR54(topic,p,_seed){
  const url=verifiedAnchor(topic,p);
  return {engine:'PREVERIFIED_FIRST_PARTY_REPORT_URL',
    search_state:url?'VERIFIED_STATIC_ANCHOR_NOT_LIVE_SEARCH':'NO_VERIFIED_ANCHOR',
    catalog_status:'NOT_REQUESTED',catalog_topic:0,
    attempts:[{engine:'PUBLIC_PUBLISHER_ANCHOR',status:url?'PREFLIGHT_URL_VALID':'MISSING',found:url?1:0}],
    candidate_urls:url?[url]:[],live_discovered_count:0,verified_anchor_count:url?1:0,
    seed_used:false,search_ms:0};
}

export async function runR54({fetchFn=fetch,inspectFn=inspectR53,
  outputPrefix=join(BASE,'R54_TOPIC03_04_ANCHOR_RESULT')}={}){
  return runR53({fetchFn,outputPrefix,
    reportLabel:'R54_STAGE04_TOPICS03_04_VERIFIED_FIRST_PARTY_ANCHORS',
    researchFn:(topic,p,seed,options)=>researchPublisher(topic,p,seed,{
      ...options,discoverFn:discoverR54,inspectFn,
    }),
  });
}

export const R54_METADATA=Object.freeze({
  topics:TOPICS.map(x=>x.index),
  publishers:PUBLISHERS.filter(p=>p.id!=='BRI').map(x=>x.id),
  network_discovery:'STATIC_VERIFIED_FIRST_PARTY_URLS_ONLY',
  bri_requests:0,
  sector_eligible:false,
});

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])
  runR54().catch(e=>{console.error('R54_FATAL='+String(e.message).slice(0,300));process.exitCode=1;});
