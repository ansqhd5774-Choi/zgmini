import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import {fileURLToPath} from "node:url";

function parseArgs(argv=process.argv.slice(2)){const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;}
async function appendTsvFiles(files,outFile){
  if(fs.existsSync(outFile))throw Object.assign(new Error("OUTPUT_EXISTS"),{code:"OUTPUT_EXISTS"});
  let expectedHeader=null,totalRows=0;
  const out=fs.createWriteStream(outFile,{encoding:"utf8",flags:"wx"});
  try{
    for(const file of files){
      if(!fs.existsSync(file))throw Object.assign(new Error(`INPUT_MISSING:${file}`),{code:"INPUT_MISSING"});
      const rl=readline.createInterface({input:fs.createReadStream(file,{encoding:"utf8"}),crlfDelay:Infinity});
      let first=true;
      for await(const line of rl){
        if(first){
          first=false;
          const header=String(line).replace(/\r$/,"");
          if(expectedHeader==null){expectedHeader=header;out.write(`${header}\r\n`);}
          else if(header!==expectedHeader)throw Object.assign(new Error(`HEADER_MISMATCH:${file}`),{code:"HEADER_MISMATCH"});
          continue;
        }
        out.write(`${String(line).replace(/\r$/,"")}\r\n`);totalRows++;
      }
    }
  }finally{await new Promise(resolve=>out.end(resolve));}
  return {header:expectedHeader,rows:totalRows,bytes:fs.statSync(outFile).size};
}

export async function mergeFsdsDirectories({directories=[],outDir}={}){
  if(!directories.length||!outDir)throw Object.assign(new Error("ARGS_REQUIRED"),{code:"ARGS_REQUIRED"});
  fs.mkdirSync(outDir,{recursive:true});
  const subFiles=directories.map(dir=>path.join(dir,"sub.txt"));
  const numFiles=directories.map(dir=>path.join(dir,"num.txt"));
  const sub=await appendTsvFiles(subFiles,path.join(outDir,"sub.txt"));
  const num=await appendTsvFiles(numFiles,path.join(outDir,"num.txt"));
  return {status:"PASS",directories:directories.length,sub,num,dbWrites:0,networkCalls:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const cli=parseArgs();
    const directories=String(cli.dirs??"").split(";").map(v=>v.trim()).filter(Boolean).map(v=>path.resolve(v));
    const result=await mergeFsdsDirectories({directories,outDir:cli["out-dir"]?path.resolve(cli["out-dir"]):null});
    console.log(JSON.stringify(result));
  }catch(error){console.log(JSON.stringify({status:"FAILED",code:error?.code??"FSDS_MERGE_FAILED"}));process.exitCode=1;}
}
