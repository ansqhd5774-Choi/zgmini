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
  assert.equal(typeof captured.providerFactory,"function");
  const provider=captured.providerFactory({fetchImpl,now:()=>new Date("2026-11-24T14:14:40.919Z")});
  await assert.rejects(
    provider.fetchGroup("DOL_UI_WEEKLY_CLAIMS",{mode:"ONE_YEAR"}),
    /DOL_ETA538_SCHEDULED_SCOPE_FORBIDDEN/,
  );

  assert.equal(captured.db,db);
  assert.equal(captured.fetchImpl,fetchImpl);
  assert.equal(Object.hasOwn(captured,"groups"),false);
  assert.deepEqual(result.plannedGroups,[
    {groupName:"BLS_STATE_MSA",status:"RELEASE_ALREADY_STORED",due:false},
    {groupName:"BLS_BED",status:"WAITING_FOR_COLLECTION_WINDOW",due:false},
  ]);
});


test("W04 regular collection checkpoint preserves only bounded SQLite row-change counts",async()=>{
  const group={groupName:"DOL_UI_WEEKLY_CLAIMS",status:"SUCCESS",
    providerRequests:2,runId:1234,sourceHash:"private-source-hash",
    rawBody:"private-raw-payload",changedSeriesIds:["INITIAL_CLAIMS"],
    collectedRows:3440,inserted:0,revised:0,noop:3440,rejected:0,
    historyRowsAdded:0,rawSnapshots:2,rawSnapshotNoops:2};
  const result=await runEmploymentR6AutoCollection({...options,enabled:true,
    collect:async()=>({status:"SUCCESS",providerRequests:2,groupResults:[group],
      plannedGroups:[]}),
  });
  assert.equal(result.status,"SUCCESS");
  assert.equal(result.providerRequests,2);
  assert.deepEqual(result.groups,[{
    groupName:"DOL_UI_WEEKLY_CLAIMS",status:"SUCCESS",
    collectedRows:3440,inserted:0,revised:0,noop:3440,rejected:0,
    historyRowsAdded:0,rawSnapshots:2,rawSnapshotNoops:2,
  }]);
  assert.equal(Object.hasOwn(result.groups[0],"runId"),false);
  assert.equal(Object.hasOwn(result.groups[0],"sourceHash"),false);
  assert.equal(Object.hasOwn(result.groups[0],"rawBody"),false);
  assert.equal(Object.hasOwn(result.groups[0],"changedSeriesIds"),false);
});

test("W04 collection telemetry omits absent, invalid, and unbounded counts instead of fabricating zeros",async()=>{
  const result=await runEmploymentR6AutoCollection({...options,enabled:true,
    collect:async()=>({status:"PARTIAL",providerRequests:0,
      groupResults:[{groupName:"DOL_UI_WEEKLY_CLAIMS",status:"PARTIAL",
        collectedRows:0,inserted:-1,revised:1.5,noop:"0",
        rejected:Number.NaN,historyRowsAdded:1_000_001,
        rawSnapshots:1,rawSnapshotNoops:undefined}],
      plannedGroups:[]}),
  });
  assert.deepEqual(result.groups,[{
    groupName:"DOL_UI_WEEKLY_CLAIMS",status:"PARTIAL",
    collectedRows:0,rawSnapshots:1,
  }]);
});

test("W04 no-due release exposes no invented group changes",async()=>{
  const result=await runEmploymentR6AutoCollection({...options,enabled:true,
    collect:async()=>({status:"NOOP",providerRequests:0,groupResults:[],
      plannedGroups:[{groupName:"DOL_UI_WEEKLY_CLAIMS",
        status:"RELEASE_ALREADY_STORED",due:false}]}),
  });
  assert.deepEqual(result.groups,[]);
  assert.equal(result.providerRequests,0);
  assert.equal(result.plannedGroups[0].status,"RELEASE_ALREADY_STORED");
});
