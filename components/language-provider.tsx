'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {validUiLanguage,type UiLanguage} from '@/lib/ui-language';
import {translateUi} from '@/lib/ui-translations';
type Context={language:UiLanguage;setLanguage:(language:UiLanguage)=>void;t:(text:string)=>string};
const LanguageContext=createContext<Context>({language:'en',setLanguage:()=>{},t:text=>text});
export function LanguageProvider({children,initialLanguage}:{children:React.ReactNode;initialLanguage:UiLanguage}){
 const [language,setLanguage]=useState(initialLanguage);
 useEffect(()=>{document.documentElement.lang=language;document.cookie=`sf_ui_language=${language}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;},[language]);
 return <LanguageContext.Provider value={{language,setLanguage:value=>setLanguage(validUiLanguage(value)),t:text=>translateUi(text,language)}}>{children}</LanguageContext.Provider>;
}
export function useUiLanguage(){return useContext(LanguageContext);}
export function T({text,values={}}:{text:string;values?:Record<string,string|number>}){const {t}=useUiLanguage();return <>{t(text).replace(/\{(\w+)\}/g,(match,key)=>Object.hasOwn(values,key)?String(values[key]):match)}</>;}
export function LanguageSwitcher(){const {language,setLanguage,t}=useUiLanguage();return <label className="language-switcher"><span className="sr-only">{t('Website language')}</span><select aria-label={t('Website language')} value={language} onChange={e=>setLanguage(validUiLanguage(e.target.value))}><option value="en" lang="en">English</option><option value="hi" lang="hi">हिन्दी</option><option value="or" lang="or">ଓଡ଼ିଆ</option></select></label>;}
