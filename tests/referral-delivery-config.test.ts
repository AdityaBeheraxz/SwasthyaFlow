import {describe,it,expect} from 'vitest';
import {deliveryConnector,receiptSchema} from '../lib/referral-delivery-config';
describe('referral receiving configuration',()=>{
 it('never enables local pitch routing in production',()=>{expect(deliveryConnector(crypto.randomUUID(),'F-001',{NODE_ENV:'test',DEPLOYMENT_MODE:'production',REFERRAL_DELIVERY_MODE:'local'})).toBeNull();});
 it('binds HTTPS receiver approval and credentials to exactly one recipient and source facility',()=>{
  const id=crypto.randomUUID(),connector={recipientId:id,facilityId:'F-001',url:'https://receiver.example/referrals',tokenEnv:'TEST_TOKEN',region:'IN',approvalReference:'Approved test only'},env={NODE_ENV:'test' as const,REFERRAL_DELIVERY_MODE:'http',REFERRAL_EXTERNAL_SHARING_APPROVED:'true',TEST_TOKEN:'test-only',REFERRAL_CONNECTORS_JSON:JSON.stringify([connector])};
  expect(deliveryConnector(id,'F-001',env)).toEqual(connector);expect(deliveryConnector(id,'other',env)).toBeNull();expect(deliveryConnector(id,'F-001',{...env,REFERRAL_CONNECTORS_JSON:JSON.stringify([connector,connector])})).toBeNull();expect(deliveryConnector(id,'F-001',{...env,REFERRAL_EXTERNAL_SHARING_APPROVED:'false'})).toBeNull();expect(deliveryConnector(id,'F-001',{...env,REFERRAL_CONNECTORS_JSON:JSON.stringify([{...connector,url:'http://localhost/referrals'}])})).toBeNull();
 });
 it('requires an explicit receipt binding the referral and payload digest',()=>{expect(receiptSchema.safeParse({referralId:crypto.randomUUID(),payloadSha256:'a'.repeat(64),receiptId:'receipt-1',status:'received'}).success).toBe(true);expect(receiptSchema.safeParse({status:'sent'}).success).toBe(false);});
});

