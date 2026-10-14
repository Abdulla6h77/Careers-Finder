import { PayloadTooLargeError,readBoundedText } from './http';
export const endpoints={search:'https://api.search.tinyfish.ai',fetch:'https://api.fetch.tinyfish.ai',agent:'https://agent.tinyfish.ai/v1/automation/run'};
export class TinyFishError extends Error {constructor(public status:number,message:string){super(message);}}
export async function request(url:string,body?:unknown,timeout=45000):Promise<unknown>{
 const key=process.env.TINYFISH_API_KEY;if(!key)throw new TinyFishError(503,'Add TINYFISH_API_KEY to .env.local and restart the server.');
 try{const r=await fetch(url,{method:body?'POST':'GET',headers:{'X-API-Key':key,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(timeout),cache:'no-store',redirect:'error'});
 if(!r.ok)throw new TinyFishError(r.status, r.status===429?'TinyFish rate limit reached. Wait before retrying.':r.status===401?'TinyFish API key was rejected.':r.status===402?'TinyFish allowance or wallet balance exhausted.':`TinyFish returned HTTP ${r.status}.`);
 return JSON.parse(await readBoundedText(r.body,2*1024*1024));}catch(e){if(e instanceof TinyFishError)throw e;throw new TinyFishError(502,e instanceof PayloadTooLargeError?'TinyFish response exceeded the size limit.':e instanceof Error&&/timeout|abort/i.test(e.name)?'TinyFish request timed out.':'TinyFish network or response error.');}
}
