import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {mergeFsdsDirectories} from "../scripts/pc-writer/earnings-r5-fsds-merge.mjs";

test("FSDS merge keeps one header and appends rows in directory order",async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-fsds-merge-"));
  try{
    const a=path.join(root,"a"),b=path.join(root,"b"),out=path.join(root,"out");
    fs.mkdirSync(a);fs.mkdirSync(b);
    fs.writeFileSync(path.join(a,"sub.txt"),"adsh\tcik\r\na1\t1\r\n");
    fs.writeFileSync(path.join(b,"sub.txt"),"adsh\tcik\r\nb1\t2\r\n");
    fs.writeFileSync(path.join(a,"num.txt"),"adsh\ttag\r\na1\tX\r\n");
    fs.writeFileSync(path.join(b,"num.txt"),"adsh\ttag\r\nb1\tY\r\n");
    const r=await mergeFsdsDirectories({directories:[a,b],outDir:out});
    assert.equal(r.status,"PASS");
    assert.equal(r.sub.rows,2);
    assert.equal(r.num.rows,2);
    assert.equal(fs.readFileSync(path.join(out,"sub.txt"),"utf8"),"adsh\tcik\r\na1\t1\r\nb1\t2\r\n");
    assert.equal(fs.readFileSync(path.join(out,"num.txt"),"utf8"),"adsh\ttag\r\na1\tX\r\nb1\tY\r\n");
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
