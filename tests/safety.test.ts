import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PayloadTooLargeError,readBoundedText,jsonResponse} from '../lib/http';
import {POST} from '../app/api/jobs/route';
test('stream limits count bytes and reject chunked oversized payloads',async()=>{
 await assert.rejects(readBoundedText(new Response('é'.repeat(2100)).body,4096),PayloadTooLargeError);
 const stream=new ReadableStream<Uint8Array>({start(c){c.enqueue(new Uint8Array(3000));c.enqueue(new Uint8Array(3000));c.close();}});
 await assert.rejects(readBoundedText(stream,4096),PayloadTooLargeError);
 assert.equal(await readBoundedText(new Response('{"ok":true}').body,100),'{"ok":true}');
 assert.equal(jsonResponse({value:'x'.repeat(300000)}).status,502);
});
test('route blocks unsafe input and public Vercel access, bounds usage and hides errors',async()=>{
 const saved={...process.env};const oldFetch=globalThis.fetch;
 Object.assign(process.env,{NODE_ENV:'test',TINYFISH_API_KEY:'fixture-key'});delete process.env.VERCEL;delete process.env.JOBHUNT_ALLOW_PUBLIC_SEARCH;
 const valid={role:'Software Engineer',location:'London'};
 const req=(body:unknown=valid,headers:Record<string,string>={})=>new Request('https://jobhunt.example/api/jobs',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 try {
  process.env.VERCEL='1';assert.equal((await POST(req())).status,503);delete process.env.VERCEL;
  assert.equal((await POST(req(valid,{Origin:'https://other.example'}))).status,403);
  assert.equal((await POST(req(valid,{'Content-Type':'text/plain'}))).status,415);
  assert.equal((await POST(req({role:'x'.repeat(5000)}))).status,413);
  assert.equal((await POST(req({role:'',location:'London'}))).status,400);
  globalThis.fetch=async()=>{throw new Error('private upstream error and credential must never reach the browser');};
  const failed=await POST(req());assert.equal(failed.status,200);const text=await failed.text();assert.ok(!text.includes('private upstream'));assert.ok(!text.includes('credential must'));assert.ok(text.includes('Source request')||text.includes('network or response error'));
  globalThis.fetch=async()=>Response.json({results:[]});for(let i=0;i<3;i++)assert.equal((await POST(req())).status,200);
  const limited=await POST(req());assert.equal(limited.status,429);assert.equal(limited.headers.get('Retry-After'),'60');assert.equal(limited.headers.get('Cache-Control'),'no-store');
 }finally{globalThis.fetch=oldFetch;for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved);}
});
