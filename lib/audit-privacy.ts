export function administrativeMetadata(metadata:Record<string,unknown>){
 const allowed=new Set(['role','priority','previous_priority','new_priority','from','state','previous_state','input_type','provider','consent','authority','purpose','policy_version','status','rule_version','notice_configured','retention_days','referralId','recipientId','consentAuthority','consentVersion','includeName','deliveryStatus','active']);
 return Object.fromEntries(Object.entries(metadata).filter(([key,value])=>allowed.has(key)&&(typeof value==='boolean'||typeof value==='number'||typeof value==='string'&&/^[a-zA-Z0-9_.:-]{1,80}$/.test(value))));
}
