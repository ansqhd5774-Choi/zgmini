export function feedInput(key,now){
 const date=new Date(now).toISOString().slice(0,10),rows=[{date,value:0}];
 if(key==='fear-greed')return {fear_and_greed:{score:0,rating:'extreme fear',timestamp:new Date(now).toISOString()},fear_and_greed_historical:{data:[]}};
 if(key==='core-pce')return {f:{rows},b:{series:[{rows}]}};
 return {blsStatus:'SUCCESS',blsRows:['CUUR0000SA0','WPSFD4','LNS14000000','CES0000000001'].map(id=>[id,rows]),fredResults:['corePce','tenYear','oil'].map(name=>({name,status:'SUCCESS',data:rows}))};
}
export function feedOutput(key,now){
 if(key==='fear-greed')return {status:'verified',score:0,observedAt:new Date(now).toISOString(),history:[{score:0,timestamp:new Date(now).toISOString()}]};
 if(key==='core-pce')return {status:'OK',actual:[{date:'2026-09',value:0}]};
 return {status:'live',indicators:Object.fromEntries(['corePce','cpi','ppi','unemployment','payrolls','tenYear','oil'].map(id=>[id,{currentValue:0,chart:[{label:'09',value:0}]}])),summary:[{score:0}]};
}
