/**
 * W06 #38: choose the newest already-validated public IEX percentage payload.
 * The caller rejects expired/invalid/unavailable publications before calling.
 * A 503, rights rejection, or invalid publication clears the display (null);
 * it must never resurrect a retired confirmed-source snapshot.
 */
const timestamp=value=>typeof value==='string'?Date.parse(value):NaN;

export function newestUsIexPercentPublication(previous,incoming){
 if(!incoming)return null;
 if(!previous)return incoming;
 const oldSlot=timestamp(previous.slotEndUtc);
 const newSlot=timestamp(incoming.slotEndUtc);
 if(!Number.isFinite(oldSlot)||!Number.isFinite(newSlot))return incoming;
 if(newSlot<oldSlot)return previous;
 if(newSlot>oldSlot)return incoming;
 // Revisions of the same 15-minute bar can arrive in reverse collection order.
 const oldCollected=timestamp(previous.collectedAt);
 const newCollected=timestamp(incoming.collectedAt);
 return Number.isFinite(oldCollected)&&Number.isFinite(newCollected)&&newCollected<oldCollected
  ?previous:incoming;
}
