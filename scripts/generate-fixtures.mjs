import {mkdirSync,writeFileSync} from 'node:fs';
import {syntheticVault} from '../server/fixtures.mjs';
import {summarize,CODES} from '../server/core.mjs';
import {translations,languages} from '../public/i18n.mjs';
const dir=new URL('../fixtures/',import.meta.url);mkdirSync(dir,{recursive:true});
const v=syntheticVault(),now='2026-10-10T10:00:00Z';
writeFileSync(new URL('synthetic-september.json',dir),JSON.stringify({notice:'Purely synthetic; no treatment recommendation',asOf:now,vault:v},null,2)+'\n');
writeFileSync(new URL('expected-september.json',dir),JSON.stringify(summarize(v,'2026-09-01','2026-09-28',now),null,2)+'\n');
const cases=[
 ['T01','28-day synthetic window',{statusDays:23,eligibleDays:28,headacheDays:8,unknownDays:5,coverage:82.1}],
 ['T02','2026-09-01T23:30+08:00 to 2026-09-02T00:30+08:00',{episodes:1,headacheDays:2,minutes:60}],
 ['T03','2026-09-01T23:30+08:00 to 2026-09-02T00:00+08:00',{episodes:1,headacheDays:1,minutes:30}],
 ['T04','Two episodes same day',{episodes:2,headacheDays:1}],
 ['T05','Two doses same class same day',{medicationEvents:2,acuteDays:1,classDays:1}],
 ['T06','Two classes same day',{acuteDays:1,eachClassDays:1}],
 ['T07','Ongoing or unknown end',{finalDuration:null}],
 ['T08','Daily no with overlapping episode',{conflict:true,originalDailyStatus:'no'}],
 ['T09','Duplicate operation ID',{additionalRecords:0,additionalRevision:0}],
 ['T10','Revision of already shared record',{newReportVersion:true,oldSnapshotPreserved:true}],
 ['T11','Same case in eight language reports',{sameFacts:true,arDirection:'rtl',urDirection:'rtl',hiDirection:'ltr'}],
 ['T12','Revoke before queued attempt',{delivered:0,audited:true}],
 ['T13','Receiver stored; ACK lost; retry',{receiverRows:1,duplicateReceipt:true}],
 ['T14','America/New_York 2026-03-08 01:30-05:00 to03:30-04:00',{elapsedMinutes:60,civilDayHours:23}],
 ['T15','Missing and late response',{neitherSuccessNorFailure:true,missingSeparate:true,outsideWindowSeparate:true}]
].map(([id,scenario,expected])=>({id,scenario,expected,ruleVersion:'0.1.0',reviewer:null,reviewStatus:'pending',executable:'tests/'+(['T12','T13'].includes(id)?'sharing':'core')+'.test.mjs'}));
writeFileSync(new URL('acceptance-cases.json',dir),JSON.stringify(cases,null,2)+'\n');
const quote=s=>'"'+String(s).replaceAll('"','""')+'"';
const rows=[['concept',...Object.keys(languages),'status','language_reviewer','clinical_reviewer','patient_test','review_date']];
for(const key of new Set([...Object.values(CODES).flat(),'yes','no','unknown','dose','unit','start','end','aura','revoke']))rows.push([key,...Object.keys(languages).map(l=>translations[l][key]),'experimental-draft','','','','']);
writeFileSync(new URL('../docs/TRANSLATION_REVIEW.csv',import.meta.url),'\uFEFF'+rows.map(r=>r.map(quote).join(',')).join('\r\n'));
console.log('Synthetic fixtures, expectations and translation review register generated.');
