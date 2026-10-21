import test from 'node:test';

test('R41 transient read-only public provisional API diagnostic',{timeout:25000},async()=>{
 try {
  const res=await fetch('https://zgmini.kr/api/earnings-risk-provisional',{headers:{accept:'application/json'},signal:AbortSignal.timeout(18000)});
  const body=await res.json();
  console.log('R41_PROVISIONAL_RUNTIME_READONLY',JSON.stringify({http:res.status,status:body?.status??null,reason:body?.reason??null,phase:body?.phase??null,score:body?.score??null,pointCount:Array.isArray(body?.history)?body.history.length:null,observedAt:body?.observedAt??null,snapshotAt:res.headers.get('x-data-snapshot-at')}));
 } catch(e) {
  console.log('R41_PROVISIONAL_RUNTIME_UNAVAILABLE',String(e?.code??e?.name??'UNKNOWN'));
 }
});
