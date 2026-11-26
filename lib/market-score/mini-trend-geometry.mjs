// Static mini charts share the same dated 0–100 contract as the interactive charts.
export function miniTrendGeometry(data, periodDays, missingDates = []) {
 // Use only real dated observations; never add synthetic boundary/current points.
 const valid=(Array.isArray(data)?data:[]).flatMap(p=>{
  const ts=Date.parse(p?.label);
  return Number.isFinite(ts)&&typeof p?.value==='number'&&Number.isFinite(p.value)&&p.value>=0&&p.value<=100?[{...p,ts}]:[];
 }).sort((a,b)=>a.ts-b.ts);
 const end=valid.at(-1)?.ts??0;
 const startCutoff=end-Math.max(1,periodDays)*86400000;
 const rows=valid.filter(p=>p.ts>=startCutoff);
 const first=rows[0],last=rows.at(-1);
 const firstAt=first?.ts??0,lastAt=last?.ts??0;
 // Symmetric 6-unit insets in the 220-unit SVG viewport: 3.85px on a 141px chart.
 const x=ts=>lastAt>firstAt?6+(ts-firstAt)/(lastAt-firstAt)*208:214;
 const y=value=>57-value*.54;
 // A continuous straight polyline through existing observations, including
 // observations on opposite sides of a missing month. No missing value is made up.
 // For one unique timestamp no trend line exists: show an insufficiency label.
 const path=rows.length>=2&&lastAt>firstAt
  ?rows.map((p,i)=>(i?'L':'M')+`${x(p.ts).toFixed(3)},${y(p.value).toFixed(3)}`).join('')
  :'';
 return {path,bridge:path,last:last?{x:x(last.ts),y:y(last.value)}:null};
}


// A mini-chart point is a chart calculation or saved historical observation,
// not necessarily a fresh provider measurement. Expose the ORIGINAL plotted
// date/value for accessibility and verification without synthesizing any row.
export function miniTrendLastPointMetadata(data=[]){
 const last=Array.isArray(data)?data.at(-1):null;
 if(typeof last?.label!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(last.label)
  ||!Number.isFinite(Date.parse(last.label))
  ||(last.label.length===10&&new Date(Date.parse(last.label)).toISOString().slice(0,10)!==last.label)
  ||typeof last?.value!=='number'||!Number.isFinite(last.value)
  ||last.value<0||last.value>100)return null;
 return {label:last.label,score:last.value};
}
