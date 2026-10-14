export class PayloadTooLargeError extends Error {}
export async function readBoundedText(body:ReadableStream<Uint8Array>|null,maxBytes:number):Promise<string>{
 if(!body)return '';
 const reader=body.getReader();const chunks:Uint8Array[]=[];let bytes=0;
 try {while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>maxBytes){await reader.cancel();throw new PayloadTooLargeError('Payload exceeds the allowed size');}chunks.push(value);}}
 finally{reader.releaseLock();}
 const joined=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.byteLength;}return new TextDecoder('utf-8',{fatal:true}).decode(joined);
}
export function jsonResponse(data:unknown,status=200,headers:Record<string,string>={}){
 const body=JSON.stringify(data);if(new TextEncoder().encode(body).byteLength>256*1024)return Response.json({error:'Search response exceeded the allowed size. Try a narrower search.'},{status:502,headers:{'Cache-Control':'no-store'}});
 return new Response(body,{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});
}
