import {NextResponse} from 'next/server';
import {appUrl} from '@/lib/runtime-config';
export async function POST(){const response=NextResponse.redirect(appUrl(),303);response.cookies.delete('sf_session');return response;}
