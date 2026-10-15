import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { URL } from 'node:url';
import assert from 'node:assert/strict';
import { parse } from 'dotenv';

const files=execFileSync('git',['ls-files','--cached','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
assert.ok(files.length,'Stage the release files before verifying the Git index.');
const forbidden=/(^|\/)(\.env(?!\.example$)[^/]*|\.local|node_modules|dist|dist-server|test-results|playwright-report|coverage)(\/|$)|\.(pem|key|p12|pfx|dump|db|sqlite)(\.|$)|\.log$/i;
const patterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\bgh[pousr]_[A-Za-z0-9]{30,}\b/,/\bAKIA[A-Z0-9]{16}\b/,/\bsk-[A-Za-z0-9_-]{32,}\b/];
let databasePassword='';
if(existsSync('.env')){
  const env=parse(readFileSync('.env'));
  if(env.DATABASE_URL)databasePassword=decodeURIComponent(new URL(env.DATABASE_URL).password);
}
for(const file of files){
  assert.ok(!forbidden.test(file),'Sensitive/runtime path staged: '+file);
  if(/\.png$/i.test(file))continue;
  const text=execFileSync('git',['show',':'+file],{encoding:'utf8',maxBuffer:5*1024*1024});
  assert.ok(!patterns.some(pattern=>pattern.test(text)),'Potential credential in staged file: '+file);
  assert.ok(!databasePassword||databasePassword.length<12||!text.includes(databasePassword),'Local database password is staged: '+file);
}
for(const file of ['.env','.env.local','.local/postgres/PG_VERSION','node_modules/example','dist/index.html','dist-server/index.js','test-results/example.png','private.key','database.dump']){
  assert.equal(execFileSync('git',['check-ignore','--',file],{encoding:'utf8'}).trim(),file);
}
console.log(`Git index safety: PASS (${files.length} staged/tracked files; no local database password or matching credential patterns).`);
