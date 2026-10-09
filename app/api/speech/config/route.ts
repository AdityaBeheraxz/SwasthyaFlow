import {session} from '@/lib/auth';
import {success,failure} from '@/lib/api';
import {localSpeechReady} from '@/lib/speech/local';
import {uploadLimits} from '@/lib/upload-limits';
export async function GET(){
 if(!await session())return failure('UNAUTHORIZED','Staff sign-in required.',401);
 const mode=process.env.ASR_MODE||(process.env.AI_MODE==='enterprise'?'enterprise':process.env.AI_MODE==='live'?'live':'unavailable');
 const configured=mode==='local'?await localSpeechReady():['live','enterprise'].includes(mode)&&!!process.env.SPEECH_TO_TEXT_API_URL&&!!process.env.SPEECH_TO_TEXT_MODEL&&!!process.env.SPEECH_TO_TEXT_API_KEY;
 return success({mode,configured,fixture:mode==='fixture',maxBytes:uploadLimits().audioBytes,languages:mode==='local'?['en','hi']:['en','hi','or']});
}
