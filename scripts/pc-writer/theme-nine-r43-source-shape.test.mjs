import test from 'node:test';
import assert from 'node:assert/strict';
import {redactSourceStructure,buildReport,APPROVED_FILES} from './theme-nine-r43-source-shape.mjs';

test('literal values, comments, environment keys and credential identifiers are not exposed',()=>{
  const raw=`// PRIVATE_INLINE_COMMENT\nconst API_KEY = "SECRET_LITERAL_VALUE";\nconst url = 'https://private.example/path?key=ABC';\nconst number = 123456789;\nconst template = \`secret-\${process.env.HIDDEN_NAME}\`;\nconst pattern = /PRIVATE_REGEX_LITERAL/g;\nfunction readThing(symbol){ return process.env.SECRET_ENV + number; }`;
  const safe=redactSourceStructure(raw);
  for(const token of ['PRIVATE_INLINE_COMMENT','SECRET_LITERAL_VALUE','private.example','123456789','HIDDEN_NAME','secret-','PRIVATE_REGEX_LITERAL','SECRET_ENV','API_KEY']){
    assert.equal(safe.includes(token),false,token);
  }
  assert.match(safe,/function readThing\(symbol\)/);
  assert.match(safe,/L000/);
});

test('source bytes and SHA identity must match audited PC sources',()=>{
  const fakeRoot='/offline';
  const records=APPROVED_FILES.map(item=>({...item}));
  assert.throws(()=>buildReport({files:records,root:fakeRoot,realpath:p=>p,lstat:()=>({isFile:()=>true,isSymbolicLink:()=>false,size:records[0].bytes}),readFile:()=>Buffer.from('malformed')}),/R43_SOURCE_SHA|R43_SOURCE_SIZE/);
  assert.throws(()=>buildReport({files:[{name:'other.mjs',sha256:'x'}],root:fakeRoot,realpath:p=>p}),/R43_SOURCE_IDENTITY/);
});
