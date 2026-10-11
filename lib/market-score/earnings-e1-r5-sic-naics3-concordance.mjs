const clean=value=>String(value??"").normalize("NFKC").trim();
const norm=value=>clean(value).toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();

function extractCodes(value,digits,{system="naics"}={}){
  const text=clean(value);const out=[];
  if(system.toLowerCase()==="sic"&&/^\d{1,4}$/.test(text)&&digits===4)out.push(text.padStart(4,"0"));
  const re=new RegExp(`(?:^|\\D)(\\d{${digits}})(?=\\D|$)`,"g");let match;
  while((match=re.exec(text)))out.push(match[1]);
  return [...new Set(out)];
}
function add(map,from,to){const set=map.get(from)??new Set();set.add(to);map.set(from,set);}
function serializableMap(map){return [...map.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([from,targets])=>({from,targets:[...targets].sort()}));}
function headerTokenMatch(value,{year,system}){
  const text=norm(value);if(!text)return false;
  return text.includes(String(year))&&text.includes(system.toLowerCase());
}
function chooseCodeColumn(rows,spec){
  const candidates=new Map();let lastHeaderRow=-1;
  for(let r=0;r<Math.min(rows.length,25);r++){
    const row=rows[r]??[];
    for(let c=0;c<row.length;c++){
      if(!headerTokenMatch(row[c],spec))continue;
      lastHeaderRow=Math.max(lastHeaderRow,r);
      let score=0;
      for(let rr=r+1;rr<Math.min(rows.length,r+250);rr++)score+=extractCodes((rows[rr]??[])[c],spec.digits,{system:spec.system}).length;
      const old=candidates.get(c)??-1;if(score>old)candidates.set(c,score);
    }
  }
  const ranked=[...candidates.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0]);
  return {column:ranked[0]?.[1]>0?ranked[0][0]:null,lastHeaderRow};
}

export function parseCensusConcordanceWorkbook(sheets,{fromYear,toYear,fromSystem="naics",toSystem="naics",fromDigits=6,toDigits=6}={}){
  const reports=[];
  for(const [sheetName,rows] of Object.entries(sheets??{})){
    if(!Array.isArray(rows)||!rows.length)continue;
    const source=chooseCodeColumn(rows,{year:fromYear,system:fromSystem,digits:fromDigits});
    const target=chooseCodeColumn(rows,{year:toYear,system:toSystem,digits:toDigits});
    if(source.column==null||target.column==null||source.column===target.column)continue;
    const start=Math.max(source.lastHeaderRow,target.lastHeaderRow)+1;
    const map=new Map();let relationshipCount=0;
    for(let r=start;r<rows.length;r++){
      const row=rows[r]??[];const fromCodes=extractCodes(row[source.column],fromDigits,{system:fromSystem});const toCodes=extractCodes(row[target.column],toDigits,{system:toSystem});
      if(!fromCodes.length||!toCodes.length)continue;
      for(const from of fromCodes)for(const to of toCodes){add(map,from,to);relationshipCount++;}
    }
    if(map.size)reports.push({sheetName,map,relationshipCount,sourceColumn:source.column,targetColumn:target.column,startRow:start});
  }
  if(reports.length!==1)return {status:"FAIL",reason:reports.length?"CENSUS_CONCORDANCE_MULTIPLE_MATCHING_SHEETS":"CENSUS_CONCORDANCE_HEADER_OR_ROWS_MISSING",fromYear,toYear,fromSystem,toSystem,map:new Map(),matches:reports.map(r=>r.sheetName)};
  const report=reports[0];
  return {status:"PASS",reason:null,fromYear,toYear,fromSystem,toSystem,map:report.map,relationshipCount:report.relationshipCount,sourceCount:report.map.size,sheetName:report.sheetName,sourceColumn:report.sourceColumn,targetColumn:report.targetColumn,startRow:report.startRow,rows:serializableMap(report.map)};
}

export function validate2017To2022DirectionalConcordance(forward,reverse){
  if(forward?.status!=="PASS"||reverse?.status!=="PASS")return {status:"FAIL",reason:"CENSUS_2017_2022_CONCORDANCE_REQUIRED"};
  const mismatches=[];
  for(const [from,targets] of forward.map){for(const to of targets)if(!reverse.map.get(to)?.has(from))mismatches.push({from,to,direction:"FORWARD_ONLY"});}
  for(const [to,sources] of reverse.map){for(const from of sources)if(!forward.map.get(from)?.has(to))mismatches.push({from,to,direction:"REVERSE_ONLY"});}
  return {status:mismatches.length?"FAIL":"PASS",reason:mismatches.length?"CENSUS_2017_2022_DIRECTIONAL_MISMATCH":null,mismatchCount:mismatches.length,mismatches:mismatches.slice(0,50)};
}

