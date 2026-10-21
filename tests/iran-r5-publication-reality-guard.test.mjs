import test from 'node:test';
import assert from 'node:assert/strict';
import {assertR5RealityPublicationReady} from '../scripts/iran-progress/operate-r5.mjs';
test('published R5 requires verified current reality and completed calibration, never a mere shadow',()=>{
 const candidate={status:'SHADOW_UNCALIBRATED',score:13,productionReady:false,
  independentCurrentRealityVerified:false,calibrated:false};
 assert.throws(()=>assertR5RealityPublicationReady(candidate),
  /R5_REALITY_CALIBRATION_NOT_APPROVED_FOR_PUBLICATION/);
 for(const missing of ['productionReady','independentCurrentRealityVerified','calibrated']){
  const x={...candidate,productionReady:true,independentCurrentRealityVerified:true,
   calibrated:true,status:'REALITY_VERIFIED',[missing]:false};
  assert.throws(()=>assertR5RealityPublicationReady(x),
   /R5_REALITY_CALIBRATION_NOT_APPROVED_FOR_PUBLICATION/);
 }
 assert.throws(()=>assertR5RealityPublicationReady({
  ...candidate,productionReady:true,independentCurrentRealityVerified:true,
  calibrated:true,status:'SHADOW_UNCALIBRATED'}),/R5_REALITY_CALIBRATION_NOT_APPROVED_FOR_PUBLICATION/);
 assert.doesNotThrow(()=>assertR5RealityPublicationReady({
  productionReady:true,independentCurrentRealityVerified:true,
  calibrated:true,status:'REALITY_VERIFIED'}));
});
