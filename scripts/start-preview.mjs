import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync,spawn} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);
try{const response=await fetch('http://127.0.0.1:3010/api/local-setup',{signal:AbortSignal.timeout(1200)});const state=await response.json();if(state.application==='cwrite-local-setup'&&state.preview){console.log('Local preview is already running: http://127.0.0.1:3010 — Tony / 123321');process.exit(0);}}catch{}
if(process.platform!=='win32')throw new Error('This preview launcher expects Windows with PostgreSQL installed.');
const pg=process.env.CWRITE_POSTGRES_BIN||'C:/Program Files/PostgreSQL/17/bin',db=join(root,'.tool-cache/video-test-db');
if(!existsSync(join(pg,'pg_ctl.exe')))throw new Error('PostgreSQL 17 was not found. Set CWRITE_POSTGRES_BIN to its bin folder.');
function run(file,args){const result=spawnSync(file,args,{stdio:'inherit',windowsHide:true});if(result.error)throw result.error;if(result.status!==0)throw new Error('A local setup step failed. See the output above.');}
function npm(command){run(process.env.ComSpec||'cmd.exe',['/d','/s','/c',command]);}
const envPath=join(root,'.env.local');let text=existsSync(envPath)?readFileSync(envPath,'utf8'):'';
const database='postgresql://cwrite_test@127.0.0.1:54348/postgres';
const existing=text.match(/^DATABASE_URL=(.+)$/m)?.[1].trim().replace(/^['"]|['"]$/g,'');
if(existing&&existing!==database)throw new Error('Existing database configuration found; leaving it untouched. Use a separate copy for local preview.');
if(!existsSync('node_modules/next'))npm('npm ci --legacy-peer-deps');
if(!existsSync(join(db,'PG_VERSION'))){mkdirSync(dirname(db),{recursive:true});run(join(pg,'initdb.exe'),['-D',db,'-U','cwrite_test','--auth=trust','--encoding=UTF8','--locale=C']);}
const status=spawnSync(join(pg,'pg_ctl.exe'),['-D',db,'status'],{stdio:'ignore',windowsHide:true});
if(status.status!==0)run(join(pg,'pg_ctl.exe'),['-D',db,'-l',join(db,'server.log'),'-o','-p 54348 -h 127.0.0.1','-w','start']);
text=text.replace(/^(DATABASE_URL|CWRITE_LOCAL_PREVIEW|CWRITE_LOCAL_MOCK_IMAGES)=.*\r?\n?/gm,'');
writeFileSync(envPath,text+`\nDATABASE_URL=${database}\nCWRITE_LOCAL_PREVIEW=true\nCWRITE_LOCAL_MOCK_IMAGES=true\n`,{mode:0o600});
process.env.DATABASE_URL=database;process.env.CWRITE_LOCAL_PREVIEW='true';process.env.CWRITE_LOCAL_MOCK_IMAGES='true';
// Existing Windows dev processes can lock Prisma's DLL; generation only runs before starting a new server.
npm('npx prisma generate');npm('npx prisma migrate deploy');run(process.execPath,['scripts/seed-local-preview.mjs']);
console.log('Local preview: http://127.0.0.1:3010 — Tony / 123321 — no paid AI calls');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','-p','3010','-H','127.0.0.1'],{stdio:'inherit',windowsHide:true});
child.on('exit',code=>{process.exitCode=code||0;});
