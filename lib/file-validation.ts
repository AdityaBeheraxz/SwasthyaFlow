export function matchesDeclaredType(bytes:Uint8Array,type:string){
 if(type==='image/png')return bytes.length>8&&[137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value);
 if(type==='image/jpeg')return bytes.length>3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[bytes.length-2]===0xff&&bytes[bytes.length-1]===0xd9;
 if(type==='application/pdf')return bytes.length>5&&new TextDecoder().decode(bytes.slice(0,5))==='%PDF-';
 if(type==='audio/webm'||type==='video/webm')return bytes.length>4&&bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3;
 return false;
}
