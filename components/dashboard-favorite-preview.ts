// Presentation-only interpretation of already published favorite indicator snapshots.
// This module never fetches raw provider data or calculates ZGMINI's indicator scores.
export type DashboardFavoritePreview={
 value:string;judgement:string;date:string;dateKind:"관측"|"기준"|"";tone:"positive"|"neutral"|"negative"|"missing";
};
type Row={id?:string;name?:string;label?:string;status?:string;score?:number|null;value?:number|null;unit?:string|null;displayValue?:string|null;formattedValue?:string|null;observationDate?:string|null;asOfDate?:string|null};
type Snapshot={
 status?:string;asOfDate?:string|null;score?:number|null;methodologyVersion?:string|null;riskFactorsMethodologyVersion?:string|null;
 features?:Record<string,Row|null>;indicators?:Row[];components?:Row[];supplementals?:Row[];core?:Row[];riskFactors?:Row[];
 domains?:Array<{id?:string;asOfDate?:string|null;indicators?:Row[]}>;
};
export const RISK_FAVORITE_ENDPOINTS:Record<string,string>={
 "zgmini:inflation:favorites:v1":"/api/inflation-detail",
 "zgmini:recession:favorites:v1":"/api/recession-detail",
 "zgmini:liquidity:favorites:v1":"/api/liquidity-crisis-detail",
 "zgmini:credit:favorites:v1":"/api/credit-risk-detail",
 "zgmini:earnings:favorites:v1":"/api/earnings-recession-detail",
 "zgmini:asset:favorites:v1":"/api/asset-bubble-detail",
 "zgmini:debt:favorites:v1":"/api/debt-risk-detail",
 "zgmini:supply:favorites:v1":"/api/supply-shock-detail",
};
const numeric=(x:unknown):x is number=>typeof x==="number"&&Number.isFinite(x);
const score=(x:unknown)=>numeric(x)&&x>=0&&x<=100?x:null;
const presentDate=(x:unknown)=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+"T00:00:00Z"))?x.slice(2).replaceAll("-","."):"";
function displayNumber(x:number){const a=Math.abs(x);const digits=a>=100?1:a>=10?2:a>=1?3:a>=0.01?4:a>=0.0001?5:6;return x.toLocaleString("ko-KR",{maximumFractionDigits:digits});}
function judge(value:number|null,economic:boolean):Pick<DashboardFavoritePreview,"judgement"|"tone">{
 if(value===null)return {judgement:"평가 없음",tone:"missing"};
 if(value>=60)return {judgement:"긍정",tone:"positive"};
 if(value>=(economic?40:45))return {judgement:"중립",tone:"neutral"};
 return {judgement:"부정",tone:"negative"};
}
function preview(row:Row|undefined,asOfDate:string|null|undefined,economic:boolean,unit?:string):DashboardFavoritePreview|null{
 if(!row||(row.status!==undefined&&row.status!=="READY"))return null;
 const assessed=score(row.score);
 let value="";
 if(economic){
  const printed=[row.displayValue,row.formattedValue].find(x=>typeof x==="string"&&x.trim())?.trim();
  if(printed)value="현재 "+printed;
 }
 if(!value&&numeric(row.value)){const suffix=unit??row.unit??"";value="현재 "+displayNumber(row.value)+(suffix&&suffix!=="%"?" "+suffix:suffix);}
 if(!value&&assessed!==null)value="평가 "+assessed.toFixed(1)+"점";
 if(!value)return null;
 const rawDate=presentDate(row.observationDate??row.asOfDate);
 const date=rawDate||presentDate(asOfDate);
 return {value,...judge(assessed,economic),date,dateKind:rawDate?"관측":date?"기준":""};
}
export function getRiskFavoritePreview(storageKey:string,id:string,payload:unknown):DashboardFavoritePreview|null{
 if(!payload||typeof payload!=="object")return null;
 const s=payload as Snapshot;
 if(storageKey==="zgmini:inflation:favorites:v1"){
  // Inflation panel's published feature value units; unit labor cost is unitless.
  const unit=id==="UNIT_LABOR_COST"?"":"%";
  return preview(s.features?.[id]??undefined,s.asOfDate,false,unit);
 }
 if(storageKey==="zgmini:earnings:favorites:v1"){
  // The detailed earnings page only accepts factors from the matching methodology.
  if(s.status!=="READY"||score(s.score)===null||s.riskFactorsMethodologyVersion!==s.methodologyVersion)return null;
  return preview(s.riskFactors?.find(x=>x?.id===id),s.asOfDate,false);
 }
 const data=storageKey==="zgmini:recession:favorites:v1"?[...(s.components??[]),...(s.supplementals??[])]
  :storageKey==="zgmini:credit:favorites:v1"?[...(s.core??[]),...(s.supplementals??[])]
  :s.indicators??[];
 return preview(data.find(x=>x?.id===id),s.asOfDate,false);
}
export function getEconomicFavoritePreview(domainId:string,indicatorId:string,payload:unknown):DashboardFavoritePreview|null{
 if(!payload||typeof payload!=="object")return null;
 const s=payload as Snapshot;
 const domain=s.domains?.find(x=>x?.id===domainId);
 const item=domain?.indicators?.find(x=>x?.id===indicatorId);
 return item?.status==="READY"?preview(item,domain?.asOfDate,true):null;
}
