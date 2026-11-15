import test from 'node:test';
import assert from 'node:assert/strict';
import {patchRegistry,patchCollector,patchUi,prepareNassMainPatch,PREIMAGES}
 from '../scripts/market-calendar/w02-nass-selective-main-integration.mjs';

const usdaEntry=" usda:{url:'https://www.usda.gov/',page:'https://www.usda.gov/',format:'usda'},";
const registry=()=>['export const RELEASE_SOURCES=Object.freeze({',
 " bls:{url:'https://www.bls.gov/',page:'https://www.bls.gov/',format:'ics'},",
 usdaEntry," treasury:{url:'https://www.treasurydirect.gov/',page:'https://www.treasurydirect.gov/',format:'treasury-xml'},",'});'].join('\n');
const collector=(eol='\r\n')=>[
 "// untouched Core contract","import {USDA_WASDE_URL,parseUsdaWasdeHtml} from '../../lib/usda-calendar.mjs';",
 "import {TREASURY_CUSIP_XML_URL} from '../../lib/treasury-calendar.mjs';",
 "  for(const [source,spec] of Object.entries(RELEASE_SOURCES)){",
 "    if(source==='usda'){",
 "     const usda=await collectUsdaSource({store,key,now,fetchImpl,countRequest:()=>requests++,previous});",
 "     sources.usda=usda.state;",
 "     events.push(...usda.events);",
 "     continue;",
 "    }",
 "    if(source==='treasury'){",
 "     // existing source untouched",
 "    }"].join(eol);
const ui=()=>[
 "const sourceNames={bls:'BLS',usda:'USDA',eia:'EIA'};",
 "for(const item of events){",
 "  const usdaEvent=item.source==='usda'&&item.id==='usda-wasde';",
 "  const cftcEvent=item.source==='cftc'&&item.id==='cftc-cot';",
 "  if(!validDate(item.date)||!(eventKinds[item.id]||nyfedEvent||usdaEvent||cftcEvent))continue;",
 "  const category=item.source==='usda'?'원자재':item.source==='eia'?'에너지':'경제';",
 "}"].join('\n');

test('registry appends exactly one official NASS key without changing other providers',()=>{
 const result=patchRegistry(registry());
 assert.equal((result.match(/usda_nass:/g)??[]).length,1);
 assert.ok(result.includes(usdaEntry));
 assert.ok(result.includes("bls:{url:"));
 assert.ok(result.includes("treasury:{url:"));
 assert.match(result,/format:'nass-report-dates'/);
});
test('Core collector adds one branch and saved-store adapter import; retains CRLF and earlier sources',()=>{
 const source=collector();
 const updated=patchCollector(source);
 assert.equal(updated.includes('\r\n'),true);
 assert.equal((updated.match(/source==='usda_nass'/g)??[]).length,1);
 assert.match(updated,/collectNassReportSchedule\(\{store,key,now,fetchImpl,/);
 assert.match(updated,/sources\.usda_nass=nass\.state/);
 assert.match(updated,/countRequest:\(\)=>requests\+\+/);
 assert.ok(updated.includes('existing source untouched'));
 assert.ok(updated.includes("sources.usda=usda.state;"));
 assert.equal(updated.replace(/\r\n/g,'').includes('\n'),false);
});
test('UI accepts NASS only with matching official provider and leaves original IDs',()=>{
 const updated=patchUi(ui());
 assert.match(updated,/usda_nass:'USDA NASS'/);
 assert.match(updated,/const nassEvent=item\.source==='usda_nass'/);
 assert.match(updated,/item\.id\.startsWith\('usda-nass-'\)&&!nassEvent\)continue/);
 assert.match(updated,/\|\|usdaEvent\|\|nassEvent\|\|cftcEvent/);
 assert.match(updated,/item\.source==='usda_nass'\?'원자재'/);
 assert.ok(updated.includes("usdaEvent=item.source==='usda'"));
});
test('missing or multiple source anchors fail closed rather than rewriting unrelated code',()=>{
 assert.throws(()=>patchRegistry(registry().replace(usdaEntry,'no USDA')),/NASS_REGISTRY_MISSING/);
 assert.throws(()=>patchCollector(collector().replace("source==='usda'","source==='other'"))/NASS_COLLECTOR_ANCHOR_MISMATCH/);
 assert.throws(()=>patchUi(ui().replace('||usdaEvent||cftcEvent','||x||cftcEvent')),/NASS_UI_EVENT_ANCHOR_MISMATCH/);
});
test('stale or incomplete main checkout cannot be accepted as an integration preimage',()=>{
 assert.deepEqual(Object.keys(PREIMAGES).sort(),[
  'app/market-calendar/market-calendar-client.tsx','lib/release-calendar.mjs',
  'scripts/pc-writer/release-calendar.mjs'].sort());
 assert.throws(()=>prepareNassMainPatch({}),/NASS_MAIN_FILE_SET_INVALID/);
 const files=Object.fromEntries(Object.keys(PREIMAGES).map(path=>[path,'modified']));
 assert.throws(()=>prepareNassMainPatch(files),/NASS_MAIN_PREIMAGE_CHANGED_/);
});
