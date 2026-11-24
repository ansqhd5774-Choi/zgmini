import assert from "node:assert/strict";
import {test} from "node:test";
import {runEmploymentR6AutoCollection} from "../scripts/pc-writer/employment-r6-auto-collection.mjs";

const db={prepare(){return {};}},fetchImpl=async()=>{};
const options={approvedSource:"approved-sha",runningSource:"approved-sha",db,fetchImpl};

test("disabled R6 automatic collection does not touch Core or providers",async()=>{
  let calls=0;
  const result=await runEmploymentR6AutoCollection({
    ...options,collect:async()=>{calls++;throw Error("NOT_APPROVED");},
  });
  assert.deepEqual(result,{status:"DISABLED",providerRequests:0});
  assert.equal(calls,0);
});

test("unapproved running source fails before opening R6 collection",async()=>{
  let calls=0;
  await assert.rejects(runEmploymentR6AutoCollection({
    ...options,enabled:true,runningSource:"different-sha",
    collect:async()=>{calls++;},
  }),/EMPLOYMENT_R6_SOURCE_NOT_APPROVED/);
  assert.equal(calls,0);
});

test("approved collector uses the complete release planner, not the four-group candidate stage",async()=>{
  let captured;
  const result=await runEmploymentR6AutoCollection({...options,enabled:true,
    collect:async args=>{captured=args;return {status:"NOOP",providerRequests:0,
      plannedGroups:[{groupName:"BLS_STATE_MSA",status:"RELEASE_ALREADY_STORED",due:false},
        {groupName:"BLS_BED",status:"WAITING_FOR_COLLECTION_WINDOW",due:false}]};},
  });
  assert.equal(captured.mode,"RELEASE");
  assert.equal(captured.db,db);
  assert.equal(captured.fetchImpl,fetchImpl);
  assert.equal(Object.hasOwn(captured,"groups"),false);
  assert.deepEqual(result.plannedGroups,[
    {groupName:"BLS_STATE_MSA",status:"RELEASE_ALREADY_STORED",due:false},
    {groupName:"BLS_BED",status:"WAITING_FOR_COLLECTION_WINDOW",due:false},
  ]);
});

test("group diagnostics preserve safe FAIL, PARTIAL and CIRCUIT_OPEN codes only",async()=>{
  const result=await runEmploymentR6AutoCollection({...options,enabled:true,
    collect:async()=>({status:"FAIL",providerRequests:3,
      groupResults:[
        {groupName:"DOL_UI_WEEKLY_CLAIMS",status:"FAIL",failureCode:"HTTP_403",providerRequests:1,rawBody:"SECRET_1"},
        {groupName:"BLS_JOLTS",status:"PARTIAL",failureCode:"NO_OBSERVATIONS",providerRequests:2,errorMessage:"SECRET_2"},
        {groupName:"BLS_ECI",status:"FAIL",failureCode:"Authorization:Bearer SECRET_3",providerRequests:100001},
      ],
      plannedGroups:[
        {groupName:"DOL_UI_WEEKLY_CLAIMS",status:"DUE",due:true},
        {groupName:"BLS_JOLTS",status:"CIRCUIT_OPEN",due:false,failureCode:"BLS_REQUEST_NOT_PROCESSED",retryAt:"SECRET_4"},
      ],
    }),
  });
  assert.equal(result.status,"FAIL");
  assert.deepEqual(result.groups,[
    {groupName:"DOL_UI_WEEKLY_CLAIMS",status:"FAIL",failureCode:"HTTP_403",providerRequests:1},
    {groupName:"BLS_JOLTS",status:"PARTIAL",failureCode:"NO_OBSERVATIONS",providerRequests:2},
    {groupName:"BLS_ECI",status:"FAIL"},
  ]);
  assert.deepEqual(result.plannedGroups,[
    {groupName:"DOL_UI_WEEKLY_CLAIMS",status:"DUE",due:true},
    {groupName:"BLS_JOLTS",status:"CIRCUIT_OPEN",due:false,failureCode:"BLS_REQUEST_NOT_PROCESSED"},
  ]);
  assert(!JSON.stringify(result).includes("SECRET_"));
});

