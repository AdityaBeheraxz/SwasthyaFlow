import {success} from '@/lib/api';
import {session} from '@/lib/auth';
export async function GET(){return success(await session());}
