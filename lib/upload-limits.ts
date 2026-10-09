export const hostedUploadLimit=3_500_000;
export function uploadLimits(env:NodeJS.ProcessEnv=process.env){
 return env.VERCEL==='1'||env.DEPLOYMENT_MODE==='demo'?{reportBytes:hostedUploadLimit,audioBytes:hostedUploadLimit}:{reportBytes:8_000_000,audioBytes:10_000_000};
}
