// W06 #69: a cached public IEX percentage strip is displayed only while
// the existing producer-side NYSE provisional session is eligible. The public
// API already rejects outside-session reads; this closes the UI cache gap.
// No provider call, scoring, storage or publication policy lives here.
import {usProvisionalSlot} from './us-provisional-r1.mjs';

export function currentUsIexDisplaySession(observationDate,slotEndUtc,now=Date.now()){
 if(typeof observationDate!=='string'||typeof slotEndUtc!=='string'
  ||!Number.isFinite(now))return false;
 const slot=usProvisionalSlot(now);
 if(!slot||observationDate!==slot.observationDate)return false;
 const observed=Date.parse(slotEndUtc);
 const completed=Date.parse(slot.slotEndUtc);
 return Number.isFinite(observed)&&observed<=completed
  &&now-observed>=0&&now-observed<=30*60_000;
}
