import test from 'node:test';
test('R48 public quarter risk history readback (read only)',{timeout:23000},async()=>{
 try {
 const r=await fetch('https://zgmini.kr/api/earnings-recession-detail',{headers:{accept:'application/json'},signal:AbortSignal.timeout(19000)});
 const p=await r.json();const trend=Array.isArray(p?.riskTrend)?p.riskTrend:[];
 console.log('R48_PUBLIC_READBACK',JSON.stringify({http:r.status,status:p.status,score:p.score,asOf:p.asOfDate,historyKind:p.riskHistoryKind,financialPeriodEnd:p.riskFinancialPeriodEnd,historyMode:p.riskHistoryMode,pointCount:trend.length,points:trend.map(x=>({date:x.date,score:x.score}))}));
 }catch(e){console.log('R48_PUBLIC_READBACK_ERROR',String(e?.code??e?.name??'UNKNOWN'));}
});
