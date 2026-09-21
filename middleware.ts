import {NextRequest,NextResponse} from 'next/server';

const unsafeMethods=new Set(['POST','PUT','PATCH','DELETE']);

export function middleware(request:NextRequest){
 if(process.env.DEPLOYMENT_MODE==='production'&&unsafeMethods.has(request.method)){
  const expected=process.env.APP_URL;
  const origin=request.headers.get('origin');
  if(!expected||!origin||origin!==new URL(expected).origin)return NextResponse.json({ok:false,error:{code:'ORIGIN_REJECTED',message:'Request origin was rejected.'}},{status:403});
 }
 const response=NextResponse.next();
 response.headers.set('X-Content-Type-Options','nosniff');
 response.headers.set('X-Frame-Options','DENY');
 response.headers.set('Referrer-Policy','no-referrer');
 response.headers.set('Permissions-Policy','camera=(self), microphone=(self), geolocation=()');
 response.headers.set('Cross-Origin-Opener-Policy','same-origin');
 response.headers.set('Cross-Origin-Resource-Policy','same-origin');
 if(process.env.DEPLOYMENT_MODE==='production'){
  response.headers.set('Content-Security-Policy',"default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'");
  response.headers.set('Strict-Transport-Security','max-age=63072000; includeSubDomains; preload');
 }
 return response;
}

export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
