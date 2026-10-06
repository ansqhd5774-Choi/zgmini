const minute=60_000;
const hour=60*minute;
const day=24*hour;

// Provider limits are operational guardrails, not scoring or storage rules.
// null means the supplied source did not publish a reliable hard quota.
export const PROVIDER_QUOTA_POLICY=Object.freeze({
 FRED:Object.freeze({label:'FRED/ALFRED',hard:true,perMinute:120,minIntervalMs:500,limitSource:'provider-report'}),
 BLS:Object.freeze({label:'BLS registered v2',hard:true,per10Sec:50,perDay:500,minIntervalMs:200,limitSource:'provider-report'}),
 BEA:Object.freeze({label:'BEA',hard:true,perMinute:100,maxErrorPerMinute:30,minIntervalMs:300,limitSource:'provider-report'}),
 CENSUS:Object.freeze({label:'Census',hard:false,perDay:500,minIntervalMs:500,limitSource:'provider-report',note:'no-key/IP limit; keyed cap is provider-dependent'}),
 EIA:Object.freeze({label:'EIA',hard:false,perHour:9000,perSecond:5,minIntervalMs:200,limitSource:'provider-report',note:'recommended ceiling'}),
 SEC:Object.freeze({label:'SEC EDGAR',hard:true,perSecond:10,minIntervalMs:100,limitSource:'provider-report'}),
 KRX:Object.freeze({label:'KRX',hard:true,perDay:10_000,minIntervalMs:250,limitSource:'provider-report'}),
 KOSIS:Object.freeze({label:'KOSIS',hard:true,perMinute:200,minIntervalMs:300,limitSource:'provider-report'}),
 BOK:Object.freeze({label:'BOK ECOS',hard:false,perDay:null,minIntervalMs:1_000,limitSource:'unknown',note:'official fixed quota not verified'}),
 OFR:Object.freeze({label:'OFR',hard:false,perDay:null,minIntervalMs:1_000,limitSource:'unknown',note:'data release frequency is usually daily'}),
 BIS:Object.freeze({label:'BIS',hard:false,perDay:null,minIntervalMs:1_000,limitSource:'unknown'}),
 WORLDBANK:Object.freeze({label:'World Bank',hard:false,perDay:null,minIntervalMs:1_000,limitSource:'unknown'}),
 MARKETPARQUET:Object.freeze({label:'MarketParquet',hard:false,perMinute:60,minIntervalMs:1_000,limitSource:'provider-report',note:'free tier; paid tier may differ'}),
 NYFED:Object.freeze({label:'NY Fed',hard:false,perDay:null,minIntervalMs:1_000,limitSource:'release-frequency'}),
 CNN:Object.freeze({label:'CNN internal feed',hard:false,perMinute:12,minIntervalMs:5*minute,limitSource:'cache-policy',note:'unofficial endpoint; no SLA'}),
 FEARGREEDCHART:Object.freeze({label:'FearGreedChart',hard:false,perMinute:12,minIntervalMs:5*minute,limitSource:'cache-policy'})
});

const HOSTS=[
 ['api.stlouisfed.org','FRED'],['fred.stlouisfed.org','FRED'],
 ['api.bls.gov','BLS'],['apps.bea.gov','BEA'],
 ['api.census.gov','CENSUS'],['api.eia.gov','EIA'],
 ['data.sec.gov','SEC'],['www.sec.gov','SEC'],['sec.gov','SEC'],
 ['openapi.krx.co.kr','KRX'],['data.krx.co.kr','KRX'],
 ['kosis.kr','KOSIS'],['ecos.bok.or.kr','BOK'],
 ['financialresearch.gov','OFR'],['data.financialresearch.gov','OFR'],
 ['data.bis.org','BIS'],['api.worldbank.org','WORLDBANK'],['thedocs.worldbank.org','WORLDBANK'],
 ['marketparquet.com','MARKETPARQUET'],['api.marketparquet.com','MARKETPARQUET'],
 ['markets.newyorkfed.org','NYFED'],['www.newyorkfed.org','NYFED'],
 ['production.dataviz.cnn.io','CNN']
];

export function providerForUrl(input){
 let url;try{url=new URL(input);}catch{return null;}
 const host=url.hostname.toLowerCase();
 const exact=HOSTS.find(([candidate])=>host===candidate||host.endsWith(`.${candidate}`));
 if(exact)return exact[1];
 if(host.includes('feargreedchart'))return 'FEARGREEDCHART';
 return null;
}

export function policyForProvider(provider){return provider?PROVIDER_QUOTA_POLICY[provider]??null:null;}

export function quotaWindowMs(policy){
 const windows=[];
 if(policy?.perSecond)windows.push(1_000);
 if(policy?.per10Sec)windows.push(10_000);
 if(policy?.perMinute)windows.push(minute);
 if(policy?.perHour)windows.push(hour);
 if(policy?.perDay)windows.push(day);
 return Math.max(day,...windows);
}
