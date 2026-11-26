// NY Fed SCE #31: isolated, explicit one-shot collector. Not wired to Core,
// scheduler, publication or Controller. The caller MUST supply a policy-guarded
// fetcher and an approved local output directory.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {parseSceYearAheadInflationRows,SCE_SHEET_NAME} from './inflation-sce-source.mjs';

export const SCE_OFFICIAL_FILE='https://www.newyorkfed.org/medialibrary/interactives/sce/sce/downloads/data/frbny-sce-data.xlsx';
const MAX_DOWNLOAD=8_000_000;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

async function boundedGet(fetcher, url, timeoutMs=30000) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try {
    let requested=new URL(url);
    for(let attempt=0;attempt<3;attempt++) {
      if(requested.protocol!=='https:'||requested.hostname!=='www.newyorkfed.org')
        throw Error('SCE_HOST_NOT_ALLOWED');
      const response=await fetcher(requested.toString(),{redirect:'manual',signal:controller.signal});
      if(response.status>=300&&response.status<400){
        const location=response.headers?.get?.('location');
        if(!location)throw Error('SCE_REDIRECT_INVALID');
        requested=new URL(location,requested);continue;
      }
      if(!response.ok)throw Error(`SCE_PROVIDER_HTTP_${response.status}`);
      if(!response.body?.getReader)throw Error('SCE_RESPONSE_NOT_STREAMED');
      const reader=response.body.getReader(),chunks=[];let size=0;
      for(;;){
        const {done,value}=await reader.read();if(done)break;
        size+=value.length;
        if(size>MAX_DOWNLOAD){await reader.cancel();throw Error('SCE_DOWNLOAD_TOO_LARGE');}
        chunks.push(value);
      }
      const bytes=Buffer.concat(chunks);
      if(bytes.length<64||bytes.subarray(0,4).toString('hex')!=='504b0304')
        throw Error('SCE_NOT_XLSX');
      return bytes;
    }
    throw Error('SCE_REDIRECT_CAP');
  } finally {clearTimeout(timer);}
}

export async function parseSceOfficialWorkbook(bytes,{readWorkbook}={}) {
  const reader=readWorkbook??(await import('../../lib/diagnostic-layer/xlsx-lite.mjs')).readXlsxWorkbook;
  const workbook=await reader(bytes);
  const rows=workbook?.sheets?.get?.(SCE_SHEET_NAME);
  if(!rows)throw Error('SCE_INFLATION_SHEET_MISSING');
  const parsed=parseSceYearAheadInflationRows(rows);
  if(parsed.observations.length<24)throw Error('SCE_HISTORY_INCOMPLETE');
  return {
    source:'NY_FED_SCE_ONE_YEAR_MEDIAN',sourceSheet:SCE_SHEET_NAME,
    unit:'percent',vintageMethod:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false,
    observations:parsed.observations,missing:parsed.missing,
    firstMonth:parsed.firstMonth,latestMonth:parsed.latestMonth,
    latestObservation:parsed.latestObservation,
  };
}

async function saveImmutable(directory,sha,bytes,parsed,fetchedAt) {
  await fs.mkdir(directory,{recursive:true});
  const rawFile=path.join(directory,`${sha}.xlsx`);
  const parsedFile=path.join(directory,`${sha}.json`);
  async function immutable(file,data) {
    try{await fs.writeFile(file,data,{flag:'wx'});}
    catch(error){
      if(error.code!=='EEXIST')throw error;
      const existing=await fs.readFile(file);
      if(hash(existing)!==hash(data))throw Error('SCE_ARCHIVE_COLLISION');
    }
    if(hash(await fs.readFile(file))!==hash(data))throw Error('SCE_ARCHIVE_READBACK');
  }
  // A byte-identical official vintage is immutable across repeated observations.
  // The new fetch timestamp belongs in the mutable latest pointer only.
  const document=Buffer.from(JSON.stringify({...parsed,downloadSha256:sha}));
  await immutable(rawFile,bytes);
  await immutable(parsedFile,document);
  const metadata={source:parsed.source,status:'STORED',downloadSha256:sha,
    fetchedAt,firstMonth:parsed.firstMonth,latestMonth:parsed.latestMonth,
    count:parsed.observations.length,historyMode:parsed.vintageMethod,
    attributionRequired:true,disclaimerRequired:true};
  const target=path.join(directory,'latest.json');
  const temp=`${target}.next-${randomUUID()}`;
  await fs.writeFile(temp,JSON.stringify(metadata),{flag:'wx'});
  await fs.rename(temp,target);
  const readback=JSON.parse(await fs.readFile(target,'utf8'));
  if(readback.downloadSha256!==sha||readback.count!==parsed.observations.length)
    throw Error('SCE_CHECKPOINT_READBACK');
  return metadata;
}

export async function collectSceOneYear({directory,fetcher,now=()=>new Date(),readWorkbook}={}) {
  if(typeof directory!=='string'||!path.isAbsolute(directory)||typeof fetcher!=='function')
    throw Error('SCE_APPROVED_DIRECTORY_AND_QUOTA_FETCH_REQUIRED');
  const bytes=await boundedGet(fetcher,SCE_OFFICIAL_FILE);
  const parsed=await parseSceOfficialWorkbook(bytes,{readWorkbook});
  const fetchedAt=now().toISOString();
  return saveImmutable(directory,hash(bytes),bytes,parsed,fetchedAt);
}
