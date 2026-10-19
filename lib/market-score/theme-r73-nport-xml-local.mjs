import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {R66_SEC_IDENTITIES} from './theme-r66-sec-issuer-registry.mjs';
/** Read a locally stored single official SEC N-PORT XML filing. No network,
 * providers, database, mutation, publication, or implied daily PIT. */
export const R73_VERSION='THEME-R73-SINGLE-SEC-NPORT-XML-PRIVATE-SNAPSHOT-V1';
const fail=s=>{throw Error('R73_'+s);};
const check=(yes,code)=>{if(!yes)fail(code);};
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const local=s=>s.split(':').at(-1);
function decodeXml(s){
 const result=s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g,(_,v)=>{
  if(v==='amp')return '&';if(v==='lt')return '<';if(v==='gt')return '>';if(v==='quot')return '"';if(v==='apos')return "'";
  const cp=v[1]?.toLowerCase()==='x'?parseInt(v.slice(2),16):parseInt(v.slice(1),10);
  check(Number.isInteger(cp)&&cp>0&&cp<=0x10ffff&&(cp<0xd800||cp>0xdfff),'INVALID_XML_CHAR');
  return String.fromCodePoint(cp);
 });
 check(!/&(?:#|[A-Za-z])/.test(result),'UNSUPPORTED_XML_ENTITY');return result;
}
/** Strict bounded tag reader. Refuses DTD and external XML entity resolution. */
export function parseR73Xml(xml){
 check(typeof xml==='string'&&xml.length>0&&xml.length<=2000000,'XML_SIZE_LIMIT');
 check(!/<!DOCTYPE|<!ENTITY/i.test(xml),'XML_DTD_UNSUPPORTED');
 const root={name:'_root',attrs:{},text:'',children:[]},stack=[root];
 const token=/<!--[\s\S]*?-->|<\?[^?]*\?>|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]*>|[^<]+/g;
 let pos=0,count=0,m;
 while((m=token.exec(xml))){
  check(m.index===pos,'INVALID_XML_TOKEN');pos=token.lastIndex;const v=m[0];
  if(v.startsWith('<!--')||v.startsWith('<?'))continue;
  if(v.startsWith('<![CDATA[')){stack.at(-1).text+=v.slice(9,-3);continue;}
  if(!v.startsWith('<')){stack.at(-1).text+=decodeXml(v);continue;}
  if(v.startsWith('</')){
   const close=/^<\/\s*([A-Za-z_][\w.:-]*)\s*>$/.exec(v);
   check(close&&stack.length>1&&stack.at(-1).name===local(close[1]),'INVALID_XML_CLOSING_TAG');
   stack.pop();continue;
  }
  const tag=/^<([A-Za-z_][\w.:-]*)([\s\S]*?)\s*(\/?)>$/.exec(v);
  check(tag,'INVALID_XML_START_TAG');const attrs={},input=tag[2].replace(/\/\s*$/,'').trim();
  const attr=/([A-Za-z_][\w.:-]*)\s*=\s*("[^"]*"|'[^']*')/g;let offset=0,a;
  while((a=attr.exec(input))){
   check(input.slice(offset,a.index).trim()==='','INVALID_XML_ATTR_GAP');offset=attr.lastIndex;
   const key=local(a[1]);check(!Object.hasOwn(attrs,key),'DUPLICATE_XML_ATTR');
   attrs[key]=decodeXml(a[2].slice(1,-1));
  }
  check(input.slice(offset).trim()==='','INVALID_XML_ATTR_TAIL');
  const node={name:local(tag[1]),attrs,text:'',children:[]};stack.at(-1).children.push(node);
  check(++count<=50000,'XML_NODE_LIMIT');
  if(tag[3]!=='/'){stack.push(node);check(stack.length<=64,'XML_DEPTH_LIMIT');}
 }
 check(pos===xml.length&&stack.length===1&&root.children.length===1,'XML_STRUCTURE_INVALID');
 check(root.children[0].name==='edgarSubmission','XML_EDGAR_ROOT_REQUIRED');
 return root.children[0];
}
const one=(node,name)=>{const m=node?.children?.filter(x=>x.name===name)??[];check(m.length===1,'XML_REQUIRED_SINGLE_'+name);return m[0];};
const optional=(node,name)=>node?.children?.find(x=>x.name===name)??null;
const txt=(node,name)=>optional(node,name)?.text.trim()??null;
const attr=(node,name,key='value')=>optional(node,name)?.attrs?.[key]??null;
const num=s=>s===null||s===''?null:Number.isFinite(Number(s))?Number(s):null;
export function readR73NportXml({xml,ticker,accession,reportDate,firstPublicDate,decisionDate}={}){
 const identity=R66_SEC_IDENTITIES[ticker];
 check(identity&&/^\d{10}-\d{2}-\d{6}$/.test(accession??'')&&[reportDate,firstPublicDate,decisionDate].every(date),'FILING_IDENTITY_AND_DATES_REQUIRED');
 check(reportDate<=firstPublicDate,'PUBLICATION_CHRONOLOGY');
 const root=parseR73Xml(xml),head=one(root,'headerData'),filerInfo=one(head,'filerInfo');
 const cik=txt(one(one(filerInfo,'filer'),'issuerCredentials'),'cik'),sc=one(filerInfo,'seriesClassInfo');
 check(String(cik).padStart(10,'0')===identity.cik,'CIK_MISMATCH');
 check(txt(sc,'seriesId')===identity.seriesId&&txt(sc,'classId')===identity.classId,'ETF_SERIES_CLASS_MISMATCH');
 const form=one(root,'formData');
 check(txt(one(form,'genInfo'),'repPdDate')===reportDate,'REPORT_DATE_MISMATCH');
 const rows=one(form,'invstOrSecs').children.filter(x=>x.name==='invstOrSec');
 check(rows.length>0&&rows.length<=10000,'EMPTY_OR_TOO_MANY_HOLDINGS');
 let equity=0,stable=0,missing=0;
 const holdings=rows.map((r,i)=>{
  const ids=optional(r,'identifiers'),cusip=txt(r,'cusip'),isin=attr(ids,'isin'),tickerId=attr(ids,'ticker');
  const assetCat=txt(r,'assetCat');if(assetCat==='EC')equity++;
  const c=typeof cusip==='string'&&/^[0-9A-Z*@#]{9}$/.test(cusip)&&cusip!=='000000000';
  const n=typeof isin==='string'&&/^[A-Z]{2}[A-Z0-9]{10}$/.test(isin);
  if(c||n)stable++;else missing++;
  return Object.freeze({position:i+1,issuerName:txt(r,'name'),tickerIdentifier:tickerId,
   securityIds:Object.freeze({cusip:c?cusip:null,isin:n?isin:null}),assetCat,
   weightPercent:num(txt(r,'pctVal')),reportedValueUSD:num(txt(r,'valUSD'))});
 });
 return Object.freeze({version:R73_VERSION,ticker,seriesId:identity.seriesId,accession,reportDate,firstPublicDate,
   xmlSha256:createHash('sha256').update(xml).digest('hex'),
   accessionProvenanceIndependentVerificationRequired:true,
   decisionDate,publicByDecisionDate:firstPublicDate<=decisionDate,
   holdingsCount:rows.length,equityPositions:equity,nonEquityPositions:rows.length-equity,
   holdingsWithStableFormatId:stable,missingStableId:missing,
   historicalDailyPITVerified:false,pricesAndVolumeAvailable:false,reference756Verified:false,
   fiveAxisScoreReady:false,commercialRedistributionApproved:false,
   holdingsPrivate:Object.freeze(holdings),
   status:firstPublicDate>decisionDate?'NOT_PUBLIC_AT_DECISION':'SINGLE_DATE_RESEARCH_SNAPSHOT_ONLY'});
}
export async function readR73LocalFile({filePath,...rest}={}){
 check(typeof filePath==='string'&&/\.xml$/i.test(filePath),'LOCAL_XML_ONLY');
 const st=await fs.stat(filePath);check(st.isFile()&&st.size<=2000000,'LOCAL_XML_SIZE_LIMIT');
 return readR73NportXml({...rest,xml:await fs.readFile(filePath,'utf8')});
}
export function summarizeR73(report){
 check(report?.version===R73_VERSION,'INVALID_R73_REPORT');
 const {holdingsPrivate,...summary}=report;return Object.freeze(summary);
}