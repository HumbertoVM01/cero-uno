import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const root=new URL('../public/js/game/',import.meta.url).pathname;
for(const name of await readdir(root)){
  if(!name.endsWith('.js'))continue;
  const p=join(root,name);const r=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});
  if(r.status!==0){console.error(r.stdout,r.stderr);process.exit(r.status||1)}
  console.log('PASS',name);
}
