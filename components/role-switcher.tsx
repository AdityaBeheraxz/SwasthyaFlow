'use client';
import { useEffect,useState } from 'react';
type Role={id:string;role:string}|null;
const options=[['U-101','Health Worker'],['U-102','Nurse'],['U-104','Medical Officer'],['U-105','Administrator']];
export function RoleSwitcher(){const [role,setRole]=useState<Role>(null);const [busy,setBusy]=useState(false);
 useEffect(()=>{fetch('/api/session').then(r=>r.json()).then(v=>setRole(v.data)).catch(()=>{});},[]);
 async function choose(id:string){setBusy(true);const response=await fetch('/api/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId:id})});const value=await response.json();setBusy(false);if(value.ok){setRole(value.data);window.location.reload();}else alert(value.error.message);}
 return <label className="role-control"><span>Demo role</span><select aria-label="Demo role" disabled={busy} value={role?.id??''} onChange={event=>choose(event.target.value)}><option value="">Select role</option>{options.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>;
}
