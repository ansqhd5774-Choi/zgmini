// Read-only source adapter. BEA S6 is a published E1 observation, never an
// input to the independent four-factor earnings-recession diagnostic.
export type BeaPoint={date:string;value:number};
export type BeaIndicator={
 id:string;status:string;value:number|null;unit:string;source:string;
 historyKind?:string;sourcePeriodEnd?:string|null;previousValue?:number|null;
 previousPeriodEnd?:string|null;sourceHistory1Y?:BeaPoint[];
 nextReleaseDate?:string|null;
};
const object=(value:unknown):Record<string,unknown>|null=>
 value!==null&&typeof value==="object"&&!Array.isArray(value)
  ?value as Record<string,unknown>:null;

export function readBeaStoredS6(payload:unknown):BeaIndicator|undefined{
 const stored=object(object(payload)?.storedE1);
 if(stored?.methodologyVersion!=="E1-R5"||stored?.status!=="READY"||
  !Array.isArray(stored?.indicators))return undefined;
 const row=stored.indicators.find((candidate:unknown)=>object(candidate)?.id==="S6");
 return object(row)?row as BeaIndicator:undefined;
}
