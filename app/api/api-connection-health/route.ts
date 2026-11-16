// Security boundary: internal collector telemetry is NOT a public product API.
// Do not query D1, expose provider hosts, route fingerprints, error statuses,
// request cadence, or freshness evidence to unauthenticated visitors.
export function GET(){
 return new Response(null,{status:404,headers:{
  'cache-control':'no-store, private',
  'x-robots-tag':'noindex',
  'x-content-type-options':'nosniff'
 }});
}