test("W04 Core receipt retains only canonical scheduler UTC time fields",async()=>{
 const calls=[];
 const output=await runEmploymentR6AutoCollection({...options,enabled:true,
   collect:async args=>{
     calls.push(args);
     return {
       status:"NOOP",providerRequests:0,
       plannedGroups:[
         {groupName:"DOL_UI_WEEKLY_CLAIMS",status:"CIRCUIT_OPEN",due:false,
          failureCode:"DOL_RELEASE_OBSERVATION_STALE",
          retryAt:"2026-11-24T11:20:00.000Z",
          latestStoredData:{secret:"DO_NOT_EXPORT"}},
         {groupName:"BLS_JOLTS",status:"WAITING_FOR_COLLECTION_WINDOW",due:false,
          releaseAt:"2026-11-24T13:30:00.000Z",
          collectAt:"2026-11-25T15:30:00.000Z"},
         {groupName:"BLS_ECI",status:"CIRCUIT_OPEN",due:false,
          retryAt:"SECRET_1",
          releaseAt:"2026-13-99T08:00:00.000Z",
          collectAt:"2026-11-25T15:30:00.000Z\\nPRIVATE"},
         {groupName:"BLS_STATE_MSA",status:"WAITING_FOR_COLLECTION_WINDOW",due:false,
          collectAt:"2026-11-25T15:30:00+00:00"}
       ]
     };
   },
 });
 assert.equal(calls.length,1,"existing approved collection runs exactly once");
 assert.equal(calls[0].mode,"RELEASE");
 assert.deepEqual(output.plannedGroups,[
   {groupName:"DOL_UI_WEEKLY_CLAIMS",status:"CIRCUIT_OPEN",due:false,
    failureCode:"DOL_RELEASE_OBSERVATION_STALE",
    retryAt:"2026-11-24T11:20:00.000Z"},
   {groupName:"BLS_JOLTS",status:"WAITING_FOR_COLLECTION_WINDOW",due:false,
    releaseAt:"2026-11-24T13:30:00.000Z",collectAt:"2026-11-25T15:30:00.000Z"},
   {groupName:"BLS_ECI",status:"CIRCUIT_OPEN",due:false},
   {groupName:"BLS_STATE_MSA",status:"WAITING_FOR_COLLECTION_WINDOW",due:false}
 ]);
 assert.doesNotMatch(JSON.stringify(output),/DO_NOT_EXPORT|PRIVATE|SECRET_/);
 assert.equal(output.providerRequests,0);
});


test("W04 checkpoint preserves bounded SQLite change counts without exporting raw fields",async()=>{
  const result=await runEmploymentR6AutoCollection({...options,enabled:true,
    collect:async()=>({status:"SUCCESS",providerRequests:2,
      groupResults:[{groupName:"DOL_UI_WEEKLY_CLAIMS",status:"SUCCESS",
        providerRequests:2,runId:456,sourceHash:"SECRET_HASH",rawBody:"SECRET_BODY",
        changedSeriesIds:["SECRET_SERIES"],collectedRows:3440,inserted:0,
        revised:0,noop:3440,rejected:0,historyRowsAdded:0,
        rawSnapshots:2,rawSnapshotNoops:2}],
      plannedGroups:[]}),
  });
  assert.deepEqual(result.groups,[{
    groupName:"DOL_UI_WEEKLY_CLAIMS",status:"SUCCESS",providerRequests:2,
    collectedRows:3440,inserted:0,revised:0,noop:3440,rejected:0,
    historyRowsAdded:0,rawSnapshots:2,rawSnapshotNoops:2,
  }]);
  assert.doesNotMatch(JSON.stringify(result),/SECRET_|runId/);
});

test("W04 checkpoint omits noninteger, negative and excessive counts",async()=>{
  const result=await runEmploymentR6AutoCollection({...options,enabled:true,
    collect:async()=>({status:"PARTIAL",providerRequests:0,plannedGroups:[],
      groupResults:[{groupName:"DOL_UI_WEEKLY_CLAIMS",status:"PARTIAL",
        collectedRows:0,inserted:-1,revised:1.5,noop:"0",rejected:NaN,
        historyRowsAdded:1_000_001,rawSnapshots:1,rawSnapshotNoops:undefined}]}),
  });
  assert.deepEqual(result.groups,[{groupName:"DOL_UI_WEEKLY_CLAIMS",status:"PARTIAL",
    collectedRows:0,rawSnapshots:1}]);
});

test("W04 no-due collection does not invent changed-row counts",async()=>{
  const result=await runEmploymentR6AutoCollection({...options,enabled:true,
    collect:async()=>({status:"NOOP",providerRequests:0,groupResults:[],
      plannedGroups:[{groupName:"DOL_UI_WEEKLY_CLAIMS",status:"RELEASE_ALREADY_STORED",due:false}]}),
  });
  assert.deepEqual(result.groups,[]);
  assert.equal(result.plannedGroups[0].status,"RELEASE_ALREADY_STORED");
});
