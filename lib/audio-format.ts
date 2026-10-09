export function webmMimeType(type:string){const base=type.split(';',1)[0].trim().toLowerCase();return ['audio/webm','video/webm'].includes(base)?base:null;}
export function recordingMimeType(){return ['audio/webm;codecs=opus','audio/webm','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));}
