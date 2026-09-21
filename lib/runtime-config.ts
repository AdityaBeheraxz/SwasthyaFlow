import {z} from 'zod';

export const deploymentMode=process.env.DEPLOYMENT_MODE==='production'?'production':'demo';
export const isProductionDeployment=deploymentMode==='production';

const httpsUrl=z.string().url().refine(value=>value.startsWith('https://'),'must use HTTPS');

export function productionConfigIssues(env:NodeJS.ProcessEnv=process.env):string[]{
 if((env.DEPLOYMENT_MODE??'demo')!=='production')return [];
 const issues:string[]=[];
 if(!env.DATABASE_URL)issues.push('DATABASE_URL');
 if(env.DATABASE_SSL_MODE!=='verify-full')issues.push('DATABASE_SSL_MODE');
 if(!env.AUTH_SECRET||env.AUTH_SECRET.length<32)issues.push('AUTH_SECRET');
 if(env.AI_MODE!=='enterprise')issues.push('AI_MODE');
 if(!env.EXTRACTION_API_URL||!httpsUrl.safeParse(env.EXTRACTION_API_URL).success)issues.push('EXTRACTION_API_URL');
 if(!env.EXTRACTION_API_KEY)issues.push('EXTRACTION_API_KEY');
 if(env.EXTRACTION_DPA_APPROVED!=='true')issues.push('EXTRACTION_DPA_APPROVED');
 if(!env.SPEECH_TO_TEXT_API_KEY)issues.push('SPEECH_TO_TEXT_API_KEY');
 if(env.OPENAI_DATA_CONTROLS_APPROVED!=='true')issues.push('OPENAI_DATA_CONTROLS_APPROVED');
 if(!env.TRANSLATION_API_URL||!httpsUrl.safeParse(env.TRANSLATION_API_URL).success)issues.push('TRANSLATION_API_URL');
 if(!env.TRANSLATION_API_KEY)issues.push('TRANSLATION_API_KEY');
 if(env.TRANSLATION_DPA_APPROVED!=='true')issues.push('TRANSLATION_DPA_APPROVED');
 if(!env.APP_URL||!httpsUrl.safeParse(env.APP_URL).success)issues.push('APP_URL');
 if(!env.OIDC_ISSUER||!httpsUrl.safeParse(env.OIDC_ISSUER).success)issues.push('OIDC_ISSUER');
 if(!env.OIDC_CLIENT_ID)issues.push('OIDC_CLIENT_ID');
 if(!env.OIDC_CLIENT_SECRET)issues.push('OIDC_CLIENT_SECRET');
 if(!env.OIDC_ROLE_MAP)issues.push('OIDC_ROLE_MAP');
 if(!env.OIDC_FACILITY_ID)issues.push('OIDC_FACILITY_ID');
 if(env.STORAGE_MODE!=='s3')issues.push('STORAGE_MODE');
 for(const key of ['S3_ENDPOINT','S3_REGION','S3_BUCKET','S3_ACCESS_KEY_ID','S3_SECRET_ACCESS_KEY'] as const)if(!env[key])issues.push(key);
 if(!env.S3_KMS_KEY_ID)issues.push('S3_KMS_KEY_ID');
 if(!env.CLINICAL_RULESET_APPROVER)issues.push('CLINICAL_RULESET_APPROVER');
 if(!env.DATA_RETENTION_DAYS||!z.coerce.number().int().positive().safeParse(env.DATA_RETENTION_DAYS).success)issues.push('DATA_RETENTION_DAYS');
 return [...new Set(issues)];
}

export function assertProductionConfig(){
 const issues=productionConfigIssues();
 if(issues.length)throw new Error(`PRODUCTION_CONFIG_INVALID:${issues.join(',')}`);
}

export function appUrl(){
 const value=process.env.APP_URL??'http://localhost:3000';
 return new URL(value);
}
