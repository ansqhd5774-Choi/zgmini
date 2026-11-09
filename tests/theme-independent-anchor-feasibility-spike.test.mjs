// TEST-ONLY feasibility spike for the ZGMINI ten-theme independent anchor.
// Synthetic records; not the production Reader, not a rights validator, and
// never a reason to publish D1 data or mark an existing source READY.
import test from 'node:test';
import assert from 'node:assert/strict';

const NOW=Date.parse('2026-11-09T12:00:00Z');
const MAX_AGE=8*86400000; // Existing display contract; never extended here.
const R37_PUBLIC=['로봇·자동화','클라우드·SaaS','자율주행',
 '원전·SMR','방산','핀테크','사이버보안','바이오·신약'];
const DISPLAY=[...R37_PUBLIC,'데이터센터·전력','우주·위성'];
const families=[
 {id:'r37',required:R37_PUBLIC,feed:'theme-legacy-nine-r37'},
 {id:'data-center',required:['데이터센터·전력'],feed:'theme-data-center-power-r1'},
 {id:'space',required:['우주·위성'],feed:'theme-space-satellite-r2'},
];
const isDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&
 Number.isFinite(Date.parse(`${v}T00:00:00Z`));
const isScore=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const ageOk=(v,now)=>{
 const n=Date.parse(v);
 return Number.isFinite(n)&&n<=now&&now-n<MAX_AGE;
};

// This function deliberately proves only *shape* and refusal conditions.
// R37/R88/DC/space production validators, trading calendars, source rights,
// D1 CAS, and the live API still need independent real-world evidence.
function simulateAnchor(records,{now=NOW}={}){
 const visible=new Map();
 const sources=[];
 for(const family of families){
  const record=records?.[family.id];
  if(!record||record.status!=='READY')return {status:'INPUT_MISSING',family:family.id};
  if(record.feedKey!==family.feed||!sha(record.sourceSha)||
   !ageOk(record.sourceStoredAt,now))return {status:'SOURCE_INVALID_OR_STALE',family:family.id};
  if(!Array.isArray(record.themes))return {status:'THEME_LIST_INVALID',family:family.id};
  const byName=new Map();
  for(const theme of record.themes){
   if(byName.has(theme?.theme))return {status:'SOURCE_DUPLICATE',family:family.id};
   byName.set(theme?.theme,theme);
  }
  for(const label of family.required){
   const theme=byName.get(label);
   if(!theme)return {status:'APPROVED_THEME_MISSING',family:family.id,label};
   if(Object.hasOwn(theme,'rawBars')||Object.hasOwn(theme,'priceBars'))
    return {status:'RAW_INPUT_PRESENT',family:family.id,label};
   const hist=theme.history;
   if(!Array.isArray(hist)||hist.length!==252||!isScore(theme.score)||
    hist.some((p,i)=>!isDate(p?.date)||!isScore(p?.score)||
     (i>0&&p.date<=hist[i-1].date))||
    hist.at(-1).score!==theme.score||!isDate(theme.observationDate)||
    hist.at(-1).date!==theme.observationDate)
    return {status:'HISTORY_OR_SCORE_INVALID',family:family.id,label};
   if(visible.has(label))return {status:'PUBLIC_THEME_DUPLICATE',label};
   visible.set(label,{theme:label,score:theme.score,
    observationDate:theme.observationDate,sourceVersion:record.sourceSha,
    history:hist.map(p=>({date:p.date,score:p.score}))});
  }
  sources.push({family:family.id,feed:record.feedKey});
 }
 const themes=DISPLAY.map(label=>visible.get(label));
 if(themes.length!==10||themes.some(v=>!v))return {status:'PUBLIC_TEN_INCOMPLETE'};
 const observed=new Set(themes.map(t=>t.observationDate));
 if(observed.size!==1)return {status:'API_DATE_CONTRACT_REVIEW',
  // Preserve each date; never choose the newest and relabel older scores.
  observations:themes.map(t=>({theme:t.theme,date:t.observationDate})),d1Writes:0};
 return {status:'PRIVATE_STRUCTURAL_SPIKE_PASS_NOT_PUBLIC_READY',
  themes,sources,d1Writes:0,publicationRights:'NOT_EVALUATED',
  provisionalCoverage:'NOT_EVALUATED',tradingCalendar:'SYNTHETIC_WEEKDAYS_NOT_VERIFIED',
  providerCalls:0};
}

