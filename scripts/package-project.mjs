import {createWriteStream,existsSync} from 'node:fs';
import {readdir,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import yazl from 'yazl';
const root=resolve('.'),output=join(root,`CWrite-Lite-local-${new Date().toISOString().slice(0,10)}-${Date.now()}.zip`);
const zip=new yazl.ZipFile(),stream=createWriteStream(output,{flags:'wx'});
zip.outputStream.pipe(stream);
const forbidden=/(^|\/)(node_modules|\.next[^/]*|\.tool-cache|\.local-postgres[^/]*|generated)(\/|$)|(^|\/)\.env(\.|$)/;
let count=0;
async function add(dir){for(const item of await readdir(join(root,dir),{withFileTypes:true})){const path=dir+'/'+item.name;if(forbidden.test(path)||item.isSymbolicLink())continue;if(item.isDirectory())await add(path);else{zip.addFile(join(root,path),'CWrite-Lite/'+path,{compress:! /\.(webp|png|jpg|mp3|mp4|woff2)$/i.test(path)});count++;}}}
for(const dir of ['app','components','hooks','lib','prisma','public','scripts','docs','worker'])await add(dir);
for(const file of ['.env.example','.gitignore','.dockerignore','README.md','package.json','package-lock.json','next-env.d.ts','next.config.mjs','postcss.config.mjs','tsconfig.json','vercel.json','CURSOR_FIX_PLAN.md','AUDIT.md']){if(!existsSync(join(root,file)))continue;zip.addFile(join(root,file),'CWrite-Lite/'+file);count++;}
zip.end();await new Promise((ok,fail)=>{stream.on('close',ok);stream.on('error',fail);zip.outputStream.on('error',fail);});
console.log(`Source archive: ${output}; ${count} files; ${((await stat(output)).size/1024/1024).toFixed(1)} MB. No keys, database, dependencies or generated videos included.`);
