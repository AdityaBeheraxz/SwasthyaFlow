import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
const privateHeaders={'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Robots-Tag':'noindex, nofollow, noarchive'};
export function success<T>(data:T,status=200){return NextResponse.json({ok:true,data},{status,headers:privateHeaders});}
export function failure(code:string,message:string,status=400){return NextResponse.json({ok:false,error:{code,message}},{status,headers:privateHeaders});}
export function parseFailure(error:unknown){if(error instanceof ZodError)return failure('VALIDATION_FAILED','Check the submitted fields and retry.',422);return failure('SAVE_FAILED','The action could not be saved. Please retry.',500);}
