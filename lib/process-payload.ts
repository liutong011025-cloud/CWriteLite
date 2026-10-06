/** Keep research uploads bounded without altering the application's original media or text. */
export function compactProcessPayload(payload: Record<string, unknown>, limit=550000) {
  const size=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)).length;
  const originalBytes=size(payload);
  if(originalBytes<=limit)return payload;
  const omissions:{field:string;bytes:number;reason:string}[]=[];
  const compact=(value:unknown,path:string):unknown=>{
    if(typeof value==='string'&&/^data:image\//i.test(value)&&value.length>2048){omissions.push({field:path,bytes:new TextEncoder().encode(value).length,reason:'large_image_kept_in_work'});return '[Large image omitted from behavior upload; original work is unchanged.]';}
    if(Array.isArray(value))return value.map((v,i)=>compact(v,`${path}[${i}]`));
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,compact(v,path?path+'.'+k:k)]));
    return value;
  };
  const reduced=compact(payload,'') as Record<string,unknown>;
  if(size(reduced)<=limit)return {...reduced,payloadOmissions:omissions,originalPayloadBytes:originalBytes};
  // Abnormally large provider responses must not block the queue. Keep the primary student text.
  const retained=Object.fromEntries(Object.entries(reduced).filter(([key])=>['beforeText','afterText','field','targetId','requestId','episodeId','segmentIndex','contentSource','status','endReason','insertedChars','deletedChars','precedingGapMs'].includes(key)));
  return {...retained,payloadSummarized:true,originalPayloadBytes:originalBytes,payloadOmissions:omissions,originalPayloadFields:Object.keys(payload)};
}
