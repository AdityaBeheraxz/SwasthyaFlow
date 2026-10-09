const sourceRoles=new Set(['health_worker','nurse','medical_officer']);
const lockedStates=new Set(['COMPLETED','APPROVED','ESCALATED','REFERRAL_GENERATED','PROCESSING']);
export function reportEditingRestriction(role:string,state:string):string|undefined{
 if(!sourceRoles.has(role))return 'An assigned Health Worker, Nurse or Medical Officer is required to extract this document.';
 if(lockedStates.has(state))return 'Document changes are locked while this case is processing, approved, escalated, referred or completed.';
 return undefined;
}
