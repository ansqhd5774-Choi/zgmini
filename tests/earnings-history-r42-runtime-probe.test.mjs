import test from 'node:test';

test('R42 read-only public earnings diagnostic history probe',{timeout:25000},async()=>{
 const url='https://zgmini.kr/api/earnings-recession-detail';
 try{
  const res=await fetch(url,{signal:AbortSignal.timeout(18000),headers:{accept:'application/json'}});
  const body=await res.json();
  console.log('R42_EARNINGS_HISTORY_RUNTIME',JSON.stringify({http:res.status,status:body?.status,score:body?.score,asOfDate:body?.asOfDate,methodologyVersion:body?.methodologyVersion,riskHistoryKind:body?.riskHistoryKind,riskHistoryMode:body?.riskHistoryMode,riskFinancialPeriodEnd:body?.riskFinancialPeriodEnd,riskTrend:body?.riskTrend,topKeys:Object.keys(body??{}).slice(0,25)}));
 }catch(e){console.log('R42_EARNINGS_HISTORY_UNAVAILABLE',String(e?.code??e?.name??'UNKNOWN'));}
});
