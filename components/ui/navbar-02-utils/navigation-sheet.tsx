'use client';
import {T,useUiLanguage} from '@/components/language-provider';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Menu} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Sheet,SheetClose,SheetContent,SheetDescription,SheetHeader,SheetTitle,SheetTrigger} from '@/components/ui/sheet';
import {AuthControl} from '@/components/auth-control';
import {OfflineController} from '@/components/offline-controller';
import {cn} from '@/lib/utils';
import {navItems} from '@/components/ui/navbar-02-utils/nav-items';

export function NavigationSheet({production}:{production:boolean}){const {t:uiText}=useUiLanguage();
 const pathname=usePathname();
 return <Sheet><SheetTrigger asChild><Button size="icon" variant="ghost" className="data-[state=open]:bg-accent data-[state=open]:text-accent-foreground" aria-label={uiText("Open navigation")}><Menu className="h-5 w-5"/></Button></SheetTrigger><SheetContent className="flex flex-col" side="right"><SheetHeader><SheetTitle>SwasthyaFlow</SheetTitle><SheetDescription><T text={"Staff workspace navigation"}/></SheetDescription></SheetHeader><nav aria-label={uiText("Mobile main navigation")} className="mt-6 grid gap-2">{navItems.map(item=><SheetClose asChild key={item.href}><Link href={item.href} aria-current={(pathname===item.href||(item.href==='/referrals'&&pathname.startsWith('/referrals/')))?'page':undefined} className={cn('rounded-md px-3 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',(pathname===item.href||(item.href==='/referrals'&&pathname.startsWith('/referrals/')))&&'bg-accent text-accent-foreground')}><T text={item.label}/></Link></SheetClose>)}</nav><div className="mt-auto grid gap-4 border-t pt-5"><OfflineController allowSimulation={!production}/><AuthControl production={production} compact/></div></SheetContent></Sheet>;
}
