import {NextResponse} from 'next/server';
import {isProductionDeployment} from '@/lib/runtime-config';
import {oidc,oidcConfig,redirectUri,sealOidcFlow} from '@/lib/oidc';
import {failure} from '@/lib/api';

export async function GET(){
 if(!isProductionDeployment)return failure('OIDC_DISABLED','OIDC sign-in is enabled only in production mode.',404);
 try{
  const config=await oidcConfig();
  const verifier=oidc.randomPKCECodeVerifier();
  const state=oidc.randomState();
  const nonce=oidc.randomNonce();
  const url=oidc.buildAuthorizationUrl(config,{redirect_uri:redirectUri(),scope:'openid profile email',code_challenge:await oidc.calculatePKCECodeChallenge(verifier),code_challenge_method:'S256',state,nonce});
  const response=NextResponse.redirect(url);
  response.cookies.set('sf_oidc_flow',await sealOidcFlow({verifier,state,nonce}),{httpOnly:true,secure:true,sameSite:'lax',path:'/api/auth/callback',maxAge:600});
  return response;
 }catch{return failure('AUTH_CONFIGURATION_ERROR','Secure sign-in is not configured.',503);}
}
