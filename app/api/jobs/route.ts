import { searchSchema } from '@/lib/types';
import { searchJobs } from '@/lib/pipeline';
import {jsonResponse,PayloadTooLargeError,readBoundedText} from '@/lib/http';
export const runtime='nodejs';
export const maxDuration=150;
let active=0;const recent:number[]=[];
export async function POST(req:Request){
 if(process.env.VERCEL&&process.env.JOBHUNT_ALLOW_PUBLIC_SEARCH!=='true')return jsonResponse({error:'Search is temporarily unavailable.'},503);
 if(!process.env.TINYFISH_API_KEY)return jsonResponse({error:process.env.NODE_ENV==='production'?'Search is temporarily unavailable.':'TinyFish is not configured. Add TINYFISH_API_KEY to .env.local and restart the server.'},503);
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return jsonResponse({error:'Cross-site search requests are not allowed.'},403);
 if(req.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return jsonResponse({error:'Expected application/json.'},415);
 if(Number(req.headers.get('content-length')||0)>4096)return jsonResponse({error:'Request too large'},413);
 let input;try{input=searchSchema.safeParse(JSON.parse(await readBoundedText(req.body,4096)));}catch(error){return jsonResponse({error:error instanceof PayloadTooLargeError?'Request too large':'Invalid JSON'},error instanceof PayloadTooLargeError?413:400);}
 if(!input.success)return jsonResponse({error:'Check your search fields.'},400);
 const now=Date.now();while(recent.length&&recent[0]<now-60000)recent.shift();if(active>=2||recent.length>=4)return jsonResponse({error:'Search capacity reached. Please wait a minute.'},429,{'Retry-After':'60'});
 recent.push(now);active++;try{return jsonResponse(await searchJobs(input.data));}catch{return jsonResponse({error:'Search could not complete. Please retry later.'},502);}finally{active--;}
}
