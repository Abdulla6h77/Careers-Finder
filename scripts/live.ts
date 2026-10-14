import { loadEnvConfig } from '@next/env';
import { mkdirSync,writeFileSync } from 'node:fs';
import { searchJobs,type Transport } from '../lib/pipeline';
import { request } from '../lib/tinyfish';
import { searchSchema } from '../lib/types';
loadEnvConfig(process.cwd());
if(!process.env.TINYFISH_API_KEY){console.error('BLOCKED: Add TINYFISH_API_KEY to .env.local before live verification.');process.exit(1);}
const cases=[{role:'Software Engineer',location:'Karachi',seniority:'junior'},{role:'Data Analyst',location:'remote',kind:'internship'},{role:'Product Engineer',location:'London',seniority:'mid'},{role:'Zzxqv Underwater Basket Weaver',location:'Karachi'},{role:'Software Engineer',location:'London'}];
mkdirSync('test-results',{recursive:true});
async function main(){
let failures=0;
let totalMatches=0;
for(const [i,input] of cases.entries()) {
 if(process.argv[2]&&Number(process.argv[2])!==i+1)continue;
 const started=Date.now();console.log(`Starting live case ${i+1}: ${input.role} / ${input.location}`);
 const trace:unknown[]=[];
 const transport:Transport=async(url,body,timeout)=>{const stage=url.includes('api.search.')?'search':url.includes('api.fetch.')?'fetch':'agent';console.log(`Case ${i+1}: ${stage} request`);try{const response=await request(url,body,timeout);trace.push({url,body,response});writeFileSync(`test-results/trace-${i+1}.json`,JSON.stringify(trace,null,2));console.log(`Case ${i+1}: ${stage} response received`);return response;}catch(error){trace.push({url,body,error:error instanceof Error?error.message:'Request failed'});writeFileSync(`test-results/trace-${i+1}.json`,JSON.stringify(trace,null,2));throw error;}};
 const result=await searchJobs(searchSchema.parse(input),transport);
 writeFileSync(`test-results/live-${i+1}.json`,JSON.stringify({input,durationMs:Date.now()-started,...result},null,2));
 writeFileSync(`test-results/trace-${i+1}.json`,JSON.stringify(trace,null,2));
 console.log(JSON.stringify({input,matches:result.jobs.length,diagnostics:result.diagnostics}));
 totalMatches+=result.jobs.length;
 if(result.diagnostics.filter(d=>d.stage==='search').every(d=>d.status==='failed'))failures++;
 if(i===3&&result.jobs.length)failures++;
}
console.log('Evidence saved to test-results/. Inspect actual listings, endpoints, Agent run IDs and apply links before recording the demo.');
if(failures||(!totalMatches&&process.argv[2]!=='4')){console.error('Live acceptance incomplete: failed discovery or no positive matches. See evidence.');process.exitCode=1;}
}
void main().catch(()=>{console.error('Live verification failed; inspect configuration and source diagnostics.');process.exitCode=1;});
