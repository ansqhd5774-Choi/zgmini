import {marketOperationalStore as readOnlyStore} from './candidate-market-operational-store.mjs';
import {PROJECTION_MACRO_SERIES,projectionMacroKey,sliceProjectionMacro} from './projection-input-manifest-r60.mjs';

export async function writeProjectionMacroSlices({db,store,storedAt}){
 const saved=await readOnlyStore(db).readInput('macro');
 if(!saved||saved.storedAt!==storedAt)throw Error('MACRO_READBACK_CHANGED');
 if(!Object.values(saved.body?.series??{}).some(rows=>Array.isArray(rows)&&rows.length))throw Error('MACRO_NO_READY_SERIES');
 for(const id of Object.keys(PROJECTION_MACRO_SERIES))await store.writeInput(projectionMacroKey(id),sliceProjectionMacro(id,saved.body),storedAt);
 return {count:Object.keys(PROJECTION_MACRO_SERIES).length,storedAt};
}
