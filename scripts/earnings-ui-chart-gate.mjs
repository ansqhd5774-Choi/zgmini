// Read-only collector. Recharts 3 renders tick labels in a sibling layer.
export function collectEarningsChartMonths(root){
 const chart=root.querySelector('.earnings-recession-target-card .fg-chart-slot');
 if(!chart)return [];
 const labels=[...chart.querySelectorAll('.recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value, .recharts-xAxis .recharts-cartesian-axis-tick-value')];
 return labels.filter(el=>{
  const style=getComputedStyle(el),rect=el.getBoundingClientRect();
  return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)!==0&&rect.width>0&&rect.height>0;
 }).map(el=>(el.textContent??'').trim()).filter(Boolean);
}

export function inspectEarningsChartMonths({labels,trend}={}){
 if(!Array.isArray(trend))return {status:'AUTOMATION_BLOCKED',reason:'API_TREND_NOT_COLLECTED'};
 if(trend.length<2)return {status:'NOT_APPLICABLE',reason:'INSUFFICIENT_STORED_OBSERVATIONS'};
 if(!Array.isArray(labels)||labels.length===0)return {status:'AUTOMATION_BLOCKED',reason:'AXIS_LABELS_NOT_COLLECTED'};
 const expected=[...new Set(trend.map(row=>String(row?.label??'').slice(2,7).replace('-','/')))];
 if(expected.some(label=>!/^\d{2}\/\d{2}$/.test(label)))return {status:'AUTOMATION_BLOCKED',reason:'API_TREND_DATE_INVALID'};
 if(labels.some(label=>!/^\d{2}\/(0[1-9]|1[0-2])$/.test(label)))return {status:'FAIL',reason:'AXIS_LABEL_FORMAT_INVALID',expected,actual:labels};
 if(new Set(labels).size!==labels.length)return {status:'FAIL',reason:'DUPLICATE_AXIS_MONTH',expected,actual:labels};
 if(JSON.stringify(labels)!==JSON.stringify(expected))return {status:'FAIL',reason:'AXIS_MONTH_MISMATCH',expected,actual:labels};
 return {status:'PASS',reason:'UNIQUE_EXPECTED_MONTHS',expected,actual:labels};
}
