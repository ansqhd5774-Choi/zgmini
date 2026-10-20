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
const KNOWN_COLORS=new Map(THEME_DASHBOARD_SEVEN.map(({id,color})=>[id,color]));
const EXTRA_COLORS=Object.freeze(['#60a5fa','#34d399','#f59e0b','#a78bfa','#f472b6','#22d3ee','#facc15','#fb923c']);
const score=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const colorFor=name=>{
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
 const valid=payload.themes.filter(item=>validHistory(item,payload.observationDate));
 if(!valid.length)return empty;
 if(new Set(valid.map(t=>t.theme)).size!==valid.length)return empty;
 const dates=valid[0].history.map(point=>point.date);
 const eligible=valid.filter(item=>item.history.every((point,i)=>point.date===dates[i]));
 if(!eligible.length)return empty;
 const series=eligible.map(item=>({id:item.theme,name:item.theme,color:colorFor(item.theme)}));
 const data=dates.map((day,i)=>({
  date:day,
  ...Object.fromEntries(eligible.map(item=>[item.theme,item.history[i].score])),
 }));
 return {series,data};
}
