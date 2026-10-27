import test from 'node:test';
import assert from 'node:assert/strict';
import {themeTooltipRows} from '../lib/theme-tooltip-rows.mjs';

const core=[
 '클라우드·SaaS','사이버보안','핀테크','방산','원전·SMR','자율주행','로봇·자동화',
];
const optional=['우주·위성','바이오·신약','데이터센터·전력'];
const names=[...core,...optional];
const themes=names.map((name,i)=>({
 name,key:`theme_${i}`,color:'#38bdf8',
 points:[{date:'2026-10-23',score:60-i}],
}));
const chosen=new Set(names);
const oct23={date:'2026-10-23',...Object.fromEntries(themes.map((theme,i)=>[theme.key,60-i]))};
const oct26={date:'2026-10-26',...Object.fromEntries(themes.map((theme,i)=>[theme.key,i<7?65-i:null]))};

test('10/23: ten selected themes have ten tooltip rows, not solid+dash duplicates',()=>{
 const actual=themeTooltipRows(themes,chosen,oct23,oct23.date);
 assert.equal(actual.length,10);
 assert.equal(new Set(actual.map(x=>x.name)).size,10);
 assert.ok(actual.every(x=>x.score!==null));
});

test('10/26: seven genuine scores and three explicitly missing themes',()=>{
 const actual=themeTooltipRows(themes,chosen,oct26,oct26.date);
 assert.equal(actual.length,10);
 assert.equal(actual.filter(x=>x.score!==null).length,7);
 assert.deepEqual(actual.filter(x=>x.score===null).map(x=>x.name),optional);
 assert.ok(actual.filter(x=>x.score===null).every(x=>x.lastObservedDate==='2026-10-23'));
 assert.equal(oct26.theme_7,null,'source row stays untouched');
});

test('same theme ID appearing twice is rendered once, and only selected themes appear',()=>{
 const subset=new Set([core[0],optional[0]]);
 const actual=themeTooltipRows([...themes,themes[0]],subset,oct26,oct26.date);
 assert.deepEqual(actual.map(x=>x.name),[core[0],optional[0]]);
});

test('no value is invented for unknown or future observations',()=>{
 const future={...oct26,date:'2026-10-27',theme_7:undefined};
 const actual=themeTooltipRows(themes,new Set([optional[0]]),future,future.date);
 assert.deepEqual(actual.map(x=>[x.score,x.lastObservedDate]),[[null,'2026-10-23']]);
 assert.deepEqual(themeTooltipRows(themes,chosen,oct23,'2026-10-26'),[]);
});
