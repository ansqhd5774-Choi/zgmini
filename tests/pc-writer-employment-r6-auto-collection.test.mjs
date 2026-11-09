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
