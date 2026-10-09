import {NextRequest,NextResponse} from 'next/server';
import {hostedDemoConfigIssues} from './lib/runtime-config';

const unsafeMethods=new Set(['POST','PUT','PATCH','DELETE']);

export function middleware(request:NextRequest){
 if(request.nextUrl.pathname.startsWith('/api/')&&hostedDemoConfigIssues().length)return NextResponse.json({ok:false,error:{code:'DEPLOYMENT_NOT_READY',message:'Hosted deployment configuration is incomplete.'}},{status:503,headers:{'Cache-Control':'no-store'}});
 if(['production','demo'].includes(process.env.DEPLOYMENT_MODE??'')&&unsafeMethods.has(request.method)){
  const expected=process.env.APP_URL;
  const origin=request.headers.get('origin');
  if(!expected||!origin||origin!==new URL(expected).origin)return NextResponse.json({ok:false,error:{code:'ORIGIN_REJECTED',message:'Request origin was rejected.'}},{status:403});
 }
 const response=NextResponse.next();
 response.headers.set('Cache-Control','private, no-store, max-age=0');
 response.headers.set('Pragma','no-cache');
 response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
 response.headers.set('X-Content-Type-Options','nosniff');
 response.headers.set('X-Frame-Options','DENY');
 response.headers.set('Referrer-Policy','no-referrer');
 response.headers.set('Permissions-Policy','camera=(self), microphone=(self), geolocation=(), display-capture=(), web-share=(), clipboard-write=()');
 response.headers.set('Cross-Origin-Opener-Policy','same-origin');
 response.headers.set('Cross-Origin-Resource-Policy','same-origin');
 if(['production','demo'].includes(process.env.DEPLOYMENT_MODE??'')){
  response.headers.set('Content-Security-Policy',"default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'");
  response.headers.set('Strict-Transport-Security','max-age=63072000; includeSubDomains; preload');
 }
 return response;
}

export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
