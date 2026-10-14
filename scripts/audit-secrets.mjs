import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, mkdtempSync, copyFileSync, rmSync } from 'node:fs';
import { join, relative,resolve,dirname,basename } from 'node:path';
import { tmpdir } from 'node:os';
const root=process.cwd();
const git=(args, cwd=root)=>{try{return execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:32*1024*1024});}catch{throw new Error('Git audit operation failed; inspect repository state without printing secret content.');}};
const known=[];
for(const name of readdirSync(root).filter(n=>/^\.env/.test(n)&&n!=='.env.example')){
 for(const line of readFileSync(join(root,name),'utf8').split(/\r?\n/)){
  const m=line.match(/^\s*(?:export\s+)?[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)[A-Z0-9_]*\s*=\s*(.*?)\s*$/i);
  if(m){const value=m[1].replace(/^(['"])(.*)\1$/,'$2');if(value.length>=12)known.push(value);}
 }
}
const generic=/(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bAKIA[A-Z0-9]{16}\b|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b|\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b)/;
const sensitive=p=>p!=='.env.example'&&/(?:^|\/)(?:\.env[^/]*|test-results|private|secrets|credentials|\.aws|\.vercel|\.qodo)(?:\/|$)|\.(?:pem|key|p12|pfx|log)$|trace[^/]*\.(?:jsonl?|ndjson|har|zip)$/i.test(p);
const issues=[];let committedSecret=false;let checked=0;
function inspect(path,content,where){checked++;if(known.some(k=>content.includes(k))||generic.test(content)){issues.push(`${where}: potential credential in ${path} (value redacted)`);if(where==='history')committedSecret=true;}}
let repository=false;
try {repository=git(['rev-parse','--show-toplevel']).trim().toLowerCase()===root.toLowerCase();}catch{}
const temporary=mkdtempSync(join(tmpdir(),'jobhunt-ignore-audit-'));
try {
 git(['init','--quiet'],temporary);copyFileSync(join(root,'.gitignore'),join(temporary,'.gitignore'));
 const ignored=p=>{try{git(['check-ignore','--no-index','--quiet','--',p],temporary);return true;}catch{return false;}};
 for(const p of ['.env','.env.local','.env.production','.env.backup','test-results/trace.json','private/data.json','credentials/key.json','secrets/key.json','.vercel/project.json','.qodo/context.json','server.key','private.pem','raw-trace.json','preview.png','live-preview.png'])if(!ignored(p))issues.push(`ignore rules: ${p} is not excluded`);
 if(ignored('.env.example'))issues.push('ignore rules: .env.example should remain publishable');
 copyFileSync(join(root,'.vercelignore'),join(temporary,'.gitignore'));
 for(const p of ['.env','.env.local','test-results/private.json','.git/config','.qodo/context.json','private/key.json','credentials/key.json','secrets/key.json','network.har','storage-state.json','server.key','raw-trace.json','live-preview.png'])if(!ignored(p))issues.push(`Vercel upload rules: ${p} is not excluded`);
 copyFileSync(join(root,'.gitignore'),join(temporary,'.gitignore'));
 function walk(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const abs=join(dir,item.name);const path=relative(root,abs).replaceAll('\\','/');if(item.isSymbolicLink()){issues.push(`working tree: symlink requires manual review: ${path}`);continue;}if(item.name==='.git'||ignored(path+(item.isDirectory()?'/':'')))continue;if(item.isDirectory())walk(abs);else if(statSync(abs).size<=8*1024*1024)inspect(path,readFileSync(abs).toString('utf8'),'working tree');else issues.push(`working tree: oversized file requires manual review: ${path}`);}}
 walk(root);
 if(existsSync(join(root,'.next/static'))){
  let browserFiles=0;
  function checkBrowser(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const p=join(dir,item.name);if(item.isDirectory())checkBrowser(p);else{browserFiles++;const content=readFileSync(p).toString('utf8');if(known.some(k=>content.includes(k)))issues.push(`browser bundle: local credential found in ${relative(root,p)} (value redacted)`);}}}
  checkBrowser(join(root,'.next/static'));console.log(`Browser assets: ${browserFiles} files checked for configured credential values.`);
 }
 if(repository){
  const tracked=git(['ls-files','-z']).split('\0').filter(Boolean);
  const staged=git(['diff','--cached','--name-only','--diff-filter=ACMR','-z']).split('\0').filter(Boolean);
  for(const p of tracked)if(sensitive(p)||ignored(p))issues.push(`tracked: excluded/private file ${p}`);
  for(const p of staged){if(sensitive(p)||ignored(p))issues.push(`staged: excluded/private file ${p}`);inspect(p,git(['show',`:${p}`]),'staged');}
  const objects=git(['rev-list','--objects','--all']).trim().split('\n').filter(Boolean);
  for(const row of objects){const [id,...parts]=row.split(' ');const path=parts.join(' ');if(!path||git(['cat-file','-t',id]).trim()!=='blob')continue;if(Number(git(['cat-file','-s',id]))>8*1024*1024){issues.push(`history: oversized blob requires manual review: ${path}`);continue;}inspect(path,git(['cat-file','blob',id]),'history');if(sensitive(path))issues.push(`history: private file requires review: ${path}`);}
  console.log(`Git: ${tracked.length} tracked files, ${staged.length} staged additions/modifications; reachable history scanned.`);
 }else console.log('Git: no repository at this workspace root; no local tracking, index or history exists. External repositories were not audited.');
 console.log(`Audit: ${checked} file/blob checks; ${known.length} local credential values compared without printing them.`);
 for(const issue of issues)console.error(issue);
 if(committedSecret){console.error('STOP: a potential secret exists in committed history. Do not publish. Rotate/revoke the credential with the owner before history remediation.');process.exitCode=2;}
 else if(issues.length)process.exitCode=1;
 else console.log('PASS: publishable files contain no detected credentials; private-path ignore checks passed. Heuristic scanning cannot prove absence of every possible secret.');
}finally{if(dirname(resolve(temporary))!==resolve(tmpdir())||!basename(temporary).startsWith('jobhunt-ignore-audit-'))throw new Error('Unsafe temporary audit cleanup path');rmSync(temporary,{recursive:true,force:true});}
