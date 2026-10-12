import test from "node:test";
import assert from "node:assert/strict";
import {normalizeLineLabel,looksLikeOperatingLine,looksLikeCapexLine} from "../scripts/pc-writer/earnings-r5-fsds-custom-line-inventory.mjs";

test("operating custom label filter keeps total operating result and rejects partial operating income",()=>{
  assert.equal(looksLikeOperatingLine({label:"Operating income (loss)"}),true);
  assert.equal(looksLikeOperatingLine({label:"Income from operations"}),true);
  assert.equal(looksLikeOperatingLine({label:"Operating lease income"}),false);
  assert.equal(looksLikeOperatingLine({label:"Interest income operating"}),false);
  assert.equal(looksLikeOperatingLine({label:"Nonoperating income"}),false);
});

test("capex custom label filter keeps PPE purchases and rejects broad or non-PPE acquisitions",()=>{
  assert.equal(looksLikeCapexLine({label:"Capital expenditures for property and equipment"}),true);
  assert.equal(looksLikeCapexLine({label:"Purchases of property, plant and equipment"}),true);
  assert.equal(looksLikeCapexLine({label:"Acquisition of software and intangible assets"}),false);
  assert.equal(looksLikeCapexLine({label:"Proceeds from sale of property and equipment"}),false);
  assert.equal(looksLikeCapexLine({label:"Payments to acquire businesses"}),false);
});

test("line labels normalize deterministically",()=>{
  assert.equal(normalizeLineLabel(" Operating income (loss) "),"operating income loss");
  assert.equal(normalizeLineLabel("Purchases of Property, Plant & Equipment"),"purchases of property plant and equipment");
});
