import {LoginForm} from '@/components/login-form';
import {isProductionDeployment} from '@/lib/runtime-config';
export default function Login(){return <div className="container">{isProductionDeployment?<section className="panel access-denied"><div className="eyebrow">Hospital identity</div><h1 className="section-title">Secure staff sign-in</h1><p>Continue through the configured hospital identity provider. Your assigned role and facility determine access.</p><a className="btn" href="/api/auth/login">Continue to secure sign in</a></section>:<LoginForm/>}</div>;}