function weekdaysEnding(end,count){
 const out=[];let t=Date.parse(`${end}T00:00:00Z`);
 while(out.length<count){
  const d=new Date(t).getUTCDay();
  if(d!==0&&d!==6)out.push(new Date(t).toISOString().slice(0,10));
  t-=86400000;
 }
 return out.reverse();
}

function fixture(){
 const days=weekdaysEnding('2026-11-05',252);
 const mk=(name,i)=>({theme:name,observationDate:days.at(-1),
  score:20+i,history:days.map((date,j)=>({date,score:j===251?20+i:20+i}))});
 const records={};
 for(const family of families){
  const names=family.id==='r37'?[...R37_PUBLIC,'AI·반도체']:family.required;
  records[family.id]={status:'READY',feedKey:family.feed,
   sourceStoredAt:'2026-11-06T08:00:00Z',sourceSha:'a'.repeat(64),
   themes:names.map(mk)};
 }
 return records;
}

test('synthetic 8+2 gives ten in approved display order, no AI sidecar or implied publication',()=>{
 const result=simulateAnchor(fixture());
 assert.equal(result.status,'PRIVATE_STRUCTURAL_SPIKE_PASS_NOT_PUBLIC_READY');
 assert.deepEqual(result.themes.map(t=>t.theme),DISPLAY);
 assert.equal(result.themes.length,10);
 assert.ok(result.themes.every(t=>t.history.length===252));
 assert.equal(result.d1Writes,0);
 assert.equal(result.publicationRights,'NOT_EVALUATED');
 assert.equal(result.provisionalCoverage,'NOT_EVALUATED');
 assert.equal(result.tradingCalendar,'SYNTHETIC_WEEKDAYS_NOT_VERIFIED');
 assert.ok(!JSON.stringify(result).includes('AI·반도체'));
});

test('a missing independent family cannot silently publish nine themes',()=>{
 const records=fixture();delete records.space;
 assert.deepEqual(simulateAnchor(records),{status:'INPUT_MISSING',family:'space'});
});

test('an extra duplicated R37 record is refused',()=>{
 const records=fixture();records.r37.themes.push({...records.r37.themes[0]});
 assert.equal(simulateAnchor(records).status,'SOURCE_DUPLICATE');
});

test('a missing one of the eight public R37 themes cannot be filled with research AI',()=>{
 const records=fixture();records.r37.themes=records.r37.themes.filter(t=>t.theme!=='방산');
 assert.equal(simulateAnchor(records).status,'APPROVED_THEME_MISSING');
});

test('out-of-date independent family is rejected, never relabelled as current',()=>{
 const records=fixture();records.space.sourceStoredAt='2026-10-29T00:00:00Z';
 assert.equal(simulateAnchor(records).status,'SOURCE_INVALID_OR_STALE');
});

test('invalid last point or absent history is not converted to zero',()=>{
 const records=fixture();records['data-center'].themes[0].history.pop();
 assert.equal(simulateAnchor(records).status,'HISTORY_OR_SCORE_INVALID');
});

test('raw provider bars are forbidden in the candidate public payload',()=>{
 const records=fixture();records.space.themes[0].rawBars=[{open:1}];
 assert.equal(simulateAnchor(records).status,'RAW_INPUT_PRESENT');
});

test('different valid family dates require explicit API contract review',()=>{
 const records=fixture();
 const days=weekdaysEnding('2026-11-04',252);
 records.space.themes[0].history=days.map(date=>({date,score:20}));
 records.space.themes[0].observationDate=days.at(-1);
 const result=simulateAnchor(records);
 assert.equal(result.status,'API_DATE_CONTRACT_REVIEW');
 assert.equal(result.observations.length,10);
 assert.equal(result.d1Writes,0);
 assert.equal(result.observations.at(-1).date,'2026-11-04');
});

test('all outcomes remain private-only; no branch can claim READY or write',()=>{
 for(const input of [fixture(),null,{},(()=>{const v=fixture();delete v.r37;return v;})()]){
  const result=simulateAnchor(input);
  assert.notEqual(result.status,'READY');
  assert.equal(result.d1Writes??0,0);
 }
});
