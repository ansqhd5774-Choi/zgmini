// W02 USDA-NASS: pure selective main source integration, no file I/O,
// Git/PC/network/DB access, installation, scheduled collection or publication.
import {createHash} from 'node:crypto';
export const PREIMAGES=Object.freeze({
 'lib/release-calendar.mjs':'ce27b3df3f2d62024cd0d5775283f182e0249419',
 'scripts/pc-writer/release-calendar.mjs':'a5b370fd57b0402d52ec822ac5a2afb032a05f8d',
 'app/market-calendar/market-calendar-client.tsx':'960eb766a86a31272f562d4a2c24b563a6cd983e'
});
const sha=text=>createHash('sha1').update('blob '+Buffer.byteLength(text,'utf8')+'\0').update(text,'utf8').digest('hex');
const once=(text,oldValue,newValue,label)=>{
 const at=text.indexOf(oldValue);
 if(at<0||text.indexOf(oldValue,at+oldValue.length)>=0)throw Error(label+'_ANCHOR_MISMATCH');
 return text.slice(0,at)+newValue+text.slice(at+oldValue.length);
};
const nl=text=>text.includes('\r\n')?'\r\n':'\n';
export const patchRegistry=text=>{
 const anchor=text.match(/^ usda:\{[^\r\n]+format:'usda'\},$/m)?.[0];
 if(!anchor)throw Error('NASS_REGISTRY_MISSING');
 const entry=" usda_nass:{url:'https://www.nass.usda.gov/Publications/Reports_by_Release_Day/index.php',page:'https://www.nass.usda.gov/Publications/Reports_by_Release_Day/index.php',format:'nass-report-dates'},";
 return once(text,anchor,anchor+nl(text)+entry,'NASS_REGISTRY');
};
export const patchCollector=text=>{
 const eol=nl(text);
 let updated=once(text,
  "import {USDA_WASDE_URL,parseUsdaWasdeHtml} from '../../lib/usda-calendar.mjs';",
  "import {USDA_WASDE_URL,parseUsdaWasdeHtml} from '../../lib/usda-calendar.mjs';"+eol+
  "import {collectNassReportSchedule} from '../../lib/market-calendar-usda-nass.mjs';",'NASS_IMPORT');
 const anchor=[
 "    if(source==='usda'){",
 "     const usda=await collectUsdaSource({store,key,now,fetchImpl,countRequest:()=>requests++,previous});",
 "     sources.usda=usda.state;",
 "     events.push(...usda.events);",
 "     continue;",
 "    }"
 ].join(eol);
 const extra=[
 "    if(source==='usda_nass'){",
 "     const nass=await collectNassReportSchedule({store,key,now,fetchImpl,",
 "      countRequest:()=>requests++,previous});",
 "     sources.usda_nass=nass.state;",
 "     events.push(...nass.events);",
 "     continue;",
 "    }"
 ].join(eol);
 return once(updated,anchor,anchor+eol+extra,'NASS_COLLECTOR');
};
export const patchUi=text=>{
 let updated=once(text,"usda:'USDA'","usda:'USDA',usda_nass:'USDA NASS'",'NASS_UI_LABEL');
 const anchor="  const usdaEvent=item.source==='usda'&&item.id==='usda-wasde';";
 updated=once(updated,anchor,anchor+nl(text)+
  "  const nassEvent=item.source==='usda_nass'&&/^usda-nass-(?:crop-production|crop-progress|prospective-plantings)$/.test(item.id);"+nl(text)+
  "  if(item.id.startsWith('usda-nass-')&&!nassEvent)continue;",'NASS_UI_PROVIDER');
 updated=once(updated,'||nyfedEvent||usdaEvent||cftcEvent','||nyfedEvent||usdaEvent||nassEvent||cftcEvent','NASS_UI_EVENT');
 updated=once(updated,"item.source==='usda'?'원자재':item.source==='eia'","item.source==='usda'?'원자재':item.source==='usda_nass'?'원자재':item.source==='eia'",'NASS_UI_CATEGORY');
 return updated;
};
/** Fail closed on preimage drift; return three detached proposed file bodies. */
export function prepareNassMainPatch(files){
 if(!files||typeof files!=='object'||Array.isArray(files)||
  Object.keys(files).sort().join('|')!==Object.keys(PREIMAGES).sort().join('|'))
  throw Error('NASS_MAIN_FILE_SET_INVALID');
 const result={};
 for(const [path,expectedSha] of Object.entries(PREIMAGES)){
  const original=files[path];
  if(typeof original!=='string'||sha(original)!==expectedSha)
   throw Error('NASS_MAIN_PREIMAGE_CHANGED_'+path);
  const updated=path==='lib/release-calendar.mjs'?patchRegistry(original):
   path==='scripts/pc-writer/release-calendar.mjs'?patchCollector(original):patchUi(original);
  if(updated===original)throw Error('NASS_MAIN_NO_CHANGE_'+path);
  result[path]={beforeBlob:expectedSha,afterBlob:sha(updated),content:updated};
 }
 return result;
}
