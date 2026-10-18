import zh from './locales/zh.mjs';
import en from './locales/en.mjs';
import es from './locales/es.mjs';
import fr from './locales/fr.mjs';
import ru from './locales/ru.mjs';
import ar from './locales/ar.mjs';
import hi from './locales/hi.mjs';
import ur from './locales/ur.mjs';
import {languages,normalizeLanguage,GLOSSARY_VERSION} from './locale-registry.mjs';
export {languages,direction,normalizeLanguage} from './locale-registry.mjs';
export const catalogs={zh,en,es,fr,ru,ar,hi,ur};
export const translations=Object.fromEntries(Object.entries(catalogs).map(([l,c])=>[l,c.base]));
export const uiText=(language,group,key)=>catalogs[normalizeLanguage(language)][group]?.[key];
export function translate(language,key){return uiText(language,'base',key)??key;}
export const glossaryStatus={version:GLOSSARY_VERSION,status:'experimental-draft',reviewer:null,reviewDate:null};
