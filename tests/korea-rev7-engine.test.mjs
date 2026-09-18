import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateRev7,REV7_VERSION,REV7_SCORE_WINDOW} from '../worker/korea-rev7-engine.mjs';

const date=i=>{
  const d=new Date(Date.UTC(2022,0,3));
  d.setUTCDate(d.getUTCDate()+i);
  return d.toISOString().slice(0,10).replaceAll('-','');
};
function fixtures(count=780) {
  const dailySeries=[],marketRows=[];
  for(let i=0;i<count;i++) {
    const d=date(i);
    dailySeries.push({
      date:d,
      kospiClose:1000+i*1.2+Math.sin(i/9)*20,
      vkospi200Close:20+Math.sin(i/13)*3+(i%17)/20,
      ktbTotalReturn:1000+i*.08+Math.sin(i/15),
      putCallRatio:.7+Math.sin(i/11)*.12,
      aaMinus3Y:3+Math.sin(i/20)*.05,
      bbbMinus3Y:5+Math.sin(i/17)*.08,
      junkSpread:2+Math.sin(i/17)*.08-Math.sin(i/20)*.05,
    });
    for(let s=0;s<3;s++) {
      const base=100+s*10+i*.15+Math.sin((i+s)/7);
      const change=i%3===0?1:i%3===1?-1:0;
      marketRows.push({
        date:d,securityId:`S${s}`,shortCode:`S${s}`,
        close:base,high:base+1+(i%29===0?5:0),low:base-1-(i%31===0?5:0),
        changeAmount:change,shareVolume:1000+s*100+(i%10)*10,
      });
    }
  }
  return {dailySeries,marketRows};
}

test('Revision 7 exact seven-factor gate and 504-observation normalization',()=>{
  const input=fixtures();
  const result=calculateRev7(input);
  assert.equal(result.methodologyVersion,REV7_VERSION);
  assert.equal(REV7_SCORE_WINDOW,504);
  const ready=result.history.filter(x=>x.status==='READY');
  assert.ok(ready.length>0);
  assert.equal(result.score,ready.at(-1).composite);
  for(const point of ready) {
    const scores=Object.values(point.factors).map(x=>x.score);
    assert.equal(scores.length,7);
    assert.ok(scores.every(x=>typeof x==='number'&&x>=0&&x<=100));
    assert.ok(Math.abs(point.composite-scores.reduce((a,b)=>a+b,0)/7)<1e-10);
  }
});
test('missing junk spread blocks headline instead of 6/7 reweighting',()=>{
  const input=fixtures();
  for(let i=input.dailySeries.length-600;i<input.dailySeries.length;i++) input.dailySeries[i].junkSpread=null;
  const result=calculateRev7(input);
  const latest=result.history.at(-1);
  assert.equal(latest.factors.junkBond.score,null);
  assert.equal(latest.composite,null);
});
test('strength uses intraday high/low history, not closing-price highs',()=>{
  const input=fixtures();
  const result=calculateRev7(input);
  const points=result.history.filter(p=>p.factors.strength.raw!==null);
  assert.ok(points.length>=500);
  assert.ok(points.some(p=>p.factors.strength.raw!==0));
});
