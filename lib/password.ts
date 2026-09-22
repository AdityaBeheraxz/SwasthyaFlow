import {promisify} from 'node:util';
import {randomBytes,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';

const scrypt=promisify(scryptCallback);
const keyLength=64;

export async function hashPassword(password:string){
 const salt=randomBytes(16).toString('hex');
 const derived=await scrypt(password,salt,keyLength) as Buffer;
 return `scrypt:${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password:string,stored:string){
 const [algorithm,salt,hex]=stored.split(':');
 if(algorithm!=='scrypt'||!salt||!hex)return false;
 const expected=Buffer.from(hex,'hex');
 if(expected.length!==keyLength)return false;
 const derived=await scrypt(password,salt,keyLength) as Buffer;
 return timingSafeEqual(derived,expected);
}

export async function spendPasswordCheck(password:string){
 await scrypt(password,'00000000000000000000000000000000',keyLength);
}
