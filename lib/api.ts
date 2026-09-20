import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
export function success<T>(data:T,status=200){return NextResponse.json({ok:true,data},{status});}
export function failure(code:string,message:string,status=400){return NextResponse.json({ok:false,error:{code,message}},{status});}
export function parseFailure(error:unknown){if(error instanceof ZodError)return failure('VALIDATION_FAILED',error.issues.map(i=>i.message).join('; '),422);if(process.env.NODE_ENV==='development')console.error(error);return failure('SAVE_FAILED','The action could not be saved. Please retry.',500);}
