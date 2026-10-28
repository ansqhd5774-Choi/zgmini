// Synthetic coverage fixture ONLY. Not an approved investment roster or PC installation input.
// Nine groups / 64 positions / 63 unique symbols exercise the R39 shape contract.
const symbols=['ROBO','XBI',...Array.from({length:61},(_,i)=>'FIX'+String(i).padStart(2,'0'))];
const positions=[...symbols,symbols[0]];
export const r39UnitRoster={
 schema:'zgmini.theme-nine.r20-approved-three-gate-candidates.v1',
 counts:{themes:9,positions:64,uniqueTickers:63},
 groups:Array.from({length:9},(_,i)=>({id:'FIXTURE_'+i,
  tickers:positions.slice(i*7,i===8?64:(i+1)*7).map(ticker=>({ticker}))})),
};
