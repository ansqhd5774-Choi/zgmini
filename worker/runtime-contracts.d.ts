// Type-only contracts for the existing Worker and stored-result boundaries.
export type DataEnv = {DB?:D1Database;DB_CORE?:D1Database;DB_HISTORY?:D1Database};
export type WorkerContext = Pick<ExecutionContext,'waitUntil'|'passThroughOnException'>;
export type ProjectionId = keyof typeof import('./market-public-projection-store.mjs').PUBLIC_PROJECTION_KEYS;
export type ProjectionJob = {id:ProjectionId;sourceVersion:string|null;sourceStoredAt:number};
export type CandidateEnv = DataEnv & {DB_CORE:D1Database;DB_HISTORY:D1Database;ASSETS?:Fetcher;PUBLIC_PROJECTION_QUEUE?:Queue<ProjectionJob>};
export type CandidateReadEnv = Omit<ReturnType<typeof import('./candidate-2db-guard.mjs').readOnlyDualEnv>,'ASSETS'> & {ASSETS?:Fetcher};
export type OperationalResult = {status:string;job?:string;readyDomains?:number|null;providerRequests?:number;reason?:string;sourceStatus?:string;[field:string]:unknown};
export type SchedulerOptions = {
 refresh?:(options:{env:DataEnv;maxDates:number})=>Promise<{status:string}>;
 ctx?:WorkerContext;responseBudgetMs?:number;logTag?:string;
};
export type ProjectionPhase = {id:ProjectionId;phase:string;elapsedMs:number};
export type ProjectionMetadata = Record<string,unknown>;
export type QuarterScoreRow = {quarter?:string;observationDate?:string|null;value?:number|null;score?:number|null;priceAccelScore?:number|null};
export type ObservationRow = {observationDate:string;value:number|null;releaseDate?:string|null;availableAt?:string|null;realtimeStart?:string|null;realtimeEnd?:string|null;vintageId?:string|null;vintageMethod?:string|null;revision?:string|null};
