import type {UiLanguage} from './ui-language';
import {uiCatalog} from './ui-catalog';
export function translateUi(text:string,language:UiLanguage):string{
 if(language==='en')return text;
 const key=text.replace(/\s+/g,' ').trim();
 const translated=uiCatalog[key]?.[language];
 if(!translated){const coded=text.match(/^([A-Z_]+): (.+)$/s);return coded?coded[1]+': '+translateUi(coded[2],language):text;}
 return (text.startsWith(' ')?' ':'')+translated+(text.endsWith(' ')?' ':'');
}
