import type {PoolConfig} from 'pg';
export function postgresPoolConfig(env:NodeJS.ProcessEnv=process.env,migration=false):PoolConfig{
 const connectionString=migration?(env.DATABASE_MIGRATION_URL||env.DATABASE_URL):env.DATABASE_URL;
 if(!connectionString)throw new Error('DATABASE_URL_REQUIRED');
 let url:URL;try{url=new URL(connectionString);}catch{throw new Error('DATABASE_URL_INVALID');}
 if(!['postgres:','postgresql:'].includes(url.protocol))throw new Error('DATABASE_URL_INVALID');
 const mode=env.DATABASE_SSL_MODE;
 if((env.VERCEL==='1'||['demo','production'].includes(env.DEPLOYMENT_MODE??''))&&mode!=='verify-full')throw new Error('DATABASE_VERIFIED_TLS_REQUIRED');
 if(mode&&!['verify-full','require','disable'].includes(mode))throw new Error('DATABASE_SSL_MODE_INVALID');
 // Connection-string SSL parameters otherwise override pg's verified SSL object.
 if(mode)for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
 const maximum=Number(env.DATABASE_POOL_MAX||(env.VERCEL==='1'?'1':'20'));
 if(!Number.isInteger(maximum)||maximum<1||maximum>20)throw new Error('DATABASE_POOL_MAX_INVALID');
 return {connectionString:url.toString(),ssl:mode==='disable'?false:mode?{rejectUnauthorized:mode==='verify-full',...(env.DATABASE_CA_CERT?{ca:env.DATABASE_CA_CERT.replace(/\\n/g,'\n')}:{})}:undefined,max:migration?1:maximum,idleTimeoutMillis:10_000,connectionTimeoutMillis:10_000,statement_timeout:30_000,query_timeout:35_000,allowExitOnIdle:true};
}
