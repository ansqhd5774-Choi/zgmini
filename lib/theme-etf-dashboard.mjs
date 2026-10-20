// R154: Project only the seven approved, stored ETF-only theme histories.
// No synthetic points, no on-GET calculations, no 30-theme research placeholders.
export const THEME_DASHBOARD_SEVEN=Object.freeze([
 {id:'로봇·자동화',name:'로봇·자동화',color:'#fb7185'},
 {id:'클라우드·SaaS',name:'클라우드·SaaS',color:'#a3e635'},
 {id:'자율주행',name:'자율주행',color:'#38bdf8'},
 {id:'원전·SMR',name:'원전·SMR',color:'#2dd4bf'},
 {id:'방산',name:'방산',color:'#fbbf24'},
 {id:'핀테크',name:'핀테크',color:'#c084fc'},
 {id:'사이버보안',name:'사이버보안',color:'#e879f9'},
]);
const score=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
export function themeEtfDashboardSeries(payload){
 const empty={series:THEME_DASHBOARD_SEVEN,data:[]};
 if(payload?.status!=='READY'||!Array.isArray(payload?.themes)||payload.themes.length!==7||!date(payload.observationDate))return empty;
 const pairs=new Map(payload.themes.map(t=>[t?.theme,t]));
 if(pairs.size!==7)return empty;
 const first=pairs.get(THEME_DASHBOARD_SEVEN[0].id);
 if(!Array.isArray(first?.history)||first.history.length!==252)return empty;
 const dates=first.history.map(x=>x?.date);
 if(dates.some((d,i)=>!date(d)||(i&&d<=dates[i-1]))||dates.at(-1)!==payload.observationDate)return empty;
 for(const item of THEME_DASHBOARD_SEVEN){
  const theme=pairs.get(item.id);
  if(!theme||!score(theme.score)||!Array.isArray(theme.history)||theme.history.length!==252)return empty;
  for(let i=0;i<252;i++){
   const point=theme.history[i];
   if(point?.date!==dates[i]||!score(point.score))return empty;
  }
  if(Math.abs(theme.history[251].score-theme.score)>1e-6)return empty;
 }
 return {series:THEME_DASHBOARD_SEVEN,data:dates.map((d,i)=>({
  date:d,
  ...Object.fromEntries(THEME_DASHBOARD_SEVEN.map(t=>[t.id,pairs.get(t.id).history[i].score])),
 }))};
}
