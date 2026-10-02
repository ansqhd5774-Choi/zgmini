import {env as native} from 'cloudflare:workers';
import {readOnlyDualEnv} from './candidate-2db-guard.mjs';
export const env=readOnlyDualEnv(native);
