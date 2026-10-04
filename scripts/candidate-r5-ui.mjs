export function candidateR5Ui() {
 const stripCss=code=>code.replace(/[^{}]*\.zg-r55-gauge-ring[^{}]*\{[^{}]*\}/g,'').replace(/[^{}]*\.zg-r55-master-number span[^{}]*\{[^{}]*\}/g,'');
 return {name:'candidate-r5-approved-summary-ui',enforce:'pre',generateBundle(_options,bundle) {
  for(const asset of Object.values(bundle)) if(asset.type==='asset'&&asset.fileName.endsWith('.css')) asset.source=stripCss(typeof asset.source==='string'?asset.source:new TextDecoder().decode(asset.source));
 },transform(code,id) {
  const p=id.replaceAll('\\','/').split('?')[0];
  // Production canonical redirect must never send candidate probes to zgmini.kr.
  if(p.endsWith('/middleware.ts')) {
   if(!code.includes('const canonicalHost = "zgmini.kr"'))throw Error('Unknown canonical middleware');
   return {code:'import {NextResponse} from "next/server"; export function middleware(){return NextResponse.next();}',map:null};
  }
  if(p.endsWith('/app/dashboard-ui.tsx')) {
   const start=code.indexOf('<div className="zg-r55-summary-top"');
   const end=code.indexOf('<div className="zg-r55-summary-chart">',start);
   if(start<0||end<0) throw Error('Approved summary target missing');
   const segment=code.slice(start,end).replace(/^.*className="zg-r55-gauge-ring".*\r?\n/m,'').replace(/^.*<span>\{overallStatus\}<\/span>.*\r?\n/m,'').replace('overallScore===null?overallStatus:',"overallScore===null?'자료 없음':");
   if(segment.includes('gauge-ring')||segment.includes('overallStatus'))throw Error('Approved summary patch incomplete');
   return {code:code.slice(0,start)+segment+code.slice(end),map:null};
  }
  if(p.endsWith('/app/globals.css')) return {code:stripCss(code),map:null};
  return null;
 }};
}
