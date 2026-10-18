import {addDays,dateAt,previousPeriod} from './domain.mjs';
import {LANGUAGES as languages} from './locale-registry.mjs';
export function reportLanguage(v,interfaceLanguage=v.language){
  const value=v.reportLanguageMode==='fixed'?v.reportLanguage:interfaceLanguage;
  return languages.includes(value)?value:'zh';
}
export function reportPeriod(kind,now,zone){
  if(kind==='range28'){const today=dateAt(now,zone);return {from:addDays(today,-28),to:addDays(today,-1)};}
  if(kind==='week'||kind==='month')return previousPeriod(kind==='week'?'weekly':'monthly',now,zone);
  return null;
}
