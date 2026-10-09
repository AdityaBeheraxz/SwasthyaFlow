export type PrescriptionItem={sourceText:string;medicine:string|null;strength:string|null;frequency:string|null;duration:string|null;state:'CANDIDATE'|'HUMAN_VERIFIED'|'UNCLEAR'};
// Parse only explicitly labelled medication lines. Never complete an unreadable
// name, dose or schedule, and never expand abbreviations into treatment advice.
export function extractPrescriptionData(text:string,verified:boolean){
 const items:PrescriptionItem[]=text.split(/\r?\n/).filter(line=>/^\s*(?:tab(?:let)?|cap(?:sule)?|syrup|inj(?:ection)?|medicine|medication)\b[.:]?/i.test(line)).map(sourceText=>{
  const match=sourceText.match(/^\s*(?:tab(?:let)?|cap(?:sule)?|syrup|inj(?:ection)?|medicine|medication)\b[.:]?\s+([\p{L}][\p{L}\p{N} /-]*?)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|IU|%))(?![\p{L}])/iu);
  const frequency=sourceText.match(/\b(?:OD|BD|BID|TDS|TID|QID|HS|SOS|\d-\d-\d|once daily|twice daily)\b/i)?.[0]??null;
  const duration=sourceText.match(/\b\d+\s*(?:days?|weeks?)\b/i)?.[0]??null;
  return {sourceText,medicine:match?.[1].trim()??null,strength:match?.[2]??null,frequency,duration,state:match?(verified?'HUMAN_VERIFIED':'CANDIDATE'):'UNCLEAR'};
 });
 return {documentType:'prescription',reviewStatus:verified?'HUMAN_VERIFIED':'REQUIRES_HUMAN_VERIFICATION',prescriptionItems:items,warnings:items.some(item=>item.state==='UNCLEAR')?['A medicine name or strength is unclear. Verify the original; no missing value has been guessed.']:[],fields:[]};
}
