import {z} from 'zod';

const connectorSchema=z.object({recipientId:z.string().uuid(),facilityId:z.string().min(1),url:z.string().url(),tokenEnv:z.string().regex(/^[A-Z][A-Z0-9_]+$/),approvalReference:z.string().min(10),region:z.literal('IN')}).strict();
export type ReferralConnector=z.infer<typeof connectorSchema>;
export function deliveryConnector(recipientId:string,facilityId:string,env:NodeJS.ProcessEnv=process.env):ReferralConnector|'local'|'internal'|null{
 if(env.REFERRAL_DELIVERY_MODE==='internal')return 'internal';
 if(env.REFERRAL_DELIVERY_MODE==='local')return env.DEPLOYMENT_MODE==='production'?null:'local';
 if(env.REFERRAL_DELIVERY_MODE!=='http')return null;
 const parsed=z.array(connectorSchema).safeParse((()=>{try{return JSON.parse(env.REFERRAL_CONNECTORS_JSON||'[]');}catch{return null;}})());
 if(!parsed.success)return null;
 const matches=parsed.data.filter(c=>c.recipientId===recipientId&&c.facilityId===facilityId);
 if(matches.length!==1)return null;
 const c=matches[0],url=new URL(c.url);
 if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search||!env[c.tokenEnv]||env.REFERRAL_EXTERNAL_SHARING_APPROVED!=='true')return null;
 return c;
}
export const receiptSchema=z.object({referralId:z.string().uuid(),payloadSha256:z.string().regex(/^[a-f0-9]{64}$/),receiptId:z.string().regex(/^[A-Za-z0-9._:-]{1,120}$/),status:z.literal('received')}).strict();
export const deliveryLabels:Record<string,string>={NOT_SENT:'Not sent',QUEUED:'Queued for delivery',PROCESSING:'Sending',RETRY_WAIT:'Delivery unconfirmed · retry pending',RECEIVED:'Received by configured software',LOCAL_RECEIVED:'Received by local prototype inbox',FAILED:'Delivery unconfirmed · administrator review required',CANCELLED:'Delivery cancelled'};