function advanceFull(current,relation,label){
  const next=new Set();const missing=[];
  for(const code of current){const targets=relation.map.get(code);if(!targets?.size){missing.push(code);continue;}for(const target of targets)next.add(target);}
  if(missing.length)return {status:"NO_NAICS",reason:`MISSING_${label}`,missing,current:[...current].sort(),next:[]};
  return {status:"PASS",current:[...current].sort(),next:[...next].sort(),set:next};
}

export function resolveSicTo2022Naics3(sic,{sic1987To2002,naics2002To2007,naics2007To2012,naics2012To2017,naics2017To2022}={}){
  const source=String(sic??"").replace(/\D/g,"").padStart(4,"0");if(!/^\d{4}$/.test(source))return {status:"NO_NAICS",reason:"INVALID_SIC",sic:null};
  let current=new Set([source]);const path=[];
  for(const [label,relation] of [["SIC1987_TO_NAICS2002",sic1987To2002],["NAICS2002_TO_2007",naics2002To2007],["NAICS2007_TO_2012",naics2007To2012],["NAICS2012_TO_2017",naics2012To2017],["NAICS2017_TO_2022",naics2017To2022]]){
    if(relation?.status!=="PASS")return {status:"NO_NAICS",reason:`RELATION_${label}_NOT_PASS`,sic:source,path};
    const step=advanceFull(current,relation,label);path.push({label,current:step.current,next:step.next,missing:step.missing??[]});if(step.status!=="PASS")return {status:"NO_NAICS",reason:step.reason,sic:source,path};current=step.set;
  }
  const naics2022=[...current].filter(code=>/^\d{6}$/.test(code)).sort();const naics3=[...new Set(naics2022.map(code=>code.slice(0,3)))].sort();
  if(!naics3.length)return {status:"NO_NAICS",reason:"NO_2022_NAICS_TARGET",sic:source,path,naics2022,naics3};
  if(naics3.length!==1)return {status:"AMBIGUOUS",reason:"MULTIPLE_2022_NAICS3_TARGETS",sic:source,path,naics2022,naics3};
  return {status:"EXACT",reason:null,sic:source,naics3:naics3[0],naics2022,path};
}

export function buildApprovedSicNaics3Document({sic1987To2002,naics2002To2007,naics2007To2012,naics2012To2017,naics2017To2022,naics2022To2017,version="CENSUS-SIC-NAICS3-R1"}={}){
  const relations=[sic1987To2002,naics2002To2007,naics2007To2012,naics2012To2017,naics2017To2022,naics2022To2017];
  if(relations.some(relation=>relation?.status!=="PASS"))return {status:"PARTIAL",reason:"CENSUS_CONCORDANCE_CHAIN_INCOMPLETE",version,rows:[],summary:{exact:0,ambiguous:0,noNaics:0}};
  const symmetry=validate2017To2022DirectionalConcordance(naics2017To2022,naics2022To2017);
  if(symmetry.status!=="PASS")return {status:"PARTIAL",reason:symmetry.reason,version,rows:[],summary:{exact:0,ambiguous:0,noNaics:0},symmetry};
  const rows=[],ambiguous=[],noNaics=[];
  for(const sic of [...sic1987To2002.map.keys()].sort()){
    const result=resolveSicTo2022Naics3(sic,{sic1987To2002,naics2002To2007,naics2007To2012,naics2012To2017,naics2017To2022});
    if(result.status==="EXACT")rows.push({sic:result.sic,naics3:result.naics3,approved:true});
    else if(result.status==="AMBIGUOUS")ambiguous.push({sic:result.sic,naics3:result.naics3,naics2022:result.naics2022,reason:result.reason});
    else noNaics.push({sic:result.sic,reason:result.reason});
  }
  return {
    status:"APPROVED",reason:null,version,
    policy:"ALL_OFFICIAL_CENSUS_PATHS_MUST_CONVERGE_TO_ONE_2022_NAICS3",
    finalConcordance:"FULL_CENSUS_2017_TO_2022_WITH_REVERSE_VALIDATION",
    rows,ambiguous,noNaics,
    summary:{exact:rows.length,ambiguous:ambiguous.length,noNaics:noNaics.length,total:sic1987To2002.map.size},
    symmetry,
  };
}
