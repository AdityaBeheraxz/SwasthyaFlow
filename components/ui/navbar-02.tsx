'use client';
import type {ComponentProps} from 'react';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {MoonIcon,SunIcon} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {NavigationMenu,NavigationMenuItem,NavigationMenuLink,NavigationMenuList,navigationMenuTriggerStyle} from '@/components/ui/navigation-menu';
import {Logo} from '@/components/ui/navbar-02-utils/logo';
import {NavigationSheet} from '@/components/ui/navbar-02-utils/navigation-sheet';
import {AuthControl} from '@/components/auth-control';
import {OfflineController} from '@/components/offline-controller';
import {cn} from '@/lib/utils';
import {navItems} from '@/components/ui/navbar-02-utils/nav-items';

export const NavMenu=(props:ComponentProps<typeof NavigationMenu>)=>{const pathname=usePathname();return <NavigationMenu {...props}><NavigationMenuList>{navItems.map(item=><NavigationMenuItem key={item.href}><NavigationMenuLink asChild active={pathname===item.href} className={cn(navigationMenuTriggerStyle(),pathname===item.href&&'bg-accent text-accent-foreground')}><Link href={item.href} aria-current={pathname===item.href?'page':undefined}>{item.label}</Link></NavigationMenuLink></NavigationMenuItem>)}</NavigationMenuList></NavigationMenu>;};

function ThemeButton(){const [dark,setDark]=useState(false);useEffect(()=>{const enabled=localStorage.getItem('sf_theme')==='dark';setDark(enabled);document.documentElement.dataset.theme=enabled?'dark':'light';},[]);function toggle(){const next=!dark;setDark(next);localStorage.setItem('sf_theme',next?'dark':'light');document.documentElement.dataset.theme=next?'dark':'light';}return <Button size="icon" variant="outline" onClick={toggle} aria-label={dark?'Use light theme':'Use dark theme'}>{dark?<SunIcon className="h-4 w-4"/>:<MoonIcon className="h-4 w-4"/>}</Button>;}

export default function Navbar({production}:{production:boolean}){return <header className="sticky top-0 z-40 h-16 border-b border-border bg-background shadow-sm" style={{position:'sticky',top:0}}><div className="mx-auto flex h-full max-w-screen-2xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"><div className="flex min-w-0 items-center gap-8"><Logo/><NavMenu className="hidden xl:flex"/></div><div className="flex shrink-0 items-center gap-2"><div className="hidden xl:block">{!production&&<OfflineController/>}</div><div className="hidden xl:block"><AuthControl production={production}/></div><ThemeButton/><div className="xl:hidden"><NavigationSheet production={production}/></div></div></div></header>;}

