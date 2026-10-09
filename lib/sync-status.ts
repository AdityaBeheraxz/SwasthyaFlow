export type SyncedIntake={draftId:string;encounterId:string;verificationRequired:boolean};
export function syncErrorMessage(code:string){
 if(/UNAUTHORIZED|FORBIDDEN|OFFLINE_AUTHORIZATION/.test(code))return 'Sign in as the Health Worker, Nurse or Medical Officer who saved this draft, then retry.';
 if(/OCR_REVIEW_REQUIRED/.test(code))return 'The sources were saved, but the documents need verification before processing.';
 if(/KEY|LEGACY/.test(code))return 'This device cannot unlock the saved draft. Ask your administrator for help; the draft has not been deleted.';
 return 'Sync could not finish. Check your connection and retry. Your encrypted draft is retained on this device.';
}
