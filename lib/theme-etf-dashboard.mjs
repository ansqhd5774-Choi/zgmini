// Derive displayable themes from the stored READY feed, never from the 30-theme catalog.
// The currently published seven are a color reference ONLY, not an allowlist or fixed count.
export const THEME_DASHBOARD_SEVEN=Object.freeze([
 {id:'로봇·자동화',name:'로봇·자동화',color:'#fb7185'},
 {id:'클라우드·SaaS',name:'클라우드·SaaS',color:'#a3e635'},
 {id:'자율주행',name:'자율주행',color:'#38bdf8'},
 {id:'원전·SMR',name:'원전·SMR',color:'#2dd4bf'},
 {id:'방산',name:'방산',color:'#fbbf24'},
 {id:'핀테크',name:'핀테크',color:'#c084fc'},
 {id:'사이버보안',name:'사이버보안',color:'#e879f9'},
]);
// Canonical ID is the existing 30-theme catalog key. Display alias/color only;
 // no eighth score is created until the stored READY feed supplies valid history.
const FUTURE_THEME_PRESENTATION=Object.freeze({
 'AI 반도체':Object.freeze({name:'AI·반도체',color:'#f97316'}),
});
const KNOWN_COLORS=new Map(THEME_DASHBOARD_SEVEN.map(({id,color})=>[id,color]));
const EXTRA_COLORS=Object.freeze(['#60a5fa','#34d399','#f59e0b','#a78bfa','#f472b6','#22d3ee','#facc15','#fb923c']);
const score=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const colorFor=name=>{
 const preview=FUTURE_THEME_PRESENTATION[name];
 if(preview)return preview.color;
 const known=KNOWN_COLORS.get(name);
 if(known)return known;
 let hash=2166136261;
 for(const cp of name)hash=Math.imul(hash^cp.codePointAt(0),16777619)>>>0;
 return EXTRA_COLORS[hash%EXTRA_COLORS.length];
};
const validHistory=(item,observationDate)=>{
 if(typeof item?.theme!=='string'||!item.theme.trim()||!score(item.score)||!Array.isArray(item.history)||item.history.length!==252)return false;
 let prev='';
 for(const p of item.history){
  if(!date(p?.date)||p.date<=prev||!score(p.score))return false;
  prev=p.date;
 }
 return prev===observationDate&&Math.abs(item.history.at(-1).score-item.score)<=1e-6;
};
export function themeEtfDashboardSeries(payload){
 const empty={series:[],data:[]};
 if(payload?.status!=='READY'||!date(payload?.observationDate)||!Array.isArray(payload.themes)||!payload.themes.length)return empty;
 // A new theme appears automatically once the existing stored API publishes valid
 // 252-session score history. Incomplete/unsupported items remain invisible.
 const valid=payload.themes.filter(item=>validHistory(item,item.delayed===true&&date(item.observationDate)&&item.observationDate<payload.observationDate?item.observationDate:payload.observationDate));
 if(!valid.length)return empty;
 if(new Set(valid.map(t=>t.theme)).size!==valid.length)return empty;
 const dates=valid[0].history.map(point=>point.date);
 const eligible=valid.filter(item=>item.delayed===true||item.history.every((point,i)=>point.date===dates[i]));
 if(!eligible.length)return empty;
 const series=eligible.map(item=>({id:item.theme,name:FUTURE_THEME_PRESENTATION[item.theme]?.name??item.theme,color:colorFor(item.theme)}));
 const commonDates=[...new Set(eligible.flatMap(item=>item.history.map(p=>p.date)))].sort();
 const histories=new Map(eligible.map(item=>[item.theme,new Map(item.history.map(p=>[p.date,p.score]))]));
 const confirmed=commonDates.map(day=>({date:day,...Object.fromEntries(eligible.map(item=>[item.theme,histories.get(item.theme).get(day)??null]))}));
 // Provisional dates originate solely from the separately approved stored API.
 // No substitution of missing values and no provisional text in the chart.
 let trailing=[];
 if(payload.phase==='PROVISIONAL'&&Array.isArray(payload.provisional?.points)&&payload.provisional.points.length>=1&&payload.provisional.points.length<=2){
  let previous=dates.at(-1);
  const next=[];
  for(const p of payload.provisional.points){
   if(!date(p?.date)||p.date<=previous||typeof p?.scores!=='object'||p.scores===null||eligible.some(item=>!item.delayed&&!score(p.scores[item.theme]))){
    next.length=0;break;
   }
   next.push({date:p.date,provisional:true,...Object.fromEntries(eligible.map(item=>[item.theme,item.delayed?null:p.scores[item.theme]]))});
   previous=p.date;
  }
  if(next.length===payload.provisional.points.length)trailing=next;
 }
 return {series,data:[...confirmed,...trailing]};
}
