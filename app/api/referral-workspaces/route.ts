import {session} from '@/lib/auth';
import {db} from '@/lib/db/server';
import {facilities} from '@/db/schema';
import {failure,success} from '@/lib/api';
export async function GET(){const actor=await session();if(!actor?.facilityId||!['administrator','medical_officer'].includes(actor.role))return failure('FORBIDDEN','Doctor or administrator required.',403);return success(await (await db()).select({id:facilities.id,name:facilities.name,location:facilities.location}).from(facilities));}
