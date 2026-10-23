// Static mini charts share the same dated 0–100 contract as the interactive charts.
export function miniTrendGeometry(data, periodDays, missingDates = []) {
 const valid=data.flatMap(p=>{const ts=Date.parse(p.label);return Number.isFinite(ts)&&Number.isFinite(p.value)?[{...p,ts}]:[]});
 const end=valid.length?Math.max(...valid.map(p=>p.ts)):0;
 const start=end-Math.max(1,periodDays)*86400000;
 const rows=[...valid,...missingDates.map(label=>({ts:Date.parse(label),value:null}))].filter(p=>Number.isFinite(p.ts)&&p.ts>=start&&p.ts<=end).sort((a,b)=>a.ts-b.ts);
 const x=ts=>13+(ts-start)/(end-start)*204,y=value=>57-value*.54;
 let pen=false,path='',bridge='';
 for(const p of rows){if(p.value===null){pen=false;continue}const xy=`${x(p.ts).toFixed(3)},${y(p.value).toFixed(3)}`;path+=(pen?'L':'M')+xy;pen=true;bridge+=(bridge?'L':'M')+xy;}
 const last=valid.at(-1);
 return {path,bridge,last:last?{x:x(last.ts),y:y(last.value)}:null};
}
