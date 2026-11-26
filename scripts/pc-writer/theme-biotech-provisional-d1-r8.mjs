import {throwMarketParquetRemoved} from '../../lib/marketparquet-retirement.mjs';
// D1 compare-and-swap writer: only a new biotech-specific provisional key.
// Does not write the seven-theme rolling key, confirmed biotech R2, or R1.
import fs from 'node:fs';
import path from 'node:path';
import {BIOTECH_PROVISIONAL_KEY,BIOTECH_PROVISIONAL_VERSION} from './theme-biotech-provisional-r8.mjs';

const sqlRead="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
const fail=s=>{throw Object.assign(new Error(s),{code:s});};
const check=(v,s)=>{if(!v)fail(s);};

export function biotechProvisionalD1R8(){return throwMarketParquetRemoved();}
