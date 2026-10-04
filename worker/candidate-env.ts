import {env as native} from 'cloudflare:workers';
import {readOnlyEnv} from './candidate-guard.mjs';
export const env = readOnlyEnv(native);
